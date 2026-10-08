"use client";

import { useState, useTransition } from "react";
import { Gift, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claimDailyBonusAction } from "@/server/actions/game";
import { useAudioStore } from "@/stores/audio";
import { useBalanceStore } from "@/stores/balance";
import { formatCoins } from "@/lib/utils";

/** Daily bonus streak widget. The reward amount comes from the server. */
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
      } else {
        setError(result.error?.message ?? "Could not claim");
      }    });
  }

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5">
      <div className="absolute -right-6 -top-6 text-8xl opacity-10" aria-hidden>
        🐟
      </div>
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gold-500/20 text-gold-300">
            <Gift className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display font-bold text-text-primary">Daily Bonus</h3>
            <p className="text-xs text-text-muted">Come back every day for a bigger reward.</p>
          </div>
        </div>

        <div className="mb-4 flex gap-1.5">
          {Array.from({ length: maxStreak }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < streak ? "bg-gradient-to-r from-gold-300 to-gold-600" : "bg-ink-700"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted">Day {streak}</p>
            <p className="font-display text-xl font-bold text-gold-200">
              {claimed ? "Claimed" : `+${formatCoins(nextReward)}`}
            </p>
          </div>
          <Button onClick={claim} disabled={pending || claimed} variant={claimed ? "outline" : "gold"}>
            {claimed ? (
              <>
                <Check className="h-4 w-4" /> {rewarded ? `+${formatCoins(rewarded)}` : "Done"}
              </>
            ) : pending ? (
              "Claiming…"
            ) : (
              "Claim now"
            )}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
}
