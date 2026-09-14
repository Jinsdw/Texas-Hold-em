import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

/** 数字滚动：目标值变化时从当前显示值平滑过渡（底池/筹码计数用），返回取整后的显示值 */
export function useAnimatedNumber(target: number, durationMs = 650): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    if (displayRef.current === target) return;
    const controls = animate(displayRef.current, target, {
      duration: durationMs / 1000,
      ease: 'easeOut',
      onUpdate: (v) => {
        displayRef.current = Math.round(v);
        setDisplay(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [target, durationMs]);

  return display;
}
