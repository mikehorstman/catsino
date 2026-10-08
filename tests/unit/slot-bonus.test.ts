import { describe, it, expect } from "vitest";
import { createSeededRng } from "@/engine/rng/seeded";
import {
  generatePickBoard,
  resolvePick,
  settlePickBonus,
} from "@/engine/slots/bonus";
import { spinSlot } from "@/engine/slots/engine";
import type { PickBonusFeature, SlotConfig } from "@/engine/slots/types";
import { CAT_MEOW } from "@/games/slots/cat-meow/config";

const FEATURE: PickBonusFeature = {
  type: "pickBonus",
  triggerSymbol: "mouse",
  triggerCount: 3,
  rows: 3,
  cols: 3,
  picks: 3,
  multipliers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  x2Count: 1,
  thiefCount: 1,
  thiefSteal: 3,
};

describe("pick bonus board", () => {
  it("builds a board of the right size with the configured specials", () => {
    const board = generatePickBoard(FEATURE, createSeededRng(1));
    expect(board.cells).toHaveLength(9);
    expect(board.cells.filter((c) => c.kind === "x2")).toHaveLength(1);
    expect(board.cells.filter((c) => c.kind === "thief")).toHaveLength(1);
    expect(board.cells.filter((c) => c.kind === "coin")).toHaveLength(7);
  });

  it("is deterministic for a fixed seed", () => {
    const a = generatePickBoard(FEATURE, createSeededRng(42));
    const b = generatePickBoard(FEATURE, createSeededRng(42));
    expect(a.cells.map((c) => c.kind)).toEqual(b.cells.map((c) => c.kind));
    expect(a.cells.map((c) => c.multiplier)).toEqual(
      b.cells.map((c) => c.multiplier),
    );
  });

  it("resolves a pick to the stored cell (no re-rolling)", () => {
    const board = generatePickBoard(FEATURE, createSeededRng(7));
    const first = resolvePick(board, 4);
    const second = resolvePick(board, 4);
    expect(first).toEqual(second);
  });

  it("sums coins, applies doubling and subtracts a thief steal", () => {
    // Hand-built board so the maths is unambiguous.
    const board = {
      feature: FEATURE,
      cells: [
        { index: 0, kind: "coin" as const, multiplier: 5 },
        { index: 1, kind: "coin" as const, multiplier: 2 },
        { index: 2, kind: "x2" as const, multiplier: 1 },
        { index: 3, kind: "thief" as const, multiplier: 3 },
      ],
    };
    const result = settlePickBonus(board, [0, 1, 2], 100);
    // (5 + 2) * 2 = 14, no thief picked
    expect(result.multiplierSum).toBe(14);
    expect(result.doublingApplied).toBe(true);
    expect(result.win).toBe(1400);
  });

  it("never returns a negative win when a thief is picked", () => {
    const board = {
      feature: FEATURE,
      cells: [
        { index: 0, kind: "coin" as const, multiplier: 1 },
        { index: 1, kind: "thief" as const, multiplier: 3 },
      ],
    };
    const result = settlePickBonus(board, [0, 1], 100);
    expect(result.win).toBeGreaterThanOrEqual(0);
    expect(result.thiefSteal).toBe(3);
  });
});

describe("slot bonus triggers", () => {
  function configWithBonus(): SlotConfig {
    return {
      ...CAT_MEOW,
      reelStrips: [["mouse"], ["mouse"], ["mouse"], ["mouse"], ["mouse"]],
    };
  }

  it("awards the pick bonus when the trigger symbol count is met", () => {
    const config = configWithBonus();
    const result = spinSlot(config, 100, createSeededRng(1));
    expect(result.pickBonusAwarded).toBe(true);
  });

  it("does not award the pick bonus during free spins", () => {
    const config = configWithBonus();
    const result = spinSlot(config, 100, createSeededRng(1), {
      freeSpinsRemaining: 3,
      freeSpinsMultiplier: 2,
    });
    expect(result.pickBonusAwarded).toBe(false);
  });

  it("escalates the multiplier on a free-spin retrigger", () => {
    const config: SlotConfig = {
      ...CAT_MEOW,
      reelStrips: [["bell"], ["bell"], ["bell"], ["bell"], ["bell"]],
    };
    const result = spinSlot(config, 100, createSeededRng(1), {
      freeSpinsRemaining: 2,
      freeSpinsMultiplier: 2,
    });
    // Retrigger adds 10 spins and bumps the multiplier by 1.
    expect(result.freeSpinsAwarded).toBe(10);
    expect(result.nextState.freeSpinsMultiplier).toBe(3);
  });
});
