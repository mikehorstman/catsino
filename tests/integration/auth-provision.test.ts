import { describe, it, expect } from "vitest";
import { createMemoryStore } from "@/server/store/memory";
import { AuthService, welcomeTransactionId } from "@/server/services/auth";
import { WalletService } from "@/server/store/wallet";
import { WELCOME_BONUS } from "@/server/services/bonus";

const profile = { uid: "uid-123", email: "Cat@Example.com ", displayName: "Whiskers" };

describe("AuthService.provision", () => {
  it("creates the profile, wallet and a single welcome ledger entry", async () => {
    const store = createMemoryStore();
    const { user, created } = await new AuthService(store).provision(profile);

    expect(created).toBe(true);
    expect(user.id).toBe("uid-123");
    expect(user.email).toBe("cat@example.com");
    expect(user.displayName).toBe("Whiskers");
    expect(await new WalletService(store).getBalance("uid-123")).toBe(WELCOME_BONUS);

    const ledger = await store.listTransactions("uid-123");
    expect(ledger).toHaveLength(1);
    expect(ledger[0].id).toBe(welcomeTransactionId("uid-123"));
    expect(ledger[0].type).toBe("welcome");
  });

  it("is idempotent: repeat logins never re-credit the bonus", async () => {
    const store = createMemoryStore();
    const service = new AuthService(store);
    await service.provision(profile);
    const second = await service.provision(profile);

    expect(second.created).toBe(false);
    expect(await new WalletService(store).getBalance("uid-123")).toBe(WELCOME_BONUS);
    expect(await store.listTransactions("uid-123")).toHaveLength(1);
  });

  it("is safe under concurrent first requests", async () => {
    const store = createMemoryStore();
    const service = new AuthService(store);
    const results = await Promise.all(Array.from({ length: 8 }, () => service.provision(profile)));

    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(await new WalletService(store).getBalance("uid-123")).toBe(WELCOME_BONUS);
    expect(await store.listTransactions("uid-123")).toHaveLength(1);
  });

  it("keeps the ledger reconcilable with the cached balance", async () => {
    const store = createMemoryStore();
    await new AuthService(store).provision(profile);
    expect((await new WalletService(store).verify("uid-123")).ok).toBe(true);
  });

  it("falls back to the email local-part when no display name is given", async () => {
    const { user } = await new AuthService(createMemoryStore()).provision({
      uid: "u2",
      email: "mr.fluffy@catsino.test",
    });
    expect(user.displayName).toBe("mr.fluffy");
  });
});
