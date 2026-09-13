import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { openDatabase } from './index';
import { users } from './schema';

function tempDbPath(): string {
  return join(mkdtempSync(join(tmpdir(), 'holdem-test-')), 'test.db');
}

describe('数据库层', () => {
  it('建表幂等（重复打开不报错）', () => {
    const path = tempDbPath();
    expect(() => {
      openDatabase(path);
      openDatabase(path);
    }).not.toThrow();
  });

  it('users 表写入与唯一约束', () => {
    const db = openDatabase(tempDbPath());
    const now = Date.now();
    db.insert(users)
      .values({
        id: 'u1',
        username: 'alice',
        passwordHash: 'h',
        salt: 's',
        chips: 1000,
        createdAt: now,
      })
      .run();

    const row = db.select().from(users).where(eq(users.id, 'u1')).get();
    expect(row?.username).toBe('alice');
    expect(row?.chips).toBe(1000);

    expect(() =>
      db
        .insert(users)
        .values({
          id: 'u2',
          username: 'alice',
          passwordHash: 'h',
          salt: 's',
          chips: 0,
          createdAt: now,
        })
        .run(),
    ).toThrow();
  });

  it('筹码更新持久化', () => {
    const path = tempDbPath();
    const db = openDatabase(path);
    db.insert(users)
      .values({
        id: 'u1',
        username: 'bob',
        passwordHash: 'h',
        salt: 's',
        chips: 1000,
        createdAt: Date.now(),
      })
      .run();
    db.update(users).set({ chips: 1250 }).where(eq(users.id, 'u1')).run();

    const reopened = openDatabase(path);
    expect(reopened.select().from(users).where(eq(users.id, 'u1')).get()?.chips).toBe(1250);
  });
});
