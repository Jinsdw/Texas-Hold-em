import type { PlayerAction, RoomState, RoomSummary, ServerMessage } from '@holdem/shared';
import { DEFAULT_INITIAL_STACK, MAX_PLAYERS, MIN_PLAYERS } from '@holdem/shared';
import type { TableState } from '../game/engine';
import { applyAction, createTable, startHand, toPublicState } from '../game/engine';

/** 连接抽象：RoomManager 不直接依赖 ws */
export interface Connection {
  send(message: ServerMessage): void;
}

interface PlayerIdentity {
  playerId: string;
  token: string;
  name: string;
  roomId: string | null;
  conn: Connection | null;
}

export interface RoomPlayer {
  playerId: string;
  name: string;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  /** 观众不占座位、不发手牌 */
  spectator: boolean;
  stack: number;
  conn: Connection | null;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  players: Map<string, RoomPlayer>;
  table: TableState | null;
  handInPlay: boolean;
  /** 当前对局记录 id（首手开启时由持久层生成） */
  gameId: string | null;
}

/** 持久化钩子：RoomManager 在关键节点回调，具体落库由实现方负责 */
export interface RoomPersistenceHooks {
  /** 一场对局开始（table.handNumber === 1 时）；返回 game 记录 id */
  onGameStarted(roomId: string, playerCount: number): string;
  /** 一手牌结束（进入 showdown，含 foldWin） */
  onHandFinished(
    roomId: string,
    gameId: string,
    handNumber: number,
    potTotal: number,
    resultJson: string,
  ): void;
  /** 账号玩家筹码变化 */
  onChipsChanged(playerId: string, chips: number): void;
  /** 对局结束（房间解散） */
  onGameEnded(roomId: string, gameId: string): void;
}

/**
 * 房间与游戏流程管理（不含 IO：连接通过 Connection 抽象注入）。
 * 流程：register → createRoom/joinRoom → setReady → startGame → playerAction 循环 → showdown → startGame 下一手。
 */
export class RoomManager {
  private rooms = new Map<string, Room>();
  private identities = new Map<string, PlayerIdentity>();
  private seq = 0;

  constructor(
    private readonly initialStack: number = DEFAULT_INITIAL_STACK,
    private readonly genId: () => string = () => Math.random().toString(36).slice(2, 8),
    private readonly hooks?: RoomPersistenceHooks,
  ) {}

  // ---------- 身份与连接 ----------

  register(name: string, conn: Connection): PlayerIdentity {
    const playerId = `p${++this.seq}-${this.genId()}`;
    const identity: PlayerIdentity = {
      playerId,
      token: this.genId() + this.genId(),
      name,
      roomId: null,
      conn,
    };
    this.identities.set(playerId, identity);
    conn.send({ type: 'registered', playerId, token: identity.token });
    return identity;
  }

  /** 断线重连：校验 token，恢复连接并重发房间/游戏状态与底牌 */
  reconnect(playerId: string, token: string, conn: Connection): boolean {
    const identity = this.identities.get(playerId);
    if (!identity || identity.token !== token) {
      conn.send({ type: 'error', code: 'RECONNECT_FAILED', message: '重连凭据无效' });
      return false;
    }
    identity.conn = conn;

    const room = identity.roomId ? this.rooms.get(identity.roomId) : undefined;
    if (!room) return true;

    const player = room.players.get(playerId);
    if (!player) return true;
    player.conn = conn;
    player.connected = true;

    conn.send({ type: 'roomState', room: this.buildRoomState(room) });
    const table = room.table;
    if (table) {
      conn.send({ type: 'gameState', state: toPublicState(table) });
      if (!player.spectator) {
        const hand = table.hands[playerId];
        if (hand) conn.send({ type: 'yourHand', cards: hand });
      }
    }
    this.sendRoomState(room);
    return true;
  }

  disconnect(playerId: string): void {
    const identity = this.identities.get(playerId);
    const room = identity?.roomId ? this.rooms.get(identity.roomId) : undefined;
    const player = room?.players.get(playerId);
    if (!room || !player) return;
    player.conn = null;
    player.connected = false;
    this.sendRoomState(room);
  }

