/**
 * Achievement definitions. Evaluated against a player's stats after each round
 * by the AchievementsService. Data-only: add an entry, no code changes.
 */
export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  /** Coin reward granted once unlocked. */
  reward: number;
  icon: string;
  check: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  totalRounds: number;
  totalWins: number;
  totalSpins: number;
  biggestWin: number;
  totalWagered: number;
  level: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-win",
    title: "First Purr",
    description: "Win your first round.",
    reward: 250,
    icon: "trophy",
    check: (s) => s.totalWins >= 1,
  },
  {
    id: "ten-wins",
    title: "Ten Lives",
    description: "Win 10 rounds.",
    reward: 1000,
    icon: "paw-print",
    check: (s) => s.totalWins >= 10,
  },
  {
    id: "hundred-spins",
    title: "Spin Machine",
    description: "Play 100 spins.",
    reward: 2500,
    icon: "refresh-cw",
    check: (s) => s.totalSpins >= 100,
  },
  {
    id: "big-win",
    title: "Big Game Cat",
    description: "Land a single win of 5,000 coins or more.",
    reward: 5000,
    icon: "sparkles",
    check: (s) => s.biggestWin >= 5000,
  },
  {
    id: "whale",
    title: "Whisker Whale",
    description: "Wager 100,000 coins in total.",
    reward: 10000,
    icon: "gem",
    check: (s) => s.totalWagered >= 100000,
  },
  {
    id: "vip",
    title: "Catsino VIP",
    description: "Reach level 10.",
    reward: 25000,
    icon: "crown",
    check: (s) => s.level >= 10,
  },
];
