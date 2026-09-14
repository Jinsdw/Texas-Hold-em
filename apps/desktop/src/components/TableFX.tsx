import { motion } from 'framer-motion';
import { CardBack } from './PlayingCard';

/** 牌桌容器内百分比坐标 */
export interface FxPos {
  left: number;
  top: number;
}

/** 荷官位置（顶部兔女郎的手部，所有发牌/收牌从这里出发） */
export const DEALER_POS: FxPos = { left: 50, top: 2 };

/** 底池筹码归集点（公共牌上方，避免遮挡居中的公共牌） */
export const POT_POS: FxPos = { left: 50, top: 30 };

export function lerpPos(a: FxPos, b: FxPos, t: number): FxPos {
  return { left: a.left + (b.left - a.left) * t, top: a.top + (b.top - a.top) * t };
}

/** 发牌飞行牌背：从荷官手中飞向座位（两张错开），按百分比坐标插值 */
export function DealFlyCard({ to, delay }: { to: FxPos; delay: number }) {
  return (
    <motion.div
      className="absolute z-30"
      style={{ left: `${DEALER_POS.left}%`, top: `${DEALER_POS.top}%` }}
      initial={{ x: '-50%', y: '-50%', rotate: 0, scale: 0.9 }}
      animate={{
        left: [`${DEALER_POS.left}%`, `${to.left}%`],
        top: [`${DEALER_POS.top}%`, `${to.top}%`],
        rotate: [0, 16, 0],
        scale: 1,
      }}
      transition={{ duration: 0.56, delay, ease: 'easeOut' }}
    >
      <CardBack size="sm" />
    </motion.div>
  );
}

/** 弃牌飞行牌背：从座位交还给荷官并淡出 */
export function FoldFlyCards({ from }: { from: FxPos }) {
  return [0, 1].map((i) => (
    <motion.div
      key={i}
      className="absolute z-30"
      style={{ left: `${from.left + (i - 0.5) * 3}%`, top: `${from.top - 8}%` }}
      initial={{ x: '-50%', y: '-50%', opacity: 1, rotate: 0 }}
      animate={{
        left: `${DEALER_POS.left + (i - 0.5) * 3}%`,
        top: `${DEALER_POS.top + 4}%`,
        opacity: 0,
        rotate: (i - 0.5) * 50,
        scale: 0.85,
      }}
      transition={{ duration: 0.75, delay: i * 0.1, ease: 'easeIn' }}
    >
      <CardBack size="sm" />
    </motion.div>
  ));
}

/** 下注筹码：从座位弹出到底池前方的固定押注位；新一轮开始时（卸载）飞入底池 */
export function BetChip({ amount, seatPos }: { amount: number; seatPos: FxPos }) {
  const spot = lerpPos(seatPos, POT_POS, 0.45);
  return (
    <motion.div
      className="absolute z-20"
      style={{ left: `${seatPos.left}%`, top: `${seatPos.top}%` }}
      initial={{ x: '-50%', y: '-50%', scale: 0.5, opacity: 0 }}
      animate={{ left: `${spot.left}%`, top: `${spot.top}%`, scale: 1, opacity: 1 }}
      exit={{ left: `${POT_POS.left}%`, top: `${POT_POS.top}%`, scale: 0.6, opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="flex h-7 min-w-14 items-center justify-center gap-1 rounded-full border border-amber-600 bg-gradient-to-b from-amber-300 to-amber-500 px-2 text-xs font-bold whitespace-nowrap text-slate-900 shadow-lg">
        <span className="h-2.5 w-2.5 rounded-full border border-amber-700 bg-amber-200" />
        {amount}
      </div>
    </motion.div>
  );
}

/** 赢池筹码：摊牌后从底池飞向每个赢家座位 */
export function WinChips({
  winners,
}: {
  winners: { pos: FxPos; amount: number }[];
}) {
  return winners.map((w, i) => (
    <motion.div
      key={i}
      className="absolute z-30"
      style={{ left: `${POT_POS.left}%`, top: `${POT_POS.top}%` }}
      initial={{ x: '-50%', y: '-50%', scale: 1.1, opacity: 1 }}
      animate={{ left: `${w.pos.left}%`, top: `${w.pos.top}%`, scale: 1, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.85, delay: i * 0.2, ease: [0.3, 0, 0.2, 1] }}
    >
      <div className="flex h-7 min-w-14 items-center justify-center gap-1 rounded-full border border-amber-600 bg-gradient-to-b from-amber-300 to-amber-500 px-2 text-xs font-bold whitespace-nowrap text-slate-900 shadow-lg">
        +{w.amount}
      </div>
    </motion.div>
  ));
}
