import type { Card } from './card';

/** 牌型等级，数值越大越强 */
export enum HandRank {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
  RoyalFlush = 9,
}

/**
 * 手牌评估结果（M2 评估器返回）。
 * tiebreakers 为从高到低的决胜值序列，逐位比较，全部相等即平分底池。
 */
export interface HandEvaluation {
  readonly rank: HandRank;
  readonly tiebreakers: readonly number[];
  /** 参与比较的最佳 5 张牌 */
  readonly bestFive: readonly Card[];
}
