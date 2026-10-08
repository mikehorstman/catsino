/**
 * Slot engine types.
 *
 * A slot is fully described by data (a `SlotConfig`): reel strips, symbols,
 * paylines and paytable. The engine interprets that data — adding a new slot
 * means adding a config, not writing new code.
 */

export type SymbolKind = "regular" | "wild" | "scatter";

export interface SlotSymbol {
  id: string;
  kind: SymbolKind;
  /** Higher weight = more common on the reels. */
  weight: number;
}

/** A reel strip is a list of symbol ids (already expanded by weight). */
export type ReelStrip = string[];

export interface FreeSpinsFeature {
  type: "freeSpins";
  triggerSymbol: string;
  triggerCount: number;
  spins: number;
  multiplier: number;
}

export interface PickBonusFeature {
  type: "pickBonus";
  /** Scatter-style symbol that triggers the bonus. */
  triggerSymbol: string;
  triggerCount: number;
  /** Grid dimensions of the pick board. */
  rows: number;
  cols: number;
  /** How many cells the player may reveal. */
  picks: number;
  /** Coin-multiplier values available on the board (of the triggering bet). */
  multipliers: number[];
  /** Cells that double everything collected afterwards. */
  x2Count: number;
  /** "Cat burglar" cells that steal a multiplier from the board. */
  thiefCount: number;
  /** Cell value stolen by a thief, as a multiplier of the bet. */
  thiefSteal: number;
}

export type SlotFeature = FreeSpinsFeature | PickBonusFeature;

export interface SlotConfig {
  id: string;
  name: string;
  version: number;
  rows: number;
  cols: number;
  symbols: SlotSymbol[];
  /** Weighted strips; one strip per column (or fewer, cycled). */
  reelStrips: ReelStrip[];
  /** Each payline is `cols` row indices (0-based, top row = 0). */
  paylines: number[][];
  /** paytable[symbolId][matchCount] = multiplier of the total line bet. */
  paytable: Record<string, Record<number, number>>;
  features: SlotFeature[];
  betLevels: number[];
  /** Target return-to-player, used by the RTP simulation only. */
  rtpTarget: number;
}

export interface LineWin {
  lineIndex: number;
  symbolId: string;
  count: number;
  /** Rows (one per matched column) for the winning overlay. */
  positions: { col: number; row: number }[];
  multiplier: number;
  payout: number;
}

export interface SpinResult {
  /** Final reel stop index per column, consumed by the PixiJS scene. */
  stops: number[];
  /** grid[row][col] = symbol id. */
  grid: string[][];
  lineWins: LineWin[];
  scatterCount: number;
  scatterWin: number;
  freeSpinsAwarded: number;
  pickBonusAwarded: boolean;
  multiplier: number;
  totalWin: number;
}

export interface PickCell {
  index: number;
  kind: "coin" | "x2" | "thief";
  multiplier: number;
  /** True for the cell stolen by a thief, if any. */
  stolen?: boolean;
}

export interface PickBonusResult {
  cells: PickCell[];
  picks: number;
  /** Revealed cell indices, in pick order. */
  chosen: number[];
  multiplierSum: number;
  doublingApplied: boolean;
  thiefSteal: number;
  totalMultiplier: number;
  /** totalMultiplier × bet — the coins credited. */
  win: number;
}

/** Feature state carried between spins (free spins). */
export interface SpinState {
  freeSpinsRemaining: number;
  freeSpinsMultiplier: number;
}
