/**
 * CATSINO — AI-generated cat art prompt library.
 *
 * Every asset in `public/art/` is generated from these prompts. Keep the style
 * block identical across prompts so the whole set feels like one game.
 *
 * Style block: dark luxury casino, premium, gold rim light, neon purple and
 * pink glow, high detail, centred subject, clean dark background, no text.
 */

export const STYLE_BLOCK =
  "dark luxury casino aesthetic, premium and elegant, gold rim lighting, " +
  "subtle neon purple and pink glow, highly detailed, centered composition, " +
  "clean dark charcoal background, soft studio reflections, no text, no watermark";

export interface AssetPrompt {
  id: string;
  /** Where the finished asset lives. */
  output: string;
  prompt: string;
  /** Recommended size before optimisation. */
  size: string;
}

export const BRAND_ASSETS: AssetPrompt[] = [
  {
    id: "logo",
    output: "public/art/brand/logo.png",
    prompt: `Elegant casino logo of a sophisticated cat face wearing a monocle and bow tie, gold and black, art deco, ${STYLE_BLOCK}`,
    size: "1024x1024",
  },
  {
    id: "hero",
    output: "public/art/brand/hero.png",
    prompt: `A regal black cat sitting at a luxury casino roulette table, gold chips, purple neon ambience, cinematic wide shot, ${STYLE_BLOCK}`,
    size: "1536x1024",
  },
  {
    id: "coin",
    output: "public/art/brand/coin.png",
    prompt: `A single shiny gold casino coin embossed with a cat paw print, transparent background, ${STYLE_BLOCK}`,
    size: "512x512",
  },
];

export const SLOT_ASSETS: Record<string, { background: string; symbols: { id: string; prompt: string }[] }> = {
  "cat-meow": {
    background: "public/art/slots/cat-meow/background.webp",
    symbols: [
      { id: "golden-cat", prompt: `A majestic golden cat statue head, jewel-encrusted wild symbol, ${STYLE_BLOCK}` },
      { id: "cat-royal", prompt: `A royal cat wearing a small crown, purple robes, ${STYLE_BLOCK}` },
      { id: "cat-calico", prompt: `A calico cat portrait, warm and friendly, ${STYLE_BLOCK}` },
      { id: "cat-tabby", prompt: `A tabby cat portrait, alert and playful, ${STYLE_BLOCK}` },
      { id: "cat-black", prompt: `A sleek black cat with glowing eyes, ${STYLE_BLOCK}` },
      { id: "fish", prompt: `A glossy fish treat, fresh and colourful, ${STYLE_BLOCK}` },
      { id: "yarn", prompt: `A ball of purple yarn with a loose thread, ${STYLE_BLOCK}` },
      { id: "paw", prompt: `A golden paw print pendant, ${STYLE_BLOCK}` },
      { id: "bell", prompt: `A glowing golden bell scatter symbol, radiant energy, ${STYLE_BLOCK}` },
    ],
  },
  "neko-nights": {
    background: "public/art/slots/neko-nights/background.webp",
    symbols: [
      { id: "lucky-cat", prompt: `A neon maneki-neko lucky cat, glowing, wild symbol, ${STYLE_BLOCK}` },
      { id: "neon-neko", prompt: `A cyberpunk neon cat head sign, pink and cyan glow, ${STYLE_BLOCK}` },
      { id: "samurai-cat", prompt: `A samurai cat in armour, noble, ${STYLE_BLOCK}` },
      { id: "lantern", prompt: `A glowing red paper lantern with a cat motif, ${STYLE_BLOCK}` },
      { id: "sakura", prompt: `A cluster of pink cherry blossom flowers, ${STYLE_BLOCK}` },
      { id: "koi", prompt: `A vibrant koi fish, red and white, ${STYLE_BLOCK}` },
      { id: "sushi", prompt: `A piece of fresh nigiri sushi, ${STYLE_BLOCK}` },
      { id: "fan", prompt: `A folded Japanese fan with a cat pattern, ${STYLE_BLOCK}` },
      { id: "wind-chime", prompt: `A glowing glass wind chime scatter symbol, ${STYLE_BLOCK}` },
    ],
  },
};
