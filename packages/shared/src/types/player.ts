export type PlayerId = string;

/** 玩家在一手牌内的状态 */
export type PlayerStatus =
  | 'waiting' // 等待下一手开始
  | 'active' // 在手中，可行动
  | 'folded' // 已弃牌
  | 'all-in' // 已全下，不再参与下注
  | 'eliminated'; // 筹码为 0，出局

/**
 * 玩家（服务端权威视角）。
 * 结构约定为可变：服务端引擎在状态克隆上原位更新，客户端只读展示。
 */
export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  /** 座位号，从 0 开始 */
  readonly seat: number;
  /** 当前筹码量 */
  stack: number;
  /** 当前下注轮内已投入的筹码 */
  betThisRound: number;
  /** 本手牌内累计投入（边池计算依据） */
  totalContribution: number;
  status: PlayerStatus;
  /** WebSocket 连接状态（断线重连用） */
  isConnected: boolean;
}
