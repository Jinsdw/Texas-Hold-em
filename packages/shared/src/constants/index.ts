import type { Rank, Suit } from '../types/card';

/** 全部花色 */
export const SUITS: readonly Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

/** 全部点数（2–14） */
export const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/** 每位玩家手牌数 */
export const HAND_CARD_COUNT = 2;

/** 公共牌总数 */
export const COMMUNITY_CARD_COUNT = 5;

/** 最佳手牌张数 */
export const BEST_FIVE_COUNT = 5;

/** 默认初始筹码 */
export const DEFAULT_INITIAL_STACK = 1000;

/** 默认盲注结构 */
export const DEFAULT_BLINDS = { smallBlind: 10, bigBlind: 20, ante: 0 } as const;

/** 一桌人数限制 */
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 9;
