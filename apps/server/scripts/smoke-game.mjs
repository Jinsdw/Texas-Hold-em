// 双客户端联机集成冒烟：注册 → 建房 → 加入 → 就绪 → 开局 → 行动 → 断线重连。
// 用法：先启动服务端（pnpm dev:server），再运行 pnpm --filter @holdem/server smoke:game
// 实现说明：服务端每次状态变化广播 roomState → gameState → yourHand（私发），
// 客户端按序消费；skipUntil 丢弃无关消息并记住最新的 gameState。
import WebSocket from 'ws';

const URL = process.argv[2] ?? 'ws://localhost:3000/ws';

function connect(label) {
  const ws = new WebSocket(URL);
  const inbox = [];
  const waiters = [];
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    const w = waiters.shift();
    if (w) w(msg);
    else inbox.push(msg);
  });
  const next = (timeoutMs = 8000) =>
    new Promise((resolve, reject) => {
      const pending = inbox.shift();
      if (pending) return resolve(pending);
      const t = setTimeout(() => reject(new Error(`[${label}] 等待消息超时`)), timeoutMs);
      waiters.push((msg) => {
        clearTimeout(t);
        resolve(msg);
      });
    });
  const send = (obj) => ws.send(JSON.stringify(obj));
  return { ws, next, send, label };
}

/** 顺序消费直到拿到指定类型消息；返回该消息，并把沿途最后的 gameState 暂存到 stateRef.last */
async function skipUntil(sock, type, stateRef) {
  for (let i = 0; i < 60; i++) {
    const msg = await sock.next();
    if (msg.type === 'gameState') stateRef.last = msg.state;
    if (msg.type === type) return msg;
    if (msg.type === 'error') throw new Error(`[${sock.label}] 服务端错误: ${msg.message}`);
  }
  throw new Error(`[${sock.label}] 未等到 ${type}`);
}

const log = (...args) => console.log('[smoke]', ...args);

const a = connect('A');
await new Promise((r) => a.ws.on('open', r));
a.send({ type: 'register', name: 'Alice' });
const regA = await a.next();
log('A registered:', regA.playerId);

const b = connect('B');
await new Promise((r) => b.ws.on('open', r));
b.send({ type: 'register', name: 'Bob' });
const regB = await b.next();
log('B registered:', regB.playerId);

// A 建房（A 收到 roomState）
a.send({ type: 'createRoom', name: '朋友局' });
const roomMsg = await a.next();
if (roomMsg.type !== 'roomState') throw new Error(`A 首消息应为 roomState，实际 ${roomMsg.type}`);
const roomId = roomMsg.room.id;
log('房间创建:', roomId);

// B 加入（B 收到 roomState；A 也收到一次更新的 roomState）
b.send({ type: 'joinRoom', roomId });
const bRoom = await b.next();
if (bRoom.room.seats.length !== 2) throw new Error('B 房间座位数应为 2');
await a.next(); // A 的 roomState 广播

// 双方就绪（各自收到一次 roomState 广播）
a.send({ type: 'setReady', ready: true });
await a.next();
await b.next();
b.send({ type: 'setReady', ready: true });
await a.next();
await b.next();
log('双方就绪 ✓');

// A 开局：A 收到 roomState + gameState + yourHand
a.send({ type: 'startGame' });
const stateA = { last: null };
const stateB = { last: null };
await skipUntil(a, 'roomState', stateA);
const gs = await skipUntil(a, 'gameState', stateA);
const handA = await skipUntil(a, 'yourHand', stateA);
await skipUntil(b, 'roomState', stateB);
await skipUntil(b, 'gameState', stateB);
const handB = await skipUntil(b, 'yourHand', stateB);
log(
  `开局: phase=${gs.state.phase} pot=${gs.state.pot} A手牌=${handA.cards.length}张 B手牌=${handB.cards.length}张`,
);

// 行动循环：两人都 call/check 直到摊牌
for (let i = 0; i < 60; i++) {
  const actorId = stateA.last.actorId ?? stateB.last.actorId;
  if (!actorId || stateA.last.phase === 'showdown') break;
  const sock = actorId === regA.playerId ? a : b;
  const other = actorId === regA.playerId ? b : a;
  const ref = sock === a ? stateA : stateB;
  const otherRef = sock === a ? stateB : stateA;

  // 有未跟注额则 call，否则 check
  const me = ref.last.players.find((p) => p.id === actorId);
  const actionType = me.betThisRound < ref.last.currentBet ? 'call' : 'check';
  sock.send({ type: 'playerAction', action: { type: actionType, playerId: actorId } });
  await skipUntil(sock, 'roomState', ref);
  await skipUntil(sock, 'gameState', ref);
  await skipUntil(other, 'roomState', otherRef);
  await skipUntil(other, 'gameState', otherRef);
}

const final = stateA.last;
log(
  `结束: phase=${final.phase} handNumber=${final.handNumber} foldWin=${final.showdownResult?.foldWin ?? false}`,
);
if (final.phase !== 'showdown') throw new Error('未进入摊牌');

// B 断线 → A 收到 connected=false 的 roomState
b.ws.close();
for (let i = 0; i < 10; i++) {
  const msg = await a.next();
  if (msg.type === 'roomState' && msg.room.seats.some((s) => !s.connected)) break;
}
log('断线通知 ✓');

// B 重连：凭据恢复，收到 roomState + gameState
const b2 = connect('B2');
await new Promise((r) => b2.ws.on('open', r));
b2.send({ type: 'reconnect', playerId: regB.playerId, token: regB.token });
const reRoom = await b2.next();
if (reRoom.type !== 'roomState') throw new Error('重连首消息应为 roomState');
log(`重连恢复 ✓ 房间=${reRoom.room.id}`);

console.log('[smoke] 全部通过 ✅');
a.ws.close();
b2.ws.close();
process.exit(0);
