import type { Card, Suit } from '@holdem/shared';

const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

function rankLabel(rank: number): string {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md';
}

export function PlayingCard({ card, faceDown = false, size = 'md' }: PlayingCardProps) {
  const dims = size === 'sm' ? 'h-12 w-9 text-base' : 'h-16 w-12 text-xl';

  if (faceDown || !card) {
    return (
      <div
        className={`${dims} flex items-center justify-center rounded-md border border-emerald-800 bg-emerald-900 shadow`}
      >
        <span className="text-emerald-600">◆</span>
      </div>
    );
  }

  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <div
      className={`${dims} flex flex-col items-center justify-center rounded-md border border-slate-300 bg-white font-bold leading-none shadow ${
        red ? 'text-red-600' : 'text-slate-900'
      }`}
    >
      <span>{rankLabel(card.rank)}</span>
      <span className="mt-0.5">{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}
