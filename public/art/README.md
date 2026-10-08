# Catsino art

Real, licence-aware photos fetched by `scripts/fetch-art.mjs`.

```
art/
  brand/            logo, hero, coin
  slots/
    cat-meow/       background + one photo per symbol
    neko-nights/    background + one photo per symbol
  CREDITS.json      source, creator and licence for every image
```

## Regenerating

```bash
node scripts/fetch-art.mjs            # fetch anything missing
node scripts/fetch-art.mjs --force    # re-fetch everything
node scripts/fetch-art.mjs --only=cat-meow
```

Sources: [Openverse](https://openverse.org) (CC / public-domain photos) with
[cataas.com](https://cataas.com) as a real-cat fallback. Images are center-cropped
to 512×512 JPEG with macOS `sips`.

**Attribution:** `CREDITS.json` records the creator, licence and source URL for
every image. Most are CC-BY / CC-BY-SA, which require attribution — surface the
credits in the UI (or swap in your own art) before publishing.
