import type { Player, PlayerId } from '@holdem/shared';

/** 一个可争夺的底池（主池或边池） */
export interface Pot {
  readonly amount: number;
  /** 有资格赢取此池的玩家（未弃牌且投入达到该池门槛） */
  readonly eligibleIds: readonly PlayerId[];
}

/**
 * 按玩家累计投入切分主池与边池。
 * 前提：贡献值已经过"无人跟注退还"处理（同一最高档位至多一名未弃牌玩家）。
 */
export function buildPots(players: readonly Player[]): Pot[] {
  const contributing = players.filter((p) => p.totalContribution > 0);
  if (contributing.length === 0) {
    return [];
  }

  const levels = [...new Set(contributing.map((p) => p.totalContribution))].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    for (const p of contributing) {
      // 截断到 [prev, level] 区间；投入不足 prev 的玩家在该层贡献 0（不能为负）
      amount += Math.max(0, Math.min(p.totalContribution, level) - prev);
    }
    const eligibleIds = players
      .filter((p) => p.totalContribution >= level && p.status !== 'folded' && p.status !== 'eliminated')
      .map((p) => p.id);
    pots.push({ amount, eligibleIds });
    prev = level;
  }

  // 防御：某层无人可领（正常流程会被 uncalled bet 退还避免）时，金额并入最近的可领取池
  const firstClaimable = pots.findIndex((p) => p.eligibleIds.length > 0);
  if (firstClaimable > 0) {
    let orphans = 0;
    for (let i = 0; i < firstClaimable; i++) {
      orphans += (pots[i] as Pot).amount;
    }
    const target = pots[firstClaimable] as Pot;
    const merged: Pot = { amount: target.amount + orphans, eligibleIds: target.eligibleIds };
    pots.splice(0, firstClaimable + 1, merged);
  }
  // 尾部空池（弃牌者多投、无人可领）并入最后一个可领取池
  const lastClaimable = pots.findLastIndex((p) => p.eligibleIds.length > 0);
  if (lastClaimable !== -1 && lastClaimable < pots.length - 1) {
    let orphans = 0;
    for (let i = lastClaimable + 1; i < pots.length; i++) {
      orphans += (pots[i] as Pot).amount;
    }
    const target = pots[lastClaimable] as Pot;
    const merged: Pot = { amount: target.amount + orphans, eligibleIds: target.eligibleIds };
    pots.splice(lastClaimable, pots.length - lastClaimable, merged);
  }

  return pots;
}
