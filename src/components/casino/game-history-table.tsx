import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { GAMES } from "@/games/catalog";
import { formatCoins, formatDateTime } from "@/lib/utils";
import type { RoundRecord } from "@/server/store/types";

function gameTitle(id: string): string {
  return GAMES.find((g) => g.id === id)?.title ?? id;
}

function gameHref(id: string): string {
  return GAMES.find((g) => g.id === id)?.href ?? "/games";
}

/** Rounds table used on the profile and history pages. */
export function GameHistoryTable({
  rounds,
  compact = false,
}: {
  rounds: RoundRecord[];
  compact?: boolean;
}) {
  if (rounds.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-text-muted">
        No games played yet.{" "}
        <Link href="/games" className="text-gold-300 hover:underline">
          Play your first round
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="no-scrollbar overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3 font-medium">Game</th>
              {!compact && <th className="px-4 py-3 font-medium">Type</th>}
              <th className="px-4 py-3 font-medium">Bet</th>
              <th className="px-4 py-3 font-medium">Result</th>
              <th className="px-4 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round) => {
              const won = round.winTotal > 0;
              const net = round.winTotal - round.betTotal;
              return (
                <tr key={round.id} className="border-b border-ink-800/60 last:border-0 hover:bg-ink-800/40">
                  <td className="px-4 py-3">
                    <Link href={gameHref(round.gameId)} className="font-medium text-text-primary hover:text-gold-200">
                      {gameTitle(round.gameId)}
                    </Link>
                  </td>
                  {!compact && (
                    <td className="px-4 py-3 capitalize text-text-muted">{round.kind}</td>
                  )}
                  <td className="px-4 py-3 tabular-nums text-text-secondary">{formatCoins(round.betTotal)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={won ? "win" : "lose"}>{won ? "Win" : "Loss"}</Badge>
                      <span className={`tabular-nums font-semibold ${net >= 0 ? "text-win" : "text-lose"}`}>
                        {net >= 0 ? "+" : ""}
                        {formatCoins(net)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{formatDateTime(round.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
