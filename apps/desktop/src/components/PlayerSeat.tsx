import { motion } from 'framer-motion';
import { HandRank } from '@holdem/shared';
import type { Card, Player, RoomSeat, ShowdownResult } from '@holdem/shared';
import { FlipCard } from './FlipCard';

export const HAND_RANK_LABEL: Record<HandRank, string> = {
  [HandRank.HighCard]: '高牌',
  [HandRank.OnePair]: '一对',
  [HandRank.TwoPair]: '两对',
  [HandRank.ThreeOfAKind]: '三条',
  [HandRank.Straight]: '顺子',
  [HandRank.Flush]: '同花',
  [HandRank.FullHouse]: '葫芦',
  [HandRank.FourOfAKind]: '四条',
  [HandRank.StraightFlush]: '同花顺',
  [HandRank.RoyalFlush]: '皇家同花顺',
};

interface PlayerSeatProps {
  seat: RoomSeat;
  player?: Player;
  isActor: boolean;
  isMe: boolean;
  /** 摊牌时的公开手牌与结果 */
  revealCards?: Card[];
  revealRank?: HandRank;
  wonAmount?: number;
  /** 该玩家是否为赢家（金色光圈） */
  isWinner?: boolean;
  /** 摊牌中但未获胜（整体变暗） */
  isLoser?: boolean;
  /** 亮牌翻转延迟（秒），按亮牌顺序错开 */
  revealDelay?: number;
  /** 亮牌是否播翻转动画（重连快照不播） */
  revealAnimate?: boolean;
  /** 赢家的最佳五张牌 key 集合（suit-rank），命中的牌发光 */
  winnerCardKeys?: Set<string>;
}

const STATUS_LABEL: Record<string, string> = {
  waiting: '',
  active: '',
  folded: '已弃牌',
  'all-in': '全下',
  eliminated: '出局',
};

export function PlayerSeat({
  seat,
  player,
  isActor,
  isMe,
  revealCards,
  revealRank,
  wonAmount,
  isWinner = false,
  isLoser = false,
  revealDelay = 0,
  revealAnimate = false,
  winnerCardKeys,
}: PlayerSeatProps) {
  const statusLabel = player ? (STATUS_LABEL[player.status] ?? '') : '';

  return (
    <motion.div
      animate={isWinner ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, times: [0, 0.4, 1] }}
      className={`w-36 rounded-xl border px-3 py-2 text-center shadow-lg transition-colors ${
        isWinner
          ? 'border-amber-300 bg-emerald-800 ring-2 ring-amber-300 shadow-[0_0_24px_rgba(252,211,77,0.5)]'
          : isActor
            ? 'border-amber-400 bg-emerald-800 ring-2 ring-amber-400'
            : isMe
              ? 'border-emerald-500 bg-emerald-900'
              : 'border-emerald-800 bg-emerald-950'
      } ${isLoser ? 'opacity-60' : ''} ${seat.connected ? '' : 'opacity-40'}`}
    >
      <div className="flex items-center justify-center gap-1 text-sm font-semibold">
        {seat.isHost && <span title="房主">👑</span>}
        <span className="truncate">{seat.name}</span>
        {isMe && <span className="text-emerald-400">(我)</span>}
      </div>
      <div className="mt-1 text-sm text-amber-300">筹码 {seat.stack}</div>
      {player && player.betThisRound > 0 && (
        <div className="mt-0.5 text-xs text-emerald-300">本轮下注 {player.betThisRound}</div>
      )}
      {statusLabel && <div className="mt-0.5 text-xs text-slate-400">{statusLabel}</div>}
      {!seat.connected && <div className="text-xs text-red-400">断线</div>}

      {revealCards && revealCards.length > 0 && (
        <div className="mt-1 flex justify-center gap-1">
          {revealCards.map((card, i) => {
            const key = `${card.suit}-${card.rank}`;
            return (
              <FlipCard
                key={key}
                card={card}
                size="sm"
                delay={revealDelay + i * 0.1}
                animateMount={revealAnimate}
                glow={winnerCardKeys?.has(key) ?? false}
              />
            );
          })}
        </div>
      )}
      {revealRank !== undefined && (
        <motion.div
          initial={revealAnimate ? { opacity: 0, y: 4 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: revealDelay + 0.35 }}
          className="mt-1 text-xs font-semibold text-emerald-300"
        >
          {HAND_RANK_LABEL[revealRank]}
        </motion.div>
      )}
      {wonAmount !== undefined && wonAmount > 0 && (
        <motion.div
          initial={revealAnimate ? { scale: 0.4, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: revealDelay + 0.5, type: 'spring', stiffness: 300, damping: 15 }}
          className="mt-0.5 text-base font-bold text-amber-300"
        >
          +{wonAmount}
        </motion.div>
      )}
    </motion.div>
  );
}

/** 椭圆座位坐标（百分比数值版）：index=0 固定在底部（即“我”的位置），其余顺时针排开。
 *  顶部中央是兔女郎荷官席，任何落在该区域的座位向旁侧偏移 35°。 */
export function seatPosPct(index: number, total: number): { left: number; top: number } {
  let angle = (index / total) * Math.PI * 2 + Math.PI / 2;
  const guard = (35 * Math.PI) / 180;
  let diff = angle - 3 * (Math.PI / 2); // 相对顶部中心的角差
  diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // 归一化到 [-π, π]
  if (Math.abs(diff) < guard) angle += guard * (diff >= 0 ? 1 : -1);
  return { left: 50 + 42 * Math.cos(angle), top: 50 + 40 * Math.sin(angle) };
}

/** 椭圆座位坐标（百分比字符串版，供 style 直接使用） */
export function seatPosition(index: number, total: number): { left: string; top: string } {
  const pos = seatPosPct(index, total);
  return { left: `${pos.left}%`, top: `${pos.top}%` };
}

export function ShowdownPanel({ result, seats }: { result: ShowdownResult; seats: RoomSeat[] }) {
  const nameOf = (id: string) => seats.find((s) => s.playerId === id)?.name ?? id;
  if (result.foldWin) {
    const winner = result.pots[0]?.winners[0];
    return (
      <div className="rounded-lg bg-black/50 px-4 py-2 text-center text-sm text-emerald-200">
        {winner
          ? `其余玩家弃牌，${nameOf(winner.playerId)} 赢得 ${winner.amount} 底池`
          : '手牌结束'}
      </div>
    );
  }
  const winners = result.pots.flatMap((p) => p.winners);
  return (
    <div className="rounded-lg bg-black/50 px-4 py-2 text-center text-sm text-emerald-200">
      {winners.map((w) => (
        <span key={`${w.playerId}-${w.amount}`} className="mx-2">
          🏆 {nameOf(w.playerId)} +{w.amount}
        </span>
      ))}
    </div>
  );
}
