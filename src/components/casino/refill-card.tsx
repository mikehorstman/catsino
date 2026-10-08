"use client";

import { useEffect, useState, useTransition } from "react";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claimRefillAction } from "@/server/actions/game";
import { useAudioStore } from "@/stores/audio";
import { useBalanceStore } from "@/stores/balance";
import { formatCoins } from "@/lib/utils";

/** "Stray Cat Fund" — a safety net refill when the player runs dry. */
export function RefillCard({
  available,
  cooldownEndsAt,
}: {
  available: boolean;
  cooldownEndsAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const play = useAudioStore((s) => s.play);
  const setBalance = useBalanceStore((s) => s.setBalance);

  // Tick for the cooldown countdown.
  useEffect(() => {
    if (done || !cooldownEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [done, cooldownEndsAt]);

  function claim() {
    setError(null);
    startTransition(async () => {
      const result = await claimRefillAction();
      if (result.ok && result.data) {
        setDone(true);
        setBalance(useBalanceStore.getState().balance + result.data.amount);
        play("coin");
      } else {
        setError(result.error?.message ?? "Not available");
      }
    });
  }

  const secondsLeft = cooldownEndsAt ? Math.max(0, Math.floor((new Date(cooldownEndsAt).getTime() - now) / 1000)) : 0;
  const canClaim = available && !done;

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5">
      <div className="absolute -right-4 -bottom-6 text-7xl opacity-10" aria-hidden>🐈</div>
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-neon-purple/20 text-neon-purple">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display font-bold text-text-primary">Stray Cat Fund</h3>
            <p className="text-xs text-text-muted">Low on coins? Grab a top-up on us.</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="font-display text-xl font-bold text-gold-200">+{formatCoins(1000)}</p>
          <Button onClick={claim} disabled={pending || !canClaim} variant={canClaim ? "purple" : "outline"}>
            {done ? "Claimed" : canClaim ? (pending ? "Claiming…" : "Claim") : secondsLeft > 0 ? `Ready in ${Math.ceil(secondsLeft / 60)}m` : "Not eligible"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
}
