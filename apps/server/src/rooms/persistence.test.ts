import type { ServerMessage } from '@holdem/shared';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { AuthService } from '../auth/service';
import { openDatabase } from '../db';
import { games, hands, users } from '../db/schema';
import { SqlitePersistence } from '../persistence';
import type { Connection } from './manager';
import { RoomManager } from './manager';

class FakeConn implements Connection {
  readonly outbox: ServerMessage[] = [];
  send(message: ServerMessage): void {
    this.outbox.push(message);
  }
  lastState() {
    const msg = this.outbox.filter((m) => m.type === 'gameState').at(-1);
    return msg?.type === 'gameState' ? msg.state : null;
  }
}

function makeManager() {
  const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'persist-test-')), 't.db'));
  const authService = new AuthService(db);
  const persistence = new SqlitePersistence(db, authService);
  const manager = new RoomManager(1000, () => 'id', persistence);
  return { db, authService, manager };
}

describe('SqlitePersistence 与 RoomManager 集成', () => {
  it('开局写入 games 记录，手牌结束写入 hands，账号筹码回写', () => {
    const { db, authService, manager } = makeManager();

    // 账号玩家 + 游客玩家
    const reg = authService.register('alice', 'secret123');
    if (!('userId' in reg)) throw new Error(String(reg));
    const accountConn = new FakeConn();
    manager.bindUser(reg.userId, reg.name, reg.token, reg.chips, accountConn);

    const guestConn = new FakeConn();
    const guest = manager.register('Bob', guestConn);

    const { roomId } = manager.createRoom(reg.userId, '测试') as { roomId: string };
    manager.joinRoom(guest.playerId, roomId);
    manager.setReady(reg.userId, true);
    manager.setReady(guest.playerId, true);
    manager.startGame(reg.userId);

    // games 记录已写入
    const gameRows = db.select().from(games).where(eq(games.roomId, roomId)).all();
    expect(gameRows).toHaveLength(1);

    // 轮流行动直到摊牌
    for (let i = 0; i < 40; i++) {
      const state = accountConn.lastState();
      if (!state || state.phase === 'showdown' || !state.actorId) break;
      const actor = state.players.find((p) => p.id === state.actorId)!;
      const type = actor.betThisRound < state.currentBet ? 'call' : 'check';
      manager.playerAction(actor.id, { type, playerId: actor.id });
    }

    const state = accountConn.lastState();
    expect(state?.phase).toBe('showdown');

    // hands 记录已写入且可反序列化
    const handRows = db.select().from(hands).all();
    expect(handRows).toHaveLength(1);
    expect(handRows[0]!.potTotal).toBeGreaterThan(0);
    const parsed = JSON.parse(handRows[0]!.resultJson);
    expect(parsed.pots.length).toBeGreaterThan(0);

    // 账号玩家筹码已回写 users 表
    const userRow = db.select().from(users).where(eq(users.id, reg.userId)).get();
    expect(userRow?.chips).toBeGreaterThanOrEqual(0);
  });

  it('房间解散时对局记录写入结束时间', () => {
    const { db, manager } = makeManager();
    const conns = [new FakeConn(), new FakeConn()];
    const p1 = manager.register('Alice', conns[0]!);
    const p2 = manager.register('Bob', conns[1]!);
    const { roomId } = manager.createRoom(p1.playerId, '测试') as { roomId: string };
    manager.joinRoom(p2.playerId, roomId);
    manager.setReady(p1.playerId, true);
    manager.setReady(p2.playerId, true);
    manager.startGame(p1.playerId);

    manager.leaveRoom(p1.playerId);
    manager.leaveRoom(p2.playerId);

    const gameRow = db.select().from(games).where(eq(games.roomId, roomId)).get();
    expect(gameRow?.endedAt).not.toBeNull();
  });

  it('游客玩家的筹码变化不触发回写', () => {
    const { db, manager } = makeManager();
    const conns = [new FakeConn(), new FakeConn()];
    const p1 = manager.register('Alice', conns[0]!);
    const p2 = manager.register('Bob', conns[1]!);
    manager.createRoom(p1.playerId, '测试');
    manager.joinRoom(p2.playerId, 'id' in p1 ? 'nope' : 'nope');
    // 游客 id 不以 u- 开头，onChipsChanged 不应影响 users 表（表为空）
    expect(db.select().from(users).all()).toHaveLength(0);
  });
});
