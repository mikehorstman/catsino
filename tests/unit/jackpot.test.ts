import { describe, it, expect } from "vitest";
import { createMemoryStore } from "@/server/store/memory";
import { JackpotService, JACKPOT_CONTRIBUTION } from "@/server/services/jackpot";
import { WalletService } from "@/server/store/wallet";
import { AuthService } from "@/server/services/auth";
import { createSeededRng } from "@/engine/rng/seeded";
import type { Rng } from "@/engine/rng/types";

/** RNG that always/never hits the jackpot roll. */
function fixedRng(floatValue: number): Rng {
  return { float: () => floatValue, int: (min) => min, pick: (a) => a[0] };
}

describe("JackpotService", () => {
  it("starts at the seed pool", () => {
    const store = createMemoryStore();
    expect(new JackpotService(store, createSeededRng(1)).getPool()).toBe(250_000);
  });

  it("grows the pool by a share of each bet", () => {
    const store = createMemoryStore();
    const service = new JackpotService(store, createSeededRng(1));
    service.contribute(1000);
    expect(service.getPool()).toBe(250_000 + Math.floor(1000 * JACKPOT_CONTRIBUTION));
  });

  it("does not contribute on a zero bet", () => {
    const store = createMemoryStore();
    const service = new JackpotService(store, createSeededRng(1));
    service.contribute(0);
    expect(service.getPool()).toBe(250_000);
  });

  it("pays the whole pool and resets it on a win", () => {
    const store = createMemoryStore();
    const user = new AuthService(store).createGuest();
    const service = new JackpotService(store, fixedRng(0)); // always hits

    const win = service.roll(user.id, user.displayName, 100);
    expect(win).not.toBeNull();
    expect(win!.amount).toBe(250_000);
    expect(service.getPool()).toBe(250_000); // reset to seed
    expect(new WalletService(store).getBalance(user.id)).toBe(10_000 + 250_000);

    const jackpot = store.getJackpot();
    expect(jackpot.lastWonBy).toBe(user.id);
    expect(jackpot.lastWonAmount).toBe(250_000);
  });

  it("does not pay when the roll misses", () => {
    const store = createMemoryStore();
    const user = new AuthService(store).createGuest();
    const service = new JackpotService(store, fixedRng(0.999)); // never hits
    expect(service.roll(user.id, user.displayName, 100)).toBeNull();
    expect(new WalletService(store).getBalance(user.id)).toBe(10_000);
  });

  it("gives bigger bets better odds", () => {
    // A float just above the base chance misses at bet 100 but hits at bet 1000.
    const store = createMemoryStore();
    const user = new AuthService(store).createGuest();
    const probe = 1 / 50_000 * 1.5; // between 1x and 5x bonus
    const service = new JackpotService(store, fixedRng(probe));
    expect(service.roll(user.id, user.displayName, 100)).toBeNull();
    expect(service.roll(user.id, user.displayName, 1000)).not.toBeNull();
  });
});
