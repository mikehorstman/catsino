import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeading } from "@/components/casino/section-heading";
import { GameHistoryTable } from "@/components/casino/game-history-table";
import { requireUser } from "@/server/auth/guards";
import { getStore } from "@/server/store";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Game history" };

const PAGE_SIZE = 20;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "slots", label: "Slots" },
  { key: "roulette", label: "Roulette" },
  { key: "win", label: "Wins" },
  { key: "loss", label: "Losses" },
] as const;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const user = await requireUser();

  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.key === sp.filter) ? sp.filter! : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const store = getStore();

  const opts: {
    kind?: string;
    result?: "win" | "loss";
    limit: number;
    offset: number;
  } = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };
  if (filter === "slots" || filter === "roulette") opts.kind = filter;
  if (filter === "win" || filter === "loss") opts.result = filter;

  const rounds = await store.listRounds(user.id, opts);
  const total = await store.countRounds(user.id);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(next: Partial<{ filter: string; page: number }>) {
    const params = new URLSearchParams();
    const nextFilter = next.filter ?? filter;
    const nextPage = next.page ?? page;
    if (nextFilter !== "all") params.set("filter", nextFilter);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return `/history${qs ? `?${qs}` : ""}`;
  }

  return (
    <PageShell>
      <SectionHeading
        title="Game History"
        subtitle={`${total} rounds played.`}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={href({ filter: f.key, page: 1 })}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f.key
                ? "border-gold-500/50 bg-gold-500/15 text-gold-200"
                : "border-ink-600 bg-ink-800/60 text-text-secondary hover:text-text-primary",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <GameHistoryTable rounds={rounds} />

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={href({ page: page - 1 })}
              className="rounded-lg border border-ink-600 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={href({ page: page + 1 })}
              className="rounded-lg border border-ink-600 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </PageShell>
  );
}
