import type { SlotConfig } from "@/engine/slots/types";

/** Standard 5x3, 20-payline layout shared by the Catsino slots. */
export const CLASSIC_PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 2, 2, 2, 1],
  [1, 0, 0, 0, 1],
  [1, 2, 1, 0, 1],
  [1, 0, 1, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [0, 2, 2, 2, 0],
];

export const CLASSIC_BET_LEVELS = [10, 20, 50, 100, 250, 500, 1000];

/**
 * CAT MEOW — the flagship starter slot.
 * Different cat breeds plus fish, yarn and paw prints, a golden wild cat and a
 * bell scatter that triggers free spins.
 */
export const CAT_MEOW: SlotConfig = {
  id: "cat-meow",
  name: "Cat Meow",
  version: 1,
  rows: 3,
  cols: 5,
  symbols: [
    { id: "golden-cat", kind: "wild", weight: 2 },
    { id: "cat-royal", kind: "regular", weight: 6 },
    { id: "cat-calico", kind: "regular", weight: 9 },
    { id: "cat-tabby", kind: "regular", weight: 12 },
    { id: "cat-black", kind: "regular", weight: 15 },
    { id: "fish", kind: "regular", weight: 18 },
    { id: "yarn", kind: "regular", weight: 20 },
    { id: "paw", kind: "regular", weight: 24 },
    { id: "mouse", kind: "regular", weight: 4 },
    { id: "bell", kind: "scatter", weight: 4 },
  ],
  reelStrips: [[], [], [], [], []],
  paylines: CLASSIC_PAYLINES,
  paytable: {
    "golden-cat": { 3: 10, 4: 50, 5: 200 },
    "cat-royal": { 3: 8, 4: 40, 5: 150 },
    "cat-calico": { 3: 6, 4: 25, 5: 100 },
    "cat-tabby": { 3: 5, 4: 20, 5: 80 },
    "cat-black": { 3: 4, 4: 15, 5: 60 },
    fish: { 3: 3, 4: 10, 5: 40 },
    yarn: { 3: 2, 4: 8, 5: 30 },
    paw: { 3: 2, 4: 6, 5: 20 },
    bell: { 3: 2, 4: 10, 5: 50 },
  },
  features: [
    {
      type: "freeSpins",
      triggerSymbol: "bell",
      triggerCount: 3,
      spins: 10,
      multiplier: 2,
    },
    {
      type: "pickBonus",
      triggerSymbol: "mouse",
      triggerCount: 3,
      rows: 3,
      cols: 3,
      picks: 3,
      multipliers: [1, 2, 2, 3, 3, 5, 5, 8, 10],
      x2Count: 1,
      thiefCount: 1,
      thiefSteal: 3,
    },
  ],
  betLevels: CLASSIC_BET_LEVELS,
  rtpTarget: 0.95,
};
