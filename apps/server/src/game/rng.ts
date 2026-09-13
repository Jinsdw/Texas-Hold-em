/** 随机数生成器接口：返回 [0, 1) 浮点数 */
export type Rng = () => number;

/**
 * mulberry32 种子随机数（仅测试与重放调试用）。
 * 生产环境使用默认的 Math.random 即可，洗牌不需要密码学强度。
 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
