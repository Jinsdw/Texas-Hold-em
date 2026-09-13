import type {
  BlindStructure,
  Card,
  GamePhase,
  GameState,
  Player,
  PlayerAction,
  PlayerId,
} from '@holdem/shared';
import { DEFAULT_BLINDS } from '@holdem/shared';
import { createDeck, shuffle } from './deck';
import type { Rng } from './rng';

/** 下注阶段（可行动） */
const BETTING_PHASES: readonly GamePhase[] = ['pre-flop', 'flop', 'turn', 'river'];

/**
 * 服务端内部手牌状态：在 GameState 公共字段之外，持有不可下发的私有信息
 * （牌堆、各玩家底牌）与状态机簿记字段。
 */
export interface TableState extends GameState {
  deck: Card[];
  hands: Record<PlayerId, Card[]>;
  /** 最近一次攻击性下注者（加注重开行动顺序的锚点） */
  lastAggressorId: PlayerId | null;
  /** 本轮是否已行动过（加注后被重置） */
  actedThisRound: Record<PlayerId, boolean>;
}

export interface SeatSpec {
  id: PlayerId;
  name: string;
  stack: number;
}

export interface ActionResult {
  state: TableState;
  error: string | null;
}

export function createTable(
  seating: readonly SeatSpec[],
  blinds: BlindStructure = DEFAULT_BLINDS,
): TableState {
  const players: Player[] = seating.map((s, i) => ({
    id: s.id,
    name: s.name,
    seat: i,
    stack: s.stack,
    betThisRound: 0,
    totalContribution: 0,
    status: s.stack > 0 ? 'waiting' : 'eliminated',
    isConnected: true,
  }));
  return {
    handNumber: 0,
    phase: 'waiting',
    players,
    communityCards: [],
    pot: 0,
    currentBet: 0,
    minimumRaise: blinds.bigBlind,
    actorId: null,
    dealerSeat: -1, // 首手 startHand 时从座位 0 起定庄
    blinds,
    actionLog: [],
    showdownResult: null,
    deck: [],
    hands: {},
    lastAggressorId: null,
    actedThisRound: {},
  };
}

function cloneState(state: TableState): TableState {
  return structuredClone(state);
}

function totalPot(state: TableState): number {
  return state.players.reduce((sum, p) => sum + p.totalContribution, 0);
}

/** 玩家是否仍可行动（未弃牌、有筹码） */
function canAct(p: Player): boolean {
  return p.status === 'active';
}

/** 从指定座位（含）开始按座位环形排列的在局玩家 */
function seatingOrderFrom(state: TableState, seat: number): Player[] {
  const n = state.players.length;
  const start = ((seat % n) + n) % n;
  // 模运算保证索引落在 [0, n) 内，无越界可能
  return Array.from({ length: n }, (_, i) => state.players[(start + i) % n] as Player).filter(
    (p) => p.status !== 'eliminated',
  );
}

/** 从指定座位之后开始，找到第一个需要行动的玩家 */
function nextActorAfter(state: TableState, seat: number): PlayerId | null {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const p = state.players[(seat + i) % n] as Player;
    if (canAct(p) && (p.betThisRound < state.currentBet || !state.actedThisRound[p.id])) {
      return p.id;
    }
  }
  return null;
}

function postBlind(state: TableState, playerId: PlayerId, amount: number): void {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;
  const pay = Math.min(amount, player.stack);
  player.stack -= pay;
  player.betThisRound += pay;
  player.totalContribution += pay;
  if (player.stack === 0) {
    player.status = 'all-in';
  }
}

function dealCommunity(state: TableState, count: number): void {
  for (let i = 0; i < count; i++) {
    const card = state.deck.pop();
    if (card) state.communityCards.push(card);
  }
}

/** 结束当前下注轮：收注、推进阶段并发出公共牌、确定下一行动者 */
function advancePhase(state: TableState): void {
  for (const p of state.players) {
    p.betThisRound = 0;
  }
  state.currentBet = 0;
  state.minimumRaise = state.blinds.bigBlind;
  state.lastAggressorId = null;
  state.actedThisRound = {};

  state.phase =
    state.phase === 'pre-flop' ? 'flop' : state.phase === 'flop' ? 'turn' : 'river';
  dealCommunity(state, state.phase === 'flop' ? 3 : 1);

  state.actorId = nextActorAfter(state, state.dealerSeat);
  if (state.actorId === null) {
    // 理论上不会到达（调用前已确认存在可行动玩家）；防御性 run-out
    runOutBoard(state);
  }
}

