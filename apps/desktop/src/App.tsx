import { useEffect } from 'react';
import { useConnectionStore } from './stores/connectionStore';
import { useGameStore } from './stores/gameStore';
import { wsClient } from './network/wsClient';
import { LobbyPage } from './pages/LobbyPage';
import { TablePage } from './pages/TablePage';

const WS_URL = 'ws://localhost:3000/ws';

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  connected: { text: '已连接', className: 'bg-emerald-600' },
  connecting: { text: '连接中…', className: 'bg-amber-600' },
  disconnected: { text: '未连接（重连中）', className: 'bg-red-700' },
};

export default function App() {
  const status = useConnectionStore((s) => s.status);
  const room = useGameStore((s) => s.room);
  const lastError = useGameStore((s) => s.lastError);

  useEffect(() => {
    wsClient.connect(WS_URL);
    return () => wsClient.disconnect();
  }, []);

  const badge = STATUS_LABEL[status] ?? STATUS_LABEL.disconnected!;

  return (
    <main className="flex min-h-screen flex-col items-center bg-emerald-950 px-6 py-8 text-white">
      <div className="mb-6 flex w-full max-w-5xl items-center justify-between">
        <h1 className="text-2xl font-bold tracking-wide">
          Texas Hold&apos;em <span className="text-emerald-500">| 德州扑克</span>
        </h1>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
          {badge.text}
        </span>
      </div>

      {lastError && (
        <div className="mb-4 w-full max-w-5xl rounded-lg border border-red-500/50 bg-red-950/60 px-4 py-2 text-sm text-red-200">
          {lastError}
        </div>
      )}

      {room ? <TablePage /> : <LobbyPage />}
    </main>
  );
}
