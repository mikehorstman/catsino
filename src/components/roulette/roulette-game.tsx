"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RouletteWheel } from "./pixi-wheel";
import { RouletteTable, type PlacedBet } from "./roulette-table";
import { spinRouletteAction } from "@/server/actions/game";
import { useAudioStore } from "@/stores/audio";
import { useBalanceStore } from "@/stores/balance";
import { formatCoins } from "@/lib/utils";

const CHIP_VALUES = [10, 50, 100, 500, 1000];

interface RouletteResponse {
  balance: number;
  result: {
    winningNumber: number;
    outcomes: { bet: PlacedBet; won: boolean; payout: number }[];
    totalBet: number;
    totalPayout: number;
  };
}

export function RouletteGame({ initialBalance, authed }: { initialBalance: number; authed: boolean }) {
  const [chip, setChip] = useState(50);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [winning, setWinning] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<RouletteWheel | null>(null);
  const play = useAudioStore((s) => s.play);
  const setBalance = useBalanceStore((s) => s.setBalance);

  useEffect(() => {
    let disposed = false;
    const host = hostRef.current;
    if (!host) return;
    const scene = new RouletteWheel();
    scene.init(host).then(() => {
      if (disposed) scene.destroy();
    });
    sceneRef.current = scene;
    return () => {
      disposed = true;
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  const placeBet = useCallback(
    (bet: PlacedBet) => {
      if (spinning) return;
      play("click");
      setBets((prev) => {
        // Merge with an existing identical bet.
        const idx = prev.findIndex((b) => b.type === bet.type && b.selection.join(",") === bet.selection.join(","));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], amount: next[idx].amount + bet.amount };
          return next;
        }
        return [...prev, bet];
      });
    },
    [play, spinning],
  );

  const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);

  const spin = useCallback(async () => {
    if (spinning) return;
    if (!authed) {
      setMessage("Sign in to place bets with your virtual coins.");
      return;
    }
    if (bets.length === 0) {
      setMessage("Place at least one bet first.");
      return;
    }
    setMessage(null);
    setWinning(null);
    setSpinning(true);
    play("roulette");

    const response = await spinRouletteAction({ bets, idempotencyKey: crypto.randomUUID() });
    if (!response.ok || !response.data) {
      setSpinning(false);
      setMessage(response.error?.message ?? "Spin failed");
      return;
    }

    const data = response.data as RouletteResponse;
    await sceneRef.current?.spinTo(data.result.winningNumber);

    setWinning(data.result.winningNumber);
    setBalance(data.balance);
    setSpinning(false);
    setBets([]);
    sceneRef.current?.reset();
    if (data.result.totalPayout > 0) play("win");
  }, [authed, bets, play, setBalance, spinning]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-black text-text-primary">Catsino Roulette</h1>
        <Badge tone="gold">European · single zero</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Wheel + result */}
        <div className="space-y-4">
          <div className="glass rounded-3xl p-4">
            <div ref={hostRef} className="mx-auto w-full max-w-[360px]" data-testid="roulette-wheel" />
          </div>
          <div
            className={`flex min-h-[64px] items-center justify-center rounded-2xl border px-4 ${
              winning === null
                ? "border-ink-700 bg-ink-800/40 text-text-muted"
                : winning === 0
                  ? "border-win/60 bg-win/15"
                  : "border-lose/50 bg-lose/10"
            }`}
            role="status"
            aria-live="polite"
          >
            {winning === null ? (
              <span className="text-sm">Spin the wheel to see the result</span>
            ) : (
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-text-secondary">Winning number</p>
                <p className="font-display text-3xl font-black text-gold-200">{winning}</p>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="space-y-4">
          <RouletteTable chip={chip} bets={bets} onPlace={placeBet} disabled={spinning} />
        </div>
      </div>

      {message && (
        <p className="rounded-xl border border-gold-500/25 bg-gold-500/10 px-4 py-2 text-center text-sm text-gold-100">
          {message}
        </p>
      )}

      {/* Chip tray + controls */}
      <div className="glass flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="mr-1 text-sm font-medium text-text-secondary">Chip</span>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {CHIP_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setChip(value)}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition-transform ${
                  chip === value
                    ? "border-gold-300 bg-gradient-to-b from-gold-300 to-gold-600 text-ink-950 scale-110"
                    : "border-ink-600 bg-ink-800 text-text-secondary"
                }`}
              >
                {value >= 1000 ? `${value / 1000}k` : value}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-text-muted">Total bet</p>
            <p className="font-display text-lg font-bold text-gold-200">{formatCoins(totalBet)}</p>
          </div>
          <Button variant="outline" size="icon" aria-label="Clear bets" onClick={() => setBets([])} disabled={spinning || bets.length === 0}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={spin} disabled={spinning} size="lg" className="min-w-[160px]">
            {spinning ? "Spinning…" : <><RotateCw className="h-5 w-5" /> SPIN</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
