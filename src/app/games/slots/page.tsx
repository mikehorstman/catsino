import type { Metadata } from "next";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeading } from "@/components/casino/section-heading";
import { GameCard } from "@/components/casino/game-card";
import { GAMES } from "@/games/catalog";

export const metadata: Metadata = {
  title: "Slots",
  description: "Cat-themed slot machines with wilds, scatters and free spins.",
};

export default function SlotsPage() {
  const slots = GAMES.filter((g) => g.kind === "slots");
  return (
    <PageShell>
      <h1 className="font-display text-3xl font-black text-text-primary sm:text-4xl">
        Cat <span className="gold-text">Slots</span>
      </h1>
      <p className="mt-2 max-w-2xl text-text-secondary">
        5-reel, 20-payline adventures. Wilds substitute, scatters trigger free
        spins, and every outcome is decided on the server.
      </p>
      <section className="mt-10">
        <SectionHeading title="All slots" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {slots.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
