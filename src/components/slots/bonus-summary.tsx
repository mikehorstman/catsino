"use client";

import { Sparkles, Zap } from "lucide-react";
import { formatCoins } from "@/lib/utils";

/** Persistent banner shown while a bonus round is active. */
export function BonusSummary({
  title,
  subtitle,
  right,
  tone = "gold",
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  tone?: "gold" | "purple";
}) {
  const ring = tone === "gold" ? "border-gold-500/40 glow-gold" : "border-neon-purple/40 glow-purple";
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border bg-ink-800/70 px-4 py-3 ${ring}`}>
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
            tone === "gold" ? "bg-gold-500/20 text-gold-300" : "bg-neon-purple/20 text-neon-purple"
          }`}
        >
          {tone === "gold" ? <Sparkles className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
        </span>
        <div>
          <p className="font-display text-base font-bold text-text-primary">{title}</p>
          {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

/** Free-spins status bar. */
export function FreeSpinsStatus({
  remaining,
  multiplier,
  accumulated,
}: {
  remaining: number;
  multiplier: number;
  accumulated: number;
}) {
  return (
    <BonusSummary
      title={`Free Spins · ${remaining} left`}
      subtitle={`Every win is multiplied by ${multiplier}x`}
      tone="purple"
      right={
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-text-muted">Bonus win</p>
          <p className="font-display text-lg font-bold text-neon-purple">{formatCoins(accumulated)}</p>
        </div>
      }
    />
  );
}

export function formatBonusCoins(n: number) {
  return formatCoins(n);
}
