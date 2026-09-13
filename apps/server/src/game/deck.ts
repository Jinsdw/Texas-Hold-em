import { RANKS, SUITS } from '@holdem/shared';
import type { Card } from '@holdem/shared';
import type { Rng } from './rng';

/** 生成一副按花色×点数有序的 52 张牌 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/** Fisher-Yates 洗牌：返回新数组，不修改入参 */
export function shuffle(deck: readonly Card[], rng: Rng = Math.random): Card[] {
  const out = [...deck];
  for (let i = out.length - 1; i >= 1; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i] as Card;
    out[i] = out[j] as Card;
    out[j] = tmp;
  }
  return out;
}
