import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeading } from "@/components/casino/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DailyBonusCard } from "@/components/casino/daily-bonus-card";
import { RefillCard } from "@/components/casino/refill-card";
import { getCurrentUser } from "@/server/auth/guards";
import { getStore } from "@/server/store/memory";
import { WalletService } from "@/server/store/wallet";
import { BonusService } from "@/server/services/bonus";
import { ACHIEVEMENTS } from "@/games/achievements";
import { LEVELS } from "@/games/progression";
import { formatCoins } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Bonuses",
  description: "Daily bonuses, refills, level rewards and achievements on Catsino.",
};

export default async function BonusesPage() {
  const user = await getCurrentUser();
  const store = getStore();

  if (!user) {
    return (
      <PageShell>
        <SectionHeading title="Bonuses" subtitle="Sign in to claim your rewards." />
        <div className="glass rounded-2xl p-8 text-center">
          <p className="mb-4 text-text-secondary">
            Create a free account to unlock a 10,000 coin welcome bonus, daily
            rewards, level-up bonuses and achievements.
          </p>
          <Button asChild size="lg">
            <Link href="/register">Claim 10,000 free coins</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const wallet = new WalletService(store);
  const bonus = new BonusService(store, wallet);
  const daily = bonus.dailyStatus(user);
  const refill = bonus.refillStatus(user);
  const earned = user.achievements.length;

  return (
    <PageShell>
      <SectionHeading title="Bonuses & Rewards" subtitle="Everything you can collect in Catsino." />

      <div className="grid gap-5 md:grid-cols-2">
        <DailyBonusCard available={daily.available} streak={daily.streak} nextReward={daily.nextReward} />
        <RefillCard available={refill.available} cooldownEndsAt={refill.cooldownEndsAt} />
      </div>

      <section className="mt-12">
        <SectionHeading title="Levels" subtitle="Earn XP from every round to climb the ranks." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LEVELS.map((level) => {
            const reached = user.level >= level.level;
            return (
              <div
                key={level.level}
                className={`glass flex items-center justify-between rounded-xl p-4 ${reached ? "border-gold-500/40" : ""}`}
              >
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-muted">Level {level.level}</p>
                  <p className="font-display font-bold text-text-primary">{level.title}</p>
                  <p className="text-xs text-text-muted">{formatCoins(level.xpRequired)} XP</p>
                </div>
                <div className="text-right">
                  <Badge tone={reached ? "win" : "muted"}>{reached ? "Reached" : "Locked"}</Badge>
                  <p className="mt-1 text-sm font-semibold text-gold-200">+{formatCoins(level.reward)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading title="Achievements" subtitle={`${earned} of ${ACHIEVEMENTS.length} unlocked.`} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = user.achievements.includes(a.id);
            return (
              <div key={a.id} className={`glass rounded-xl p-4 ${unlocked ? "border-win/40" : "opacity-80"}`}>
                <div className="flex items-center justify-between">
                  <p className="font-display font-bold text-text-primary">{a.title}</p>
                  <Badge tone={unlocked ? "win" : "muted"}>{unlocked ? "Unlocked" : "Locked"}</Badge>
                </div>
                <p className="mt-1 text-sm text-text-muted">{a.description}</p>
                <p className="mt-2 text-sm font-semibold text-gold-200">Reward: {formatCoins(a.reward)}</p>
              </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
