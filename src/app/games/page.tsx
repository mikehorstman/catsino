import type { Metadata } from "next";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeading } from "@/components/casino/section-heading";
import { GameCard } from "@/components/casino/game-card";
import { GAMES } from "@/games/catalog";

export const metadata: Metadata = {
  title: "Games",
  description:
    "Browse all Catsino games — cat-themed slots and European roulette.",
};

export default function GamesPage() {
  const slots = GAMES.filter((g) => g.kind === "slots");
  const live = GAMES.filter((g) => g.status === "live");

  return (
    <PageShell>
      <h1 className="font-display text-3xl font-black text-text-primary sm:text-4xl">
        The <span className="gold-text">Casino Floor</span>
      </h1>
      <p className="mt-2 max-w-2xl text-text-secondary">
        Every game is powered by the same server-authoritative engine, so
        results are always fair and always final.
      </p>

      <section className="mt-10">
        <SectionHeading
          title="Live now"
          subtitle={`${live.length} games ready to play.`}
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {live.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading
          title="Slots"
          subtitle="One engine, many worlds."
          href="/games/slots"
          action="Slots hub"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {slots.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
