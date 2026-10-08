import { describe, it, expect } from "vitest";
import { createMemoryStore } from "@/server/store/memory";
import { AuthService } from "@/server/services/auth";
import { RoundService } from "@/server/services/round";
import { WalletService } from "@/server/store/wallet";
import { createSeededRng } from "@/engine/rng/seeded";
import { CAT_MEOW } from "@/games/slots/cat-meow/config";
import { WELCOME_BONUS } from "@/server/services/bonus";

describe("guest accounts", () => {
  it("creates a guest with a welcome balance and no password", async () => {
    const store = createMemoryStore();
    const guest = await new AuthService(store).createGuest();

    expect(guest.isGuest).toBe(true);
    expect(guest.passwordHash).toBe("");
    expect(guest.level).toBe(1);
    expect(await new WalletService(store).getBalance(guest.id)).toBe(
      WELCOME_BONUS,
    );
  });

  it("reuses the provided id so the guest is stable across requests", async () => {
    const store = createMemoryStore();
    const guest = await new AuthService(store).createGuest("stable-guest-id");
    expect(guest.id).toBe("stable-guest-id");
    expect(await store.getUserById("stable-guest-id")).toBeDefined();
  });

  it("lets a guest play a slot round without signing in", async () => {
    const store = createMemoryStore();
    const guest = await new AuthService(store).createGuest();
    const service = new RoundService(store, createSeededRng(3));

    const response = await service.playSlot({
      user: guest,
      config: CAT_MEOW,
      bet: 20,
      idempotencyKey: crypto.randomUUID(),
    });

    expect(response.kind).toBe("slots");
    expect(await store.countRounds(guest.id)).toBe(1);
    expect(
      await new WalletService(store).getBalance(guest.id),
    ).toBeGreaterThanOrEqual(0);
  });
});
