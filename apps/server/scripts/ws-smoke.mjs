// WebSocket 冒烟脚本：连接本地服务端，收到第一条消息即视为成功。
// 用法：先启动服务端（pnpm dev:server），再运行 pnpm --filter @holdem/server smoke:ws
import { WebSocket } from 'ws';

const url = process.argv[2] ?? 'ws://localhost:3000/ws';
const ws = new WebSocket(url);

const timeout = setTimeout(() => {
  console.error(`[ws-smoke] 超时：${url} 10 秒内未收到消息`);
  process.exit(1);
}, 10_000);

ws.on('open', () => {
  console.log(`[ws-smoke] 已连接 ${url}`);
});

ws.on('message', (data) => {
  console.log(`[ws-smoke] 收到: ${data.toString()}`);
  clearTimeout(timeout);
  ws.close();
  process.exit(0);
});

ws.on('error', (err) => {
  console.error(`[ws-smoke] 连接失败: ${err.message}`);
  clearTimeout(timeout);
  process.exit(1);
});
