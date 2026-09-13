import { serve } from '@hono/node-server';
import type { Server as HttpServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { AuthService } from './auth/service';
import { createApp } from './app';
import { openDatabase } from './db';
import { RoomManager } from './rooms/manager';
import { setupWebSocketHandlers } from './ws/handler';

const db = openDatabase();
const authService = new AuthService(db);
const app = createApp(authService);
const port = Number(process.env.PORT ?? 3000);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[server] HTTP    http://localhost:${info.port}/health`);
  console.log(`[server] API     http://localhost:${info.port}/api/register | /api/login`);
  console.log(`[server] WS      ws://localhost:${info.port}/ws`);
});

// @hono/node-server 的返回类型是含 Http2 的宽联合；未传 override 时实际创建标准 http.Server
createGameServer(server as HttpServer);

export function createGameServer(httpServer: HttpServer): { wss: WebSocketServer; manager: RoomManager } {
  const wss = new WebSocketServer({ noServer: true });
  const manager = new RoomManager();
  setupWebSocketHandlers(httpServer, wss, manager, authService);
  return { wss, manager };
}
