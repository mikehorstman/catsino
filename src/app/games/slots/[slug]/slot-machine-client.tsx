"use client";

import dynamic from "next/dynamic";
import type { SlotConfig } from "@/engine/slots/types";
import type { SlotTheme } from "@/games/slots/themes";

/**
 * PixiJS is heavy and browser-only, so the slot machine is loaded with
 * `ssr: false` — the home and catalogue pages never ship it.
 */
const SlotMachine = dynamic(
  () => import("@/components/slots/slot-machine").then((m) => m.SlotMachine),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[420px] place-items-center rounded-3xl border border-gold-500/20 bg-ink-800/40">
        <span className="animate-pulse font-display text-lg text-gold-200">Loading reels…</span>
      </div>
    ),
  },
);

export function SlotMachineClient(props: {
  config: SlotConfig;
  theme: SlotTheme;
  initialBalance: number;
  authed: boolean;
}) {
  return <SlotMachine {...props} />;
}
