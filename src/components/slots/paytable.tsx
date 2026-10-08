import type { SlotConfig } from "@/engine/slots/types";
import { getSlotTheme } from "@/games/slots/themes";

/** Static paytable, shown alongside every slot. */
export function Paytable({ config }: { config: SlotConfig }) {
  const theme = getSlotTheme(config.id);
  const rows = config.symbols.slice().sort((a, b) => a.weight - b.weight);

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="mb-3 font-display text-lg font-bold text-text-primary">Paytable</h3>
      <div className="space-y-2">
        {rows.map((symbol) => {
          const payouts = config.paytable[symbol.id] ?? {};
          const counts = Object.keys(payouts)
            .map(Number)
            .sort((a, b) => a - b);
          return (
            <div key={symbol.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>
                  {theme.symbolEmoji[symbol.id] ?? "🐱"}
                </span>
                <span className="text-text-secondary capitalize">
                  {symbol.id.replace(/-/g, " ")}
                  {symbol.kind !== "regular" && (
                    <span className="ml-2 rounded bg-ink-700 px-1.5 py-0.5 text-[10px] uppercase text-gold-300">
                      {symbol.kind}
                    </span>
                  )}
                </span>
              </span>
              <span className="tabular-nums text-text-muted">
                {counts.map((c) => (
                  <span key={c} className="ml-2">
                    <span className="text-text-muted">{c}×</span>{" "}
                    <span className="font-semibold text-gold-200">{payouts[c]}x</span>
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 border-t border-ink-700 pt-3 text-xs text-text-muted">
        Payouts are multipliers of the line bet. Wilds substitute for all regular
        symbols. Three or more scatters award free spins with a multiplier.
      </p>
    </div>
  );
}
