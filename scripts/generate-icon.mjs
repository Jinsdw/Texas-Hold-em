// 一次性引导脚本：生成纯色占位图标 app-icon.png（apps/desktop/），
// 之后运行 `pnpm -C apps/desktop exec tauri icon app-icon.png` 生成全套图标。
// 替换真实 logo 时：覆盖 app-icon.png 后重跑 tauri icon 即可。
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIZE = 1024;
const RGB = [6, 95, 70]; // 深绿色毛毡桌面

const raw = Buffer.alloc((SIZE * 3 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  const row = y * (SIZE * 3 + 1);
  raw[row] = 0; // PNG 行过滤器：None
  for (let x = 0; x < SIZE; x++) {
    const p = row + 1 + x * 3;
    raw[p] = RGB[0];
    raw[p + 1] = RGB[1];
    raw[p + 2] = RGB[2];
  }
}

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // 位深
ihdr[9] = 2; // 颜色类型：真彩色 RGB

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

writeFileSync(new URL('../apps/desktop/app-icon.png', import.meta.url), png);
console.log('app-icon.png 已生成');
