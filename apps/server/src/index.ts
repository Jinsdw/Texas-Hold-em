import { serve } from '@hono/node-server';
import type { Server as HttpServer } from 'node:http';
import { createApp } from './app';
import { createWebSocketServer } from './ws/server';

const app = createApp();
const port = Number(process.env.PORT ?? 3000);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[server] HTTP    http://localhost:${info.port}/health`);
  console.log(`[server] WS      ws://localhost:${info.port}/ws`);
});

// @hono/node-server 的返回类型是含 Http2 的宽联合；未传 override 时实际创建标准 http.Server
createWebSocketServer(server as HttpServer);
