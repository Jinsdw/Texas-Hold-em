import { create } from 'zustand';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface ConnectionState {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
}

/** 与游戏服务器的 WebSocket 连接状态（M3 接入真实连接） */
export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  setStatus: (status) => set({ status }),
}));
