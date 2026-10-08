import type { SlotConfig } from "@/engine/slots/types";
import { CLASSIC_BET_LEVELS, CLASSIC_PAYLINES } from "../cat-meow/config";

/**
 * NEKO NIGHTS — Japanese-inspired cat slot with lucky cats, lanterns and
 * cherry blossoms. Same engine, different data.
 */
export const NEKO_NIGHTS: SlotConfig = {
  id: "neko-nights",
  name: "Neko Nights",
  version: 1,
  rows: 3,
  cols: 5,
  symbols: [
    { id: "lucky-cat", kind: "wild", weight: 2 },
    { id: "neon-neko", kind: "regular", weight: 7 },
    { id: "samurai-cat", kind: "regular", weight: 10 },
    { id: "lantern", kind: "regular", weight: 13 },
    { id: "sakura", kind: "regular", weight: 16 },
    { id: "koi", kind: "regular", weight: 19 },
    { id: "sushi", kind: "regular", weight: 22 },
    { id: "fan", kind: "regular", weight: 25 },
    { id: "bento", kind: "regular", weight: 4 },
    { id: "wind-chime", kind: "scatter", weight: 4 },
  ],
  reelStrips: [[], [], [], [], []],
  paylines: CLASSIC_PAYLINES,
  paytable: {
    "lucky-cat": { 3: 12, 4: 60, 5: 250 },
    "neon-neko": { 3: 9, 4: 45, 5: 180 },
    "samurai-cat": { 3: 7, 4: 28, 5: 110 },
    lantern: { 3: 6, 4: 22, 5: 90 },
    sakura: { 3: 5, 4: 18, 5: 70 },
    koi: { 3: 4, 4: 12, 5: 45 },
    sushi: { 3: 2, 4: 8, 5: 30 },
    fan: { 3: 2, 4: 6, 5: 20 },
    "wind-chime": { 3: 2, 4: 12, 5: 60 },
  },
  features: [
    {
      type: "freeSpins",
      triggerSymbol: "wind-chime",
      triggerCount: 3,
      spins: 12,
      multiplier: 3,
    },
    {
      type: "pickBonus",
      triggerSymbol: "bento",
      triggerCount: 3,
      rows: 3,
      cols: 3,
      picks: 3,
      multipliers: [1, 2, 3, 3, 5, 5, 8, 10, 15],
      x2Count: 1,
      thiefCount: 1,
      thiefSteal: 5,
    },
  ],
  betLevels: CLASSIC_BET_LEVELS,
  rtpTarget: 0.95,
};
