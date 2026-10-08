import { hashPassword, verifyPassword } from "@/server/auth/password";
import { newId } from "@/server/store/memory";
import type { Store, UserRecord } from "@/server/store/types";
import { WalletService } from "@/server/store/wallet";
import { WELCOME_BONUS } from "./bonus";

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export class AuthService {
  private wallet: WalletService;
  constructor(private store: Store) {
    this.wallet = new WalletService(store);
  }

  async register(input: { email: string; displayName: string; password: string }): Promise<UserRecord> {
    const email = input.email.trim().toLowerCase();
    if (this.store.getUserByEmail(email)) {
      throw new AuthError("EMAIL_TAKEN", "That email is already registered");
    }

    const user: UserRecord = {
      id: newId(),
      email,
      displayName: input.displayName.trim() || "Anonymous Cat",
      passwordHash: await hashPassword(input.password),
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
    };
    this.store.createUser(user);
    this.store.putWallet({ userId: user.id, balance: 0, version: 0 });

    // Welcome bonus credited through the ledger.
    this.wallet.apply({
      userId: user.id,
      type: "welcome",
      amount: WELCOME_BONUS,
      refType: "signup",
    });

    return user;
  }

  /**
   * Create a guest account. No email or password — the app is playable
   * immediately, and the guest can register later to keep their progress.
   * Pass `id` to reuse the stable id from the guest cookie.
   */
  createGuest(id?: string): UserRecord {
    const userId = id ?? newId();
    const user: UserRecord = {
      id: userId,
      email: `guest-${userId.slice(0, 8)}@catsino.local`,
      displayName: randomGuestName(),
      passwordHash: "",
      role: "player",
      isGuest: true,
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
    };
    this.store.createUser(user);
    this.store.putWallet({ userId: user.id, balance: 0, version: 0 });
    this.wallet.apply({
      userId: user.id,
      type: "welcome",
      amount: WELCOME_BONUS,
      refType: "guest",
    });
    return user;
  }

  async login(email: string, password: string): Promise<UserRecord> {
    const user = this.store.getUserByEmail(email);
    if (!user) throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password");
    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password");
    return user;
  }
}

const GUEST_NAMES = [
  "Whiskers", "Mittens", "Shadow", "Luna", "Tiger", "Smokey", "Ginger",
  "Oreo", "Pepper", "Mochi", "Nala", "Simba", "Cleo", "Felix", "Suki",
];

function randomGuestName(): string {
  const name = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
  return `${name} ${Math.floor(100 + Math.random() * 900)}`;
}
