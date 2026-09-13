import { describe, expect, it } from 'vitest';
import {
  BEST_FIVE_COUNT,
  COMMUNITY_CARD_COUNT,
  HAND_CARD_COUNT,
  MAX_PLAYERS,
  MIN_PLAYERS,
  RANKS,
  SUITS,
} from './index';

describe('扑克常量', () => {
  it('4 种花色 × 13 种点数 = 52 张牌', () => {
    expect(SUITS).toHaveLength(4);
    expect(RANKS).toHaveLength(13);
    expect(SUITS.length * RANKS.length).toBe(52);
  });

  it('点数范围从 2（最小）到 14（A）且无重复', () => {
    expect(RANKS[0]).toBe(2);
    expect(RANKS.at(-1)).toBe(14);
    expect(new Set(RANKS).size).toBe(13);
  });

  it('发牌数量符合德州扑克规则', () => {
    expect(HAND_CARD_COUNT).toBe(2);
    expect(COMMUNITY_CARD_COUNT).toBe(5);
    expect(BEST_FIVE_COUNT).toBe(5);
  });

  it('同桌人数限制为 2–9 人', () => {
    expect(MIN_PLAYERS).toBe(2);
    expect(MAX_PLAYERS).toBe(9);
    expect(MIN_PLAYERS).toBeLessThan(MAX_PLAYERS);
  });
});
