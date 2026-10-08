import type { Metadata } from "next";
import { Cinzel, Outfit } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCurrentUser } from "@/server/auth/guards";
import { getStore } from "@/server/store/memory";
import { WalletService } from "@/server/store/wallet";

const display = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  variable: "--font-display",
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100"),
  title: {
    default: "Catsino — Play the Cat Casino",
    template: "%s · Catsino",
  },
  description:
    "Catsino is a free-to-play cat casino. Spin cat-themed slots and play European roulette with virtual Catsino Coins. No real money, ever.",
  openGraph: {
    title: "Catsino — Play the Cat Casino",
    description:
      "Spin cat-themed slots and play European roulette with virtual Catsino Coins.",
    type: "website",
    siteName: "Catsino",
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const balance = user ? new WalletService(getStore()).getBalance(user.id) : 0;

  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <SiteHeader
          user={user ? { displayName: user.displayName, level: user.level } : null}
          balance={balance}
        />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

