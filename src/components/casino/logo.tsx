import Link from "next/link";
import { cn } from "@/lib/utils";

/** The Catsino wordmark. Uses a cat glyph until the AI logo lands. */
export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl sm:text-5xl",
  } as const;
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "grid place-items-center rounded-xl bg-gradient-to-b from-gold-300 to-gold-600 text-ink-950 shadow-glow-gold transition-transform group-hover:scale-105",
          size === "lg" ? "h-12 w-12 text-2xl" : "h-8 w-8 text-lg",
        )}
        aria-hidden
      >
        🐱
      </span>
      <span className={cn("font-display font-black tracking-tight", sizes[size])}>
        <span className="gold-text">CAT</span>
        <span className="text-text-primary">SINO</span>
      </span>
    </Link>
  );
}
