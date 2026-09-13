import { describe, expect, it } from 'vitest';
import type { Card } from '@holdem/shared';
import { createDeck, shuffle } from './deck';
import { seededRng } from './rng';

function cardKey(c: Card): string {
  return `${c.suit}-${c.rank}`;
}

describe('createDeck', () => {
  it('生成 52 张不重复的牌', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map(cardKey)).size).toBe(52);
  });

  it('覆盖全部花色与点数', () => {
    const deck = createDeck();
    expect(new Set(deck.map((c) => c.suit)).size).toBe(4);
    expect(new Set(deck.map((c) => c.rank)).size).toBe(13);
  });
});

describe('shuffle（Fisher-Yates）', () => {
  it('不修改入参数组', () => {
    const deck = createDeck();
    const before = deck.map(cardKey).join(',');
    shuffle(deck, seededRng(1));
    expect(deck.map(cardKey).join(',')).toBe(before);
  });

  it('相同种子产生相同排列（可重放调试）', () => {
    const a = shuffle(createDeck(), seededRng(42));
    const b = shuffle(createDeck(), seededRng(42));
    expect(a.map(cardKey)).toEqual(b.map(cardKey));
  });

  it('是原牌组的一个排列（不丢牌不重牌）', () => {
    const shuffled = shuffle(createDeck(), seededRng(7));
    expect(new Set(shuffled.map(cardKey)).size).toBe(52);
    expect(shuffled).toHaveLength(52);
  });

  it('充分打散：与原序相比位置变动明显', () => {
    const original = createDeck();
    const shuffled = shuffle(original, seededRng(123));
    const moved = shuffled.filter((c, i) => cardKey(c) !== cardKey(original[i] as Card));
    // 52 张牌完全不变的概率约 1/52!，固定种子下验证足够多牌已移动
    expect(moved.length).toBeGreaterThan(40);
  });
});
