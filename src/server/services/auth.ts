import type { Store, UserRecord } from "@/server/store/types";
import { WELCOME_BONUS } from "./bonus";

export interface ProvisionProfile {
  /** Firebase Auth uid; used as the user, wallet and ledger key. */
  uid: string;
  email: string;
  displayName?: string | null;
  provider?: string;
}

/** Deterministic ledger id: a second signup attempt can never mint a second bonus. */
export const welcomeTransactionId = (uid: string) => `welcome_${uid}`;

export class AuthService {
  constructor(private store: Store) {}

  /**
   * Ensure a Firestore profile + wallet exist for an authenticated Firebase
   * user, crediting the one-time welcome bonus on first creation.
   * Idempotent: safe to call on every login and under concurrent requests.
   */
  async provision(
    profile: ProvisionProfile,
  ): Promise<{ user: UserRecord; created: boolean }> {
    const existing = await this.store.getUserById(profile.uid);
    if (existing) return { user: existing, created: false };

    const now = new Date().toISOString();
    const email = profile.email.trim().toLowerCase();
    const user: UserRecord = {
      id: profile.uid,
      email,
      displayName:
        profile.displayName?.trim().slice(0, 40) ||
        email.split("@")[0] ||
        "Anonymous Cat",
      role: "player",
      provider: profile.provider,
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

    const created = await this.store.provisionUser({
      user,
      wallet: { userId: user.id, balance: WELCOME_BONUS, version: 1 },
      transaction: {
        id: welcomeTransactionId(user.id),
        userId: user.id,
        type: "welcome",
        amount: WELCOME_BONUS,
        balanceAfter: WELCOME_BONUS,
        refType: "signup",
        createdAt: now,
      },
    });
    if (created) return { user, created: true };

    // Lost a race with a concurrent provision: return the winner's record.
    const winner = await this.store.getUserById(profile.uid);
    return { user: winner ?? user, created: false };
  }
}
