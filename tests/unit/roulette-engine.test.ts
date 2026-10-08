import { describe, it, expect } from "vitest";
import { createSeededRng } from "@/engine/rng/seeded";
import { spinRoulette } from "@/engine/roulette/engine";
import { payoutForBet, validateBetShape, WHEEL_ORDER, isRed, isBlack } from "@/engine/roulette/bets";
import type { Bet } from "@/engine/roulette/types";

describe("roulette payouts", () => {
  it("pays straight up at 35:1 (36x return)", () => {
    expect(payoutForBet("straight", 100)).toBe(3600);
  });
  it("pays outside bets at even money (2x return)", () => {
    for (const type of ["red", "black", "odd", "even", "low", "high"] as const) {
      expect(payoutForBet(type, 100)).toBe(200);
    }
  });
  it("pays dozens and columns at 2:1 (3x return)", () => {
    expect(payoutForBet("dozen", 100)).toBe(300);
    expect(payoutForBet("column", 100)).toBe(300);
  });
});

describe("wheel properties", () => {
  it("has 37 pockets covering 0..36", () => {
    expect(WHEEL_ORDER).toHaveLength(37);
    expect(new Set(WHEEL_ORDER).size).toBe(37);
    expect(Math.min(...WHEEL_ORDER)).toBe(0);
    expect(Math.max(...WHEEL_ORDER)).toBe(36);
  });
  it("zero is neither red nor black", () => {
    expect(isRed(0)).toBe(false);
    expect(isBlack(0)).toBe(false);
  });
});

describe("validateBetShape", () => {
  it("rejects a wrong-sized split", () => {
    const bet: Bet = { type: "split", selection: [1, 2, 3], amount: 10 };
    expect(validateBetShape(bet)).not.toBeNull();
  });
  it("accepts a valid corner", () => {
    const bet: Bet = { type: "corner", selection: [1, 2, 4, 5], amount: 10 };
    expect(validateBetShape(bet)).toBeNull();
  });
  it("rejects non-integer amounts", () => {
    const bet: Bet = { type: "red", selection: [], amount: 10.5 };
    expect(validateBetShape(bet)).not.toBeNull();
  });
});

describe("spinRoulette", () => {
  it("resolves a straight-up win correctly", () => {
    // Deterministic rng that always returns the chosen number via int()
    const rng = { int: () => 17, float: () => 0, pick: <T,>(a: readonly T[]) => a[0] };
    const bets: Bet[] = [
      { type: "straight", selection: [17], amount: 100 },
      { type: "straight", selection: [18], amount: 100 },
      { type: "red", selection: [], amount: 50 },
    ];
    const result = spinRoulette(bets, rng);
    expect(result.winningNumber).toBe(17);
    expect(result.outcomes[0].won).toBe(true);
    expect(result.outcomes[0].payout).toBe(3600);
    expect(result.outcomes[1].won).toBe(false);
    expect(result.totalBet).toBe(250);
  });

  it("returns deterministic results for a fixed seed", () => {
    const bets: Bet[] = [{ type: "red", selection: [], amount: 100 }];
    const a = spinRoulette(bets, createSeededRng(123));
    const b = spinRoulette(bets, createSeededRng(123));
    expect(a.winningNumber).toBe(b.winningNumber);
  });

  it("is roughly fair across many spins (RTP trend under 1.05)", () => {
    let wagered = 0;
    let returned = 0;
    const rng = createSeededRng(2026);
    for (let i = 0; i < 200_000; i += 1) {
      const bets: Bet[] = [
        { type: "red", selection: [], amount: 10 },
        { type: "black", selection: [], amount: 10 },
      ];
      const r = spinRoulette(bets, rng);
      wagered += r.totalBet;
      returned += r.totalPayout;
    }
    const rtp = returned / wagered;
    // Two opposite even-money bets should land near 36/37 = 0.973
    expect(rtp).toBeGreaterThan(0.93);
    expect(rtp).toBeLessThan(1.01);
  });
});
