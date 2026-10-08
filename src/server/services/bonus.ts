import type { Store, UserRecord } from "@/server/store/types";
import { WalletService } from "@/server/store/wallet";

export const WELCOME_BONUS = 10000;
export const DAILY_BASE = 500;
export const DAILY_STREAK_STEP = 100;
export const DAILY_MAX_STREAK = 7;
export const REFILL_AMOUNT = 1000;
export const REFILL_COOLDOWN_HOURS = 1;
/** Only allow a refill when the player cannot afford the cheapest bet. */
export const REFILL_THRESHOLD = 10;

export type BonusError = "ALREADY_CLAIMED" | "NOT_ELIGIBLE" | "COOLDOWN";

export class BonusService {
  constructor(
    private store: Store,
    private wallet: WalletService,
  ) {}

  /** UTC date key, e.g. "2026-10-08". */
  private todayKey(now = new Date()): string {
    return now.toISOString().slice(0, 10);
  }

  private yesterdayKey(now = new Date()): string {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - 1);
    return this.todayKey(d);
  }

  dailyRewardFor(streak: number): number {
    const capped = Math.min(streak, DAILY_MAX_STREAK);
    return DAILY_BASE + DAILY_STREAK_STEP * (capped - 1);
  }

  dailyStatus(user: UserRecord): {
    available: boolean;
    streak: number;
    nextReward: number;
  } {
    const claimedToday = user.lastDailyClaim === this.todayKey();
    const continuing = user.lastDailyClaim === this.yesterdayKey();
    const streak = claimedToday
      ? user.dailyStreak
      : continuing
        ? user.dailyStreak + 1
        : 1;
    return {
      available: !claimedToday,
      streak,
      nextReward: this.dailyRewardFor(streak),
    };
  }

  /** Claim the daily bonus. Streak continues only if yesterday was claimed. */
  async claimDaily(
    user: UserRecord,
  ): Promise<{ amount: number; streak: number }> {
    if (user.lastDailyClaim === this.todayKey()) {
      throw new BonusClaimError(
        "ALREADY_CLAIMED",
        "Daily bonus already claimed today",
      );
    }
    const continuing = user.lastDailyClaim === this.yesterdayKey();
    const streak = continuing
      ? Math.min(user.dailyStreak + 1, DAILY_MAX_STREAK)
      : 1;
    const amount = this.dailyRewardFor(streak);

    await this.wallet.apply({
      userId: user.id,
      type: "daily-bonus",
      amount,
      refType: "bonus",
      refId: this.todayKey(),
    });
    await this.store.updateUser(user.id, {
      dailyStreak: streak,
      lastDailyClaim: this.todayKey(),
    });
    return { amount, streak };
  }

  async refillStatus(
    user: UserRecord,
  ): Promise<{ available: boolean; cooldownEndsAt: string | null }> {
    if ((await this.wallet.getBalance(user.id)) > REFILL_THRESHOLD) {
      return { available: false, cooldownEndsAt: null };
    }
    if (!user.lastRefill) return { available: true, cooldownEndsAt: null };

    const nextAllowed =
      new Date(user.lastRefill).getTime() + REFILL_COOLDOWN_HOURS * 3600_000;
    const now = Date.now();
    if (now >= nextAllowed) return { available: true, cooldownEndsAt: null };
    return {
      available: false,
      cooldownEndsAt: new Date(nextAllowed).toISOString(),
    };
  }

  async claimRefill(user: UserRecord): Promise<{ amount: number }> {
    const status = await this.refillStatus(user);
    if (!status.available) {
      throw new BonusClaimError(
        "NOT_ELIGIBLE",
        "Refill is not available right now",
      );
    }
    await this.wallet.apply({
      userId: user.id,
      type: "refill",
      amount: REFILL_AMOUNT,
      refType: "refill",
    });
    await this.store.updateUser(user.id, {
      lastRefill: new Date().toISOString(),
    });
    return { amount: REFILL_AMOUNT };
  }
}

export class BonusClaimError extends Error {
  code: BonusError;
  constructor(code: BonusError, message: string) {
    super(message);
    this.code = code;
  }
}
