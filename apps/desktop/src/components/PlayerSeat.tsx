import { HandRank } from '@holdem/shared';
import type { Card, Player, RoomSeat, ShowdownResult } from '@holdem/shared';
import { PlayingCard } from './PlayingCard';

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
}

const STATUS_LABEL: Record<string, string> = {
  waiting: '',
  active: '',
  folded: '已弃牌',
  'all-in': '全下',
  eliminated: '出局',
};

export function PlayerSeat({ seat, player, isActor, isMe, revealCards, revealRank, wonAmount }: PlayerSeatProps) {
  const statusLabel = player ? STATUS_LABEL[player.status] ?? '' : '';

  return (
    <div
      className={`w-36 rounded-xl border px-3 py-2 text-center shadow-lg transition-colors ${
        isActor
          ? 'border-amber-400 bg-emerald-800 ring-2 ring-amber-400'
          : isMe
            ? 'border-emerald-500 bg-emerald-900'
            : 'border-emerald-800 bg-emerald-950'
      } ${seat.connected ? '' : 'opacity-40'}`}
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
          {revealCards.map((card, i) => (
            <PlayingCard key={`${card.suit}-${card.rank}-${i}`} card={card} size="sm" />
          ))}
        </div>
      )}
      {revealRank !== undefined && (
        <div className="mt-1 text-xs font-semibold text-emerald-300">{HAND_RANK_LABEL[revealRank]}</div>
      )}
      {wonAmount !== undefined && wonAmount > 0 && (
        <div className="mt-0.5 text-xs font-bold text-amber-300">+{wonAmount}</div>
      )}
    </div>
  );
}

/** 椭圆座位坐标（百分比）：index=0 固定在底部（即“我”的位置），其余顺时针排开 */
export function seatPosition(index: number, total: number): { left: string; top: string } {
  const angle = (index / total) * Math.PI * 2 + Math.PI / 2;
  return {
    left: `${50 + 42 * Math.cos(angle)}%`,
    top: `${50 + 40 * Math.sin(angle)}%`,
  };
}

export function ShowdownPanel({
  result,
  seats,
}: {
  result: ShowdownResult;
  seats: RoomSeat[];
}) {
  const nameOf = (id: string) => seats.find((s) => s.playerId === id)?.name ?? id;
  if (result.foldWin) {
    const winner = result.pots[0]?.winners[0];
    return (
      <div className="rounded-lg bg-black/50 px-4 py-2 text-center text-sm text-emerald-200">
        {winner ? `其余玩家弃牌，${nameOf(winner.playerId)} 赢得 ${winner.amount} 底池` : '手牌结束'}
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
