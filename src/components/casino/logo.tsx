import Link from "next/link";
import { cn } from "@/lib/utils";

/** The Catsino wordmark, using a real cat photo as the mark. */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl sm:text-5xl",
  } as const;
  const markSize = size === "lg" ? "h-12 w-12" : "h-9 w-9";
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/art/brand/logo.jpg"
        alt="Catsino"
        className={cn(
          "rounded-xl object-cover ring-2 ring-gold-500/60 shadow-glow-gold transition-transform group-hover:scale-105",
          markSize,
        )}
      />
      <span
        className={cn("font-display font-black tracking-tight", sizes[size])}
      >
        <span className="gold-text">CAT</span>
        <span className="text-text-primary">SINO</span>
      </span>
    </Link>
  );
}
