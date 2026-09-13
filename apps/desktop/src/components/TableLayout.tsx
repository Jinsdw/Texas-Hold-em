import type { Card, GameState, RoomSeat, ShowdownResult } from '@holdem/shared';
import { PlayingCard } from './PlayingCard';
import { PlayerSeat, ShowdownPanel, seatPosition } from './PlayerSeat';

interface TableLayoutProps {
  room: { seats: RoomSeat[]; hostId: string };
  gameState: GameState | null;
  myPlayerId: string | null;
  myHand: Card[];
  showdown: ShowdownResult | null;
}

/**
 * 椭圆牌桌：座位环绕（“我”固定在底部），中央为公共牌与底池。
 * 座位显示序 = (seat - mySeat + n) % n，即我的下一个座位排在底部左侧开始。
 */
export function TableLayout({ room, gameState, myPlayerId, myHand, showdown }: TableLayoutProps) {
  const seats = room.seats;
  const n = seats.length;
  const myIndex = seats.findIndex((s) => s.playerId === myPlayerId);

  // 显示序：我（若有）映射到底部（index 0 = 底部起点），否则原序
  const ordered = seats.map((seat, i) => {
    const display = myIndex >= 0 ? (i - myIndex + n) % n : i;
    return { seat, display };
  });

  const phaseLabel: Record<string, string> = {
    waiting: '等待开始',
    'pre-flop': '翻牌前',
    flop: '翻牌',
    turn: '转牌',
    river: '河牌',
    showdown: '摊牌',
  };

  return (
    <div className="relative mx-auto aspect-[16/10] w-full max-w-4xl">
      {/* 桌面 */}
      <div className="absolute inset-[14%] rounded-[50%] border-8 border-emerald-950 bg-emerald-800 shadow-inner" />

      {/* 中央：阶段 + 底池 + 公共牌 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        {gameState && (
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-emerald-300">
              {phaseLabel[gameState.phase] ?? gameState.phase}
            </div>
            <div className="text-lg font-bold text-amber-300">底池 {gameState.pot}</div>
          </div>
        )}
        <div className="flex gap-1.5">
          {gameState && gameState.communityCards.length > 0
            ? gameState.communityCards.map((card) => (
                <PlayingCard key={`${card.suit}-${card.rank}`} card={card} />
              ))
            : [0, 1, 2, 3, 4].map((i) => <PlayingCard key={i} faceDown size="sm" />)}
        </div>
        {showdown && <ShowdownPanel result={showdown} seats={seats} />}
      </div>

      {/* 座位 */}
      {ordered.map(({ seat, display }) => {
        const player = gameState?.players.find((p) => p.id === seat.playerId);
        const isActor = gameState?.actorId === seat.playerId;
        const isDealer = gameState?.dealerSeat === player?.seat;
        const reveal = showdown?.reveals.find((r) => r.playerId === seat.playerId);
        const won = showdown
          ? showdown.pots.reduce(
              (sum, p) => sum + (p.winners.find((w) => w.playerId === seat.playerId)?.amount ?? 0),
              0,
            )
          : undefined;
        const isMe = seat.playerId === myPlayerId;

        return (
          <div
            key={seat.playerId}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={seatPosition(display, n)}
          >
            {isMe && gameState && myHand.length > 0 && (
              <div className="mb-1 flex justify-center gap-1">
                {myHand.map((card, i) => (
                  <PlayingCard key={`${card.suit}-${card.rank}-${i}`} card={card} />
                ))}
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
  );
}
