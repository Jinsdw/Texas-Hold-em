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

/** 卡片尺寸（牌面与牌背共用，动画组件依赖统一尺寸） */
export const CARD_DIMS: Record<'sm' | 'md', string> = {
  sm: 'h-12 w-9 text-base',
  md: 'h-16 w-12 text-xl',
};

/** 牌背（对手底牌 / 发牌动画 / 翻牌起始面） */
export function CardBack({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <div
      className={`${CARD_DIMS[size]} flex items-center justify-center rounded-md border border-emerald-800 bg-emerald-900 shadow`}
    >
      <span className="text-emerald-600">◆</span>
    </div>
  );
}

/** 牌面（dim 用于摊牌时输家的未参与牌） */
export function CardFace({
  card,
  size = 'md',
  dim = false,
}: {
  card: Card;
  size?: 'sm' | 'md';
  dim?: boolean;
}) {
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <div
      className={`${CARD_DIMS[size]} flex flex-col items-center justify-center rounded-md border border-slate-300 bg-white font-bold leading-none shadow ${
        red ? 'text-red-600' : 'text-slate-900'
      } ${dim ? 'opacity-60' : ''}`}
    >
      <span>{rankLabel(card.rank)}</span>
      <span className="mt-0.5">{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md';
}

export function PlayingCard({ card, faceDown = false, size = 'md' }: PlayingCardProps) {
  if (faceDown || !card) return <CardBack size={size} />;
  return <CardFace card={card} size={size} />;
}
