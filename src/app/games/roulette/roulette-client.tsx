"use client";

import dynamic from "next/dynamic";

const RouletteGame = dynamic(
  () =>
    import("@/components/roulette/roulette-game").then((m) => m.RouletteGame),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[420px] place-items-center rounded-3xl border border-gold-500/20 bg-ink-800/40">
        <span className="animate-pulse font-display text-lg text-gold-200">
          Loading table…
        </span>
      </div>
    ),
  },
);

export function RouletteClient(props: {
  initialBalance: number;
  authed: boolean;
}) {
  return <RouletteGame {...props} />;
}
