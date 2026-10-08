"use client";

import { useState, useTransition } from "react";
import { Gift, Check, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claimDailyBonusAction } from "@/server/actions/game";
import { useAudioStore } from "@/stores/audio";
import { useBalanceStore } from "@/stores/balance";
import { formatCoins } from "@/lib/utils";

/** Daily bonus streak widget with an escalating reward ladder. */
export function DailyBonusCard({
  available,
  streak,
  nextReward,
  maxStreak = 7,
}: {
  available: boolean;
  streak: number;
  nextReward: number;
  maxStreak?: number;
}) {
  const [pending, startTransition] = useTransition();
  const [claimed, setClaimed] = useState(!available);
  const [rewarded, setRewarded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const play = useAudioStore((s) => s.play);
  const setBalance = useBalanceStore((s) => s.setBalance);

  function claim() {
    setError(null);
    startTransition(async () => {
      const result = await claimDailyBonusAction();
      if (result.ok && result.data) {
        setClaimed(true);
        setRewarded(result.data.amount);
        setBalance(useBalanceStore.getState().balance + result.data.amount);
        play("coin");
        import("canvas-confetti").then(({ default: confetti }) => {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.7 },
            colors: ["#d4af37", "#f0d27a", "#a855f7"],
          });
        });
      } else {
        setError(result.error?.message ?? "Could not claim");
      }
    });
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold-500/40 bg-gradient-to-br from-ink-800 via-ink-900 to-neon-purple/10 p-5 shadow-glow-gold">
      <div
        className="pointer-events-none absolute -right-8 -top-8 text-9xl opacity-10"
        aria-hidden
      >
        🐟
      </div>
      <div className="relative">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-b from-gold-300 to-gold-600 text-ink-950">
            <Gift className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-lg font-black text-text-primary">
              Daily Bonus
            </h3>
            <p className="flex items-center gap-1 text-xs text-text-muted">
              <Flame className="h-3 w-3 text-gold-400" /> Day {streak} streak ·
              bigger every day
            </p>
          </div>
        </div>

        {/* Reward ladder */}
        <div className="mb-4 grid grid-cols-7 gap-1.5">
          {Array.from({ length: maxStreak }).map((_, i) => {
            const day = i + 1;
            const done = day < streak || (day === streak && claimed);
            const current = day === streak && !claimed;
            return (
              <div
                key={i}
                className={`flex flex-col items-center rounded-lg border py-2 text-center transition-all ${
                  current
                    ? "border-gold-400 bg-gold-500/20 shadow-glow-gold"
                    : done
                      ? "border-win/40 bg-win/10"
                      : "border-ink-700 bg-ink-800/60"
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider text-text-muted">
                  D{day}
                </span>
                <span
                  className={`text-xs font-bold ${done ? "text-win" : current ? "text-gold-200" : "text-text-muted"}`}
                >
                  {done ? "✓" : `+${500 + 100 * (day - 1)}`}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted">
              {claimed ? "Claimed today" : "Ready to claim"}
            </p>
            <p className="font-display text-2xl font-black gold-text">
              {claimed
                ? rewarded
                  ? `+${formatCoins(rewarded)}`
                  : "Done"
                : `+${formatCoins(nextReward)}`}
            </p>
          </div>
          <Button
            onClick={claim}
            disabled={pending || claimed}
            variant={claimed ? "outline" : "gold"}
            size="lg"
            className={claimed ? "" : "animate-pulse"}
          >
            {claimed ? (
              <>
                <Check className="h-4 w-4" /> Claimed
              </>
            ) : pending ? (
              "Claiming…"
            ) : (
              "CLAIM NOW"
            )}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
}
