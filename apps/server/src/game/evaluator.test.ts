import { HandRank } from '@holdem/shared';
import type { Card, Rank, Suit } from '@holdem/shared';
import { describe, expect, it } from 'vitest';
import { compareEvaluations, evaluateBest, evaluateFive } from './evaluator';

const c = (rank: Rank, suit: Suit): Card => ({ rank, suit });
const S: Suit = 'spades';
const H: Suit = 'hearts';
const D: Suit = 'diamonds';
const C: Suit = 'clubs';

describe('evaluateFive 各牌型判定', () => {
  it('皇家同花顺', () => {
    const ev = evaluateFive([c(10, S), c(11, S), c(12, S), c(13, S), c(14, S)]);
    expect(ev.rank).toBe(HandRank.RoyalFlush);
    expect(ev.tiebreakers).toEqual([14]);
  });

  it('同花顺（9 高）', () => {
    const ev = evaluateFive([c(5, H), c(6, H), c(7, H), c(8, H), c(9, H)]);
    expect(ev.rank).toBe(HandRank.StraightFlush);
    expect(ev.tiebreakers).toEqual([9]);
  });

  it('四条', () => {
    const ev = evaluateFive([c(9, S), c(9, H), c(9, D), c(9, C), c(2, S)]);
    expect(ev.rank).toBe(HandRank.FourOfAKind);
    expect(ev.tiebreakers).toEqual([9, 2]);
  });

  it('葫芦', () => {
    const ev = evaluateFive([c(3, S), c(3, H), c(3, D), c(13, C), c(13, S)]);
    expect(ev.rank).toBe(HandRank.FullHouse);
    expect(ev.tiebreakers).toEqual([3, 13]);
  });

  it('同花', () => {
    const ev = evaluateFive([c(14, D), c(12, D), c(9, D), c(5, D), c(3, D)]);
    expect(ev.rank).toBe(HandRank.Flush);
    expect(ev.tiebreakers).toEqual([14, 12, 9, 5, 3]);
  });

  it('顺子（A-5 轮子，5 高）', () => {
    const ev = evaluateFive([c(14, S), c(5, H), c(4, D), c(3, C), c(2, S)]);
    expect(ev.rank).toBe(HandRank.Straight);
    expect(ev.tiebreakers).toEqual([5]);
  });

  it('顺子（10-A，A 高）', () => {
    const ev = evaluateFive([c(10, S), c(11, H), c(12, D), c(13, C), c(14, S)]);
    expect(ev.rank).toBe(HandRank.Straight);
    expect(ev.tiebreakers).toEqual([14]);
  });

  it('三条', () => {
    const ev = evaluateFive([c(7, S), c(7, H), c(7, D), c(6, C), c(2, S)]);
    expect(ev.rank).toBe(HandRank.ThreeOfAKind);
    expect(ev.tiebreakers).toEqual([7, 6, 2]);
  });

  it('两对', () => {
    const ev = evaluateFive([c(8, S), c(8, H), c(5, D), c(5, C), c(13, S)]);
    expect(ev.rank).toBe(HandRank.TwoPair);
    expect(ev.tiebreakers).toEqual([8, 5, 13]);
  });

  it('一对', () => {
    const ev = evaluateFive([c(6, S), c(6, H), c(12, D), c(9, C), c(2, S)]);
    expect(ev.rank).toBe(HandRank.OnePair);
    expect(ev.tiebreakers).toEqual([6, 12, 9, 2]);
  });

  it('高牌', () => {
    const ev = evaluateFive([c(14, S), c(12, H), c(9, D), c(6, C), c(2, S)]);
    expect(ev.rank).toBe(HandRank.HighCard);
    expect(ev.tiebreakers).toEqual([14, 12, 9, 6, 2]);
  });

  it('张数不符时抛错', () => {
    expect(() => evaluateFive([c(2, S), c(3, S)])).toThrow(/5 张/);
  });
});

describe('evaluateBest 7 选 5', () => {
  it('从 7 张中找到皇家同花顺（弃掉干扰牌）', () => {
    const ev = evaluateBest(
      [c(14, S), c(13, S)],
      [c(12, S), c(11, S), c(10, S), c(2, H), c(3, D)],
    );
    expect(ev.rank).toBe(HandRank.RoyalFlush);
    expect(ev.bestFive).toHaveLength(5);
    expect(ev.bestFive.every((card) => card.suit === S)).toBe(true);
  });

  it('公共牌打法：最佳五张不含手牌', () => {
    // 公共牌本身构成 K 高同花顺，手牌再大也不参与
    const ev = evaluateBest(
      [c(14, H), c(14, S)],
      [c(9, C), c(10, C), c(11, C), c(12, C), c(13, C)],
    );
    expect(ev.rank).toBe(HandRank.StraightFlush);
    expect(ev.tiebreakers).toEqual([13]);
    expect(ev.bestFive.every((card) => card.suit === C)).toBe(true);
  });

  it('6 张场景（4 张公共牌）也能评估', () => {
    const ev = evaluateBest([c(14, H), c(13, H)], [c(12, H), c(11, H), c(10, H), c(2, S)]);
    expect(ev.rank).toBe(HandRank.RoyalFlush);
    expect(ev.tiebreakers).toEqual([14]);
  });

  it('张数不合法时抛错', () => {
    expect(() => evaluateBest([c(2, S), c(3, S)], [])).toThrow();
  });
});

describe('compareEvaluations 比较与平局', () => {
  it('牌型等级直接分胜负', () => {
    const flush = evaluateFive([c(2, D), c(5, D), c(7, D), c(9, D), c(11, D)]);
    const straight = evaluateFive([c(4, S), c(5, H), c(6, D), c(7, C), c(8, S)]);
    expect(compareEvaluations(flush, straight)).toBeGreaterThan(0);
    expect(compareEvaluations(straight, flush)).toBeLessThan(0);
  });

  it('同型比 kicker', () => {
    const pairA = evaluateFive([c(9, S), c(9, H), c(13, D), c(6, C), c(2, S)]);
    const pairB = evaluateFive([c(9, D), c(9, C), c(12, D), c(8, C), c(3, S)]);
    expect(compareEvaluations(pairA, pairB)).toBeGreaterThan(0);
  });

  it('完全相同点数为平局（花色不参与比较）', () => {
    const a = evaluateFive([c(9, S), c(9, H), c(13, D), c(6, C), c(2, S)]);
    const b = evaluateFive([c(9, D), c(9, C), c(13, H), c(6, H), c(2, H)]);
    expect(compareEvaluations(a, b)).toBe(0);
  });

  it('轮子顺子输给 6 高顺子', () => {
    const wheel = evaluateFive([c(14, S), c(5, H), c(4, D), c(3, C), c(2, S)]);
    const six = evaluateFive([c(6, S), c(5, H), c(4, D), c(3, C), c(2, S)]);
    expect(compareEvaluations(wheel, six)).toBeLessThan(0);
  });

  it('葫芦之间比三条部分', () => {
    const a = evaluateFive([c(3, S), c(3, H), c(3, D), c(13, C), c(13, S)]);
    const b = evaluateFive([c(2, S), c(2, H), c(2, D), c(14, C), c(14, S)]);
    expect(compareEvaluations(a, b)).toBeGreaterThan(0);
  });
});
