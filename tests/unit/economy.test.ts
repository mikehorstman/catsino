import { describe, it, expect } from "vitest";
import { levelForXp, levelDef, resolveLevelUp, xpForBet, xpToNextLevel } from "@/games/progression";
import { WalletService, WalletError } from "@/server/store/wallet";
import { createMemoryStore } from "@/server/store/memory";
import { BonusService } from "@/server/services/bonus";
import type { UserRecord } from "@/server/store/types";

function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "u1",
    email: "cat@example.com",
    displayName: "Test Cat",
    passwordHash: "x",
    role: "player",
    createdAt: new Date().toISOString(),
    xp: 0,
    level: 1,
    totalRounds: 0,
    totalWins: 0,
    totalSpins: 0,
    biggestWin: 0,
    totalWagered: 0,
    totalWon: 0,
    dailyStreak: 0,
    lastDailyClaim: null,
    lastRefill: null,
    achievements: [],
    ...overrides,
  };
}

describe("progression", () => {
  it("starts at level 1 with 0 xp", () => {
    expect(levelForXp(0)).toBe(1);
  });
  it("levels up at the right thresholds", () => {
    expect(levelForXp(100)).toBe(2); // 100 * 1^1.5 = 100
    expect(levelForXp(283)).toBe(3); // round(100 * 2^1.5) = 283
  });
  it("rewards coins for each level crossed", () => {
    const result = resolveLevelUp(0, 300);
    expect(result.newLevel).toBe(3);
    expect(result.levelsGained).toBe(2);
    expect(result.rewards).toBe(500 + 1000);
  });
  it("caps xp per round", () => {
    expect(xpForBet(1_000_000)).toBe(200);
    expect(xpForBet(100)).toBe(10);
  });
  it("has a strictly increasing xp curve", () => {
    for (let level = 1; level < 10; level += 1) {
      expect(xpToNextLevel(level)).toBeGreaterThan(0);
      expect(levelDef(level + 1).xpRequired).toBeGreaterThan(levelDef(level).xpRequired);
    }
  });
});

describe("WalletService", () => {
  function setup() {
    const store = createMemoryStore();
    const wallet = new WalletService(store);
    store.createUser(makeUser());
    store.putWallet({ userId: "u1", balance: 0, version: 0 });
    // Seed the starting balance through the ledger so `verify` stays consistent.
    wallet.apply({ userId: "u1", type: "welcome", amount: 1000, refType: "test" });
    return { store, wallet };
  }

  it("credits and records a ledger entry", () => {
    const { wallet, store } = setup();
    wallet.apply({ userId: "u1", type: "daily-bonus", amount: 500 });
    expect(wallet.getBalance("u1")).toBe(1500);
    const bonusEntries = store.listTransactions("u1").filter((t) => t.type === "daily-bonus");
    expect(bonusEntries).toHaveLength(1);
  });

  it("throws on insufficient funds and does not mutate", () => {
    const { wallet } = setup();
    expect(() => wallet.apply({ userId: "u1", type: "bet", amount: -2000 })).toThrow(WalletError);
    expect(wallet.getBalance("u1")).toBe(1000);
  });

  it("rejects non-integer amounts", () => {
    const { wallet } = setup();
    expect(() => wallet.apply({ userId: "u1", type: "win", amount: 10.5 })).toThrow(WalletError);
  });

  it("keeps cached balance equal to the ledger", () => {
    const { wallet } = setup();
    wallet.settleRound("u1", 100, 250, "r1");
    const check = wallet.verify("u1");
    expect(check.ok).toBe(true);
    expect(check.cached).toBe(1150);
  });

  it("rolls back the debit when the bet is unaffordable in settleRound", () => {
    const { wallet } = setup();
    expect(() => wallet.settleRound("u1", 5000, 0, "r0")).toThrow(WalletError);
    expect(wallet.getBalance("u1")).toBe(1000);
  });
});

describe("BonusService", () => {
  function setup(user: Partial<UserRecord> = {}) {
    const store = createMemoryStore();
    const wallet = new WalletService(store);
    const bonus = new BonusService(store, wallet);
    const u = makeUser(user);
    store.createUser(u);
    store.putWallet({ userId: u.id, balance: 100, version: 0 });
    return { store, wallet, bonus, user: u };
  }

  it("grants the daily bonus and starts a streak", () => {
    const { bonus, user, wallet } = setup();
    const result = bonus.claimDaily(user);
    expect(result.streak).toBe(1);
    expect(result.amount).toBe(500);
    expect(wallet.getBalance(user.id)).toBe(600);
  });

  it("prevents double claiming on the same day", () => {
    const first = setup();
    first.bonus.claimDaily(first.user);
    const updated = first.store.getUserById(first.user.id)!;
    expect(() => first.bonus.claimDaily(updated)).toThrow();
  });

  it("continues the streak when claimed yesterday", () => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const { bonus, user } = setup({
      lastDailyClaim: yesterday.toISOString().slice(0, 10),
      dailyStreak: 3,
    });
    const result = bonus.claimDaily(user);
    expect(result.streak).toBe(4);
    expect(result.amount).toBe(800);
  });

  it("resets the streak when a day was missed", () => {
    const { bonus, user } = setup({ lastDailyClaim: "2020-01-01", dailyStreak: 5 });
    const result = bonus.claimDaily(user);
    expect(result.streak).toBe(1);
  });

  it("only refills when the balance is low", () => {
    const { bonus, user, wallet } = setup();
    // Balance is 100, above the refill threshold of 10.
    expect(bonus.refillStatus(user).available).toBe(false);
    // Drain the wallet below the threshold and it becomes available.
    wallet.settleRound(user.id, 95, 0, "drain");
    expect(bonus.refillStatus(user).available).toBe(true);
  });
});
