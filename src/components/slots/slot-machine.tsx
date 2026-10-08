"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCw, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlotReels } from "./pixi-reels";
import { WinBanner } from "./win-banner";
import { FreeSpinsStatus } from "./bonus-summary";
import { PickBonusGame, type PickBonusView } from "./pick-bonus-game";
import { JackpotTicker } from "@/components/casino/jackpot-ticker";
import { WinCelebration } from "@/components/casino/win-celebration";
import { spinSlotAction, playFreeSpinAction } from "@/server/actions/slots";
import { useAudioStore } from "@/stores/audio";
import { useBalanceStore } from "@/stores/balance";
import { formatCoins } from "@/lib/utils";
import { slotBackgroundImage, type SlotTheme } from "@/games/slots/themes";
import type { SlotConfig, SpinResult } from "@/engine/slots/types";
import type { SlotState } from "@/server/services/round";

interface SpinResponse {
  balance: number;
  result: SpinResult;
  progression: {
    gainedXp: number;
    leveledUp: boolean;
    newLevel: number;
    levelReward: number;
    unlockedAchievements: { id: string; title: string; reward: number }[];
  };
  bonus:
    | { type: "pickBonus"; id: string; picks: number; cellCount: number; bet: number }
    | { type: "freeSpins"; remaining: number; multiplier: number; bet: number }
    | null;
  jackpot: { amount: number; pool: number } | null;
  jackpotPool: number;
}

function newKey() {
  return crypto.randomUUID();
}

