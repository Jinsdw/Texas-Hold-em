import { useState } from 'react';
import { deriveLegalActions } from '@holdem/shared';
import type { GameState } from '@holdem/shared';
import { wsClient } from '../network/wsClient';

interface ActionBarProps {
  gameState: GameState;
  myPlayerId: string;
}

/** 底部操作面板：弃牌 / 过牌 / 跟注 / 加注（滑块）/ 全下 */
export function ActionBar({ gameState, myPlayerId }: ActionBarProps) {
  const legal = deriveLegalActions(gameState, myPlayerId);
  const [raiseTo, setRaiseTo] = useState<number>(legal.minRaiseTo);

  // 轮到新行动时重置滑块到最小加注
  const actorChanged = gameState.actorId === myPlayerId;
  const [lastActorKey, setLastActorKey] = useState<string | null>(null);
  const key = `${gameState.handNumber}-${gameState.phase}`;
  if (actorChanged && lastActorKey !== key) {
    setLastActorKey(key);
    setRaiseTo(legal.minRaiseTo);
  }

  if (!actorChanged) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-black/40 p-4">
      <button
        type="button"
        onClick={() => wsClient.playerAction({ type: 'fold', playerId: myPlayerId })}
        className="rounded-lg bg-red-700 px-5 py-2 font-semibold text-white hover:bg-red-600"
      >
        弃牌
      </button>

      {legal.canCheck ? (
        <button
          type="button"
          onClick={() => wsClient.playerAction({ type: 'check', playerId: myPlayerId })}
          className="rounded-lg bg-slate-600 px-5 py-2 font-semibold text-white hover:bg-slate-500"
        >
          过牌
        </button>
      ) : (
        legal.canCall && (
          <button
            type="button"
            onClick={() => wsClient.playerAction({ type: 'call', playerId: myPlayerId })}
            className="rounded-lg bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-600"
          >
            跟注 {legal.callAmount}
          </button>
        )
      )}

      {legal.canRaise && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-300">加注到</span>
            <input
              type="range"
              min={legal.minRaiseTo}
              max={legal.maxRaiseTo}
              value={raiseTo}
              onChange={(e) => setRaiseTo(Number(e.target.value))}
              className="w-48"
            />
            <span className="w-14 text-center font-mono text-amber-300">{raiseTo}</span>
          </div>
          <button
            type="button"
            onClick={() =>
              wsClient.playerAction({ type: 'raise', playerId: myPlayerId, amount: raiseTo })
            }
            className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500"
          >
            加注
          </button>
          <button
            type="button"
            onClick={() => wsClient.playerAction({ type: 'all-in', playerId: myPlayerId })}
            className="rounded-lg bg-amber-600 px-5 py-2 font-semibold text-white hover:bg-amber-500"
          >
            全下
          </button>
        </>
      )}
    </div>
  );
}
