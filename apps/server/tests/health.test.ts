import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('GET /health', () => {
  it('返回 200 与 ok 状态', async () => {
    const res = await createApp().request('/health');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      status: 'ok',
      service: 'holdem-server',
    });
  });
});
