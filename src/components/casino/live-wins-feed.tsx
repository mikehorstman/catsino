import { Flame, TrendingUp } from "lucide-react";
import { GAMES } from "@/games/catalog";
import { formatCoins } from "@/lib/utils";
import type { RoundRecord } from "@/server/store/types";

function gameTitle(id: string): string {
  return GAMES.find((g) => g.id === id)?.title ?? id;
}

/** A scrolling "live wins" strip — the classic casino social-proof ticker. */
export function LiveWinsFeed({ rounds }: { rounds: RoundRecord[] }) {
  const wins = rounds.filter((r) => r.winTotal > 0).slice(0, 12);
  if (wins.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-ink-700 bg-ink-800/50 px-4 py-3 text-sm text-text-muted">
        <TrendingUp className="h-4 w-4 text-gold-400" />
        Be the first to land a big win today.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-700 bg-ink-800/50">
      <div className="flex items-center gap-2 border-b border-ink-700 px-4 py-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-win opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-win" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Live wins
        </span>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto p-3">
        {wins.map((round) => (
          <div
            key={round.id}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-gold-500/20 bg-ink-900/60 px-3 py-2"
          >
            <Flame className="h-4 w-4 text-gold-400" />
            <div>
              <p className="text-xs text-text-muted">
                {gameTitle(round.gameId)}
              </p>
              <p className="font-display text-sm font-bold text-win">
                +{formatCoins(round.winTotal)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
