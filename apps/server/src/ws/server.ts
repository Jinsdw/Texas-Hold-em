import type { Server as HttpServer, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer } from 'ws';

const WS_PATH = '/ws';

/**
 * 在既有 HTTP 服务器上挂载 WebSocket（路径 /ws）。
 * M1 仅建立通路（welcome + 回显占位），正式游戏协议在 M3 实现。
 */
export function createWebSocketServer(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (request.url !== WS_PATH) {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'welcome', message: 'connected to holdem server' }));

    ws.on('message', (data) => {
      // M1 占位回显；M3 替换为协议消息分发
      ws.send(JSON.stringify({ type: 'echo', payload: data.toString() }));
    });
  });

  return wss;
}
