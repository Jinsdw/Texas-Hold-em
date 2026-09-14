import { motion } from 'framer-motion';
import type { Card } from '@holdem/shared';
import { CardBack, CardFace, CARD_DIMS } from './PlayingCard';

interface FlipCardProps {
  card?: Card;
  /** true 显示牌面，false 显示牌背 */
  faceUp?: boolean;
  size?: 'sm' | 'md';
  /** 翻转延迟（秒），用于错落节奏 */
  delay?: number;
  /** 挂载时从牌背翻起；false 则直接静态显示（重连快照用） */
  animateMount?: boolean;
  /** 赢家最佳五张：金色发光并上浮 */
  glow?: boolean;
}

/** 3D 翻牌卡片：牌背 ↔ 牌面绕 Y 轴翻转 */
export function FlipCard({
  card,
  faceUp = true,
  size = 'md',
  delay = 0,
  animateMount = false,
  glow = false,
}: FlipCardProps) {
  return (
    <div
      className={`${CARD_DIMS[size]} [perspective:600px] ${
        glow ? 'rounded-md shadow-[0_0_16px_rgba(252,211,77,0.9)]' : ''
      }`}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        initial={{ rotateY: animateMount ? 180 : faceUp ? 0 : 180 }}
        animate={{ rotateY: faceUp ? 0 : 180, y: glow ? -6 : 0 }}
        transition={
          animateMount
            ? { rotateY: { duration: 0.6, delay, ease: [0.2, 0.7, 0.3, 1] }, y: { duration: 0.35, delay: delay + 0.6 } }
            : { duration: 0 }
        }
      >
        {/* 正面：牌面（rotateY 0 可见） */}
        <div className="absolute inset-0 [backface-visibility:hidden]">
          {card ? <CardFace card={card} size={size} /> : <CardBack size={size} />}
        </div>
        {/* 背面：牌背（rotateY 180 可见） */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <CardBack size={size} />
        </div>
      </motion.div>
    </div>
  );
}