export function SlotMachine({
  config,
  theme,
  initialBalance,
  authed,
  initialState,
  initialJackpot,
}: {
  config: SlotConfig;
  theme: SlotTheme;
  initialBalance: number;
  authed: boolean;
  initialState: SlotState;
  initialJackpot: number;
}) {
  const levels = config.betLevels;
  const [betIndex, setBetIndex] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [win, setWin] = useState<SpinResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [jackpotPool, setJackpotPool] = useState(initialJackpot);
  const [celebration, setCelebration] = useState<{ win: number; bet: number } | null>(null);
  const [freeSpins, setFreeSpins] = useState<
    { remaining: number; multiplier: number; bet: number; accumulated: number } | null
  >(initialState.freeSpins ?? null);
  const [pickBonus, setPickBonus] = useState<PickBonusView | null>(
    initialState.activeBonus
      ? {
          id: initialState.activeBonus.id,
          bet: initialState.activeBonus.bet,
          picks: initialState.activeBonus.picks,
          chosen: initialState.activeBonus.chosen,
          revealed: initialState.activeBonus.revealed,
          complete: false,
          result: null,
        }
      : null,
  );
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SlotReels | null>(null);
  const play = useAudioStore((s) => s.play);
  const setBalance = useBalanceStore((s) => s.setBalance);
  const bet = levels[betIndex];

  useEffect(() => {
    let disposed = false;
    const host = hostRef.current;
    if (!host) return;

    const scene = new SlotReels(config, theme);
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

  const announce = useCallback((data: SpinResponse) => {
    if (data.progression?.leveledUp) {
      setMessage(
        `Level up! You reached level ${data.progression.newLevel} (+${formatCoins(data.progression.levelReward)} coins)`,
      );
    }
    for (const achievement of data.progression?.unlockedAchievements ?? []) {
      setMessage(`Achievement unlocked: ${achievement.title} (+${formatCoins(achievement.reward)})`);
    }
  }, []);

  const handleResult = useCallback(
    (data: SpinResponse) => {
      setBalance(data.balance);
      setJackpotPool(data.jackpotPool);
      if (data.bonus?.type === "freeSpins") {
        setFreeSpins((prev) => ({
          remaining: data.bonus!.type === "freeSpins" ? data.bonus!.remaining : 0,
          multiplier: data.bonus!.type === "freeSpins" ? data.bonus!.multiplier : 1,
          bet: data.bonus!.bet,
          accumulated: prev?.accumulated ?? 0,
        }));
      } else if (!data.bonus) {
        setFreeSpins(null);
      }
      if (data.bonus?.type === "pickBonus") {
        setPickBonus({
          id: data.bonus.id,
          bet: data.bonus.bet,
          picks: data.bonus.picks,
          chosen: [],
          revealed: [],
          complete: false,
          result: null,
        });
        play("bigWin");
      }
      // Jackpot win takes over the screen.
      if (data.jackpot) {
        setCelebration({ win: data.jackpot.amount, bet: 1 });
        play("bigWin");
      }
      announce(data);
    },
    [announce, play, setBalance],
  );

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

    const response = freeSpins
      ? await playFreeSpinAction({ gameId: config.id })
      : await spinSlotAction({ gameId: config.id, bet, idempotencyKey: newKey() });

    if (!response.ok || !response.data) {
      setSpinning(false);
      setMessage(response.error?.message ?? "Something went wrong");
      return;
    }

    const data = response.data as SpinResponse;
    await sceneRef.current?.reveal(data.result);
    setWin(data.result);
    setSpinning(false);

    if (data.result.totalWin > 0) {
      play(data.result.totalWin >= bet * 20 ? "bigWin" : "win");
      play("coin");
      // Big wins get the full-screen celebration.
      if (data.result.totalWin >= bet * 20) {
        setCelebration({ win: data.result.totalWin, bet });
      }
    }
    handleResult(data);
  }, [authed, bet, config.id, freeSpins, handleResult, play, spinning]);

  // Track the running bonus win for the free-spins status bar.
  useEffect(() => {
    if (win && freeSpins) {
      setFreeSpins((prev) => (prev ? { ...prev, accumulated: (prev.accumulated ?? 0) + win.totalWin } : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win]);

  const inFreeSpins = Boolean(freeSpins && freeSpins.remaining > 0);

  return (
    <div className="space-y-4">
      {celebration && (
        <WinCelebration
          totalWin={celebration.win}
          bet={celebration.bet}
          onDone={() => setCelebration(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-black text-text-primary">{config.name}</h1>
        <Badge tone="gold">{config.paylines.length} lines</Badge>
      </div>

      <JackpotTicker pool={jackpotPool} />

      {freeSpins && (
        <FreeSpinsStatus
          remaining={freeSpins.remaining}
          multiplier={freeSpins.multiplier}
          accumulated={freeSpins.accumulated}
        />
      )}

      {pickBonus ? (
        <PickBonusGame
          gameId={config.id}
          state={pickBonus}
          onComplete={(bonusWin) => {
            setWin({ totalWin: bonusWin } as SpinResult);
            setMessage(`Cat Burglar Bonus complete — you won ${formatCoins(bonusWin)} coins!`);
            setPickBonus(null);
          }}
        />
      ) : null}

      {/* The reels stay mounted (just hidden) so the Pixi canvas survives a bonus. */}
      <div className={pickBonus ? "hidden" : "space-y-4"}>
        <div
          className="relative overflow-hidden rounded-3xl border border-gold-500/20 p-3 shadow-2xl shadow-black/50"
          style={{ background: theme.background }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slotBackgroundImage(config.id)}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950/60 via-transparent to-ink-950/80" />
          <div
            ref={hostRef}
            className="relative mx-auto w-full max-w-[560px]"
            data-testid="slot-reels"
            aria-label={`${config.name} reels`}
          />
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/5" />
        </div>

        <WinBanner win={win} bet={bet} />
      </div>

      {message && (
        <p className="rounded-xl border border-gold-500/25 bg-gold-500/10 px-4 py-2 text-center text-sm text-gold-100">
          {message}
        </p>
      )}

      {!pickBonus && (
        <div className="glass flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-secondary">Bet</span>
            <div className="flex items-center gap-1 rounded-xl border border-ink-600 bg-ink-800/70 p-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Decrease bet"
                disabled={spinning || inFreeSpins || betIndex === 0}
                onClick={() => setBetIndex((i) => Math.max(0, i - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-20 text-center font-display text-lg font-bold text-gold-200">
                {inFreeSpins ? "FREE" : formatCoins(bet)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Increase bet"
                disabled={spinning || inFreeSpins || betIndex === levels.length - 1}
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
            aria-label={inFreeSpins ? "Free spin" : "Spin"}
          >
            {spinning ? (
              <>
                <Zap className="h-5 w-5 animate-pulse" /> Spinning…
              </>
            ) : inFreeSpins ? (
              <>
                <Sparkles className="h-5 w-5" /> FREE SPIN
              </>
            ) : (
              <>
                <RotateCw className="h-5 w-5" /> SPIN
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