  identity(playerId: string): PlayerIdentity | undefined {
    return this.identities.get(playerId);
  }

  /** 账号登录后绑定持久身份（playerId 来自 users 表，初始筹码为用户当前筹码） */
  bindUser(playerId: string, name: string, token: string, stack: number, conn: Connection): void {
    this.identities.set(playerId, { playerId, token, name, roomId: null, conn });
  }

  // ---------- 房间 ----------

  listRooms(): RoomSummary[] {
    return [...this.rooms.values()].map((room) => ({
      id: room.id,
      name: room.name,
      playerCount: this.seated(room).length,
      spectatorCount: this.spectators(room).length,
      handInPlay: room.handInPlay,
    }));
  }

  createRoom(playerId: string, name: string): { roomId: string } | { error: string } {
    const identity = this.identities.get(playerId);
    if (!identity) return { error: '未注册' };
    if (identity.roomId) this.leaveRoom(playerId);

    const room: Room = {
      id: this.genId(),
      name,
      hostId: playerId,
      players: new Map(),
      table: null,
      handInPlay: false,
      gameId: null,
    };
    room.players.set(playerId, this.makePlayer(identity, { isHost: true }));
    this.rooms.set(room.id, room);
    identity.roomId = room.id;
    this.sendRoomState(room);
    return { roomId: room.id };
  }

  joinRoom(playerId: string, roomId: string, spectator = false): { error: string } | { ok: true } {
    const room = this.rooms.get(roomId);
    const identity = this.identities.get(playerId);
    if (!room) return { error: '房间不存在' };
    if (!identity) return { error: '未注册' };
    if (identity.roomId === roomId) return { ok: true };
    if (identity.roomId) this.leaveRoom(playerId);

    if (!spectator && this.seated(room).length >= MAX_PLAYERS) {
      return { error: '房间已满' };
    }

    identity.roomId = roomId;
    room.players.set(playerId, this.makePlayer(identity, { spectator }));
    this.sendRoomState(room);
    return { ok: true };
  }

  leaveRoom(playerId: string): void {
    const identity = this.identities.get(playerId);
    const room = identity?.roomId ? this.rooms.get(identity.roomId) : undefined;
    if (!identity?.roomId || !room) return;

    const wasHost = room.hostId === playerId;
    room.players.delete(playerId);
    identity.roomId = null;

    if (room.players.size === 0) {
      if (room.gameId) {
        this.hooks?.onGameEnded(room.id, room.gameId);
      }
      this.rooms.delete(room.id);
      return;
    }
    if (wasHost) {
      const nextHost = this.seated(room)[0] ?? this.spectators(room)[0];
      if (nextHost) {
        nextHost.isHost = true;
        room.hostId = nextHost.playerId;
      }
    }
    this.sendRoomState(room);
  }

  // ---------- 游戏流程 ----------

  setReady(playerId: string, ready: boolean): void {
    const { room, player } = this.locate(playerId);
    if (!room || !player || player.spectator) return;
    player.ready = ready;
    this.sendRoomState(room);
  }

  startGame(playerId: string): { error: string } | { ok: true } {
    const { room, player } = this.locate(playerId);
    if (!room || !player) return { error: '不在房间中' };
    if (room.hostId !== playerId) return { error: '只有房主可以开始游戏' };
    if (room.handInPlay) return { error: '手牌正在进行中' };

    const seated = this.seated(room);
    if (seated.length < MIN_PLAYERS) {
      return { error: `至少需要 ${MIN_PLAYERS} 名玩家` };
    }
    const notReady = seated.filter((p) => !p.ready);
    if (notReady.length > 0) {
      return { error: `等待就绪：${notReady.map((p) => p.name).join('、')}` };
    }

    const table = createTable(
      seated.map((p) => ({ id: p.playerId, name: p.name, stack: p.stack })),
    );
    // 延续上一手的庄家位置与手数（庄家轮转、handNumber 递增）
    if (room.table) {
      table.handNumber = room.table.handNumber;
      table.dealerSeat = room.table.dealerSeat;
    }
    room.table = startHand(table);
    room.handInPlay = true;
    if (room.table.handNumber === 1) {
      room.gameId = this.hooks?.onGameStarted(room.id, seated.length) ?? null;
    }
    this.afterStateChanged(room);
    return { ok: true };
  }

