import { motion } from 'framer-motion';

/**
 * 像素风兔女郎荷官（16×16 点阵 SVG）。
 * - 待机：整体上下浮动 + 耳朵轻摆
 * - 发牌：手中牌堆向牌桌方向一挥（dealing=true 时触发）
 * - 牌堆常驻在她手中（桌中央不再另设牌堆）
 */
const PALETTE: Record<string, string> = {
  W: '#f1f5f9', // 兔毛白
  P: '#f9a8d4', // 耳内粉
  H: '#fbbf24', // 金发
  S: '#fcd9b8', // 皮肤
  E: '#1e293b', // 眼睛
  M: '#f472b6', // 嘴唇
  R: '#dc2626', // 领结
  B: '#111827', // 马甲
  C: '#ffffff', // 牌面
  c: '#cbd5e1', // 牌侧边
  D: '#334155', // 鞋
};

const GRID = [
  '....WW....WW....',
  '....WP....PW....',
  '....WP....PW....',
  '....WW....WW....',
  '...WWWWWWWWWW...',
  '...WHHHHHHHHW...',
  '...WHSSSSSSHW...',
  '...WHSESSESHW...',
  '...WHSSMMSSHW...',
  '....WWWWWWWW....',
  '.....BBRRBB.....',
  '...SBBBBBBBBSCC.',
  '...SBBBBBBBBScc.',
  '....BBBBBBBB....',
  '.....S....S.....',
  '.....D....D.....',
];

interface DealerProps {
  /** 正在发牌：手部牌堆向牌桌挥出 */
  dealing?: boolean;
}

export function Dealer({ dealing = false }: DealerProps) {
  return (
    <motion.div
      className="relative z-20 select-none"
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg
        width="128"
        height="128"
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        className="drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]"
      >
        {/* 双耳轻摆（独立于待机浮动） */}
        <motion.g
          animate={{ x: [0, 0.3, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {GRID.slice(0, 4).map((row, y) =>
            [...row].map((ch, x) =>
              ch === 'W' || ch === 'P' ? (
                <rect key={`L${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[ch]} />
              ) : null,
            ),
          )}
        </motion.g>

        {/* 身体与右耳（不含左耳，避免重绘） */}
        {GRID.map((row, y) =>
          [...row].map((ch, x) => {
            if (y < 4) return null; // 左耳区域已单独渲染
            if (ch === '.' || !(ch in PALETTE)) return null;
            // 手中的牌堆单独渲染（发牌时挥动）
            if (y >= 11 && y <= 12 && x >= 13) return null;
            return <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[ch]} />;
          }),
        )}

        {/* 手中牌堆：发牌时向牌桌方向一挥 */}
        <motion.g
          initial={false}
          animate={dealing ? { x: [-2.5, -1, -2.5], y: [1.5, 0.5, 1.5] } : { x: 0, y: 0 }}
          transition={dealing ? { duration: 0.55, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        >
          <rect x={13} y={11} width={2} height={1} fill={PALETTE.C} />
          <rect x={13} y={12} width={2} height={1} fill={PALETTE.c} />
          <rect x={13.4} y={11.15} width={0.5} height={0.5} fill={PALETTE.R} />
        </motion.g>
      </svg>
      <div className="mt-0.5 text-center text-[10px] font-bold tracking-widest text-amber-300/90">
        DEALER
      </div>
    </motion.div>
  );
}
