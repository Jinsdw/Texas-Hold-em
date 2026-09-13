import type { Card } from './card';
import type { Player, PlayerId } from './player';
import type { PlayerAction } from './action';

/** 一手牌的阶段（显式状态机，M2 实现） */
export type GamePhase =
  | 'waiting' // 等待开局
  | 'pre-flop' // 翻牌前
  | 'flop' // 翻牌（3 张公共牌）
  | 'turn' // 转牌（第 4 张）
  | 'river' // 河牌（第 5 张）
  | 'showdown'; // 摊牌

/** 盲注结构 */
export interface BlindStructure {
  readonly smallBlind: number;
  readonly bigBlind: number;
  readonly ante: number;
}

/** 服务端权威的完整游戏状态（客户端视角的裁剪版在 M3 协议中定义） */
export interface GameState {
  /** 第几手牌（从 1 开始） */
  readonly handNumber: number;
  readonly phase: GamePhase;
  readonly players: readonly Player[];
  /** 公共牌（未发出的阶段为空数组） */
  readonly communityCards: readonly Card[];
  /** 主池 + 边池总额 */
  readonly pot: number;
  /** 当前下注轮的最高投注 */
  readonly currentBet: number;
  /** 最小加注增量 */
  readonly minimumRaise: number;
  /** 当前应行动的玩家；null 表示无人在等待行动 */
  readonly actorId: PlayerId | null;
  /** 庄家按钮所在座位 */
  readonly dealerSeat: number;
  readonly blinds: BlindStructure;
  /** 本手牌的动作日志（按时间序） */
  readonly actionLog: readonly PlayerAction[];
}
