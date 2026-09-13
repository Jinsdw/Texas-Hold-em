import type { PlayerId, ShowdownPotResult, ShowdownReveal, ShowdownResult } from '@holdem/shared';
import type { TableState } from './engine';
import { compareEvaluations, evaluateBest } from './evaluator';
import { buildPots } from './pots';

/**
 * 摊牌结算：按边池分层比较手牌，平分底池。
 * 余数筹码按"庄家之后座位顺序"分配给前若干名平分赢家。
 * 本函数会修改传入状态（stack 增加、投入清零、pot 归零）。
 */
export function resolveShowdown(state: TableState): ShowdownResult | null {
  const contenders = state.players.filter((p) => p.status === 'active' || p.status === 'all-in');
  if (state.phase !== 'showdown' || contenders.length < 2) {
    return null;
  }

  // 按庄家后座位顺序摊牌（余数分配顺序与此一致）
  const n = state.players.length;
  const orderFromDealer = [...state.players].sort(
    (a, b) =>
      ((a.seat - state.dealerSeat - 1 + 2 * n) % n) -
      ((b.seat - state.dealerSeat - 1 + 2 * n) % n),
  );

  const reveals = new Map<PlayerId, ShowdownReveal>();
  for (const p of orderFromDealer) {
    if (p.status !== 'active' && p.status !== 'all-in') continue;
    const hole = state.hands[p.id] ?? [];
    reveals.set(p.id, {
      playerId: p.id,
      cards: hole,
      evaluation: evaluateBest(hole, state.communityCards),
    });
  }

  const potResults: ShowdownPotResult[] = [];
  for (const pot of buildPots(state.players)) {
    const eligible = pot.eligibleIds
      .map((id) => reveals.get(id))
      .filter((r): r is ShowdownReveal => r !== undefined);
    if (eligible.length === 0) {
      potResults.push({ amount: pot.amount, eligibleIds: [...pot.eligibleIds], winners: [] });
      continue;
    }

    let best = eligible[0] as ShowdownReveal;
    for (const r of eligible) {
      if (compareEvaluations(r.evaluation, best.evaluation) > 0) best = r;
    }
    const winners = eligible.filter((r) => compareEvaluations(r.evaluation, best.evaluation) === 0);

    const share = Math.floor(pot.amount / winners.length);
    const remainder = pot.amount - share * winners.length;
    potResults.push({
      amount: pot.amount,
      eligibleIds: [...pot.eligibleIds],
      winners: winners.map((r, i) => ({
        playerId: r.playerId,
        amount: share + (i < remainder ? 1 : 0),
      })),
    });
  }

  for (const potResult of potResults) {
    for (const w of potResult.winners) {
      const player = state.players.find((p) => p.id === w.playerId);
      if (player) player.stack += w.amount;
    }
  }

  for (const p of state.players) {
    p.totalContribution = 0;
    p.betThisRound = 0;
  }
  state.pot = 0;

  return { pots: potResults, reveals: [...reveals.values()], foldWin: false };
}
