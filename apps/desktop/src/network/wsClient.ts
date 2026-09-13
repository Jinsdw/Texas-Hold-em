import type { Card, ClientMessage, PlayerAction, ServerMessage } from '@holdem/shared';
import { useConnectionStore } from '../stores/connectionStore';
import { useGameStore } from '../stores/gameStore';

const STORAGE_KEY = 'holdem-identity';

/**
 * 游戏服务器 WebSocket 客户端。
 * - 连接成功后自动用本地保存的身份重连（playerId + token）
 - 凭据失效时清空身份回大厅
 * - 断线后指数退避自动重连
 */
class WsClient {
  private ws: WebSocket | null = null;
  private attempts = 0;
  private manuallyClosed = false;
  private errorTimer: ReturnType<typeof setTimeout> | null = null;

  connect(url = 'ws://localhost:3000/ws'): void {
    this.manuallyClosed = false;
    this.closeSocket();
    useConnectionStore.getState().setStatus('connecting');

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.attempts = 0;
      const identity = useConnectionStore.getState().identity;
      if (identity) {
        this.sendRaw({
          type: 'reconnect',
          playerId: identity.playerId,
          token: identity.token,
        });
      }
      useConnectionStore.getState().setStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        this.handleMessage(JSON.parse(event.data as string) as ServerMessage);
      } catch {
        // 忽略非 JSON 消息
      }
    };

    ws.onclose = () => {
      useConnectionStore.getState().setStatus('disconnected');
      if (!this.manuallyClosed) {
        this.scheduleReconnect(url);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  disconnect(): void {
    this.manuallyClosed = true;
    this.closeSocket();
    useConnectionStore.getState().setStatus('disconnected');
  }

  // ---------- 身份 ----------

  register(name: string): void {
    this.pendingName = name;
    this.send({ type: 'register', name });
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    useConnectionStore.getState().setIdentity(null);
    useGameStore.getState().reset();
  }

  // ---------- 房间指令 ----------

  listRooms(): void {
    this.send({ type: 'listRooms' });
  }

  createRoom(name: string): void {
    this.send({ type: 'createRoom', name });
  }

  joinRoom(roomId: string, spectator = false): void {
    useGameStore.getState().setSpectator(spectator);
    this.send({ type: 'joinRoom', roomId, asSpectator: spectator });
  }

  leaveRoom(): void {
    this.send({ type: 'leaveRoom' });
  }

  setReady(ready: boolean): void {
    this.send({ type: 'setReady', ready });
  }

  startGame(): void {
    this.send({ type: 'startGame' });
  }

  playerAction(action: PlayerAction): void {
    this.send({ type: 'playerAction', action });
  }

  // ---------- 内部 ----------

  private send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private sendRaw(message: ClientMessage): void {
    this.send(message);
  }

  private handleMessage(message: ServerMessage): void {
    const game = useGameStore.getState();
    const conn = useConnectionStore.getState();
    switch (message.type) {
      case 'registered': {
        const name = this.pendingName ?? conn.identity?.name ?? '玩家';
        const identity = { playerId: message.playerId, token: message.token, name };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
        conn.setIdentity(identity);
        this.pendingName = null;
        break;
      }
      case 'roomState': {
        game.setRoom(message.room);
        break;
      }
      case 'roomList': {
        game.setRooms(message.rooms);
        break;
      }
      case 'gameState': {
        game.setGameState(message.state);
        break;
      }
      case 'yourHand': {
        game.setMyHand(message.cards as Card[]);
        break;
      }
      case 'error': {
        // 重连凭据失效：清空本地身份，用户需重新注册
        if (message.code === 'RECONNECT_FAILED') {
          conn.setIdentity(null);
          useGameStore.getState().reset();
        }
        game.setError(message.message);
        if (this.errorTimer) clearTimeout(this.errorTimer);
        this.errorTimer = setTimeout(() => game.setError(null), 4000);
        break;
      }
      case 'pong':
        break;
    }
  }

  private pendingName: string | null = null;

  private scheduleReconnect(url: string): void {
    this.attempts += 1;
    const delay = Math.min(1000 * 2 ** Math.min(this.attempts, 5), 30_000);
    setTimeout(() => {
      if (!this.manuallyClosed) this.connect(url);
    }, delay);
  }

  private closeSocket(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      try {
        this.ws.close();
      } catch {
        // 已关闭
      }
      this.ws = null;
    }
  }
}

export const wsClient = new WsClient();
