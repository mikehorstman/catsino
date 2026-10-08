import { cn } from "@/lib/utils";

/** Small pill used for statuses and filters. */
export function Badge({
  children,
  tone = "gold",
  className,
}: {
  children: React.ReactNode;
  tone?: "gold" | "purple" | "win" | "lose" | "muted";
  className?: string;
}) {
  const tones: Record<string, string> = {
    gold: "border-gold-500/40 bg-gold-500/10 text-gold-200",
    purple: "border-neon-purple/40 bg-neon-purple/10 text-neon-purple",
    win: "border-win/40 bg-win/10 text-win",
    lose: "border-lose/40 bg-lose/10 text-lose",
    muted: "border-ink-600 bg-ink-700/50 text-text-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
