import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Db } from './db';
import { games, hands } from './db/schema';
import { AuthService } from './auth/service';
import type { RoomPersistenceHooks } from './rooms/manager';

/** 持久化钩子的 SQLite 实现：对局/手牌落库，账号玩家筹码回写 users 表 */
export class SqlitePersistence implements RoomPersistenceHooks {
  private gamesByRoom = new Map<string, string>();

  constructor(
    private readonly db: Db,
    private readonly authService?: AuthService,
  ) {}

  onGameStarted(roomId: string, playerCount: number): string {
    const id = randomUUID();
    this.db.insert(games)
      .values({ id, roomId, playerCount, startedAt: Date.now(), endedAt: null })
      .run();
    this.gamesByRoom.set(roomId, id);
    return id;
  }

  onHandFinished(
    _roomId: string,
    gameId: string,
    handNumber: number,
    potTotal: number,
    resultJson: string,
  ): void {
    void _roomId;
    this.db.insert(hands)
      .values({
        id: randomUUID(),
        gameId,
        handNumber,
        potTotal,
        resultJson,
        createdAt: Date.now(),
      })
      .run();
  }

  onChipsChanged(playerId: string, chips: number): void {
    if (!playerId.startsWith('u-')) return;
    this.authService?.updateChips(playerId, chips);
  }

  onGameEnded(roomId: string, gameId: string): void {
    this.gamesByRoom.delete(roomId);
    this.db.update(games)
      .set({ endedAt: Date.now() })
      .where(and(eq(games.id, gameId), eq(games.roomId, roomId)))
      .run();
  }
}
