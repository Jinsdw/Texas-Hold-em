import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** 注册用户（登录后获得持久筹码） */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  chips: integer('chips').notNull().default(1000),
  createdAt: integer('created_at').notNull(),
});

/** 登录会话（token → 用户；断线重连也用同一 token） */
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: integer('created_at').notNull(),
});

/** 一场对局（从房间第一手开始到房间解散） */
export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull(),
  playerCount: integer('player_count').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
});

/** 单手牌记录 */
export const hands = sqliteTable('hands', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull(),
  handNumber: integer('hand_number').notNull(),
  potTotal: integer('pot_total').notNull(),
  /** ShowdownResult JSON（含各池赢家与摊牌信息） */
  resultJson: text('result_json').notNull(),
  createdAt: integer('created_at').notNull(),
});

export type User = typeof users.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Hand = typeof hands.$inferSelect;
