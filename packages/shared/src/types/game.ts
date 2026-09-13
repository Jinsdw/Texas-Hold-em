import type { Card } from './card';
import type { HandEvaluation } from './hand';
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
  smallBlind: number;
  bigBlind: number;
  ante: number;
}

/** 单个池（主池/边池）的摊牌结算 */
export interface ShowdownPotResult {
  amount: number;
  eligibleIds: PlayerId[];
  winners: { playerId: PlayerId; amount: number }[];
}

/** 摊牌时公开的单个玩家手牌信息 */
export interface ShowdownReveal {
  playerId: PlayerId;
  cards: Card[];
  evaluation: HandEvaluation;
}

export interface ShowdownResult {
  pots: ShowdownPotResult[];
  reveals: ShowdownReveal[];
  /** true 表示其余玩家全部弃牌，未进入摊牌比较 */
  foldWin: boolean;
}

/**
 * 服务端权威的游戏状态快照（不含任何私有信息：底牌与牌堆在服务端内部）。
 * 客户端收到的是本结构的浅拷贝；引擎在服务端克隆体上原位更新。
 */
export interface GameState {
  /** 第几手牌（从 1 开始） */
  handNumber: number;
  phase: GamePhase;
  players: Player[];
  /** 公共牌（未发出的阶段为空数组） */
  communityCards: Card[];
  /** 本手牌所有玩家累计投入（= 主池 + 边池总额） */
  pot: number;
  /** 当前下注轮的最高投注 */
  currentBet: number;
  /** 最小加注增量 */
  minimumRaise: number;
  /** 当前应行动的玩家；null 表示无人在等待行动 */
  actorId: PlayerId | null;
  /** 庄家按钮所在座位 */
  dealerSeat: number;
  blinds: BlindStructure;
  /** 本手牌的动作日志（按时间序） */
  actionLog: PlayerAction[];
  /** 摊牌结果（仅 phase = showdown 时非空） */
  showdownResult: ShowdownResult | null;
}
