import { create } from 'zustand';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface PlayerIdentityInfo {
  playerId: string;
  token: string;
  name: string;
}

const STORAGE_KEY = 'holdem-identity';

function loadIdentity(): PlayerIdentityInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerIdentityInfo;
    if (parsed.playerId && parsed.token && parsed.name) return parsed;
    return null;
  } catch {
    return null;
  }
}

interface ConnectionState {
  status: ConnectionStatus;
  identity: PlayerIdentityInfo | null;
  setStatus: (status: ConnectionStatus) => void;
  setIdentity: (identity: PlayerIdentityInfo | null) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  identity: loadIdentity(),
  setStatus: (status) => set({ status }),
  setIdentity: (identity) => {
    if (identity) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ identity });
  },
}));
