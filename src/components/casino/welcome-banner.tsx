"use client";

import confetti from "canvas-confetti";
import { PartyPopper, X } from "lucide-react";
import { useEffect, useState } from "react";

export function WelcomeBanner({ amount }: { amount: number }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.3 } });
  }, []);

  if (!open) return null;
  return (
    <div
      role="status"
      className="relative mb-6 flex items-center gap-3 rounded-2xl border border-gold-500/40 bg-gold-500/10 px-5 py-4 text-gold-100"
    >
      <PartyPopper className="h-6 w-6 shrink-0 text-gold-300" />
      <p className="text-sm sm:text-base">
        <strong className="font-display">Welcome to Catsino!</strong> We&apos;ve added{" "}
        <strong>{amount.toLocaleString("en-US")}</strong> free coins to your wallet. Good luck!
      </p>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Dismiss"
        className="ml-auto rounded-md p-1 text-gold-200 hover:bg-gold-500/20"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
