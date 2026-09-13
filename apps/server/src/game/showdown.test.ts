import { HandRank } from '@holdem/shared';
import type { Card, Rank, Suit } from '@holdem/shared';
import { describe, expect, it } from 'vitest';
import type { TableState } from './engine';
import { createTable } from './engine';
import { resolveShowdown } from './showdown';

const c = (rank: Rank, suit: Suit): Card => ({ rank, suit });
const S: Suit = 'spades';
const H: Suit = 'hearts';
const D: Suit = 'diamonds';
const C: Suit = 'clubs';

interface Spec {
  id: string;
  contribution: number;
  hole: Card[];
  status?: 'active' | 'all-in' | 'folded';
}

function showdownTable(specs: Spec[], community: Card[], dealerSeat = 0): TableState {
  const table = createTable(specs.map((s) => ({ id: s.id, name: s.id, stack: 0 })));
  table.phase = 'showdown';
  table.communityCards = community;
  table.dealerSeat = dealerSeat;
  for (const s of specs) {
    const p = table.players.find((x) => x.id === s.id)!;
    p.totalContribution = s.contribution;
    p.status = s.status ?? 'all-in';
    table.hands[s.id] = s.hole;
  }
  table.pot = specs.reduce((sum, s) => sum + s.contribution, 0);
  return table;
}

describe('resolveShowdown 摊牌结算', () => {
  it('单池：最强牌赢走全部', () => {
    const table = showdownTable(
      [
        { id: 'a', contribution: 100, hole: [c(14, S), c(13, S)] },
        { id: 'b', contribution: 100, hole: [c(2, H), c(3, C)] },
        { id: 'c', contribution: 100, hole: [c(9, D), c(7, D)] },
      ],
      [c(12, S), c(11, S), c(10, S), c(2, D), c(5, H)],
    );
    const result = resolveShowdown(table)!;
    expect(result.foldWin).toBe(false);
    expect(result.pots).toEqual([
      { amount: 300, eligibleIds: ['a', 'b', 'c'], winners: [{ playerId: 'a', amount: 300 }] },
    ]);
    expect(table.players.find((p) => p.id === 'a')!.stack).toBe(300);
    expect(table.pot).toBe(0);
    // a 摊牌为皇家同花顺
    expect(result.reveals.find((r) => r.playerId === 'a')!.evaluation.rank).toBe(
      HandRank.RoyalFlush,
    );
  });

  it('真正平分：两家都是公共牌构成的一对', () => {
    const table = showdownTable(
      [
        { id: 'a', contribution: 100, hole: [c(3, S), c(4, S)] },
        { id: 'b', contribution: 100, hole: [c(3, H), c(4, H)] },
      ],
      [c(9, D), c(9, C), c(13, D), c(6, H), c(11, C)],
    );
    const result = resolveShowdown(table)!;
    // 公共牌对 9：两家都是 9,9,A,K,J → 平分
    expect(result.pots[0]!.winners).toEqual([
      { playerId: 'a', amount: 100 },
      { playerId: 'b', amount: 100 },
    ]);
  });

  it('奇数底池余数按庄家后座位分配', () => {
    // a/b 各 100、弃牌者 x 101 → x 多投的 1 无人可领，防御性并入主池 301
    // 301 平分为 150+150 余 1，庄家后的 a 拿 151
    const table = showdownTable(
      [
        { id: 'a', contribution: 100, hole: [c(3, S), c(4, S)] },
        { id: 'b', contribution: 100, hole: [c(3, H), c(4, H)] },
        { id: 'x', contribution: 101, hole: [c(2, C), c(5, D)], status: 'folded' },
      ],
      [c(9, D), c(9, C), c(13, D), c(6, H), c(11, C)],
      0,
    );
    const result = resolveShowdown(table)!;
    expect(result.pots).toEqual([
      {
        amount: 301,
        eligibleIds: ['a', 'b'],
        winners: [
          { playerId: 'a', amount: 151 },
          { playerId: 'b', amount: 150 },
        ],
      },
    ]);
  });

  it('边池分层：各自拿回对应层级的钱', () => {
    const table = showdownTable(
      [
        // c 皇家同花顺赢主池；a 高牌 A-8 赢两个边池；b 高牌 A-7 输
        { id: 'a', contribution: 500, hole: [c(9, H), c(8, H)] },
        { id: 'b', contribution: 300, hole: [c(7, D), c(6, D)] },
        { id: 'c', contribution: 100, hole: [c(10, S), c(11, S)] },
      ],
      [c(14, S), c(13, S), c(12, S), c(2, H), c(3, D)],
    );
    const result = resolveShowdown(table)!;
    expect(result.pots).toEqual([
      { amount: 300, eligibleIds: ['a', 'b', 'c'], winners: [{ playerId: 'c', amount: 300 }] },
      { amount: 400, eligibleIds: ['a', 'b'], winners: [{ playerId: 'a', amount: 400 }] },
      { amount: 200, eligibleIds: ['a'], winners: [{ playerId: 'a', amount: 200 }] },
    ]);
    expect(table.players.find((p) => p.id === 'a')!.stack).toBe(600);
    expect(table.players.find((p) => p.id === 'b')!.stack).toBe(0);
    expect(table.players.find((p) => p.id === 'c')!.stack).toBe(300);
  });

  it('未到摊牌阶段返回 null', () => {
    const table = showdownTable(
      [
        { id: 'a', contribution: 100, hole: [c(3, S), c(4, S)] },
        { id: 'b', contribution: 100, hole: [c(3, H), c(4, H)] },
      ],
      [c(9, D), c(9, C), c(13, D), c(6, H), c(11, C)],
    );
    table.phase = 'river';
    expect(resolveShowdown(table)).toBeNull();
  });
});
