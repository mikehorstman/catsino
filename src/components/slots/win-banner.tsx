"use client";

import { useEffect, useState } from "react";
import { formatCoins } from "@/lib/utils";

interface WinLike {
  totalWin: number;
  lineWins: { lineIndex: number; symbolId: string; payout: number }[];
  freeSpinsAwarded: number;
  pickBonusAwarded?: boolean;
}

/** Win presentation: count-up total plus a confetti burst for big wins. */
export function WinBanner({ win, bet }: { win: WinLike | null; bet: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!win || win.totalWin <= 0) {
      setShown(0);
      return;
    }

    // Big win => confetti (lazy loaded so it never touches the first paint).
    if (win.totalWin >= bet * 20) {
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.6 },
          colors: ["#d4af37", "#f0d27a", "#a855f7", "#ec4899"],
        });
      });
    }

    const start = performance.now();
    const duration = 700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(win.totalWin * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [win, bet]);

  if (!win || win.totalWin <= 0) {
    return (
      <div
        className="h-[68px] rounded-2xl border border-ink-700 bg-ink-800/40"
        aria-hidden
      />
    );
  }

  const isBig = win.totalWin >= bet * 20;
  const lineCount = win.lineWins?.length ?? 0;
  const freeSpins = win.freeSpinsAwarded ?? 0;

  return (
    <div
      className={`flex min-h-[68px] items-center justify-between rounded-2xl border px-5 py-3 ${
        isBig
          ? "border-gold-400/60 bg-gold-500/15 glow-gold"
          : "border-win/40 bg-win/10"
      }`}
      role="status"
      aria-live="polite"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {isBig ? "Big Win!" : "You won"}
        </p>
        <p
          className={`font-display text-2xl font-black ${isBig ? "gold-text" : "text-win"}`}
        >
          +{formatCoins(shown)}
        </p>
      </div>
      <div className="text-right text-sm text-text-muted">
        {lineCount > 0 && <p>{lineCount} winning line(s)</p>}
        {freeSpins > 0 && (
          <p className="font-semibold text-neon-purple">
            +{freeSpins} free spins!
          </p>
        )}
      </div>
    </div>
  );
}
