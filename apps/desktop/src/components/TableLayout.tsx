import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Card, GameState, RoomSeat, ShowdownResult } from '@holdem/shared';
import { CardBack } from './PlayingCard';
import { FlipCard } from './FlipCard';
import { PlayerSeat, ShowdownPanel, seatPosPct, seatPosition } from './PlayerSeat';
import { BetChip, DealFlyCard, FoldFlyCards, WinChips } from './TableFX';
import type { FxPos } from './TableFX';
import { Dealer } from './Dealer';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { isFreshDeal, markHandSeen } from './dealTracker';

interface TableLayoutProps {
  room: { id: string; seats: RoomSeat[]; hostId: string };
  gameState: GameState | null;
  myPlayerId: string | null;
  myHand: Card[];
  showdown: ShowdownResult | null;
}

const cardKey = (c: Card) => `${c.suit}-${c.rank}`;

/** 发牌错落节奏（秒）：按座位显示序依次发，每人两张间隔 */
const DEAL_GAP_SEAT = 0.14;
const DEAL_GAP_CARD = 0.09;
const DEAL_FLY_MS = 560;

/**
 * 椭圆牌桌：座位环绕（“我”固定在底部），中央为公共牌与底池。
 * 座位显示序 = (seat - mySeat + n) % n，即我的下一个座位排在底部左侧开始。
 * 动画（发牌/翻牌/弃牌/筹码/摊牌）全部由客户端 diff 触发，协议零改动；
 * 重连快照通过 dealTracker + animHandRef 静态显示，不重播动画。
 */
