import type { TableState } from './engine';
import { applyAction, createTable, legalActionsFor, startHand } from './engine';
import type { PlayerAction } from '@holdem/shared';
import { describe, expect, it } from 'vitest';
import { seededRng } from './rng';

function makeTable(stacks: number[] = [1000, 1000, 1000]): TableState {
  return createTable(
    stacks.map((stack, i) => ({ id: String.fromCharCode(97 + i), name: `P${i}`, stack })),
    { smallBlind: 10, bigBlind: 20, ante: 0 },
  );
}

function act(
  state: TableState,
  playerId: string,
  type: PlayerAction['type'],
  amount?: number,
): { state: TableState; error: string | null } {
  const action = {
    type,
    playerId,
    ...(type === 'raise' ? { amount: amount! } : {}),
  } as PlayerAction;
  return applyAction(state, action);
}

describe('startHand 发牌与盲注', () => {
  it('单挑局：庄家是小盲且先行动', () => {
    const state = startHand(makeTable([1000, 1000]), seededRng(1));
    expect(state.handNumber).toBe(1);
    expect(state.phase).toBe('pre-flop');
    // dealer=a → a 是小盲，b 是大盲，小盲先行动
    expect(state.actorId).toBe('a');
    const a = state.players.find((p) => p.id === 'a')!;
    const b = state.players.find((p) => p.id === 'b')!;
    expect(a.betThisRound).toBe(10);
    expect(b.betThisRound).toBe(20);
    expect(a.stack).toBe(990);
    expect(b.stack).toBe(980);
    expect(state.currentBet).toBe(20);
    expect(Object.values(state.hands).every((h) => h.length === 2)).toBe(true);
    expect(state.deck).toHaveLength(48);
  });

  it('三人局：UTG 是大盲后第一位', () => {
    const state = startHand(makeTable(), seededRng(2));
    // dealer=a(0), SB=b(1), BB=c(2) → UTG=a
    expect(state.actorId).toBe('a');
    expect(state.pot).toBe(30);
  });

  it('第二手庄家轮转到下一座位', () => {
    let state = startHand(makeTable(), seededRng(3));
    state = act(state, 'a', 'call').state;
    state = act(state, 'b', 'call').state;
    state = act(state, 'c', 'check').state;
    expect(state.phase).toBe('flop');
    state = startHand(state, seededRng(4));
    expect(state.dealerSeat).toBe(1);
    expect(state.handNumber).toBe(2);
  });
});

