/**
 * 发牌动画的跨手牌记忆。
 * TablePage 在 waiting 阶段会卸载 TableLayout，组件内 ref 无法区分
 * “新一手开局”与“重连/中途加入”，因此把已见过的 handNumber 记在模块级。
 */
let seenRoomId: string | null = null;
const seenHands = new Set<number>();

/** 每次看到非 waiting 的 gameState 都标记；换房间自动清空 */
export function markHandSeen(roomId: string, handNumber: number): void {
  if (seenRoomId !== roomId) {
    seenRoomId = roomId;
    seenHands.clear();
  }
  seenHands.add(handNumber);
}

/**
 * 首次挂载时判断这手牌是否“刚发出来”（客户端从头看到开局）：
 * 只有 pre-flop 且无公共牌的手牌才播发牌动画；
 * 重连到进行中的手牌（已有公共牌 / 已过 pre-flop）一律静态显示。
 */
export function isFreshDeal(
  roomId: string,
  handNumber: number,
  phase: string,
  communityCount: number,
): boolean {
  if (seenRoomId === roomId && seenHands.has(handNumber)) return false;
  return phase === 'pre-flop' && communityCount === 0;
}
