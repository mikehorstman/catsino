import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { Paytable } from "@/components/slots/paytable";
import { SlotMachineClient } from "./slot-machine-client";
import { getSlotConfig } from "@/games/slots/registry";
import { getGameMeta } from "@/games/catalog";
import { getSlotTheme } from "@/games/slots/themes";
import { getOrCreateUser } from "@/server/auth/guards";
import { getStore } from "@/server/store/memory";
import { WalletService } from "@/server/store/wallet";
import { RoundService } from "@/server/services/round";

const LIVE_SLUGS = ["cat-meow", "neko-nights"];

export function generateStaticParams() {
  return LIVE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = getSlotConfig(slug);
  if (!config) return { title: "Slot" };
  return {
    title: config.name,
    description: `Play ${config.name} — a cat-themed ${config.cols}-reel, ${config.paylines.length}-payline slot on Catsino.`,
    openGraph: { title: `${config.name} · Catsino` },
  };
}

export default async function SlotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const config = getSlotConfig(slug);
  if (!config) notFound();

  const user = await getOrCreateUser();
  const balance = new WalletService(getStore()).getBalance(user.id);
  const theme = getSlotTheme(slug);
  const meta = getGameMeta(slug);
  const initialState = new RoundService(getStore()).getSlotState(user, config);
  const jackpotPool = getStore().getJackpot().pool;

  return (
    <PageShell>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <SlotMachineClient
            config={config}
            theme={theme}
            initialBalance={balance}
            authed={true}
            initialState={initialState}
            initialJackpot={jackpotPool}
          />
        </div>
        <aside className="space-y-5">
          <Paytable config={config} />
          <div className="glass rounded-2xl p-5 text-sm text-text-muted">
            <h3 className="mb-2 font-display text-base font-bold text-text-primary">How it plays</h3>
            <ul className="list-inside list-disc space-y-1">
              <li>{config.cols} reels × {config.rows} rows</li>
              <li>{config.paylines.length} fixed paylines</li>
              <li>Wilds substitute for any regular symbol</li>
              <li>3+ scatters trigger free spins with a multiplier</li>
              <li>Target RTP {(config.rtpTarget * 100).toFixed(0)}%</li>
            </ul>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
