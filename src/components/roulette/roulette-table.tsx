"use client";

import { cn } from "@/lib/utils";
import { isRed, isBlack } from "@/engine/roulette/bets";
import type { Bet, BetType } from "@/engine/roulette/types";

export type PlacedBet = Bet;

const RED = "bg-red-700/80 hover:bg-red-600";
const BLACK = "bg-ink-700 hover:bg-ink-600";
const GREEN = "bg-felt hover:bg-emerald-700";

interface CellProps {
  label: string;
  className?: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

function Cell({ label, className, onClick, disabled, title }: CellProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid place-items-center rounded-sm border border-black/40 text-xs font-semibold text-white transition-colors disabled:opacity-60",
        className,
      )}
    >
      {label}
    </button>
  );
}

/**
 * European roulette felt. Straight numbers plus the standard outside bets.
 * Tapping a number places a straight bet; the outside buttons place even-money
 * and dozen/column bets. (Split/corner shortcuts can be added later.)
 */
export function RouletteTable({
  chip,
  bets,
  onPlace,
  disabled,
}: {
  chip: number;
  bets: PlacedBet[];
  onPlace: (bet: PlacedBet) => void;
  disabled?: boolean;
}) {
  const straight = (n: number): PlacedBet => ({ type: "straight", selection: [n], amount: chip });
  const outside = (type: BetType, selection: number[] = []): PlacedBet => ({ type, selection, amount: chip });

  const numbers = Array.from({ length: 36 }, (_, i) => i + 1);

  return (
    <div className="glass overflow-hidden rounded-2xl p-3">
      <div className="no-scrollbar overflow-x-auto">
        <div className="min-w-[560px]">
          {/* Zero + 1..36 in a 3-row grid */}
          <div className="flex gap-1">
            <Cell
              label="0"
              title="Straight up 0"
              className={cn(GREEN, "h-[132px] w-10 shrink-0")}
              onClick={() => onPlace(straight(0))}
              disabled={disabled}
            />
            <div className="grid flex-1 grid-cols-12 gap-1">
              {numbers.map((n) => (
                <Cell
                  key={n}
                  label={String(n)}
                  title={`Straight up ${n}`}
                  className={cn(isRed(n) ? RED : BLACK, "h-10")}
                  onClick={() => onPlace(straight(n))}
                  disabled={disabled}
                />
              ))}
              {/* Dozens row */}
              <Cell
                label="1st 12"
                className="col-span-4 h-10 bg-ink-600"
                onClick={() => onPlace(outside("dozen", numbers.slice(0, 12)))}
                disabled={disabled}
              />
              <Cell
                label="2nd 12"
                className="col-span-4 h-10 bg-ink-600"
                onClick={() => onPlace(outside("dozen", numbers.slice(12, 24)))}
                disabled={disabled}
              />
              <Cell
                label="3rd 12"
                className="col-span-4 h-10 bg-ink-600"
                onClick={() => onPlace(outside("dozen", numbers.slice(24, 36)))}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Outside bets */}
          <div className="mt-1 grid grid-cols-6 gap-1">
            <Cell label="1-18" className="h-10 bg-ink-600" onClick={() => onPlace(outside("low"))} disabled={disabled} />
            <Cell label="EVEN" className="h-10 bg-ink-600" onClick={() => onPlace(outside("even"))} disabled={disabled} />
            <Cell label="RED ♦" className="h-10 bg-red-700/80" onClick={() => onPlace(outside("red"))} disabled={disabled} />
            <Cell label="BLACK ♠" className="h-10 bg-ink-700" onClick={() => onPlace(outside("black"))} disabled={disabled} />
            <Cell label="ODD" className="h-10 bg-ink-600" onClick={() => onPlace(outside("odd"))} disabled={disabled} />
            <Cell label="19-36" className="h-10 bg-ink-600" onClick={() => onPlace(outside("high"))} disabled={disabled} />
          </div>
        </div>
      </div>

      {bets.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-700 pt-3 text-xs">
          <span className="text-text-muted">On the table:</span>
          {bets.map((b, i) => (
            <span key={i} className="rounded-full bg-ink-700 px-2 py-0.5 text-gold-200">
              {b.type} {b.selection.length === 1 ? b.selection[0] : ""} · {b.amount}
            </span>
          ))}
          <span className="ml-auto text-text-muted">
            straight total: {bets.filter((b) => b.type === "straight").reduce((s, b) => s + b.amount, 0)}
          </span>
        </div>
      )}
    </div>
  );
}
