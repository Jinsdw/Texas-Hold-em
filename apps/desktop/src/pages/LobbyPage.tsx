import { useEffect, useState } from 'react';
import { useConnectionStore } from '../stores/connectionStore';
import { useGameStore } from '../stores/gameStore';
import { wsClient } from '../network/wsClient';

/** 大厅：游客昵称 或 账号注册/登录 → 房间列表 / 创建 / 加入 */
export function LobbyPage() {
  const identity = useConnectionStore((s) => s.identity);
  const rooms = useGameStore((s) => s.rooms);
  const lastError = useGameStore((s) => s.lastError);
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (identity) wsClient.listRooms();
  }, [identity, rooms.length === 0]);

  if (!identity) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-5">
        <h2 className="text-2xl font-bold">进入牌局</h2>

        <div className="flex w-full rounded-xl border border-emerald-800 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${
              mode === 'login' ? 'bg-emerald-700' : 'text-emerald-400'
            }`}
          >
            账号登录
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${
              mode === 'register' ? 'bg-emerald-700' : 'text-emerald-400'
            }`}
          >
            注册新账号
          </button>
        </div>

        <form
          className="flex w-full flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === 'register') wsClient.authRegister(username, password);
            else wsClient.authLogin(username, password);
          }}
        >
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="用户名"
            maxLength={20}
            className="rounded-lg border border-emerald-700 bg-emerald-950 px-3 py-2 text-center outline-none focus:border-emerald-400"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码（至少 6 位）"
            type="password"
            maxLength={64}
            className="rounded-lg border border-emerald-700 bg-emerald-950 px-3 py-2 text-center outline-none focus:border-emerald-400"
          />
          <button type="submit" className="rounded-lg bg-emerald-600 py-2 font-semibold hover:bg-emerald-500">
            {mode === 'register' ? '注册并进入' : '登录'}
          </button>
        </form>

        {lastError && <p className="text-sm text-red-400">{lastError}</p>}

        <div className="flex w-full items-center gap-3 text-xs text-emerald-600">
          <span className="h-px flex-1 bg-emerald-800" />
          或以游客身份
          <span className="h-px flex-1 bg-emerald-800" />
        </div>

        <form
          className="flex w-full gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) wsClient.register(name.trim());
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="昵称"
            maxLength={20}
            className="w-56 rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-center outline-none focus:border-emerald-400"
          />
          <button type="submit" className="rounded-lg border border-emerald-700 px-5 py-2 font-semibold hover:bg-emerald-900">
            游客进入
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">大厅</h2>
          <p className="text-sm text-emerald-300">
            欢迎，{identity.name}
            {identity.chips !== undefined && <span className="text-amber-300">（筹码 {identity.chips}）</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => wsClient.logout()}
          className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm hover:bg-emerald-900"
        >
          退出登录
        </button>
      </div>

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (roomName.trim()) wsClient.createRoom(roomName.trim());
        }}
      >
        <input
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="新房间名称"
          maxLength={30}
          className="flex-1 rounded-lg border border-emerald-700 bg-emerald-950 px-3 py-2 outline-none focus:border-emerald-400"
        />
        <button type="submit" className="rounded-lg bg-amber-600 px-5 py-2 font-semibold hover:bg-amber-500">
          创建房间
        </button>
        <button
          type="button"
          onClick={() => wsClient.listRooms()}
          className="rounded-lg border border-emerald-700 px-4 py-2 hover:bg-emerald-900"
        >
          刷新
        </button>
      </form>

      {rooms.length === 0 ? (
        <p className="mt-10 text-center text-emerald-500">还没有房间，创建一个吧</p>
      ) : (
        <ul className="space-y-2">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="flex items-center justify-between rounded-xl border border-emerald-800 bg-emerald-950 px-4 py-3"
            >
              <div>
                <div className="font-semibold">{room.name}</div>
                <div className="text-xs text-emerald-400">
                  {room.playerCount} 名玩家
                  {room.spectatorCount > 0 && ` · ${room.spectatorCount} 观战`}
                  {room.handInPlay && ' · 牌局进行中'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => wsClient.joinRoom(room.id)}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold hover:bg-emerald-500"
                >
                  加入
                </button>
                <button
                  type="button"
                  onClick={() => wsClient.joinRoom(room.id, true)}
                  className="rounded-lg border border-emerald-700 px-4 py-1.5 text-sm hover:bg-emerald-900"
                >
                  观战
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
