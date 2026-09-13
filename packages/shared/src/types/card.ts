/** 花色 */
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

/**
 * 点数：2–10 为面值，11=J，12=Q，13=K，14=A。
 * 用数字便于 M2 手牌评估器直接比较大小。
 */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

/** 一张牌 */
export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
}
