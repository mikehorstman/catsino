import type { LineWin, SlotConfig, SpinResult } from "./types";
import type { Rng } from "../rng/types";

/**
 * Expand a symbol weight table into a flat strip so that picking a uniform
 * index is equivalent to a weighted pick. Done once at config load.
 */
export function buildStrip(config: SlotConfig, column: number): string[] {
  const source = config.reelStrips[column % config.reelStrips.length];
  if (source.length > 0) return source;

  const strip: string[] = [];
  for (const symbol of config.symbols) {
    for (let i = 0; i < symbol.weight; i += 1) strip.push(symbol.id);
  }
  return strip;
}

/** Build the visible grid from the final reel stops. */
export function buildGrid(config: SlotConfig, stops: number[]): string[][] {
  const grid: string[][] = Array.from({ length: config.rows }, () =>
    Array.from({ length: config.cols }, () => ""),
  );

  for (let col = 0; col < config.cols; col += 1) {
    const strip = buildStrip(config, col);
    for (let row = 0; row < config.rows; row += 1) {
      grid[row][col] = strip[(stops[col] + row) % strip.length];
    }
  }
  return grid;
}

function isWild(config: SlotConfig, symbolId: string): boolean {
  const symbol = config.symbols.find((s) => s.id === symbolId);
  return symbol?.kind === "wild";
}

/** Count leading matches on a payline, allowing wilds to substitute. */
function matchLine(
  config: SlotConfig,
  grid: string[][],
  payline: number[],
): { symbolId: string; count: number; positions: { col: number; row: number }[] } {
  let base = "";
  let count = 0;
  const positions: { col: number; row: number }[] = [];

  for (let col = 0; col < config.cols; col += 1) {
    const row = payline[col];
    const symbolId = grid[row][col];

    if (isWild(config, symbolId)) {
      count += 1;
      positions.push({ col, row });
      continue;
    }

    if (base === "") {
      base = symbolId;
      count += 1;
      positions.push({ col, row });
      continue;
    }

    if (symbolId === base) {
      count += 1;
      positions.push({ col, row });
      continue;
    }
    break;
  }

  return { symbolId: base, count, positions };
}

function paytableFor(config: SlotConfig, symbolId: string): Record<number, number> {
  return config.paytable[symbolId] ?? {};
}

/**
 * Evaluate all paylines and scatters for a grid.
 * Pure: same inputs always produce the same output.
 */
export function evaluateSpin(
  config: SlotConfig,
  grid: string[][],
  lineBet: number,
  multiplier = 1,
): Pick<SpinResult, "lineWins" | "scatterCount" | "scatterWin"> {
  const lineWins: LineWin[] = [];

  config.paylines.forEach((payline, lineIndex) => {
    const { symbolId, count, positions } = matchLine(config, grid, payline);
    if (symbolId === "" || count < 3) return;

    const payouts = paytableFor(config, symbolId);
    const symbolMultiplier = payouts[count];
    if (!symbolMultiplier) return;
    // A winning line pays on the leading run only.
    if (positions.length < count) return;

    const leadingPositions = positions.slice(0, count);
    const payout = Math.floor(lineBet * symbolMultiplier * multiplier);
    lineWins.push({
      lineIndex,
      symbolId,
      count,
      positions: leadingPositions,
      multiplier: symbolMultiplier * multiplier,
      payout,
    });
  });

  const scatterSymbol = config.symbols.find((s) => s.kind === "scatter");
  let scatterCount = 0;
  let scatterWin = 0;

  if (scatterSymbol) {
    for (let row = 0; row < config.rows; row += 1) {
      for (let col = 0; col < config.cols; col += 1) {
        if (grid[row][col] === scatterSymbol.id) scatterCount += 1;
      }
    }
    const scatterPayouts = paytableFor(config, scatterSymbol.id);
    const scatterMultiplier = scatterPayouts[scatterCount] ?? 0;
    scatterWin = Math.floor(lineBet * scatterMultiplier * multiplier);
  }

  return { lineWins, scatterCount, scatterWin };
}

/** Feature state carried between spins (free spins). */
export interface SpinState {
  freeSpinsRemaining: number;
  freeSpinsMultiplier: number;
}

/**
 * Run one slot spin. This is the single entry point the server calls.
 * `state` carries free-spin progress so bonus rounds span multiple rounds.
 */
export function spinSlot(
  config: SlotConfig,
  bet: number,
  rng: Rng,
  state?: SpinState,
): SpinResult & { nextState: SpinState } {
  const isFreeSpin = (state?.freeSpinsRemaining ?? 0) > 0;
  const multiplier = isFreeSpin ? (state?.freeSpinsMultiplier ?? 1) : 1;
  const lineBet = Math.floor(bet / config.paylines.length);

  const stops: number[] = [];
  for (let col = 0; col < config.cols; col += 1) {
    const strip = buildStrip(config, col);
    stops.push(rng.int(0, strip.length - 1));
  }

  const grid = buildGrid(config, stops);
  const { lineWins, scatterCount, scatterWin } = evaluateSpin(config, grid, lineBet, multiplier);

  let freeSpinsAwarded = 0;
  for (const feature of config.features) {
    if (feature.type === "freeSpins" && scatterCount >= feature.triggerCount) {
      freeSpinsAwarded += feature.spins;
    }
  }

  const lineTotal = lineWins.reduce((sum, win) => sum + win.payout, 0);
  const totalWin = lineTotal + scatterWin;

  const remainingFromPrevious = state?.freeSpinsRemaining ?? 0;
  const consumed = isFreeSpin ? remainingFromPrevious - 1 : 0;
  const nextState: SpinState = {
    freeSpinsRemaining: Math.max(0, consumed + freeSpinsAwarded),
    freeSpinsMultiplier: multiplier,
  };

  return {
    stops,
    grid,
    lineWins,
    scatterCount,
    scatterWin,
    freeSpinsAwarded,
    multiplier,
    totalWin,
    nextState,
  };
}
