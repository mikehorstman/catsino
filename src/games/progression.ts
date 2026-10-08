/** Player progression: levels, XP curve and titles. */

export interface LevelDef {
  level: number;
  title: string;
  /** Cumulative XP required to reach this level. */
  xpRequired: number;
  /** Coin reward granted on reaching this level. */
  reward: number;
}

/** xpForLevel(n) = round(100 * n^1.5). Cumulative thresholds are precomputed. */
function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.5));
}

const TITLES: Record<number, string> = {
  1: "Stray Kitten",
  2: "House Cat",
  3: "Alley Cat",
  4: "Lucky Cat",
  5: "Casino Cat",
  6: "High Roller Cat",
  7: "Whisker Whale",
  8: "Catnip Connoisseur",
  9: "Feline Fat Cat",
  10: "Catsino VIP",
};

export const MAX_LEVEL = 10;

export const LEVELS: LevelDef[] = Array.from({ length: MAX_LEVEL }, (_, i) => {
  const level = i + 1;
  return {
    level,
    title: TITLES[level] ?? `Catsino Legend ${level - MAX_LEVEL + 1}`,
    xpRequired: xpForLevel(level),
    reward: level === 1 ? 0 : 500 * (level - 1),
  };
});

/** Total XP needed to advance from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  return LEVELS[level].xpRequired - LEVELS[level - 1].xpRequired;
}

export function levelForXp(xp: number): number {
  let level = 1;
  for (const def of LEVELS) {
    if (xp >= def.xpRequired) level = def.level;
    else break;
  }
  return level;
}

export function levelDef(level: number): LevelDef {
  return LEVELS[Math.min(level, MAX_LEVEL) - 1];
}

/** XP earned for a round: 1 per 10 coins wagered, capped at 200 per round. */
export function xpForBet(amount: number): number {
  return Math.min(200, Math.floor(amount / 10));
}

/**
 * Resolve a level-up, returning coins owed for every level crossed.
 * Pure so it can be unit tested.
 */
export function resolveLevelUp(
  previousXp: number,
  gainedXp: number,
): { newLevel: number; rewards: number; levelsGained: number } {
  const before = levelForXp(previousXp);
  const after = levelForXp(previousXp + gainedXp);
  let rewards = 0;
  for (let level = before + 1; level <= after; level += 1) {
    rewards += levelDef(level).reward;
  }
  return { newLevel: after, rewards, levelsGained: after - before };
}
