import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeading } from "@/components/casino/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameHistoryTable } from "@/components/casino/game-history-table";
import { getCurrentUser } from "@/server/auth/guards";
import { getStore } from "@/server/store/memory";
import { WalletService } from "@/server/store/wallet";
import { levelDef, xpToNextLevel } from "@/games/progression";
import { formatCoins } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = getStore();
  const wallet = new WalletService(store);
  const balance = wallet.getBalance(user.id);
  const def = levelDef(user.level);
  const nextXp = xpToNextLevel(user.level);
  const currentLevelFloor = def.xpRequired;
  const progress = nextXp > 0 ? Math.min(100, ((user.xp - currentLevelFloor) / nextXp) * 100) : 100;
  const winRate = user.totalRounds > 0 ? (user.totalWins / user.totalRounds) * 100 : 0;
  const net = user.totalWon - user.totalWagered;
  const recent = store.listRounds(user.id, { limit: 10 });

  return (
    <PageShell>
      <SectionHeading title="Your Profile" subtitle="Stats, progression and recent play." />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Identity + level */}
        <div className="glass rounded-2xl p-5 lg:col-span-1">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-gold-300 to-gold-600 text-2xl text-ink-950">
              🐱
            </span>
            <div>
              <p className="font-display text-lg font-bold text-text-primary">{user.displayName}</p>
              <p className="text-sm text-text-muted">{user.email}</p>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-semibold text-gold-200">
                Level {user.level} · {def.title}
              </span>
              <span className="text-text-muted">
                {formatCoins(user.xp)} XP
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            {nextXp > 0 && (
              <p className="mt-1 text-xs text-text-muted">
                {formatCoins(nextXp - (user.xp - currentLevelFloor))} XP to level {user.level + 1}
              </p>
            )}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-ink-800/60 p-3">
              <p className="text-xs uppercase tracking-wider text-text-muted">Balance</p>
              <p className="font-display text-lg font-bold text-gold-200">{formatCoins(balance)}</p>
            </div>
            <div className="rounded-xl bg-ink-800/60 p-3">
              <p className="text-xs uppercase tracking-wider text-text-muted">Net</p>
              <p className={`font-display text-lg font-bold ${net >= 0 ? "text-win" : "text-lose"}`}>
                {net >= 0 ? "+" : ""}
                {formatCoins(net)}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/bonuses">View bonuses & levels</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="mb-4 font-display text-lg font-bold text-text-primary">Statistics</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Rounds played" value={formatCoins(user.totalRounds)} />
            <Stat label="Rounds won" value={formatCoins(user.totalWins)} />
            <Stat label="Win rate" value={`${winRate.toFixed(1)}%`} />
            <Stat label="Total spins" value={formatCoins(user.totalSpins)} />
            <Stat label="Total wagered" value={formatCoins(user.totalWagered)} />
            <Stat label="Biggest win" value={formatCoins(user.biggestWin)} highlight />
          </div>
          <div className="mt-5 flex items-center gap-2">
            <Badge tone="gold">{user.achievements.length} achievements</Badge>
            <Badge tone="purple">Catsino VIP at level 10</Badge>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <SectionHeading title="Recent games" href="/history" action="Full history" />
        <GameHistoryTable rounds={recent} compact />
      </section>
    </PageShell>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-ink-800/50 p-4">
      <p className="text-xs uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${highlight ? "gold-text" : "text-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}
