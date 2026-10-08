/**
 * Per-slot visual theme. Emoji are placeholders that stand in for the final
 * AI-generated symbol art in `public/art/slots/<id>/`. Swapping in real art
 * means replacing this mapping with texture atlas keys — the scene code and
 * engine do not change.
 */
export interface SlotTheme {
  id: string;
  background: string;
  frameGlow: string;
  symbolEmoji: Record<string, string>;
  symbolColour: Record<string, string>;
}

export const SLOT_THEMES: Record<string, SlotTheme> = {
  "cat-meow": {
    id: "cat-meow",
    background: "linear-gradient(160deg,#1a1420,#0b0b12)",
    frameGlow: "#d4af37",
    symbolEmoji: {
      "golden-cat": "😻",
      "cat-royal": "🐱",
      "cat-calico": "🐈",
      "cat-tabby": "🐈‍⬛",
      "cat-black": "🐾",
      fish: "🐟",
      yarn: "🧶",
      paw: "🐾",
      bell: "🔔",
    },
    symbolColour: {
      "golden-cat": "#f0d27a",
      "cat-royal": "#a855f7",
      "cat-calico": "#f97316",
      "cat-tabby": "#22d3ee",
      "cat-black": "#94a3b8",
      fish: "#38bdf8",
      yarn: "#ec4899",
      paw: "#d4af37",
      bell: "#facc15",
    },
  },
  "neko-nights": {
    id: "neko-nights",
    background: "linear-gradient(160deg,#1b1030,#0b0b12)",
    frameGlow: "#ec4899",
    symbolEmoji: {
      "lucky-cat": "🐱",
      "neon-neko": "😸",
      "samurai-cat": "🐈‍⬛",
      lantern: "🏮",
      sakura: "🌸",
      koi: "🐠",
      sushi: "🍣",
      fan: "🪭",
      "wind-chime": "🎐",
    },
    symbolColour: {
      "lucky-cat": "#f0d27a",
      "neon-neko": "#ec4899",
      "samurai-cat": "#a855f7",
      lantern: "#ef4444",
      sakura: "#f9a8d4",
      koi: "#fb923c",
      sushi: "#fca5a5",
      fan: "#22d3ee",
      "wind-chime": "#a3e635",
    },
  },
};

export function getSlotTheme(id: string): SlotTheme {
  return SLOT_THEMES[id] ?? SLOT_THEMES["cat-meow"];
}
