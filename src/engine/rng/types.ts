/**
 * Random number generator abstraction.
 *
 * The game engine NEVER calls `Math.random` or `crypto` directly — it takes an
 * `Rng` dependency. Production wires in the secure CSPRNG; tests wire in the
 * deterministic seeded PRNG so every outcome is reproducible.
 */
export interface Rng {
  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Uniform float in [0, 1). */
  float(): number;
  /** Pick a uniformly random element from a non-empty array. */
  pick<T>(items: readonly T[]): T;
}
