import type { ServerMessage } from '@holdem/shared';
import { describe, expect, it } from 'vitest';
import type { Connection } from './manager';
import { RoomManager } from './manager';

/** 收集全部下发消息的假连接 */
class FakeConn implements Connection {
  readonly outbox: ServerMessage[] = [];
  send(message: ServerMessage): void {
    this.outbox.push(message);
  }
  ofType<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }>[] {
    return this.outbox.filter((m): m is Extract<ServerMessage, { type: T }> => m.type === type);
  }
  last(): ServerMessage | undefined {
    return this.outbox.at(-1);
  }
}

interface Player {
  id: string;
  token: string;
  conn: FakeConn;
}

function setup(playerCount = 2, stack = 1000): { manager: RoomManager; players: Player[] } {
  // 固定 genId：房间 id / token 可预测（r1, r2...），通过递增计数器
  let seq = 0;
  const manager = new RoomManager(stack, () => `id${++seq}`);
  const players: Player[] = [];
  for (let i = 0; i < playerCount; i++) {
    const conn = new FakeConn();
    const identity = manager.register(`玩家${i}`, conn);
    players.push({ id: identity.playerId, token: identity.token, conn });
  }
  return { manager, players };
}

function createAndJoin(manager: RoomManager, players: Player[], spectator = false): string {
  const host = players[0]!;
  const { roomId } = manager.createRoom(host.id, '测试房') as { roomId: string };
  for (const p of players.slice(1)) {
    manager.joinRoom(p.id, roomId, spectator);
  }
  return roomId;
}

describe('注册与身份', () => {
  it('register 签发 playerId/token 并下发 registered', () => {
    const { manager, players } = setup(1);
    const identity = manager.identity(players[0]!.id);
    expect(identity?.token).toBe(players[0]!.token);
    expect(players[0]!.conn.ofType('registered')).toHaveLength(1);
  });

  it('reconnect 凭据正确恢复连接并重发状态', () => {
    const { manager, players } = setup(2);
    const roomId = createAndJoin(manager, players);
    manager.setReady(players[0]!.id, true);
    manager.setReady(players[1]!.id, true);
    manager.startGame(players[0]!.id);

    // 断线
    manager.disconnect(players[1]!.id);
    expect(
      players[0]!.conn
        .ofType('roomState')
        .at(-1)!
        .room.seats.find((s) => s.playerId === players[1]!.id)!.connected,
    ).toBe(false);

    // 重连：新连接，重发 roomState/gameState/yourHand
    const newConn = new FakeConn();
    expect(manager.reconnect(players[1]!.id, players[1]!.token, newConn)).toBe(true);
    expect(newConn.ofType('roomState').length).toBeGreaterThan(0);
    expect(newConn.ofType('gameState').length).toBeGreaterThan(0);
    expect(newConn.ofType('yourHand')[0]!.cards).toHaveLength(2);
    expect(roomId).toBeTruthy();
  });

  it('reconnect 凭据错误被拒绝', () => {
    const { manager, players } = setup(1);
    const newConn = new FakeConn();
    expect(manager.reconnect(players[0]!.id, 'wrong-token', newConn)).toBe(false);
    expect(newConn.last()).toMatchObject({ type: 'error', code: 'RECONNECT_FAILED' });
  });
});

describe('房间生命周期', () => {
  it('创建/加入/离开与房主转移', () => {
    const { manager, players } = setup(3);
    const roomId = createAndJoin(manager, players);
    expect(manager.listRooms()).toEqual([
      { id: roomId, name: '测试房', playerCount: 3, spectatorCount: 0, handInPlay: false },
    ]);

    manager.leaveRoom(players[0]!.id); // host 离开
    const roomState = players[1]!.conn.ofType('roomState').at(-1)!.room;
    expect(roomState.hostId).toBe(players[1]!.id);
    expect(roomState.seats.some((s) => s.playerId === players[0]!.id)).toBe(false);
  });

  it('观众不占座位且计入 spectatorCount', () => {
    const { manager, players } = setup(3);
    const roomId = createAndJoin(manager, players.slice(0, 2));
    manager.joinRoom(players[2]!.id, roomId, true);
    expect(manager.listRooms()[0]).toMatchObject({ playerCount: 2, spectatorCount: 1 });
  });

  it('最后一个玩家离开后房间删除', () => {
    const { manager, players } = setup(1);
    createAndJoin(manager, players);
    manager.leaveRoom(players[0]!.id);
    expect(manager.listRooms()).toEqual([]);
  });
});