/** 剩余玩家全部 all-in：直接发完公共牌进入摊牌 */
function runOutBoard(state: TableState): void {
  while (state.communityCards.length < 5) {
    dealCommunity(state, 1);
  }
  state.phase = 'showdown';
  state.actorId = null;
}

/** 只剩一名未弃牌玩家：立即结束本手，赢走全部底池（不摊牌） */
function settleFoldWin(state: TableState): void {
  const winner = state.players.find((p) => p.status === 'active' || p.status === 'all-in');
  if (!winner) return;
  const total = totalPot(state);
  winner.stack += total;
  for (const p of state.players) {
    p.betThisRound = 0;
    p.totalContribution = 0;
  }
  state.pot = 0;
  state.phase = 'showdown';
  state.actorId = null;
  state.showdownResult = {
    pots: [{ amount: total, eligibleIds: [winner.id], winners: [{ playerId: winner.id, amount: total }] }],
    reveals: [],
    foldWin: true,
  };
}

/** 行动后判定：本轮是否结束、是否推进阶段、下一行动者是谁 */
function settleAfterAction(state: TableState): void {
  const contenders = state.players.filter((p) => p.status === 'active' || p.status === 'all-in');

  if (contenders.length === 1) {
    settleFoldWin(state);
    return;
  }

  const canActPlayers = contenders.filter(canAct);
  // 只要求"仍可行动"的玩家下注匹配；all-in 短跟注者的欠注留在池中由分层分配处理
  const matched = canActPlayers.every((p) => p.betThisRound === state.currentBet);

  // 唯一可行动者已匹配下注且其余对手全部 all-in：其行动已无意义（无人可跟注），直接 run-out
  if (
    canActPlayers.length === 1 &&
    matched &&
    contenders.some((p) => p.status === 'all-in')
  ) {
    runOutBoard(state);
    return;
  }

  if (canActPlayers.length === 0) {
    runOutBoard(state);
    return;
  }

  if (matched && canActPlayers.every((p) => state.actedThisRound[p.id])) {
    if (state.phase === 'river') {
      runOutBoard(state);
    } else {
      advancePhase(state);
    }
    return;
  }

  const actorSeat = state.players.find((p) => p.id === state.actorId)?.seat ?? state.dealerSeat;
  state.actorId = nextActorAfter(state, actorSeat);
  if (state.actorId === null) {
    runOutBoard(state);
  }
}

/** 开启新一手牌：轮转庄家、洗牌发牌、下盲注、确定首个行动者 */
export function startHand(state: TableState, rng: Rng = Math.random): TableState {
  const next = cloneState(state);
  for (const p of next.players) {
    p.betThisRound = 0;
    p.totalContribution = 0;
    p.status = p.stack > 0 ? 'active' : 'eliminated';
  }
  const inHand = next.players.filter((p) => p.status === 'active');
  if (inHand.length < 2) {
    next.phase = 'waiting';
    next.actorId = null;
    next.showdownResult = null;
    next.pot = 0;
    return next;
  }

  next.handNumber += 1;
  next.phase = 'pre-flop';
  next.communityCards = [];
  next.actionLog = [];
  next.showdownResult = null;
  next.hands = {};
  next.deck = shuffle(createDeck(), rng);

  // 庄家按钮轮转：从上一手庄家的下一座开始找第一个在局玩家
  next.dealerSeat = seatingOrderFrom(next, next.dealerSeat + 1)[0]!.seat;
  const order = seatingOrderFrom(next, next.dealerSeat).filter((p) => p.status === 'active');

  for (let round = 0; round < 2; round++) {
    for (const p of order) {
      const card = next.deck.pop();
      if (card) {
        next.hands[p.id] = [...(next.hands[p.id] ?? []), card];
      }
    }
  }

  const headsUp = order.length === 2;
  const smallBlind = headsUp ? (order[0] as Player) : (order[1] as Player);
  const bigBlind = headsUp ? (order[1] as Player) : (order[2] as Player);
  postBlind(next, smallBlind.id, next.blinds.smallBlind);
  postBlind(next, bigBlind.id, next.blinds.bigBlind);

  next.currentBet = Math.max(...next.players.map((p) => p.betThisRound));
  next.minimumRaise = next.blinds.bigBlind;
  next.lastAggressorId = bigBlind.id;
  next.actedThisRound = {};
  next.pot = totalPot(next);
  next.actorId = nextActorAfter(next, bigBlind.seat);
  return next;
}

