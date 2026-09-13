import { BEST_FIVE_COUNT, HandRank } from '@holdem/shared';
import type { Card, HandEvaluation } from '@holdem/shared';

interface RankGroup {
  readonly rank: number;
  readonly count: number;
}

/** 从 n 张牌中枚举全部 5 张组合（n = 5/6/7，最多 21 组） */
function* combinations5<T>(items: readonly T[]): Generator<T[]> {
  const n = items.length;
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            yield [items[a]!, items[b]!, items[c]!, items[d]!, items[e]!];
          }
        }
      }
    }
  }
}

/** 评估恰好 5 张牌，返回牌型等级与决胜序列 */
export function evaluateFive(cards: readonly Card[]): HandEvaluation {
  if (cards.length !== BEST_FIVE_COUNT) {
    throw new Error(`evaluateFive 需要恰好 5 张牌，收到 ${cards.length} 张`);
  }

  const ranksDesc = cards.map((c) => c.rank).sort((x, y) => y - x);
  const isFlush = cards.every((c) => c.suit === (cards[0] as Card).suit);

  // 顺子检测（A 可作 1：A-5-4-3-2 为 5 高顺子）
  const uniqueRanks = [...new Set(ranksDesc)];
  let straightHigh: number | null = null;
  if (uniqueRanks.length === BEST_FIVE_COUNT) {
    const top = uniqueRanks[0] as number;
    const bottom = uniqueRanks[4] as number;
    if (top - bottom === 4) {
      straightHigh = top;
    } else if (top === 14 && (uniqueRanks[1] as number) === 5 && bottom === 2) {
      straightHigh = 5;
    }
  }

  // 按数量降序、点数降序分组（葫芦/四条/两对的关键）
  const countByRank = new Map<number, number>();
  for (const r of ranksDesc) {
    countByRank.set(r, (countByRank.get(r) ?? 0) + 1);
  }
  const groups: RankGroup[] = [...countByRank.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((x, y) => y.count - x.count || y.rank - x.rank);

  const g0 = groups[0] as RankGroup;
  const g1 = groups[1] as RankGroup;
  const g2 = groups[2] as RankGroup;
  const g3 = groups[3] as RankGroup;

  let rank: HandRank;
  let tiebreakers: number[];
  if (isFlush && straightHigh !== null) {
    rank = straightHigh === 14 ? HandRank.RoyalFlush : HandRank.StraightFlush;
    tiebreakers = [straightHigh];
  } else if (g0.count === 4) {
    rank = HandRank.FourOfAKind;
    tiebreakers = [g0.rank, g1.rank];
  } else if (g0.count === 3 && g1.count === 2) {
    rank = HandRank.FullHouse;
    tiebreakers = [g0.rank, g1.rank];
  } else if (isFlush) {
    rank = HandRank.Flush;
    tiebreakers = ranksDesc;
  } else if (straightHigh !== null) {
    rank = HandRank.Straight;
    tiebreakers = [straightHigh];
  } else if (g0.count === 3) {
    rank = HandRank.ThreeOfAKind;
    tiebreakers = [g0.rank, g1.rank, g2.rank];
  } else if (g0.count === 2 && g1.count === 2) {
    rank = HandRank.TwoPair;
    tiebreakers = [g0.rank, g1.rank, g2.rank];
  } else if (g0.count === 2) {
    rank = HandRank.OnePair;
    tiebreakers = [g0.rank, g1.rank, g2.rank, g3.rank];
  } else {
    rank = HandRank.HighCard;
    tiebreakers = ranksDesc;
  }

  return { rank, tiebreakers, bestFive: [...cards] };
}

/** 从 2 张底牌 + 3~5 张公共牌中选出最佳 5 张 */
export function evaluateBest(hole: readonly Card[], community: readonly Card[]): HandEvaluation {
  const all = [...hole, ...community];
  if (all.length < BEST_FIVE_COUNT || all.length > 7) {
    throw new Error(`evaluateBest 需要 5~7 张牌，收到 ${all.length} 张`);
  }

  let best: HandEvaluation | null = null;
  for (const combo of combinations5(all)) {
    const ev = evaluateFive(combo);
    if (best === null || compareEvaluations(ev, best) > 0) {
      best = ev;
    }
  }
  return best as HandEvaluation;
}

/** 比较两手评估：>0 表示 a 胜，<0 表示 b 胜，0 表示平局（平分底池） */
export function compareEvaluations(a: HandEvaluation, b: HandEvaluation): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  const len = Math.max(a.tiebreakers.length, b.tiebreakers.length);
  for (let i = 0; i < len; i++) {
    const av = a.tiebreakers[i] ?? 0;
    const bv = b.tiebreakers[i] ?? 0;
    if (av !== bv) {
      return av - bv;
    }
  }
  return 0;
}
