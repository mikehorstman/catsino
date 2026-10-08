"use client";

import { useEffect, useRef, useState } from "react";
import { cn, formatCoins } from "@/lib/utils";

/**
 * Animated count-up for coin values. Drives its own rAF loop so it never
 * triggers React re-renders for intermediate values beyond the display state.
 */
export function AnimatedNumber({
  value,
  className,
  durationMs = 600,
}: {
  value: number;
  className?: string;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const from = fromRef.current;
    const to = value;

    if (reduced || from === to) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      fromRef.current = to;
    };
  }, [value, durationMs]);

  return (
    <span className={cn("tabular-nums", className)}>
      {formatCoins(display)}
    </span>
  );
}