export function TableLayout({ room, gameState, myPlayerId, myHand, showdown }: TableLayoutProps) {
  const seats = room.seats;
  const n = seats.length;
  const myIndex = seats.findIndex((s) => s.playerId === myPlayerId);

  const displayOf = useCallback(
    (playerId: string) => {
      const i = seats.findIndex((s) => s.playerId === playerId);
      if (i < 0) return -1;
      return myIndex >= 0 ? (i - myIndex + n) % n : i;
    },
    [seats, myIndex, n],
  );

  // —— 发牌状态机：hand + done（done=false 时播发牌飞行，期间隐藏手牌区） ——
  const [deal, setDeal] = useState<{ hand: number; done: boolean } | null>(() => {
    if (!gameState || gameState.phase === 'waiting') return null;
    return {
      hand: gameState.handNumber,
      done: !isFreshDeal(
        room.id,
        gameState.handNumber,
        gameState.phase,
        gameState.communityCards.length,
      ),
    };
  });
  const handRef = useRef<number | null>(null);
  /** 本挂载周期内正在播动画（而非静态快照）的手牌号；null 表示当前手牌不播动画 */
  const animHandRef = useRef<number | null>(null);
  /** 发牌动画完成计时的参与者数量（避免计时器随普通消息重置） */
  const participantsRef = useRef(0);
  const commLenRef = useRef(0);

  // —— 公共牌新增批次：from 之后的下标播翻转（翻牌圈三张错落） ——
  const [commFresh, setCommFresh] = useState<{ hand: number; from: number } | null>(null);

  // —— 弃牌飞牌特效 ——
  const foldTrackedRef = useRef<Set<string>>(new Set());
  const [foldFx, setFoldFx] = useState<{ fxId: number; pos: FxPos }[]>([]);

  // —— 赢池筹码特效 ——
  const winFxShownRef = useRef<number | null>(null);
  const [winFx, setWinFx] = useState<{
    fxId: number;
    winners: { pos: FxPos; amount: number }[];
  } | null>(null);

  const fxIdRef = useRef(0);
  const animatedHand =
    deal !== null && deal.hand === gameState?.handNumber && animHandRef.current === deal.hand;
  const potDisplay = useAnimatedNumber(gameState?.pot ?? 0);

  // 核心同步：状态机推进（发牌检测 / 快照降级 / 各特效的开关复位）
  useLayoutEffect(() => {
    if (!gameState || gameState.phase === 'waiting') {
      handRef.current = null;
      animHandRef.current = null;
      participantsRef.current = 0;
      commLenRef.current = 0;
      setDeal(null);
      setCommFresh(null);
      setFoldFx([]);
      setWinFx(null);
      foldTrackedRef.current.clear();
      return;
    }
    const hn = gameState.handNumber;
    const known = handRef.current;
    if (known === hn) return;

    // 新手牌（或首次挂载）：先判断是否播发牌动画（判断依赖标记前的记忆），再标记
    const animate =
      known !== null
        ? hn > known
        : isFreshDeal(room.id, hn, gameState.phase, gameState.communityCards.length);
    markHandSeen(room.id, hn);

    handRef.current = hn;
    animHandRef.current = animate ? hn : null;
    participantsRef.current = gameState.players.filter(
      (p) => p.status !== 'waiting' && p.status !== 'eliminated',
    ).length;
    commLenRef.current = gameState.communityCards.length;
    foldTrackedRef.current.clear();
    if (!animate) {
      // 中途加入/重连：快照中已弃牌的玩家直接标记为已跟踪，不补播弃牌动画
      for (const p of gameState.players) {
        if (p.status === 'folded') foldTrackedRef.current.add(p.id);
      }
    }
    setDeal({ hand: hn, done: !animate });
    setFoldFx([]);
    setWinFx(null);
    winFxShownRef.current = null;
    setCommFresh({ hand: hn, from: animate ? 0 : gameState.communityCards.length });
  }, [gameState, room.id]);

  // 公共牌批次跟踪：比上一帧多出来的牌播翻转
  useLayoutEffect(() => {
    if (!gameState || gameState.phase === 'waiting') {
      commLenRef.current = 0;
      return;
    }
    const len = gameState.communityCards.length;
    if (len > commLenRef.current && deal?.done) {
      setCommFresh({ hand: gameState.handNumber, from: commLenRef.current });
    }
    commLenRef.current = len;
  }, [gameState, deal?.done]);

  // 发牌动画完成计时：最后一张飞行牌落地后揭示所有手牌
  useEffect(() => {
    if (!deal || deal.done) return;
    const total =
      Math.max(participantsRef.current - 1, 0) * DEAL_GAP_SEAT * 1000 +
      DEAL_GAP_CARD * 1000 +
      DEAL_FLY_MS +
      150;
    const t = setTimeout(() => {
      setDeal((d) => (d && d.hand === deal.hand ? { ...d, done: true } : d));
    }, total);
    return () => clearTimeout(t);
  }, [deal]);

  // 弃牌检测：状态转为 folded 时从座位飞出两张牌背
  useLayoutEffect(() => {
    if (!gameState || gameState.phase === 'waiting') return;
    const animActive = animHandRef.current === gameState.handNumber;
    for (const p of gameState.players) {
      if (p.status !== 'folded' || foldTrackedRef.current.has(p.id)) continue;
      foldTrackedRef.current.add(p.id);
      if (!animActive) continue;
      const display = displayOf(p.id);
      if (display < 0) continue;
      const fxId = ++fxIdRef.current;
      setFoldFx((fx) => [...fx, { fxId, pos: seatPosPct(display, n) }]);
      setTimeout(() => setFoldFx((fx) => fx.filter((f) => f.fxId !== fxId)), 1200);
    }
  }, [gameState, displayOf, n]);

  // 赢池飞筹码：摊牌结果首次出现（且本手播过动画）时触发
  useLayoutEffect(() => {
    if (!gameState?.showdownResult) return;
    if (winFxShownRef.current === gameState.handNumber) return;
    winFxShownRef.current = gameState.handNumber;
    if (animHandRef.current !== gameState.handNumber) return;
    const agg = new Map<string, number>();
    for (const pot of gameState.showdownResult.pots) {
      for (const w of pot.winners) {
        agg.set(w.playerId, (agg.get(w.playerId) ?? 0) + w.amount);
      }
    }
    const winners: { pos: FxPos; amount: number }[] = [];
    for (const [pid, amount] of agg) {
      const display = displayOf(pid);
      if (display >= 0) winners.push({ pos: seatPosPct(display, n), amount });
    }
    if (winners.length === 0) return;
    const fxId = ++fxIdRef.current;
    setWinFx({ fxId, winners });
    setTimeout(() => setWinFx((fx) => (fx && fx.fxId === fxId ? null : fx)), 1500);
  }, [gameState, displayOf, n]);

  if (n === 0) return null;

  // 摊牌高亮信息
  const winnerIds = new Set<string>();
  const winnerCardKeys = new Set<string>();
  if (showdown) {
    for (const pot of showdown.pots) {
      for (const w of pot.winners) winnerIds.add(w.playerId);
    }
    for (const r of showdown.reveals) {
      if (!winnerIds.has(r.playerId)) continue;
      for (const c of r.evaluation.bestFive) winnerCardKeys.add(cardKey(c));
    }
  }
  const revealAnimate = animHandRef.current !== null && animHandRef.current === gameState?.handNumber;

  const phaseLabel: Record<string, string> = {
    waiting: '等待开始',
    'pre-flop': '翻牌前',
    flop: '翻牌',
    turn: '转牌',
    river: '河牌',
    showdown: '摊牌',
  };

  // 发牌飞行的参与者（按座位显示序），目标为座位上方手牌区
  const dealTargets =
    deal && !deal.done && gameState
      ? gameState.players
          .filter((p) => p.status === 'active' || p.status === 'all-in' || p.status === 'folded')
          .map((p) => ({ display: displayOf(p.id), playerId: p.id }))
          .filter((t) => t.display >= 0)
          .sort((a, b) => a.display - b.display)
          .flatMap((t, order) =>
            [0, 1].map((card) => ({
              key: `${t.playerId}-${card}`,
              delay: order * DEAL_GAP_SEAT + card * DEAL_GAP_CARD,
              to: {
                left: seatPosPct(t.display, n).left + (card - 0.5) * 3.5,
                top: seatPosPct(t.display, n).top - 8,
              },
            })),
          )
      : [];

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* 兔女郎荷官居中，左侧为阶段/底池信息，右侧为摊牌结果 */}
      <div className="relative z-20 flex items-end justify-center gap-8">
        <div className="mb-7 min-w-28 text-right">
          {gameState && (
            <>
              <div className="text-xs uppercase tracking-widest text-emerald-300">
                {phaseLabel[gameState.phase] ?? gameState.phase}
              </div>
              <div className="text-lg font-bold text-amber-300">底池 {potDisplay}</div>
            </>
          )}
        </div>
        <Dealer dealing={deal !== null && !deal.done} />
        <div className="mb-7 min-w-28 text-left">
          {showdown && <ShowdownPanel result={showdown} seats={seats} />}
        </div>
      </div>

      <div className="relative aspect-[16/10] w-full">
      {/* 桌面 */}
      <div className="absolute inset-[14%] rounded-[50%] border-8 border-emerald-950 bg-emerald-800 shadow-inner" />

      {/* 发牌飞行层（起点 = 荷官手部，即容器顶部中央） */}
      {dealTargets.map((t) => (
        <DealFlyCard key={t.key} to={t.to} delay={t.delay} />
      ))}

      {/* 弃牌飞牌层 */}
      {foldFx.map((f) => (
        <FoldFlyCards key={f.fxId} from={f.pos} />
      ))}

      {/* 赢池飞筹码层 */}
      <AnimatePresence>
        {winFx && <WinChips key={winFx.fxId} winners={winFx.winners} />}
      </AnimatePresence>

      {/* 下注筹码层：本轮有押注的玩家各一枚，新一轮开始时飞入底池 */}
      <AnimatePresence>
        {gameState?.players
          .filter((p) => p.betThisRound > 0)
          .map((p) => {
            const display = displayOf(p.id);
            if (display < 0) return null;
            return <BetChip key={p.id} amount={p.betThisRound} seatPos={seatPosPct(display, n)} />;
          })}
      </AnimatePresence>

      {/* 公共牌：椭圆正中（阶段/底池信息已移至荷官旁） */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => {
            const card = gameState?.communityCards[i];
            if (!card) return <PlayingCardSlot key={i} />;
            const freshFrom = commFresh?.hand === gameState.handNumber ? commFresh.from : i;
            const fresh = i >= freshFrom;
            const flightDelay = fresh ? (i - freshFrom) * 0.16 : 0;
            return (
              <motion.div
                key={`${i}-${cardKey(card)}`}
                initial={fresh ? { y: -170, opacity: 0.6 } : false}
                animate={{ y: 0, opacity: 1 }}
                transition={fresh ? { duration: 0.55, delay: flightDelay, ease: 'easeOut' } : { duration: 0 }}
              >
                <FlipCard
                  card={card}
                  delay={flightDelay + 0.25}
                  animateMount={fresh}
                  glow={winnerCardKeys.has(cardKey(card))}
                />
              </motion.div>
            );
          })}
      </div>

      {/* 座位 */}
      {seats.map((seat) => {
        const display = displayOf(seat.playerId);
        const player = gameState?.players.find((p) => p.id === seat.playerId);
        const isActor = gameState?.actorId === seat.playerId;
        const isDealer = gameState?.dealerSeat === player?.seat;
        const isMe = seat.playerId === myPlayerId;
        const reveal = showdown?.reveals.find((r) => r.playerId === seat.playerId);
        const won = showdown
          ? showdown.pots.reduce(
              (sum, p) => sum + (p.winners.find((w) => w.playerId === seat.playerId)?.amount ?? 0),
              0,
            )
          : undefined;
        const isWinner = won !== undefined && won > 0;
        const isLoser =
          showdown !== null && showdown.reveals.length > 0 && !isWinner && reveal !== undefined;
        const inThisHand = player != null && ['active', 'folded', 'all-in'].includes(player.status);
        const showBacks = deal?.done && inThisHand && player.status !== 'folded' && !reveal;
        const revealOrder = reveal
          ? (showdown?.reveals.findIndex((r) => r.playerId === seat.playerId) ?? 0)
          : 0;

        return (
          <div
            key={seat.playerId}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={seatPosition(display, n)}
          >
            {/* 我的手牌（发牌动画完成后翻开） */}
            {isMe && deal?.done && myHand.length > 0 && (
              <div className="mb-1 flex justify-center gap-1">
                {myHand.map((card, i) => (
                  <FlipCard
                    key={`${cardKey(card)}-${i}`}
                    card={card}
                    delay={i * 0.16}
                    animateMount={animatedHand}
                    glow={winnerCardKeys.has(cardKey(card))}
                  />
                ))}
              </div>
            )}
            {/* 对手牌背（参与本手牌且未弃牌、未亮牌） */}
            {!isMe && showBacks && (
              <div className="mb-1 flex justify-center gap-1">
                <CardBack size="sm" />
                <CardBack size="sm" />
              </div>
            )}
            <PlayerSeat
              seat={seat}
              player={player}
              isActor={isActor}
              isMe={isMe}
              revealCards={reveal?.cards}
              revealRank={reveal?.evaluation.rank}
              wonAmount={won}
              isWinner={isWinner}
              isLoser={isLoser}
              revealDelay={0.15 + revealOrder * 0.18}
              revealAnimate={revealAnimate}
              winnerCardKeys={winnerCardKeys}
            />
            {isDealer && (
              <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-900 shadow">
                D
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

/** 公共牌空位：未发出的街道以半透明牌背占位 */
function PlayingCardSlot() {
  return (
    <div className="opacity-50">
      <CardBack size="md" />
    </div>
  );
}
