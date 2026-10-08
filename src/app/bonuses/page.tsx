import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeading } from "@/components/casino/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DailyBonusCard } from "@/components/casino/daily-bonus-card";
import { RefillCard } from "@/components/casino/refill-card";
import { JackpotTicker } from "@/components/casino/jackpot-ticker";
import { requireUser } from "@/server/auth/guards";
import { getStore } from "@/server/store";
import { WalletService } from "@/server/store/wallet";
import { BonusService } from "@/server/services/bonus";
import { ACHIEVEMENTS } from "@/games/achievements";
import { LEVELS } from "@/games/progression";
import { formatCoins } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Bonuses",
  description:
    "Daily bonuses, refills, level rewards and achievements on Catsino.",
};

export default async function BonusesPage() {
  const user = await requireUser();
  const store = getStore();

  const wallet = new WalletService(store);
  const bonus = new BonusService(store, wallet);
  const daily = bonus.dailyStatus(user);
  const refill = await bonus.refillStatus(user);
  const earned = user.achievements.length;
  const jackpot = await store.getJackpot();

  return (
    <PageShell>
      <SectionHeading
        title="Bonuses & Rewards"
        subtitle="Everything you can collect in Catsino."
      />

      {/* Jackpot hero */}
      <div className="mb-6">
        <JackpotTicker pool={jackpot.pool} />
        {jackpot.lastWonByName && (
          <p className="mt-2 text-center text-xs text-text-muted">
            Last won by{" "}
            <span className="font-semibold text-gold-200">
              {jackpot.lastWonByName}
            </span>{" "}
            for{" "}
            <span className="font-semibold text-gold-200">
              {formatCoins(jackpot.lastWonAmount ?? 0)}
            </span>{" "}
            coins
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <DailyBonusCard
          available={daily.available}
          streak={daily.streak}
          nextReward={daily.nextReward}
        />
        <RefillCard
          available={refill.available}
          cooldownEndsAt={refill.cooldownEndsAt}
        />
      </div>

      {/* Bonus showcase */}
      <section className="mt-12">
        <SectionHeading
          title="Ways to win"
          subtitle="Stack these for the biggest hauls."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: "🎰",
              title: "Free Spins",
              body: "3+ scatters award 10–12 free spins with a 2–3x multiplier.",
            },
            {
              icon: "🐭",
              title: "Cat Burglar Bonus",
              body: "Pick-and-win board with doubling paws and a thieving cat.",
            },
            {
              icon: "👑",
              title: "Mega Jackpot",
              body: "Every spin feeds the pool. Land it to take the whole thing.",
            },
            {
              icon: "🏆",
              title: "Level Rewards",
              body: "Climb from Stray Kitten to Catsino VIP for coin payouts.",
            },
          ].map((item) => (
            <div key={item.title} className="glass rounded-2xl p-5">
              <span className="text-3xl" aria-hidden>
                {item.icon}
              </span>
              <h3 className="mt-2 font-display font-bold text-text-primary">
                {item.title}
              </h3>
              <p className="mt-1 text-sm text-text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading
          title="Levels"
          subtitle="Earn XP from every round to climb the ranks."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LEVELS.map((level) => {
            const reached = user.level >= level.level;
            return (
              <div
                key={level.level}
                className={`glass flex items-center justify-between rounded-xl p-4 ${reached ? "border-gold-500/40" : ""}`}
              >
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-muted">
                    Level {level.level}
                  </p>
                  <p className="font-display font-bold text-text-primary">
                    {level.title}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatCoins(level.xpRequired)} XP
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone={reached ? "win" : "muted"}>
                    {reached ? "Reached" : "Locked"}
                  </Badge>
                  <p className="mt-1 text-sm font-semibold text-gold-200">
                    +{formatCoins(level.reward)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading
          title="Achievements"
          subtitle={`${earned} of ${ACHIEVEMENTS.length} unlocked.`}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = user.achievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={`glass rounded-xl p-4 ${unlocked ? "border-win/40" : "opacity-80"}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-display font-bold text-text-primary">
                    {a.title}
                  </p>
                  <Badge tone={unlocked ? "win" : "muted"}>
                    {unlocked ? "Unlocked" : "Locked"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-text-muted">{a.description}</p>
                <p className="mt-2 text-sm font-semibold text-gold-200">
                  Reward: {formatCoins(a.reward)}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
