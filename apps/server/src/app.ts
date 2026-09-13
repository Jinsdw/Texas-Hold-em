import { Hono } from 'hono';
import type { AuthService } from './auth/service';

/** 构建 Hono 应用（与监听解耦，便于单元测试）；传入 authService 时启用账号 REST 路由 */
export function createApp(authService?: AuthService) {
  const app = new Hono();

  app.get('/health', (c) =>
    c.json({
      status: 'ok',
      service: 'holdem-server',
      timestamp: new Date().toISOString(),
    }),
  );

  if (authService) {
    app.post('/api/register', async (c) => {
      const body = await c.req.json<{ username?: string; password?: string }>().catch(() => null);
      if (!body?.username || !body?.password) {
        return c.json({ error: '需要 username 与 password' }, 400);
      }
      const result = authService.register(body.username, body.password);
      return 'error' in result ? c.json(result, 400) : c.json(result);
    });

    app.post('/api/login', async (c) => {
      const body = await c.req.json<{ username?: string; password?: string }>().catch(() => null);
      if (!body?.username || !body?.password) {
        return c.json({ error: '需要 username 与 password' }, 400);
      }
      const result = authService.login(body.username, body.password);
      return 'error' in result ? c.json(result, 400) : c.json(result);
    });
  }

  return app;
}
