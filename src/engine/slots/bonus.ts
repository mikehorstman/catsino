import type { Rng } from "../rng/types";
import { RETRIGGER_MULTIPLIER_STEP } from "./constants";
import type {
  PickBonusFeature,
  PickBonusResult,
  PickCell,
  SpinState,
} from "./types";

/**
 * Pick-and-win bonus board generation.
 *
 * The full board is generated server-side from the RNG. Revealing a cell is a
 * pure lookup, so a player can never get a different value by retrying, and the
 * awarded coins cannot be forged on the client.
 */
export interface GeneratedBoard {
  feature: PickBonusFeature;
  cells: PickCell[];
}

export function generatePickBoard(
  feature: PickBonusFeature,
  rng: Rng,
): GeneratedBoard {
  const count = feature.rows * feature.cols;

  // Kinds: coin / x2 / thief. Any leftover cells are plain "coin" placeholders
  // that are overwritten below.
  const kinds: PickCell["kind"][] = [];
  for (let i = 0; i < feature.x2Count; i += 1) kinds.push("x2");
  for (let i = 0; i < feature.thiefCount; i += 1) kinds.push("thief");
  while (kinds.length < count) kinds.push("coin");
  shuffle(kinds, rng);

  // Assign coin values. The values are drawn from the configured pool then
  // reshuffled so positions and values are independent.
  const values = Array.from(
    { length: count },
    (_, i) => feature.multipliers[i % feature.multipliers.length],
  );
  shuffle(values, rng);

  const cells: PickCell[] = [];
  for (let i = 0; i < count; i += 1) {
    const kind = kinds[i];
    cells.push({
      index: i,
      kind,
      multiplier:
        kind === "coin" ? values[i] : kind === "x2" ? 1 : feature.thiefSteal,
    });
  }
  return { feature, cells };
}

/** Resolve the value of a picked cell. Pure. */
export function resolvePick(board: GeneratedBoard, index: number): PickCell {
  const cell = board.cells[index];
  if (!cell) throw new Error(`invalid pick index: ${index}`);
  return cell;
}

/**
 * Settle a completed bonus board: sum coins, apply doubling, subtract a thief
 * steal if one was hit, then multiply by the triggering bet.
 */
export function settlePickBonus(
  board: GeneratedBoard,
  chosen: number[],
  bet: number,
): PickBonusResult {
  let multiplierSum = 0;
  let doublingApplied = false;
  let thiefSteal = 0;
  let thiefIndex = -1;

  for (const index of chosen) {
    const cell = resolvePick(board, index);
    if (cell.kind === "coin") multiplierSum += cell.multiplier;
    else if (cell.kind === "x2") doublingApplied = true;
    else {
      thiefSteal += cell.multiplier;
      thiefIndex = index;
    }
  }

  if (doublingApplied) multiplierSum *= 2;
  const net = Math.max(0, multiplierSum - thiefSteal);

  // Mark the stolen cell so the UI can flag it.
  const cells = board.cells.map((c) =>
    c.index === thiefIndex ? { ...c, stolen: true } : c,
  );

  return {
    cells,
    picks: board.feature.picks,
    chosen,
    multiplierSum: net,
    doublingApplied,
    thiefSteal,
    totalMultiplier: net,
    win: Math.floor(net * bet),
  };
}

/** Fisher–Yates shuffle using the injected RNG. */
function shuffle<T>(items: T[], rng: Rng): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [items[i], items[j]] = [items[j], items[i]];
  }
}

export function nextFreeSpinMultiplier(state: SpinState): number {
  return state.freeSpinsMultiplier + RETRIGGER_MULTIPLIER_STEP;
}
