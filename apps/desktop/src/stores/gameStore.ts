import type { Card, GameState, RoomState, RoomSummary } from '@holdem/shared';
import { create } from 'zustand';

interface GameStore {
  /** 当前所在房间；null 表示在大厅 */
  room: RoomState | null;
  /** 大厅房间列表 */
  rooms: RoomSummary[];
  gameState: GameState | null;
  /** 仅本客户端可见的底牌 */
  myHand: Card[];
  lastError: string | null;
  spectator: boolean;

  setRoom: (room: RoomState | null) => void;
  setRooms: (rooms: RoomSummary[]) => void;
  setGameState: (state: GameState | null) => void;
  setMyHand: (cards: Card[]) => void;
  setSpectator: (spectator: boolean) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  room: null,
  rooms: [],
  gameState: null,
  myHand: [],
  lastError: null,
  spectator: false,

  setRoom: (room) => set({ room }),
  setRooms: (rooms) => set({ rooms }),
  setGameState: (gameState) => set({ gameState }),
  setMyHand: (myHand) => set({ myHand }),
  setSpectator: (spectator) => set({ spectator }),
  setError: (lastError) => set({ lastError }),
  reset: () => set({ room: null, gameState: null, myHand: [], spectator: false }),
}));
