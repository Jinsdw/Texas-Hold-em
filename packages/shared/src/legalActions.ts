import type { GameState, PlayerId } from './types';

/** 某玩家当前可执行的动作与金额边界（客户端操作面板与服务端校验共用） */
export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
}

const BETTING_PHASES = ['pre-flop', 'flop', 'turn', 'river'] as const;

const NO_ACTIONS: LegalActions = {
  canFold: false,
  canCheck: false,
  canCall: false,
  callAmount: 0,
  canRaise: false,
  minRaiseTo: 0,
  maxRaiseTo: 0,
};

/** 从公开游戏状态推导玩家的合法行动（纯展示辅助，服务端仍有最终裁决） */
export function deriveLegalActions(state: GameState, playerId: PlayerId): LegalActions {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || state.actorId !== playerId || player.status !== 'active') {
    return NO_ACTIONS;
  }
  if (!(BETTING_PHASES as readonly string[]).includes(state.phase)) {
    return NO_ACTIONS;
  }

  const need = Math.max(0, state.currentBet - player.betThisRound);
  const maxRaiseTo = player.betThisRound + player.stack;
  return {
    canFold: true,
    canCheck: need === 0,
    canCall: need > 0,
    callAmount: Math.min(need, player.stack),
    canRaise: maxRaiseTo > state.currentBet,
    minRaiseTo: Math.min(state.currentBet + state.minimumRaise, maxRaiseTo),
    maxRaiseTo,
  };
}
