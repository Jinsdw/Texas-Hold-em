import { useConnectionStore } from './stores/connectionStore';

export default function App() {
  const status = useConnectionStore((state) => state.status);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-emerald-950 text-white">
      <h1 className="text-4xl font-bold tracking-wide">Texas Hold&apos;em</h1>
      <p className="mt-3 text-emerald-200">M1 脚手架已就绪，等待牌桌 UI（M4）</p>
      <p className="mt-6 rounded-full bg-emerald-900 px-4 py-1.5 text-sm text-emerald-100">
        服务器连接状态：<span className="font-semibold">{status}</span>
      </p>
    </main>
  );
}
