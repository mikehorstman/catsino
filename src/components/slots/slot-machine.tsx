"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlotReels } from "./pixi-reels";
import { WinBanner } from "./win-banner";
import { spinSlotAction } from "@/server/actions/slots";
import { useAudioStore } from "@/stores/audio";
import { useBalanceStore } from "@/stores/balance";
import { formatCoins } from "@/lib/utils";
import type { SlotConfig } from "@/engine/slots/types";
import type { SlotTheme } from "@/games/slots/themes";

interface SpinResponse {
  balance: number;
  result: {
    totalWin: number;
    lineWins: { lineIndex: number; symbolId: string; payout: number }[];
    freeSpinsAwarded: number;
  };
  progression: {
    gainedXp: number;
    leveledUp: boolean;
    newLevel: number;
    levelReward: number;
    unlockedAchievements: { id: string; title: string; reward: number }[];
  };
}

/** Fire-and-forget idempotency key per spin request. */
function newKey() {
  return crypto.randomUUID();
}

export function SlotMachine({
  config,
  theme,
  initialBalance,
  authed,
  betLevels,
}: {
  config: Pick<SlotConfig, "id" | "name" | "rows" | "cols" | "paylines" | "betLevels" | "symbols" | "reelStrips" | "paytable" | "features" | "version" | "rtpTarget">;
  theme: SlotTheme;
  initialBalance: number;
  authed: boolean;
  betLevels?: number[];
}) {
  const levels = betLevels ?? config.betLevels;
  const [betIndex, setBetIndex] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [win, setWin] = useState<SpinResponse["result"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SlotReels | null>(null);
  const play = useAudioStore((s) => s.play);
  const setBalance = useBalanceStore((s) => s.setBalance);
  const bet = levels[betIndex];

  // Mount the Pixi scene once.
  useEffect(() => {
    let disposed = false;
    const host = hostRef.current;
    if (!host) return;

    const scene = new SlotReels(config as SlotConfig, theme);
    scene.init(host).then(() => {
      if (disposed) scene.destroy();
    });
    sceneRef.current = scene;

    const onResize = () => scene.resize(host);
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      scene.destroy();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.id]);

  const spin = useCallback(async () => {
    if (spinning) return;
    if (!authed) {
      setMessage("Sign in to play with your virtual coins.");
      return;
    }
    setMessage(null);
    setWin(null);
    setSpinning(true);
    play("spin");

    sceneRef.current?.startSpin();

    const response = await spinSlotAction({ gameId: config.id, bet, idempotencyKey: newKey() });

    if (!response.ok || !response.data) {
      setSpinning(false);
      setMessage(response.error?.message ?? "Something went wrong");
      return;
    }

    const data = response.data as SpinResponse;
    // Animation plays while the server's authoritative result is already known.
    await sceneRef.current?.reveal(data.result as never);

    setBalance(data.balance);
    setWin(data.result);
    setSpinning(false);

    if (data.result.totalWin > 0) {
      play(data.result.totalWin >= bet * 20 ? "bigWin" : "win");
      play("coin");
    }
    if (data.progression?.leveledUp) {
      setMessage(`Level up! You reached level ${data.progression.newLevel} (+${formatCoins(data.progression.levelReward)} coins)`);
    }
    for (const achievement of data.progression?.unlockedAchievements ?? []) {
      setMessage(`Achievement unlocked: ${achievement.title} (+${formatCoins(achievement.reward)})`);
    }
  }, [authed, bet, config.id, play, setBalance, spinning]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-black text-text-primary">{config.name}</h1>
        <Badge tone="gold">{config.paylines.length} lines</Badge>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-gold-500/20 p-3 shadow-2xl shadow-black/50" style={{ background: theme.background }}>
        <div
          ref={hostRef}
          className="mx-auto w-full max-w-[560px]"
          data-testid="slot-reels"
          aria-label={`${config.name} reels`}
        />
        <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/5" />
      </div>

      <WinBanner win={win} bet={bet} />

      {message && (
        <p className="rounded-xl border border-gold-500/25 bg-gold-500/10 px-4 py-2 text-center text-sm text-gold-100">
          {message}
        </p>
      )}

      {/* Controls */}
      <div className="glass flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-secondary">Bet</span>
          <div className="flex items-center gap-1 rounded-xl border border-ink-600 bg-ink-800/70 p-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Decrease bet"
              disabled={spinning || betIndex === 0}
              onClick={() => setBetIndex((i) => Math.max(0, i - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-20 text-center font-display text-lg font-bold text-gold-200">
              {formatCoins(bet)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Increase bet"
              disabled={spinning || betIndex === levels.length - 1}
              onClick={() => setBetIndex((i) => Math.min(levels.length - 1, i + 1))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button
          onClick={spin}
          disabled={spinning}
          size="lg"
          className="min-w-[180px] text-base"
          aria-label="Spin"
        >
          {spinning ? (
            <>
              <Zap className="h-5 w-5 animate-pulse" /> Spinning…
            </>
          ) : (
            <>
              <RotateCw className="h-5 w-5" /> SPIN
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
