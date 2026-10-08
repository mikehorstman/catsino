import type { Metadata } from "next";
import { PageShell } from "@/components/layout/page-shell";
import { RouletteClient } from "./roulette-client";
import { requireUser } from "@/server/auth/guards";
import { getStore } from "@/server/store";
import { WalletService } from "@/server/store/wallet";

export const metadata: Metadata = {
  title: "Roulette",
  description:
    "Play European single-zero roulette on Catsino. Straight up, splits, dozens, columns and even-money bets with virtual coins.",
};

export default async function RoulettePage() {
  const user = await requireUser();
  const balance = await new WalletService(getStore()).getBalance(user.id);

  return (
    <PageShell>
      <RouletteClient initialBalance={balance} authed={true} />
    </PageShell>
  );
}
