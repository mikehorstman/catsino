"use client";

import { useEffect } from "react";
import { Coins } from "lucide-react";
import { AnimatedNumber } from "./animated-number";
import { useBalanceStore } from "@/stores/balance";
import { cn } from "@/lib/utils";

/**
 * The player's coin balance. The server-rendered value seeds the store; every
 * later change comes from a server-action result, never from client maths.
 */
export function BalancePill({
  initialBalance = 0,
  className,
}: {
  initialBalance?: number;
  className?: string;
}) {
  const balance = useBalanceStore((s) => s.balance);
  const setBalance = useBalanceStore((s) => s.setBalance);

  useEffect(() => {
    setBalance(initialBalance);
  }, [initialBalance, setBalance]);

  // Before hydration the store is 0; show the server value so SSR is correct.
  const value = balance === 0 ? initialBalance : balance;

  return (
    <div
      className={cn("glass flex items-center gap-2 rounded-full py-1.5 pl-2 pr-4", className)}
      aria-label={`Balance ${value} coins`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-gold-300 to-gold-600 text-ink-950">
        <Coins className="h-4 w-4" />
      </span>
      <AnimatedNumber value={value} className="font-display text-base font-bold text-gold-200" />
      <span className="text-xs font-semibold uppercase tracking-wider text-gold-300/70">coins</span>
    </div>
  );
}

