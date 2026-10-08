import Link from "next/link";
import { Sparkles, ShieldCheck, Coins } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeading } from "@/components/casino/section-heading";
import { GameCard } from "@/components/casino/game-card";
import { Button } from "@/components/ui/button";
import { DailyBonusCard } from "@/components/casino/daily-bonus-card";
import { JackpotTicker } from "@/components/casino/jackpot-ticker";
import { LiveWinsFeed } from "@/components/casino/live-wins-feed";
import { GAMES } from "@/games/catalog";
import { getOrCreateUser } from "@/server/auth/guards";
import { getStore } from "@/server/store";
import { BonusService } from "@/server/services/bonus";
import { WalletService } from "@/server/store/wallet";

export default async function HomePage() {
  const user = await getOrCreateUser();
  const store = getStore();
  const liveGames = GAMES.filter((g) => g.status === "live");
  const slots = liveGames.filter((g) => g.kind === "slots");
  const daily = new BonusService(store, new WalletService(store)).dailyStatus(
    user,
  );
  const jackpotPool = (await store.getJackpot()).pool;
  const recentWins = await store.listAllRounds({ limit: 40 });

  return (
    <PageShell>
      <section className="relative overflow-hidden rounded-3xl border border-gold-500/20 bg-gradient-to-br from-ink-800/80 via-ink-900/60 to-neon-purple/10 p-8 sm:p-12">
        {/* Real photo backdrop, blended into the panel. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/art/brand/hero.jpg"
          alt=""
          className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover opacity-40 md:block"
          style={{
            maskImage: "linear-gradient(to left, black, transparent)",
            WebkitMaskImage: "linear-gradient(to left, black, transparent)",
          }}
        />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-200">
            <Sparkles className="h-3.5 w-3.5" /> Free to play · Virtual coins
            only
          </span>
          <h1 className="mt-5 font-display text-4xl font-black leading-tight sm:text-6xl">
            <span className="gold-text">The Cat&apos;s</span>{" "}
            <span className="text-text-primary">Casino</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-text-secondary sm:text-lg">
            Spin elegant cat-themed slots and take on European roulette. Earn
            Catsino Coins, climb from Stray Kitten to Catsino VIP, and chase the
            big win — all risk-free.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/games">Play now</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/games/roulette">Try roulette</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-text-muted">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-win" /> Server-authoritative
              outcomes
            </span>
            <span className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-gold-400" /> No real money, ever
            </span>
          </div>
        </div>
      </section>

      {/* Progressive jackpot */}
      <div className="mt-6">
        <JackpotTicker pool={jackpotPool} />
      </div>

      {/* Live wins + daily bonus */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <LiveWinsFeed rounds={recentWins} />
        <DailyBonusCard
          available={daily.available}
          streak={daily.streak}
          nextReward={daily.nextReward}
        />
      </div>

      <section className="mt-12">
        <SectionHeading
          title="Featured Slots"
          subtitle="Beautifully themed cat slots with wilds, scatters and free spins."
          href="/games/slots"
          action="All slots"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {slots.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading
          title="Popular Games"
          subtitle="Everything on the Catsino floor."
          href="/games"
          action="Browse all"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {GAMES.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
