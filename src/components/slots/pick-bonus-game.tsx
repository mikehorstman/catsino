"use client";

import { useState, useTransition } from "react";
import { Cat, Coins, Gift, MousePointerClick, Sparkles } from "lucide-react";
import { BonusSummary, formatBonusCoins } from "./bonus-summary";
import { pickBonusAction } from "@/server/actions/slots";
import { useAudioStore } from "@/stores/audio";
import { useBalanceStore } from "@/stores/balance";

export interface PickCellView {
  index: number;
  kind: "coin" | "x2" | "thief";
  multiplier: number;
  stolen?: boolean;
}

export interface PickBonusView {
  id: string;
  bet: number;
  picks: number;
  chosen: number[];
  revealed: PickCellView[];
  complete: boolean;
  result: {
    multiplierSum: number;
    doublingApplied: boolean;
    thiefSteal: number;
    totalMultiplier: number;
    win: number;
    cells: PickCellView[];
  } | null;
}

/** Slot-specific art for the bonus symbols, with safe fallbacks. */
const BONUS_ART: Record<string, { coin: string; double: string; thief: string }> = {
  "cat-meow": { coin: "fish", double: "paw", thief: "cat-black" },
  "neko-nights": { coin: "sushi", double: "sakura", thief: "lucky-cat" },
};

/**
 * Pick-and-win bonus board. Every pick is sent to the server; the value shown
 * is whatever the server returned, so the outcome cannot be re-rolled or faked.
 */
export function PickBonusGame({
  gameId,
  state,
  onComplete,
}: {
  gameId: string;
  state: PickBonusView;
  onComplete?: (win: number, balance: number) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<PickBonusView>(state);
  const [error, setError] = useState<string | null>(null);
  const play = useAudioStore((s) => s.play);
  const setBalance = useBalanceStore((s) => s.setBalance);

  const art = BONUS_ART[gameId] ?? BONUS_ART["cat-meow"];
  const img = (symbol: string) => `/art/slots/${gameId}/${symbol}.jpg`;

  const revealed = new Map(view.revealed.map((c) => [c.index, c]));
  const picksRemaining = Math.max(0, view.picks - view.chosen.length);
  const gridCols = 3;

  function pick(index: number) {
    if (pending || view.complete || revealed.has(index)) return;
    setError(null);
    startTransition(async () => {
      const response = await pickBonusAction({ gameId, bonusId: view.id, index });
      if (!response.ok || !response.data) {
        setError(response.error?.message ?? "Pick failed");
        return;
      }
      const data = response.data as {
        cell: PickCellView;
        chosen: number[];
        complete: boolean;
        result: PickBonusView["result"];
        balance: number;
      };

      play(data.cell.kind === "thief" ? "bigWin" : "coin");
      setView((prev) => ({
        ...prev,
        chosen: data.chosen,
        complete: data.complete,
        revealed: [...prev.revealed, data.cell],
        result: data.result ?? prev.result,
      }));
      setBalance(data.balance);
      if (data.complete && data.result) {
        play("bigWin");
        onComplete?.(data.result.win, data.balance);
      }
    });
  }

  return (
    <div className="space-y-4">
      <BonusSummary
        title="Cat Burglar Bonus"
        subtitle="Reveal treats to collect rewards. The masked cat steals one — the paw doubles your haul."
        tone="gold"
        right={
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-text-muted">Picks left</p>
            <p className="font-display text-lg font-bold text-gold-200">{picksRemaining}</p>
          </div>
        }
      />

      <div
        className="grid gap-3 rounded-3xl border border-gold-500/20 bg-gradient-to-br from-ink-800/70 to-neon-purple/10 p-4"
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: gridCols * gridCols }).map((_, index) => {
          const cell = revealed.get(index);
          const isStolen = cell?.stolen;
          return (
            <button
              key={index}
              type="button"
              onClick={() => pick(index)}
              disabled={pending || view.complete || Boolean(cell)}
              aria-label={cell ? `Revealed: ${cell.kind}` : `Reveal cell ${index + 1}`}
              className={`relative grid aspect-square place-items-center rounded-2xl border text-center transition-all duration-200 ${
                cell
                  ? isStolen
                    ? "border-lose/50 bg-lose/10"
                    : "border-gold-500/50 bg-gold-500/10"
                  : "border-ink-600 bg-ink-800/80 hover:-translate-y-0.5 hover:border-gold-500/50 hover:bg-ink-700"
              } ${!cell && !view.complete ? "cursor-pointer" : ""}`}
            >
              {cell ? (
                <div className="flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img(cell.kind === "coin" ? art.coin : cell.kind === "x2" ? art.double : art.thief)}
                    alt=""
                    className={`h-14 w-14 rounded-xl object-cover ring-2 ${
                      isStolen ? "ring-lose/60 grayscale" : "ring-gold-500/50"
                    }`}
                  />
                  <span
                    className={`mt-1 font-display text-sm font-bold ${
                      isStolen ? "text-lose" : "text-gold-200"
                    }`}
                  >
                    {cell.kind === "coin"
                      ? `${cell.multiplier}x`
                      : cell.kind === "x2"
                        ? "DOUBLE"
                        : `-${cell.multiplier}x`}
                  </span>
                </div>
              ) : (
                <span className="text-3xl opacity-30" aria-hidden>
                  {view.complete ? "🎁" : "🐾"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!view.complete && (
        <p className="flex items-center justify-center gap-2 text-sm text-text-muted">
          <MousePointerClick className="h-4 w-4" /> Tap {picksRemaining} more{" "}
          {picksRemaining === 1 ? "cell" : "cells"} to finish
        </p>
      )}

      {view.result && (
        <div className="rounded-2xl border border-gold-500/50 bg-gold-500/15 p-5 text-center glow-gold">
          <p className="text-xs uppercase tracking-wider text-text-secondary">Bonus complete</p>
          <p className="font-display text-3xl font-black gold-text">
            +{formatBonusCoins(view.result.win)}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" /> {view.result.multiplierSum}x collected
            </span>
            {view.result.doublingApplied && (
              <span className="flex items-center gap-1 text-neon-purple">
                <Sparkles className="h-3.5 w-3.5" /> Doubled
              </span>
            )}
            {view.result.thiefSteal > 0 && (
              <span className="flex items-center gap-1 text-lose">
                <Cat className="h-3.5 w-3.5" /> Stole {view.result.thiefSteal}x
              </span>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-center text-sm text-red-300">{error}</p>}

      {view.complete && (
        <p className="flex items-center justify-center gap-2 text-sm text-text-muted">
          <Gift className="h-4 w-4" /> Bonus finished — your winnings are already in your balance.
        </p>
      )}

      {pending && <p className="text-center text-sm text-text-muted">Revealing…</p>}
    </div>
  );
}
