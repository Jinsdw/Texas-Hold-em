import type { PlayerId } from './player';

/**
 * 玩家意图（discriminated union）。
 * 客户端只发送意图，合法性由服务端裁决。
 */
export type PlayerAction =
  | { readonly type: 'fold'; readonly playerId: PlayerId }
  | { readonly type: 'check'; readonly playerId: PlayerId }
  | { readonly type: 'call'; readonly playerId: PlayerId }
  /** amount 为"加注到"的本轮总额（不是增量），且不超过自身筹码即为 all-in */
  | { readonly type: 'raise'; readonly playerId: PlayerId; readonly amount: number }
  | { readonly type: 'all-in'; readonly playerId: PlayerId };

export type PlayerActionType = PlayerAction['type'];
