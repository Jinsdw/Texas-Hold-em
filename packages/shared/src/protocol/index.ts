import type { Card, GamePhase, GameState, PlayerAction, PlayerId } from '../types';

/** 房间内的座位公开信息 */
export interface RoomSeat {
  playerId: PlayerId;
  name: string;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  stack: number;
}

/** 房间公开状态（广播给房间内所有人） */
export interface RoomState {
  id: string;
  name: string;
  hostId: PlayerId;
  seats: RoomSeat[];
  spectatorCount: number;
  /** 是否正在进行手牌 */
  handInPlay: boolean;
  phase: GamePhase;
}

/** 房间大厅列表项 */
export interface RoomSummary {
  id: string;
  name: string;
  playerCount: number;
  spectatorCount: number;
  handInPlay: boolean;
}

/** 客户端 → 服务端 */
export type ClientMessage =
  /** 首次连接：注册游客身份，服务端签发 playerId + token（重连凭据） */
  | { type: 'register'; name: string }
  /** 账号注册并登录：绑定 users 行身份（筹码持久化） */
  | { type: 'authRegister'; username: string; password: string }
  | { type: 'authLogin'; username: string; password: string }
  /** 断线重连：携带既有 playerId + token 恢复会话 */
  | { type: 'reconnect'; playerId: PlayerId; token: string }
  | { type: 'listRooms' }
  | { type: 'createRoom'; name: string }
  | { type: 'joinRoom'; roomId: string; asSpectator?: boolean }
  | { type: 'leaveRoom' }
  | { type: 'setReady'; ready: boolean }
  /** 房主开始/继续（下一手） */
  | { type: 'startGame' }
  | { type: 'playerAction'; action: PlayerAction }
  | { type: 'ping' };

/** 服务端 → 客户端 */
export type ServerMessage =
  | { type: 'registered'; playerId: PlayerId; token: string }
  | { type: 'authOk'; playerId: PlayerId; token: string; name: string; chips: number }
  | { type: 'roomList'; rooms: RoomSummary[] }
  | { type: 'roomState'; room: RoomState }
  | { type: 'gameState'; state: GameState }
  /** 仅发给对应玩家：本手底牌 */
  | { type: 'yourHand'; cards: Card[] }
  /** 行动被拒绝时的提示 */
  | { type: 'error'; code: string; message: string }
  | { type: 'pong' };

export const CLIENT_MESSAGE_TYPES = [
  'register',
  'authRegister',
  'authLogin',
  'reconnect',
  'listRooms',
  'createRoom',
  'joinRoom',
  'leaveRoom',
  'setReady',
  'startGame',
  'playerAction',
  'ping',
] as const;

export function isClientMessage(value: unknown): value is ClientMessage {
  if (typeof value !== 'object' || value === null) return false;
  const t = (value as { type?: unknown }).type;
  return typeof t === 'string' && (CLIENT_MESSAGE_TYPES as readonly string[]).includes(t);
}
