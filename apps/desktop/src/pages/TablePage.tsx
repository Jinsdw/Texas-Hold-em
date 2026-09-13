import { useConnectionStore } from '../stores/connectionStore';
import { useGameStore } from '../stores/gameStore';
import { wsClient } from '../network/wsClient';
import { ActionBar } from '../components/ActionBar';
import { TableLayout } from '../components/TableLayout';

/** 牌桌页：等待区（就绪/开局） + 游戏区（牌桌/操作面板/摊牌结果） */
export function TablePage() {
  const room = useGameStore((s) => s.room);
  const gameState = useGameStore((s) => s.gameState);
  const myHand = useGameStore((s) => s.myHand);
  const spectator = useGameStore((s) => s.spectator);
  const identity = useConnectionStore((s) => s.identity);

  if (!room || !identity) return null;

  const me = room.seats.find((s) => s.playerId === identity.playerId);
  const isHost = room.hostId === identity.playerId;
  const allReady = room.seats.length >= 2 && room.seats.every((s) => s.ready);

  return (
    <div className="w-full max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{room.name}</h2>
          <p className="text-xs text-emerald-400">
            房间 {room.id} · {spectator ? '观战模式' : me?.isHost ? '你是房主' : '玩家'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => wsClient.leaveRoom()}
          className="rounded-lg border border-emerald-700 px-4 py-1.5 text-sm hover:bg-emerald-900"
        >
          离开房间
        </button>
      </div>

      {gameState && gameState.phase !== 'waiting' ? (
        <>
          <TableLayout
            room={room}
            gameState={gameState}
            myPlayerId={spectator ? null : identity.playerId}
            myHand={myHand}
            showdown={gameState.showdownResult}
          />
          {!spectator &&
            gameState.actorId === identity.playerId &&
            gameState.showdownResult === null && (
              <ActionBar gameState={gameState} myPlayerId={identity.playerId} />
            )}
          {gameState.showdownResult !== null && isHost && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => wsClient.startGame()}
                className="rounded-lg bg-amber-600 px-8 py-2.5 font-bold hover:bg-amber-500"
              >
                下一手
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950 p-8 text-center">
          <p className="mb-6 text-emerald-300">
            {room.seats.length < 2 ? '等待其他玩家加入（至少 2 人）' : '准备就绪后由房主开局'}
          </p>
          <ul className="mx-auto mb-6 max-w-md space-y-1.5">
            {room.seats.map((seat) => (
              <li
                key={seat.playerId}
                className="flex justify-between rounded-lg bg-emerald-900/60 px-4 py-2 text-sm"
              >
                <span>
                  {seat.isHost && '👑 '}
                  {seat.name}
                  {!seat.connected && <span className="text-red-400">（断线）</span>}
                </span>
                <span className={seat.ready ? 'text-emerald-400' : 'text-slate-500'}>
                  {seat.ready ? '已就绪' : '未就绪'}
                </span>
              </li>
            ))}
          </ul>
          {!spectator && (
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => wsClient.setReady(!me?.ready)}
                className={`rounded-lg px-6 py-2 font-semibold ${
                  me?.ready
                    ? 'border border-emerald-600 text-emerald-300'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {me?.ready ? '取消就绪' : '准备'}
              </button>
              {isHost && (
                <button
                  type="button"
                  onClick={() => wsClient.startGame()}
                  disabled={!allReady}
                  className="rounded-lg bg-amber-600 px-6 py-2 font-semibold hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  开始游戏
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
