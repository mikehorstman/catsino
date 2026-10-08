"use client";

import { useEffect, useRef, useState } from "react";
import { Crown } from "lucide-react";
import { formatCoins } from "@/lib/utils";

/**
 * Progressive jackpot ticker. The pool grows on every spin; the number ticks
 * up smoothly and flashes when it changes.
 */
export function JackpotTicker({
  pool,
  compact = false,
}: {
  pool: number;
  compact?: boolean;
}) {
  const [display, setDisplay] = useState(pool);
  const [flash, setFlash] = useState(false);
  const fromRef = useRef(pool);

  useEffect(() => {
    const from = fromRef.current;
    const to = pool;
    if (from === to) return;

    setFlash(true);
    const start = performance.now();
    const duration = 500;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    const timeout = setTimeout(() => setFlash(false), 600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [pool]);

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-gold-500/40 bg-gradient-to-r from-gold-500/15 to-neon-purple/15 px-3 py-1.5">
        <Crown className="h-4 w-4 text-gold-300" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-200/80">
          Jackpot
        </span>
        <span
          className={`font-display text-sm font-black tabular-nums ${flash ? "text-white" : "gold-text"}`}
        >
          {formatCoins(display)}
        </span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold-500/40 bg-gradient-to-r from-ink-900 via-ink-800 to-ink-900 px-5 py-3 shadow-glow-gold">
      {/* Animated sheen */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-gold-300/10 to-transparent" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-b from-gold-300 to-gold-600 text-ink-950">
            <Crown className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-200/80">
              Catsino Mega Jackpot
            </p>
            <p className="text-xs text-text-muted">
              Grows with every spin · win it all
            </p>
          </div>
        </div>
        <p
          className={`font-display text-2xl font-black tabular-nums transition-colors sm:text-3xl ${
            flash ? "text-white" : "gold-text"
          }`}
        >
          {formatCoins(display)}
        </p>
      </div>
    </div>
  );
}
