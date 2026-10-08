import type { Rng } from "./types";

/**
 * Deterministic PRNG (mulberry32) for tests and reproducible simulations.
 * NOT cryptographically secure — never use in production gameplay.
 */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;

  function nextUint32(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  }

  return {
    int(min, max) {
      if (max < min) throw new Error(`invalid rng range: ${min}..${max}`);
      const span = max - min + 1;
      return min + (nextUint32() % span);
    },
    float() {
      return nextUint32() / 2 ** 32;
    },
    pick(items) {
      if (items.length === 0) throw new Error("cannot pick from empty array");
      return items[nextUint32() % items.length];
    },
  };
}
