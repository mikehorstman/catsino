/**
 * Game catalogue metadata (SEO + navigation). Kept separate from engine
 * configs so the home/games pages never import the engine.
 */
export interface GameMeta {
  id: string;
  title: string;
  kind: "slots" | "roulette";
  href: string;
  tagline: string;
  /** Tailwind gradient classes for the card art placeholder. */
  accent: string;
  status: "live" | "coming-soon";
  popularity: number;
}

export const GAMES: GameMeta[] = [
  {
    id: "cat-meow",
    title: "Cat Meow",
    kind: "slots",
    href: "/games/slots/cat-meow",
    tagline: "The classic Catsino slot — breeds, fish and yarn.",
    accent: "from-gold-500/30 to-neon-pink/20",
    status: "live",
    popularity: 100,
  },
  {
    id: "neko-nights",
    title: "Neko Nights",
    kind: "slots",
    href: "/games/slots/neko-nights",
    tagline: "Neon Tokyo cats, lanterns and cherry blossoms.",
    accent: "from-neon-purple/30 to-neon-pink/20",
    status: "live",
    popularity: 92,
  },
  {
    id: "roulette",
    title: "Catsino Roulette",
    kind: "roulette",
    href: "/games/roulette",
    tagline: "European single-zero table with full inside and outside bets.",
    accent: "from-felt/40 to-gold-500/20",
    status: "live",
    popularity: 80,
  },
  {
    id: "space-cats",
    title: "Space Cats",
    kind: "slots",
    href: "/games/slots/space-cats",
    tagline: "Cosmic wilds and astronaut cats. Launching soon.",
    accent: "from-neon-cyan/30 to-neon-purple/20",
    status: "coming-soon",
    popularity: 60,
  },
  {
    id: "pirate-cats",
    title: "Pirate Cats",
    kind: "slots",
    href: "/games/slots/pirate-cats",
    tagline: "Treasure, gold and a pirate captain wild. Launching soon.",
    accent: "from-gold-600/30 to-ink-700/40",
    status: "coming-soon",
    popularity: 55,
  },
];

export function getGameMeta(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}
