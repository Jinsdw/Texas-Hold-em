import type { Player, PlayerStatus } from '@holdem/shared';
import { describe, expect, it } from 'vitest';
import { buildPots } from './pots';

function player(id: string, totalContribution: number, status: PlayerStatus = 'all-in'): Player {
  return {
    id,
    name: id,
    seat: 0,
    stack: 0,
    betThisRound: 0,
    totalContribution,
    status,
    isConnected: true,
  };
}

describe('buildPots 边池切分', () => {
  it('无投入时返回空', () => {
    expect(buildPots([])).toEqual([]);
    expect(buildPots([player('a', 0, 'active')])).toEqual([]);
  });

  it('人人等额：单一主池', () => {
    const pots = buildPots([player('a', 100), player('b', 100), player('c', 100)]);
    expect(pots).toEqual([{ amount: 300, eligibleIds: ['a', 'b', 'c'] }]);
  });

  it('经典三级 all-in：A500 B300 C100', () => {
    const pots = buildPots([player('a', 500), player('b', 300), player('c', 100)]);
    expect(pots).toEqual([
      { amount: 300, eligibleIds: ['a', 'b', 'c'] }, // 主池：各 100
      { amount: 400, eligibleIds: ['a', 'b'] }, // 边池 1：A/B 各再 200
      { amount: 200, eligibleIds: ['a'] }, // 边池 2：仅 A
    ]);
    expect(pots.reduce((s, p) => s + p.amount, 0)).toBe(900);
  });

  it('弃牌者的投入仍计入池中但无资格领取', () => {
    const pots = buildPots([player('folder', 200, 'folded'), player('a', 200), player('b', 100)]);
    expect(pots).toEqual([
      { amount: 300, eligibleIds: ['a', 'b'] }, // 主池 100×3，folder 无资格，b 有资格
      { amount: 200, eligibleIds: ['a'] }, // folder 与 a 的第二个 100
    ]);
    // a 拿到全部 500（folder 的钱由 a 赢走）
    expect(pots.reduce((s, p) => s + p.amount, 0)).toBe(500);
  });

  it('中间弃牌不切断层级', () => {
    const pots = buildPots([
      player('a', 400),
      player('b', 400),
      player('c', 150, 'folded'),
      player('d', 150),
    ]);
    expect(pots).toEqual([
      { amount: 600, eligibleIds: ['a', 'b', 'd'] }, // 150×4
      { amount: 500, eligibleIds: ['a', 'b'] }, // (400-150)×2
    ]);
    expect(pots.reduce((s, p) => s + p.amount, 0)).toBe(1100);
  });
});
