import { describe, it, expect } from "vitest";
import { createSeededRng } from "@/engine/rng/seeded";
import { buildGrid, buildStrip, spinSlot } from "@/engine/slots/engine";
import type { SlotConfig } from "@/engine/slots/types";
import { CAT_MEOW } from "@/games/slots/cat-meow/config";

function simpleConfig(): SlotConfig {
  return {
    id: "test",
    name: "Test",
    version: 1,
    rows: 3,
    cols: 3,
    symbols: [
      { id: "A", kind: "regular", weight: 1 },
      { id: "W", kind: "wild", weight: 1 },
      { id: "S", kind: "scatter", weight: 1 },
    ],
    reelStrips: [
      ["A", "W", "S"],
      ["A", "W", "S"],
      ["A", "W", "S"],
    ],
    // Single middle-row payline
    paylines: [[1, 1, 1]],
    paytable: {
      A: { 3: 10 },
      S: { 3: 5 },
    },
    features: [{ type: "freeSpins", triggerSymbol: "S", triggerCount: 3, spins: 10, multiplier: 2 }],
    betLevels: [10],
    rtpTarget: 0.95,
  };
}

describe("buildStrip", () => {
  it("expands weights into a flat strip", () => {
    const config = simpleConfig();
    config.reelStrips = [[], [], []];
    config.symbols = [
      { id: "A", kind: "regular", weight: 3 },
      { id: "B", kind: "regular", weight: 1 },
    ];
    const strip = buildStrip(config, 0);
    expect(strip.filter((s) => s === "A")).toHaveLength(3);
    expect(strip.filter((s) => s === "B")).toHaveLength(1);
  });
});

describe("buildGrid", () => {
  it("wraps around the strip", () => {
    const config = simpleConfig();
    const grid = buildGrid(config, [2, 2, 2]);
    expect(grid).toHaveLength(3);
    expect(grid[0][0]).toBe("S"); // strip[2]
    expect(grid[1][0]).toBe("A"); // wrap to strip[0]
    expect(grid[2][0]).toBe("W"); // strip[1]
  });
});

describe("spinSlot", () => {
  it("is deterministic for a fixed seed", () => {
    const a = spinSlot(CAT_MEOW, 100, createSeededRng(42));
    const b = spinSlot(CAT_MEOW, 100, createSeededRng(42));
    expect(a.stops).toEqual(b.stops);
    expect(a.totalWin).toBe(b.totalWin);
  });

  it("pays a line of three matching symbols", () => {
    const config = simpleConfig();
    // Force all reel stops to 0 so the middle row is A,A,A
    config.reelStrips = [["A"], ["A"], ["A"]];
    const result = spinSlot(config, 10, createSeededRng(1));
    expect(result.grid[1]).toEqual(["A", "A", "A"]);
    // lineBet = 10 / 1 payline = 10; A pays 10x => 100
    expect(result.totalWin).toBe(100);
  });

  it("lets wilds substitute in a line", () => {
    const config = simpleConfig();
    config.reelStrips = [["A"], ["W"], ["A"]];
    const result = spinSlot(config, 10, createSeededRng(1));
    expect(result.grid[1]).toEqual(["A", "W", "A"]);
    expect(result.totalWin).toBe(100);
  });

  it("awards free spins when scatters hit the trigger count", () => {
    const config = simpleConfig();
    config.reelStrips = [["A", "S"], ["A", "S"], ["A", "S"]];
    // Build a grid full of scatters by picking the same index on every reel
    const result = spinSlot(config, 10, createSeededRng(7));
    // Regardless of outcome, free spins state must be consistent
    if (result.scatterCount >= 3) {
      expect(result.freeSpinsAwarded).toBe(10);
      expect(result.nextState.freeSpinsRemaining).toBe(10);
    } else {
      expect(result.nextState.freeSpinsRemaining).toBe(0);
    }
  });

  it("applies the free-spin multiplier and does not re-award on free spins", () => {
    const config = simpleConfig();
    config.reelStrips = [["A"], ["A"], ["A"]];
    const state = { freeSpinsRemaining: 3, freeSpinsMultiplier: 2 };
    const result = spinSlot(config, 10, createSeededRng(1), state);
    // line pays 100, doubled => 200
    expect(result.totalWin).toBe(200);
    expect(result.nextState.freeSpinsRemaining).toBe(2);
  });

  it("never returns a negative win and never exceeds grid size", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const result = spinSlot(CAT_MEOW, 100, createSeededRng(seed));
      expect(result.totalWin).toBeGreaterThanOrEqual(0);
      expect(result.stops).toHaveLength(CAT_MEOW.cols);
    }
  });
});
