import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../db';
import { AuthService } from './service';

function makeService(): AuthService {
  return new AuthService(openDatabase(join(mkdtempSync(join(tmpdir(), 'auth-test-')), 't.db')));
}

describe('AuthService', () => {
  it('注册 → 登录返回一致的用户与筹码', () => {
    const svc = makeService();
    const reg = svc.register('alice', 'secret123');
    if (!('userId' in reg)) throw new Error(String(reg));
    expect(reg.chips).toBe(1000);

    const login = svc.login('alice', 'secret123');
    if (!('userId' in login)) throw new Error(String(login));
    expect(login).toMatchObject({ userId: reg.userId, chips: 1000 });
    // token 每次会话独立
    expect(login.token).not.toBe(reg.token);
  });

  it('错误密码被拒绝', () => {
    const svc = makeService();
    svc.register('bob', 'secret123');
    expect(svc.login('bob', 'wrong!')).toEqual({ error: '用户名或密码错误' });
    expect(svc.login('nobody', 'secret123')).toEqual({ error: '用户名或密码错误' });
  });

  it('用户名重复与非法输入被拒绝', () => {
    const svc = makeService();
    expect(svc.register('carol', 'secret123')).toHaveProperty('userId');
    expect(svc.register('carol', 'other123')).toEqual({ error: '用户名已被占用' });
    expect(svc.register('a', 'secret123')).toEqual({ error: '用户名需 2–20 个字符' });
    expect(svc.register('dave', '12345')).toEqual({ error: '密码至少 6 位' });
  });

  it('updateChips 持久化筹码', () => {
    const svc = makeService();
    const reg = svc.register('erin', 'secret123');
    if (!('userId' in reg)) throw new Error(String(reg));
    svc.updateChips(reg.userId, 1600);
    const login = svc.login('erin', 'secret123');
    expect(login).toMatchObject({ chips: 1600 });
  });
});
