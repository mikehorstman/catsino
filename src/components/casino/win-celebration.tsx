"use client";

import { useEffect, useState } from "react";
import { Crown, Sparkles, Star, Trophy } from "lucide-react";
import { formatCoins } from "@/lib/utils";

export type WinTier = "win" | "big" | "mega" | "epic" | "jackpot";

/** Classify a win relative to the bet. */
export function winTier(totalWin: number, bet: number): WinTier | null {
  if (totalWin <= 0) return null;
  const x = totalWin / Math.max(1, bet);
  if (x >= 500) return "jackpot";
  if (x >= 100) return "epic";
  if (x >= 50) return "mega";
  if (x >= 20) return "big";
  return "win";
}

const TIERS: Record<
  WinTier,
  { label: string; sub: string; from: string; to: string; glow: string; icon: typeof Star; confetti: number }
> = {
  win: {
    label: "WIN",
    sub: "Nice one!",
    from: "#4ade80",
    to: "#22c55e",
    glow: "rgba(74,222,128,0.5)",
    icon: Star,
    confetti: 0,
  },
  big: {
    label: "BIG WIN",
    sub: "The cats are pleased",
    from: "#f0d27a",
    to: "#d4af37",
    glow: "rgba(212,175,55,0.6)",
    icon: Sparkles,
    confetti: 140,
  },
  mega: {
    label: "MEGA WIN",
    sub: "Incredible!",
    from: "#a855f7",
    to: "#ec4899",
    glow: "rgba(168,85,247,0.7)",
    icon: Trophy,
    confetti: 220,
  },
  epic: {
    label: "EPIC WIN",
    sub: "The whole casino is watching",
    from: "#ec4899",
    to: "#f0d27a",
    glow: "rgba(236,72,153,0.8)",
    icon: Trophy,
    confetti: 320,
  },
  jackpot: {
    label: "JACKPOT!",
    sub: "You broke the bank",
    from: "#f0d27a",
    to: "#ec4899",
    glow: "rgba(240,210,122,0.9)",
    icon: Crown,
    confetti: 500,
  },
};

/**
 * Full-screen win celebration. Scales with the win size: a small banner for a
 * normal win, up to a screen-filling jackpot takeover with confetti.
 */
export function WinCelebration({
  totalWin,
  bet,
  onDone,
}: {
  totalWin: number;
  bet: number;
  onDone?: () => void;
}) {
  const tier = winTier(totalWin, bet);
  const [shown, setShown] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!tier) return;
    setVisible(true);
    setShown(0);

    const config = TIERS[tier];
    if (config.confetti > 0) {
      import("canvas-confetti").then(({ default: confetti }) => {
        const colors = [config.from, config.to, "#ffffff", "#a855f7"];
        confetti({ particleCount: config.confetti, spread: 100, origin: { y: 0.55 }, colors });
        if (tier === "epic" || tier === "jackpot") {
          setTimeout(() => confetti({ particleCount: config.confetti, angle: 60, spread: 80, origin: { x: 0 }, colors }), 250);
          setTimeout(() => confetti({ particleCount: config.confetti, angle: 120, spread: 80, origin: { x: 1 }, colors }), 400);
        }
      });
    }

    const start = performance.now();
    const duration = tier === "win" ? 600 : 1100;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(totalWin * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const hold = tier === "win" ? 1600 : tier === "big" ? 2400 : 3400;
    const timeout = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, hold + duration);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalWin, bet, tier]);

  if (!tier || !visible) return null;
  const config = TIERS[tier];
  const Icon = config.icon;
  const isBig = tier !== "win";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 grid place-items-center"
      role="status"
      aria-live="assertive"
    >
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" />
      <div
        className={`relative flex flex-col items-center px-6 text-center ${isBig ? "animate-[coin-bounce_1.2s_ease-in-out_infinite]" : ""}`}
        style={{ filter: `drop-shadow(0 0 40px ${config.glow})` }}
      >
        <span
          className="mb-3 grid h-16 w-16 place-items-center rounded-full"
          style={{ background: `linear-gradient(180deg, ${config.from}, ${config.to})` }}
        >
          <Icon className="h-8 w-8 text-ink-950" />
        </span>
        <p
          className="font-display font-black uppercase tracking-tight"
          style={{
            fontSize: isBig ? "clamp(2.5rem, 9vw, 6rem)" : "clamp(1.75rem, 5vw, 3rem)",
            background: `linear-gradient(180deg, ${config.from}, ${config.to})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {config.label}
        </p>
        <p className="mt-1 text-sm font-medium uppercase tracking-[0.3em] text-text-secondary">
          {config.sub}
        </p>
        <p className="mt-4 font-display text-4xl font-black tabular-nums text-white sm:text-6xl">
          +{formatCoins(shown)}
        </p>
      </div>
    </div>
  );
}
