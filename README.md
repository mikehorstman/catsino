# 🐱 CATSINO

A polished, **free-to-play** cat-themed online casino built with Next.js. All game
outcomes, balances, bonuses and XP are computed **server-side** — the client only
animates the authoritative result it is given.

> **No real money.** Catsino uses virtual "Catsino Coins" only. There is no
> deposit, withdrawal or real-money wagering anywhere in the app.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4 + custom design tokens |
| State | Zustand (UI/audio only — balance is server-owned) |
| Animations | PixiJS v8 (reels, wheel, particles) + GSAP + Framer-free CSS |
| Audio | Howler.js behind an `AudioManager` |
| Validation | Zod |
| Auth | JWT session cookies (`jose`) + argon2 password hashing |
| Persistence | In-memory store (optional JSON file) behind a `Store` interface |
| Tests | Vitest (unit + integration) + Playwright (E2E) |

## Architecture

```
Browser (RSC pages + client islands)
  SlotMachine / RouletteGame  ──► Server Actions (Zod + auth guard)
                                       │
                            ┌──────────▼──────────┐
                            │  RoundService        │  per-user lock, idempotency
                            │  WalletService       │  append-only ledger
                            │  BonusService        │
                            │  ProgressionService  │
                            └──────────┬──────────┘
                                       │
                            ┌──────────▼──────────┐
                            │  Pure game engines   │  slots / roulette / rng
                            │  (no I/O, injectable │  fully unit-testable
                            │   RNG, data configs) │
                            └──────────┬──────────┘
                                       │
                                   Store (in-memory)
```

Key principles:

- **Server authority.** Outcomes, win amounts, XP and bonuses are computed only on the
  server. The client never sends a result or a balance.
- **Pure engine.** `spinSlot()` and `spinRoulette()` take `(config, bet, rng)` and are
  free of I/O, so they are deterministic under a seeded RNG and easy to test.
- **Data-driven games.** Each slot is a config; the engine interprets it. Adding a slot
  means adding data, not code.
- **Append-only ledger.** `wallets.balance` is a cache; the ledger is the source of
  truth and can be reconciled.

## Getting started

```bash
pnpm install
cp .env.example .env.local
pnpm dev            # http://localhost:3100
```

Other scripts:

```bash
pnpm test           # Vitest unit + integration
pnpm typecheck      # tsc --noEmit
pnpm build          # production build
pnpm test:e2e       # Playwright smoke tests
```

Catsino runs on **port 3100** so it never clashes with other local apps.

## Environment

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Session signing key. Dev has a fallback; production requires a real value. |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for SEO/OG. |
| `PERSIST` | Set to `file` to persist players/balances across restarts. |
| `CATSINO_DATA_FILE` | JSON store path (default `./data/catsino.json`). |

## Project layout

```
src/
  app/               routes (home, games, slots/[slug], roulette, bonuses, profile, history, auth)
  engine/            pure game engines (rng, slots, roulette) — no I/O
  games/             slot configs, themes, catalogue, progression, achievements
  server/
    actions/         Server Actions (Zod-validated, auth-guarded)
    services/        RoundService, WalletService, BonusService, ProgressionService, AuthService
    store/           Store interface + in-memory implementation, wallet ledger, mutex
    auth/            session, passwords, guards
  components/        UI (ui/, casino/, slots/, roulette/, layout/, auth/)
  stores/            Zustand UI stores
tests/               unit/, integration/, e2e/
```

## Adding a game

1. **Slots:** add a config in `src/games/slots/<id>/config.ts`, register it in
   `registry.ts`, add a theme in `themes.ts`, and add a catalogue entry. The engine
   and UI reuse everything else.
2. **New game type:** add a pure engine under `src/engine/<game>/`, a `play<Game>()`
   method on `RoundService`, a Server Action, and a client scene.

## AI art

Symbol art is generated from prompts in `ART_PROMPTS.ts`. Emoji are placeholders in
`src/games/slots/themes.ts` until the final assets land in `public/art/`.

## Roadmap

- **Phase 2:** Space Cats, Pirate Cats, bonus rounds, achievements, blackjack, dice,
  admin dashboard, provable-fairness page.
- **Phase 3:** Plinko, Mines, Wheel, Baccarat, cosmetics, leaderboards, PWA, i18n.
