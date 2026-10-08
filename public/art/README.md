# Catsino art

AI-generated assets live here, organised by purpose:

```
art/
  brand/     logo, hero, coin
  slots/
    cat-meow/       background + symbol sprites
    neko-nights/    background + symbol sprites
  roulette/         wheel, felt, chips
```

Regenerate from the prompts in `ART_PROMPTS.ts` at the repo root. Symbols are
exported as transparent WebP/AVIF and packed into a per-slot atlas. Until they
land, `src/games/slots/themes.ts` maps symbol ids to emoji placeholders.
