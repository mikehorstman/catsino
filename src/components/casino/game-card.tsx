import Link from "next/link";
import { Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GameMeta } from "@/games/catalog";
import { cn } from "@/lib/utils";

/** A game tile using a real photo cover, falling back to a gradient. */
export function GameCard({
  game,
  className,
}: {
  game: GameMeta;
  className?: string;
}) {
  const live = game.status === "live";
  const cover =
    game.kind === "slots"
      ? `/art/slots/${game.id}/background.jpg`
      : "/art/brand/coin.jpg";

  return (
    <Link
      href={live ? game.href : "#"}
      aria-disabled={!live}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-gold-500/15 bg-ink-800/60 transition-all duration-300",
        live
          ? "hover:-translate-y-1 hover:border-gold-500/40 hover:shadow-glow-gold"
          : "cursor-not-allowed opacity-70",
        className,
      )}
    >
      <div
        className={cn(
          "relative aspect-[4/3] overflow-hidden bg-gradient-to-br",
          game.accent,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/20 to-transparent" />
        {live ? (
          <span className="absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center rounded-full bg-gold-500 text-ink-950 opacity-0 shadow-glow-gold transition-opacity duration-300 group-hover:opacity-100">
            <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
          </span>
        ) : (
          <span className="absolute right-3 top-3">
            <Badge tone="muted">Soon</Badge>
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-base font-bold text-text-primary">
          {game.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-text-muted">
          {game.tagline}
        </p>
      </div>
    </Link>
  );
}
