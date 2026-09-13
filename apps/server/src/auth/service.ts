import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { sessions, users } from '../db/schema';

export type AuthResult =
  { userId: string; token: string; name: string; chips: number } | { error: string };

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex');
}

/**
 * 账号服务：注册 / 登录 / 会话签发。
 * 密码使用 scrypt（每用户独立盐），登录比较使用 timingSafeEqual。
 */
export class AuthService {
  constructor(private readonly db: Db) {}

  register(username: string, password: string): AuthResult {
    const name = username.trim();
    if (name.length < 2 || name.length > 20) {
      return { error: '用户名需 2–20 个字符' };
    }
    if (password.length < 6) {
      return { error: '密码至少 6 位' };
    }
    const existing = this.db.select().from(users).where(eq(users.username, name)).get();
    if (existing) {
      return { error: '用户名已被占用' };
    }

    const salt = randomBytes(16).toString('hex');
    const userId = `u-${randomBytes(6).toString('hex')}`;
    this.db
      .insert(users)
      .values({
        id: userId,
        username: name,
        passwordHash: hashPassword(password, salt),
        salt,
        chips: 1000,
        createdAt: Date.now(),
      })
      .run();
    return this.startSession(userId, name, 1000);
  }

  login(username: string, password: string): AuthResult {
    const row = this.db.select().from(users).where(eq(users.username, username.trim())).get();
    if (!row) return { error: '用户名或密码错误' };

    const attempt = Buffer.from(hashPassword(password, row.salt), 'hex');
    const actual = Buffer.from(row.passwordHash, 'hex');
    if (attempt.length !== actual.length || !timingSafeEqual(attempt, actual)) {
      return { error: '用户名或密码错误' };
    }
    return this.startSession(row.id, row.username, row.chips);
  }

  /** 手牌结束后同步用户筹码 */
  updateChips(userId: string, chips: number): void {
    this.db.update(users).set({ chips }).where(eq(users.id, userId)).run();
  }

  private startSession(userId: string, name: string, chips: number): AuthResult {
    const token = randomBytes(24).toString('hex');
    this.db.insert(sessions).values({ token, userId, createdAt: Date.now() }).run();
    return { userId, token, name, chips };
  }
}
