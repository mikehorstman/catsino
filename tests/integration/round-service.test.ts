import { describe, it, expect } from "vitest";
import { createMemoryStore } from "@/server/store/memory";
import { WalletService } from "@/server/store/wallet";
import { RoundService } from "@/server/services/round";
import { createSeededRng } from "@/engine/rng/seeded";
import { CAT_MEOW } from "@/games/slots/cat-meow/config";
import type { Store, UserRecord } from "@/server/store/types";

async function seedUser(store: Store, balance = 10_000): Promise<UserRecord> {
  const now = new Date().toISOString();
  const user: UserRecord = {
    id: "u1",
    email: "cat@example.com",
    displayName: "Cat",
    passwordHash: "x",
    role: "player",
    createdAt: now,
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
  };
  await store.createUser(user);
  await store.putWallet({ userId: "u1", balance: 0, version: 0 });
  await new WalletService(store).apply({
    userId: "u1",
    type: "welcome",
    amount: balance,
  });
  return user;
}

describe("RoundService (slots)", () => {
  it("settles a spin, records a round and applies XP", async () => {
    const store = createMemoryStore();
    const user = await seedUser(store);
    const service = new RoundService(store, createSeededRng(5));

    const response = await service.playSlot({
      user,
      config: CAT_MEOW,
      bet: 100,
      idempotencyKey: crypto.randomUUID(),
    });

    expect(response.kind).toBe("slots");
    expect(await store.countRounds("u1")).toBe(1);
    const updated = (await store.getUserById("u1"))!;
    expect(updated.totalSpins).toBe(1);
    expect(updated.xp).toBeGreaterThan(0);
    expect(response.balance).toBe(
      await new WalletService(store).getBalance("u1"),
    );
  });

  it("replays the same response for a duplicate idempotency key", async () => {
    const store = createMemoryStore();
    const user = await seedUser(store);
    const service = new RoundService(store, createSeededRng(5));
    const key = crypto.randomUUID();

    const first = await service.playSlot({
      user,
      config: CAT_MEOW,
      bet: 100,
      idempotencyKey: key,
    });
    const second = await service.playSlot({
      user,
      config: CAT_MEOW,
      bet: 100,
      idempotencyKey: key,
    });

    expect(second.roundId).toBe(first.roundId);
    expect(second.balance).toBe(first.balance);
    expect(await store.countRounds("u1")).toBe(1);
  });

  it("rejects an invalid bet level", async () => {
    const store = createMemoryStore();
    const user = await seedUser(store);
    const service = new RoundService(store, createSeededRng(5));
    await expect(
      service.playSlot({
        user,
        config: CAT_MEOW,
        bet: 7,
        idempotencyKey: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/allowed level/i);
  });

  it("rejects a bet larger than the balance", async () => {
    const store = createMemoryStore();
    const user = await seedUser(store, 5);
    const service = new RoundService(store, createSeededRng(5));
    await expect(
      service.playSlot({
        user,
        config: CAT_MEOW,
        bet: 100,
        idempotencyKey: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/INSUFFICIENT_FUNDS|Not enough/i);
  });

  it("serialises concurrent spins so the balance never goes negative", async () => {
    const store = createMemoryStore();
    const user = await seedUser(store, 300); // exactly 3 max spins of 100
    const service = new RoundService(store, createSeededRng(99));

    const attempts = Array.from({ length: 6 }, () =>
      service
        .playSlot({
          user,
          config: CAT_MEOW,
          bet: 100,
          idempotencyKey: crypto.randomUUID(),
        })
        .then(() => "ok" as const)
        .catch(() => "rejected" as const),
    );

    const results = await Promise.all(attempts);
    const wallet = new WalletService(store);
    expect(await wallet.getBalance("u1")).toBeGreaterThanOrEqual(0);
    const check = await wallet.verify("u1");
    expect(check.ok).toBe(true);
    // The wallet must have blocked at least one of the six attempts.
    expect(
      results.filter((r) => r === "rejected").length,
    ).toBeGreaterThanOrEqual(3);
  });
});