describe('游戏流程', () => {
  it('未全部就绪时开局被拒绝', () => {
    const { manager, players } = setup(2);
    createAndJoin(manager, players);
    manager.setReady(players[0]!.id, true);
    const result = manager.startGame(players[0]!.id);
    expect(result).toEqual({ error: expect.stringContaining('等待就绪') });
  });

  it('开局广播 gameState 并私发底牌', () => {
    const { manager, players } = setup(2);
    createAndJoin(manager, players);
    manager.setReady(players[0]!.id, true);
    manager.setReady(players[1]!.id, true);
    expect(manager.startGame(players[0]!.id)).toEqual({ ok: true });

    for (const p of players) {
      const hand = p.conn.ofType('yourHand').at(-1)!;
      expect(hand.cards).toHaveLength(2);
      const state = p.conn.ofType('gameState').at(-1)!.state;
      expect(state.phase).toBe('pre-flop');
      // 筹码守恒：各家 stack + 底池 = 初始总量（盲注已入池）
      const total = state.players.reduce((sum, sp) => sum + sp.stack, 0);
      expect(total + state.pot).toBe(2000);
    }
  });

  it('非房主不能开局', () => {
    const { manager, players } = setup(2);
    createAndJoin(manager, players);
    manager.setReady(players[0]!.id, true);
    manager.setReady(players[1]!.id, true);
    expect(manager.startGame(players[1]!.id)).toEqual({ error: '只有房主可以开始游戏' });
  });

  it('玩家行动推进游戏状态，非法行动下发 error', () => {
    const { manager, players } = setup(2);
    createAndJoin(manager, players);
    manager.setReady(players[0]!.id, true);
    manager.setReady(players[1]!.id, true);
    manager.startGame(players[0]!.id);

    // 找到当前行动者，发 fold；另一人跟随 fold 到剩一人
    let state = players[0]!.conn.ofType('gameState').at(-1)!.state;
    const actor = state.actorId!;
    const actorPlayer = players.find((p) => p.id === actor)!;
    const other = players.find((p) => p.id !== actor)!;
    manager.playerAction(actor, { type: 'call', playerId: actor });
    state = other.conn.ofType('gameState').at(-1)!.state;
    expect(state.actionLog).toHaveLength(1);
    expect(state.pot).toBeGreaterThan(0);

    // 非 actor 行动 → error
    manager.playerAction(actor, { type: 'check', playerId: actor });
    expect(actorPlayer.conn.ofType('error').at(-1)).toMatchObject({
      type: 'error',
      code: 'ACTION_REJECTED',
    });

    // 另一人 fold → 只剩一人 → showdown（foldWin）
    manager.playerAction(other.id, { type: 'fold', playerId: other.id });
    state = other.conn.ofType('gameState').at(-1)!.state;
    expect(state.phase).toBe('showdown');
    expect(state.showdownResult?.foldWin).toBe(true);
  });

  it('手牌结束后房主可开下一手', () => {
    const { manager, players } = setup(2);
    createAndJoin(manager, players);
    manager.setReady(players[0]!.id, true);
    manager.setReady(players[1]!.id, true);
    manager.startGame(players[0]!.id);

    let state = players[0]!.conn.ofType('gameState').at(-1)!.state;
    const actor = state.actorId!;
    const other = players.find((p) => p.id !== actor)!;
    manager.playerAction(actor, { type: 'call', playerId: actor });
    manager.playerAction(other.id, { type: 'fold', playerId: other.id });

    // 就绪状态在开局后保留？—— 重置为未就绪应由前端重新 ready；此处直接设置
    manager.setReady(players[0]!.id, true);
    manager.setReady(players[1]!.id, true);
    expect(manager.startGame(players[0]!.id)).toEqual({ ok: true });
    state = players[0]!.conn.ofType('gameState').at(-1)!.state;
    expect(state.handNumber).toBe(2);
  });
});
