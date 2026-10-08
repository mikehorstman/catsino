/**
 * CATSINO — art sourcing.
 *
 * Art is fetched as real, licence-aware photos by `scripts/fetch-art.mjs`
 * (Openverse + cataas), not generated. This file documents the queries used so
 * the set can be reproduced or swapped for commissioned art.
 *
 * To replace a photo: drop a 512×512 JPEG at the matching path under
 * `public/art/` and re-run the app. Attribution lives in `public/art/CREDITS.json`.
 */

export const ART_QUERIES: Record<string, string> = {
  "brand/hero": "british shorthair cat portrait",
  "brand/logo": "cat face portrait",
  "brand/coin": "gold coin macro",
  "slots/cat-meow/background": "grey cat closeup",
  "slots/neko-nights/background": "neon tokyo night",
  "slots/cat-meow/golden-cat": "golden british shorthair cat",
  "slots/cat-meow/cat-royal": "white persian cat",
  "slots/cat-meow/cat-calico": "calico cat",
  "slots/cat-meow/cat-tabby": "tabby cat",
  "slots/cat-meow/cat-black": "black cat",
  "slots/cat-meow/fish": "goldfish",
  "slots/cat-meow/yarn": "ball of yarn",
  "slots/cat-meow/paw": "cat paw close up",
  "slots/cat-meow/mouse": "house mouse",
  "slots/cat-meow/bell": "gold bell",
  "slots/neko-nights/lucky-cat": "maneki neko lucky cat",
  "slots/neko-nights/neon-neko": "neon cat sign",
  "slots/neko-nights/samurai-cat": "cat japan street",
  "slots/neko-nights/lantern": "chinese paper lantern",
  "slots/neko-nights/sakura": "cherry blossom close",
  "slots/neko-nights/koi": "koi carp",
  "slots/neko-nights/sushi": "sushi salmon",
  "slots/neko-nights/fan": "japanese folding fan",
  "slots/neko-nights/bento": "bento box",
  "slots/neko-nights/wind-chime": "glass wind chime",
};
