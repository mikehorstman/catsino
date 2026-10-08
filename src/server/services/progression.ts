import { ACHIEVEMENTS, type AchievementStats } from "@/games/achievements";
import { resolveLevelUp, xpForBet } from "@/games/progression";
import { newId } from "@/server/store";
import type { Store, UserRecord } from "@/server/store/types";
import { WalletService } from "@/server/store/wallet";

export interface RoundOutcome {
  gainedXp: number;
  leveledUp: boolean;
  newLevel: number;
  levelReward: number;
  unlockedAchievements: { id: string; title: string; reward: number }[];
}

/**
 * Handles XP, levels and achievement unlocks after a round. Credits all
 * rewards through the wallet so they appear in the ledger.
 */
export class ProgressionService {
  constructor(
    private store: Store,
    private wallet: WalletService,
  ) {}

  stats(user: UserRecord): AchievementStats {
    return {
      totalRounds: user.totalRounds,
      totalWins: user.totalWins,
      totalSpins: user.totalSpins,
      biggestWin: user.biggestWin,
      totalWagered: user.totalWagered,
      level: user.level,
    };
  }

  private async grantAchievements(
    user: UserRecord,
  ): Promise<{ id: string; title: string; reward: number }[]> {
    const stats = this.stats(user);
    const unlocked: { id: string; title: string; reward: number }[] = [];

    for (const def of ACHIEVEMENTS) {
      if (user.achievements.includes(def.id)) continue;
      if (!def.check(stats)) continue;

      await this.wallet.apply({
        userId: user.id,
        type: "achievement",
        amount: def.reward,
        refType: "achievement",
        refId: def.id,
      });
      user.achievements.push(def.id);
      unlocked.push({ id: def.id, title: def.title, reward: def.reward });
    }
    return unlocked;
  }

  /** Apply the results of a finished round to the player's progression. */
  async applyRoundResult(
    user: UserRecord,
    opts: { bet: number; win: number; isSpin: boolean },
  ): Promise<RoundOutcome> {
    const gainedXp = xpForBet(opts.bet);
    const { newLevel, rewards, levelsGained } = resolveLevelUp(
      user.xp,
      gainedXp,
    );

    const patch: Partial<UserRecord> = {
      xp: user.xp + gainedXp,
      level: newLevel,
      totalRounds: user.totalRounds + 1,
      totalWins: user.totalWins + (opts.win > 0 ? 1 : 0),
      totalSpins: user.totalSpins + (opts.isSpin ? 1 : 0),
      biggestWin: Math.max(user.biggestWin, opts.win),
      totalWagered: user.totalWagered + opts.bet,
      totalWon: user.totalWon + opts.win,
    };
    await this.store.updateUser(user.id, patch);
    const updated = { ...user, ...patch } as UserRecord;

    if (rewards > 0) {
      await this.wallet.apply({
        userId: user.id,
        type: "level-reward",
        amount: rewards,
        refType: "level",
        refId: String(newLevel),
      });
    }

    const unlockedAchievements = await this.grantAchievements(updated);

    return {
      gainedXp,
      leveledUp: levelsGained > 0,
      newLevel,
      levelReward: rewards,
      unlockedAchievements,
    };
  }
}

export function transactionId(): string {
  return newId();
}
