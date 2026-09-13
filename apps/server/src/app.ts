import { Hono } from 'hono';

/** 构建 Hono 应用（与监听解耦，便于单元测试） */
export function createApp() {
  const app = new Hono();

  app.get('/health', (c) =>
    c.json({
      status: 'ok',
      service: 'holdem-server',
      timestamp: new Date().toISOString(),
    }),
  );

  return app;
}