describe('applyAction 行动裁决', () => {
  it('非行动者提交行动被拒绝', () => {
    const state = startHand(makeTable(), seededRng(5));
    const { error } = act(state, 'b', 'call');
    expect(error).not.toBeNull();
  });

  it('面对下注时不能过牌', () => {
    const state = startHand(makeTable(), seededRng(6));
    const { error } = act(state, 'a', 'check');
    expect(error).not.toBeNull();
  });

  it('call 推进行动顺序，check 关闭大盲选择权后进入翻牌', () => {
    let state = startHand(makeTable(), seededRng(7));
    state = act(state, 'a', 'call').state;
    expect(state.actorId).toBe('b'); // 小盲补 10
    state = act(state, 'b', 'call').state;
    expect(state.actorId).toBe('c'); // 大盲 option
    expect(legalActionsFor(state, 'c')).toMatchObject({ canCheck: true, canCall: false });
    state = act(state, 'c', 'check').state;
    expect(state.phase).toBe('flop');
    expect(state.pot).toBe(60);
    // 收注后所有 betThisRound 清零
    expect(state.players.every((p) => p.betThisRound === 0)).toBe(true);
    // 翻牌轮从庄家后第一位开始
    expect(state.actorId).toBe('b');
  });

  it('raise 后加注者无需再行动，call 完即进翻牌', () => {
    let state = startHand(makeTable(), seededRng(8));
    state = act(state, 'a', 'raise', 40).state;
    expect(state.currentBet).toBe(40);
    expect(state.minimumRaise).toBe(20);
    expect(state.actorId).toBe('b');
    expect(state.actedThisRound['b']).toBe(false);
    expect(state.actedThisRound['a']).toBe(true);
    state = act(state, 'b', 'fold').state;
    state = act(state, 'c', 'call').state;
    // c 的 call 已完成对 raise 的响应，本轮结束
    expect(state.phase).toBe('flop');
    expect(state.actorId).toBe('c'); // b 已弃牌
  });

  it('被再加注后加注者需重新行动', () => {
    let state = startHand(makeTable(), seededRng(9));
    state = act(state, 'a', 'raise', 40).state;
    state = act(state, 'b', 'raise', 80).state; // b 再加注 → 重开 a/c
    expect(state.actorId).toBe('c');
    state = act(state, 'c', 'fold').state;
    expect(state.actorId).toBe('a'); // a 的行动义务被重开
    state = act(state, 'a', 'call').state;
    expect(state.phase).toBe('flop');
    expect(state.actorId).toBe('b'); // 唯一剩 a/b，庄家 a 后是 b
  });

  it('加注不足最小加注被拒绝', () => {
    const state = startHand(makeTable(), seededRng(10));
    const { error } = act(state, 'a', 'raise', 30);
    expect(error).toContain('最小加注');
  });

  it('all-in 短跟注不重开行动、欠注留池', () => {
    // b 是小盲（总 25）：投 10 后剩 15，面对 100 只能 all-in 25
    let state = startHand(makeTable([500, 25, 1000]), seededRng(11));
    state = act(state, 'a', 'raise', 100).state;
    state = act(state, 'b', 'all-in').state;
    const b = state.players.find((p) => p.id === 'b')!;
    expect(b.status).toBe('all-in');
    expect(b.betThisRound).toBe(25);
    expect(state.currentBet).toBe(100);
    // c call 后：a/c 已匹配且行动过 → 本轮结束（b 欠 75 不阻塞）
    state = act(state, 'c', 'call').state;
    expect(state.phase).toBe('flop');
    // 底池 = a 100 + b(含小盲10) 25 + c(含大盲20) 100
    expect(state.pot).toBe(225);
  });

  it('fold 到只剩一人 → 立即结束并赢走全部底池', () => {
    let state = startHand(makeTable(), seededRng(12));
    state = act(state, 'a', 'fold').state;
    state = act(state, 'b', 'fold').state;
    expect(state.phase).toBe('showdown');
    expect(state.showdownResult?.foldWin).toBe(true);
    const c = state.players.find((p) => p.id === 'c')!;
    expect(c.stack).toBe(1010); // 1000 - 20 盲注 + 30 底池
    expect(state.pot).toBe(0);
  });

  it('单挑 all-in 补齐跟注 → 直接 run-out 摊牌', () => {
    let state = startHand(makeTable([20, 1000]), seededRng(13));
    // a 是庄家/小盲：投 10 剩 10，all-in 恰好补齐大盲 20
    state = act(state, 'a', 'all-in').state;
    expect(state.phase).toBe('showdown');
    expect(state.communityCards).toHaveLength(5);
    expect(state.actorId).toBeNull();
  });

  it('river 轮结束 → 进入摊牌', () => {
    let state = startHand(makeTable(), seededRng(14));
    // pre-flop：a call, b call, c check
    state = act(state, 'a', 'call').state;
    state = act(state, 'b', 'call').state;
    state = act(state, 'c', 'check').state;
    expect(state.phase).toBe('flop');
    // 翻牌后行动顺序：b → c → a（庄家 a 之后）
    state = act(state, 'b', 'check').state;
    state = act(state, 'c', 'check').state;
    state = act(state, 'a', 'check').state;
    expect(state.phase).toBe('turn');
    state = act(state, 'b', 'check').state;
    state = act(state, 'c', 'check').state;
    state = act(state, 'a', 'check').state;
    expect(state.phase).toBe('river');
    state = act(state, 'b', 'check').state;
    state = act(state, 'c', 'check').state;
    state = act(state, 'a', 'check').state;
    expect(state.phase).toBe('showdown');
    expect(state.communityCards).toHaveLength(5);
  });
});

describe('legalActionsFor 金额边界', () => {
  it('面对下注：callAmount 与加注区间', () => {
    let state = startHand(makeTable(), seededRng(15));
    state = act(state, 'a', 'raise', 100).state;
    expect(legalActionsFor(state, 'b')).toEqual({
      canFold: true,
      canCheck: false,
      canCall: true,
      callAmount: 90, // b 是小盲已投 10
      canRaise: true,
      minRaiseTo: 180, // a 加注增量 80 → 新最小加注 100+80
      maxRaiseTo: 1000, // 10 + 990
    });
  });

  it('筹码不足时 all-in 补齐，匹配者可过牌', () => {
    let state = startHand(makeTable([1000, 15, 1000]), seededRng(16));
    state = act(state, 'a', 'call').state; // a UTG call 20
    state = act(state, 'b', 'all-in').state; // b 剩 5 → all-in 共 15
    const b = state.players.find((p) => p.id === 'b')!;
    expect(b.betThisRound).toBe(15);
    // c 已投大盲 20 = currentBet → 过牌即可
    expect(legalActionsFor(state, 'c')).toMatchObject({
      canCheck: true,
      canCall: false,
      callAmount: 0,
    });
    expect(state.actorId).toBe('c');
    state = act(state, 'c', 'check').state;
    expect(state.phase).toBe('flop');
  });
});
