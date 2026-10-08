import { randomInt } from "node:crypto";
import type { Rng } from "./types";

/**
 * Cryptographically secure RNG for production. Server-only.
 * Uses Node's CSPRNG via `crypto.randomInt`, which is unbiased.
 */
export function createSecureRng(): Rng {
  return {
    int(min, max) {
      if (max < min) throw new Error(`invalid rng range: ${min}..${max}`);
      return randomInt(min, max + 1);
    },
    float() {
      // randomInt gives unbiased integers; scale 2^48 to a [0,1) float.
      // randomInt's upper bound is exclusive and max-min must be <= 2^48-1.
      const RANGE = 2 ** 48 - 1;
      return randomInt(0, RANGE) / RANGE;
    },
    pick(items) {
      if (items.length === 0) throw new Error("cannot pick from empty array");
      return items[randomInt(0, items.length)];
    },
  };
}