/**
 * 应用玩家行动（服务端裁决）。返回新状态；非法行动时返回原状态与错误信息。
 */
export function applyAction(state: TableState, action: PlayerAction): ActionResult {
  if (!BETTING_PHASES.includes(state.phase)) {
    return { state, error: `阶段 ${state.phase} 不可行动` };
  }
  if (state.actorId !== action.playerId) {
    return { state, error: '未轮到此玩家行动' };
  }
  const player = state.players.find((p) => p.id === action.playerId);
  if (!player || player.status !== 'active') {
    return { state, error: '玩家当前不可行动' };
  }

  const next = cloneState(state);
  const actor = next.players.find((p) => p.id === action.playerId)!;

  switch (action.type) {
    case 'fold': {
      actor.status = 'folded';
      break;
    }
    case 'check': {
      if (actor.betThisRound !== next.currentBet) {
        return { state, error: '存在未跟注的下注，无法过牌' };
      }
      break;
    }
    case 'call': {
      const need = next.currentBet - actor.betThisRound;
      const pay = Math.min(need, actor.stack);
      actor.stack -= pay;
      actor.betThisRound += pay;
      actor.totalContribution += pay;
      if (actor.stack === 0) {
        actor.status = 'all-in';
      }
      break;
    }
    case 'raise': {
      const amount = action.amount;
      if (!Number.isInteger(amount) || amount <= 0) {
        return { state, error: '加注金额非法' };
      }
      const allInTo = actor.betThisRound + actor.stack;
      if (amount <= next.currentBet) {
        return { state, error: '加注总额必须高于当前下注' };
      }
      if (amount > allInTo) {
        return { state, error: '加注超过可用筹码' };
      }
      const isAllIn = amount === allInTo;
      const minRaiseTo = next.currentBet + next.minimumRaise;
      if (!isAllIn && amount < minRaiseTo) {
        return { state, error: `最小加注到 ${minRaiseTo}` };
      }
      const increment = amount - next.currentBet;
      if (increment >= next.minimumRaise) {
        next.minimumRaise = increment;
      }
      next.currentBet = amount;
      next.lastAggressorId = actor.id;
      for (const p of next.players) {
        if (p.id !== actor.id) next.actedThisRound[p.id] = false;
      }
      const pay = amount - actor.betThisRound;
      actor.stack -= pay;
      actor.betThisRound = amount;
      actor.totalContribution += pay;
      if (actor.stack === 0) {
        actor.status = 'all-in';
      }
      break;
    }
    case 'all-in': {
      const allInTo = actor.betThisRound + actor.stack;
      if (allInTo > next.currentBet) {
        // 短 all-in：不足最小加注时不重置 minimumRaise，也不重开已匹配者的行动义务
        const increment = allInTo - next.currentBet;
        if (increment >= next.minimumRaise) {
          next.minimumRaise = increment;
        }
        next.currentBet = allInTo;
        next.lastAggressorId = actor.id;
        for (const p of next.players) {
          if (p.id !== actor.id) next.actedThisRound[p.id] = false;
        }
      }
      actor.totalContribution += actor.stack;
      actor.betThisRound = allInTo;
      actor.stack = 0;
      actor.status = 'all-in';
      break;
    }
  }

  next.actionLog.push(action);
  next.actedThisRound[actor.id] = true;
  next.pot = totalPot(next);
  settleAfterAction(next);
  return { state: next, error: null };
}

/** 某玩家当前可执行的动作与金额边界（供 UI/协议使用） */
export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
}

const NO_ACTIONS: LegalActions = {
  canFold: false,
  canCheck: false,
  canCall: false,
  callAmount: 0,
  canRaise: false,
  minRaiseTo: 0,
  maxRaiseTo: 0,
};

export function legalActionsFor(state: TableState, playerId: PlayerId): LegalActions {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || state.actorId !== playerId || player.status !== 'active') {
    return NO_ACTIONS;
  }
  if (!BETTING_PHASES.includes(state.phase)) {
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

/** 剥离私有字段，得到可广播的公共快照 */
export function toPublicState(state: TableState): GameState {
  const { deck: _deck, hands: _hands, lastAggressorId: _agg, actedThisRound: _acted, ...pub } =
    state;
  void _deck;
  void _hands;
  void _agg;
  void _acted;
  return pub;
}