  playerAction(playerId: string, action: PlayerAction): void {
    const { room, player } = this.locate(playerId);
    if (!room || !player || !room.table || !room.handInPlay) {
      this.sendError(player, '当前不可行动');
      return;
    }
    if (action.playerId !== playerId) {
      this.sendError(player, '不能代替他人行动');
      return;
    }

    const result = applyAction(room.table, action);
    if (result.error) {
      this.sendError(player, result.error);
      return;
    }
    room.table = result.state;
    if (result.state.phase === 'showdown') {
      room.handInPlay = false;
      this.recordHand(room);
      this.syncStacks(room);
    }
    this.afterStateChanged(room);
  }

  // ---------- 内部 ----------

  private makePlayer(
    identity: PlayerIdentity,
    opts: { isHost?: boolean; spectator?: boolean } = {},
  ): RoomPlayer {
    return {
      playerId: identity.playerId,
      name: identity.name,
      isHost: opts.isHost ?? false,
      ready: false,
      connected: true,
      spectator: opts.spectator ?? false,
      stack: this.initialStack,
      conn: identity.conn,
    };
  }

  private seated(room: Room): RoomPlayer[] {
    return [...room.players.values()].filter((p) => !p.spectator);
  }

  private spectators(room: Room): RoomPlayer[] {
    return [...room.players.values()].filter((p) => p.spectator);
  }

  private locate(playerId: string): { room: Room | null; player: RoomPlayer | null } {
    const identity = this.identities.get(playerId);
    const room = identity?.roomId ? (this.rooms.get(identity.roomId) ?? null) : null;
    const player = room?.players.get(playerId) ?? null;
    return { room, player };
  }

  private sendError(player: RoomPlayer | null, message: string): void {
    player?.conn?.send({ type: 'error', code: 'ACTION_REJECTED', message });
  }

  /** 手牌结束：写入记录（ potTotal = 各池金额之和，此时 state.pot 已清零） */
  private recordHand(room: Room): void {
    const result = room.table?.showdownResult;
    if (!result || !room.gameId) return;
    const potTotal = result.pots.reduce((sum, p) => sum + p.amount, 0);
    this.hooks?.onHandFinished(
      room.id,
      room.gameId,
      room.table!.handNumber,
      potTotal,
      JSON.stringify(result),
    );
  }

  private syncStacks(room: Room): void {
    const table = room.table;
    if (!table) return;
    for (const p of table.players) {
      const rp = room.players.get(p.id);
      if (rp) {
        rp.stack = p.stack;
        if (rp.playerId.startsWith('u-')) {
          this.hooks?.onChipsChanged(rp.playerId, p.stack);
        }
      }
    }
  }

  /** 状态变化：房间状态广播 + 游戏状态广播 + 私发底牌 */
  private afterStateChanged(room: Room): void {
    this.sendRoomState(room);
    const table = room.table;
    if (!table) return;

    this.broadcast(room, { type: 'gameState', state: toPublicState(table) });
    for (const p of room.players.values()) {
      if (p.spectator || !p.conn) continue;
      const hand = table.hands[p.playerId];
      if (hand) p.conn.send({ type: 'yourHand', cards: hand });
    }
  }

  private sendRoomState(room: Room): void {
    this.broadcast(room, { type: 'roomState', room: this.buildRoomState(room) });
  }

  private buildRoomState(room: Room): RoomState {
    return {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      seats: this.seated(room).map((p) => ({
        playerId: p.playerId,
        name: p.name,
        isHost: p.isHost,
        ready: p.ready,
        connected: p.connected,
        stack: p.stack,
      })),
      spectatorCount: this.spectators(room).length,
      handInPlay: room.handInPlay,
      phase: room.table?.phase ?? 'waiting',
    };
  }

  private broadcast(room: Room, message: ServerMessage, exceptPlayerId?: string): void {
    for (const p of room.players.values()) {
      if (exceptPlayerId && p.playerId === exceptPlayerId) continue;
      p.conn?.send(message);
    }
  }
}
