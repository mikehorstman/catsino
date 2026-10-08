"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Volume2,
  VolumeX,
  LogOut,
  User as UserIcon,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/casino/logo";
import { BalancePill } from "@/components/casino/balance-pill";
import { JackpotTicker } from "@/components/casino/jackpot-ticker";
import { Button } from "@/components/ui/button";
import { useAudioStore } from "@/stores/audio";
import { logoutAction } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/games/slots", label: "Slots" },
  { href: "/games/roulette", label: "Roulette" },
  { href: "/bonuses", label: "Bonuses" },
];

export function SiteHeader({
  user,
  balance,
  jackpotPool,
}: {
  user: { displayName: string; level: number; isGuest?: boolean } | null;
  balance: number;
  jackpotPool: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const muted = useAudioStore((s) => s.muted);
  const toggleMute = useAudioStore((s) => s.toggleMute);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function logout() {
    startTransition(async () => {
      await logoutAction();
      router.push("/");
      router.refresh();
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gold-500/10 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-gold-500/10 text-gold-200"
                    : "text-text-secondary hover:bg-ink-700/60 hover:text-text-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden lg:block">
            <JackpotTicker pool={jackpotPool} compact />
          </div>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
            className="grid h-10 w-10 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-ink-700/60 hover:text-text-primary"
          >
            {muted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </button>

          {user ? (
            <>
              <BalancePill initialBalance={balance} />
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
                >
                  <UserIcon className="h-4 w-4" />
                  <span className="font-medium">{user.displayName}</span>
                  {user.isGuest && (
                    <span className="rounded-full border border-gold-500/40 bg-gold-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-200">
                      Guest
                    </span>
                  )}
                </Link>
                {user.isGuest ? (
                  <Button asChild size="sm">
                    <Link href="/register">Save progress</Link>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    aria-label="Log out"
                    disabled={pending}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Join</Link>
              </Button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            className="grid h-10 w-10 place-items-center rounded-lg text-text-secondary md:hidden"
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          className="border-t border-gold-500/10 bg-ink-900/95 px-4 pb-4 pt-2 md:hidden"
          aria-label="Mobile"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium text-text-secondary hover:bg-ink-700/60 hover:text-text-primary"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 px-1">
            {user ? (
              <>
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href="/profile" onClick={() => setMenuOpen(false)}>
                    Profile
                  </Link>
                </Button>
                {user.isGuest ? (
                  <Button asChild size="sm" className="flex-1">
                    <Link href="/register" onClick={() => setMenuOpen(false)}>
                      Save progress
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    disabled={pending}
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href="/login" onClick={() => setMenuOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild size="sm" className="flex-1">
                  <Link href="/register" onClick={() => setMenuOpen(false)}>
                    Join
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
