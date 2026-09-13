import type { ServerMessage } from '@holdem/shared';
import { isClientMessage } from '@holdem/shared';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { Server as HttpServer } from 'node:http';
import type { WebSocketServer } from 'ws';
import type WebSocket from 'ws';
import type { AuthService } from '../auth/service';
import type { RoomManager } from '../rooms/manager';

interface SocketContext {
  ws: WebSocket;
  /** 完成 register/reconnect 后才有 playerId */
  playerId: string | null;
}

/**
 * WebSocket 消息分发层：解析协议 → 调用 RoomManager → 由 manager 通过 Connection 回发。
 */
export function setupWebSocketHandlers(
  server: HttpServer,
  wss: WebSocketServer,
  manager: RoomManager,
  authService?: AuthService,
): void {
  const contexts = new WeakMap<WebSocket, SocketContext>();

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (request.url !== '/ws') {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    const ctx: SocketContext = { ws, playerId: null };
    contexts.set(ws, ctx);

    ws.on('message', (data) => {
      handleMessage(ctx, data.toString());
    });

    ws.on('close', () => {
      if (ctx.playerId) manager.disconnect(ctx.playerId);
      contexts.delete(ws);
    });

    ws.on('error', () => {
      // 关闭流程会随后触发 close；此处仅防止未处理异常
    });
  });

  function handleMessage(ctx: SocketContext, raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      send(ctx, { type: 'error', code: 'BAD_JSON', message: '消息不是合法 JSON' });
      return;
    }
    if (!isClientMessage(parsed)) {
      send(ctx, { type: 'error', code: 'UNKNOWN_TYPE', message: '未知消息类型' });
      return;
    }

    const conn = {
      send(message: ServerMessage) {
        send(ctx, message);
      },
    };

    switch (parsed.type) {
      case 'register': {
        const name = parsed.name.trim().slice(0, 20) || '玩家';
        const identity = manager.register(name, conn);
        ctx.playerId = identity.playerId;
        return;
      }
      case 'authRegister':
      case 'authLogin': {
        if (!authService) {
          send(ctx, { type: 'error', code: 'AUTH_UNAVAILABLE', message: '账号功能未启用' });
          return;
        }
        const result =
          parsed.type === 'authRegister'
            ? authService.register(parsed.username, parsed.password)
            : authService.login(parsed.username, parsed.password);
        if ('error' in result) {
          send(ctx, { type: 'error', code: 'AUTH_FAILED', message: result.error });
          return;
        }
        manager.bindUser(result.userId, result.name, result.token, result.chips, conn);
        ctx.playerId = result.userId;
        conn.send({
          type: 'authOk',
          playerId: result.userId,
          token: result.token,
          name: result.name,
          chips: result.chips,
        });
        return;
      }
      case 'reconnect': {
        const ok = manager.reconnect(parsed.playerId, parsed.token, conn);
        if (ok) ctx.playerId = parsed.playerId;
        return;
      }
      case 'ping': {
        send(ctx, { type: 'pong' });
        return;
      }
    }

    // 以下消息要求已完成注册
    if (!ctx.playerId) {
      send(ctx, { type: 'error', code: 'NOT_REGISTERED', message: '请先注册' });
      return;
    }

    switch (parsed.type) {
      case 'listRooms': {
        conn.send({ type: 'roomList', rooms: manager.listRooms() });
        return;
      }
      case 'createRoom': {
        manager.createRoom(ctx.playerId, parsed.name.trim().slice(0, 30) || '牌局');
        return;
      }
      case 'joinRoom': {
        manager.joinRoom(ctx.playerId, parsed.roomId, parsed.asSpectator ?? false);
        return;
      }
      case 'leaveRoom': {
        manager.leaveRoom(ctx.playerId);
        return;
      }
      case 'setReady': {
        manager.setReady(ctx.playerId, parsed.ready);
        return;
      }
      case 'startGame': {
        manager.startGame(ctx.playerId);
        return;
      }
      case 'playerAction': {
        manager.playerAction(ctx.playerId, parsed.action);
        return;
      }
    }
  }

  function send(ctx: SocketContext, message: ServerMessage): void {
    if (ctx.ws.readyState === ctx.ws.OPEN) {
      ctx.ws.send(JSON.stringify(message));
    }
  }
}
