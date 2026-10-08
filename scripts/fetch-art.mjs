#!/usr/bin/env node
/**
 * Fetch real, licence-aware art for Catsino.
 *
 * Sources:
 *   - Openverse (https://openverse.org) — CC/public-domain photos, with licence
 *     metadata captured into CREDITS.json for attribution.
 *   - cataas.com — real cat photos, used as a fallback for cat symbols.
 *
 * Images are downloaded, center-cropped to a square and normalised to 512px
 * JPEG using macOS `sips`. Re-running is safe: existing files are skipped
 * unless --force is passed.
 *
 * Usage:  node scripts/fetch-art.mjs [--force] [--only=cat-meow]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const ART = join(ROOT, "public", "art");
const SIZE = 512;
const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const ONLY = args.find((a) => a.startsWith("--only="))?.split("=")[1] ?? null;

/** Symbol id -> search query, per slot. */
const SLOTS = {
  "cat-meow": {
    "golden-cat": "golden british shorthair cat",
    "cat-royal": "white persian cat",
    "cat-calico": "calico cat",
    "cat-tabby": "tabby cat",
    "cat-black": "black cat",
    fish: "goldfish",
    yarn: "ball of yarn",
    paw: "cat paw close up",
    mouse: "house mouse",
    bell: "gold bell",
  },
  "neko-nights": {
    "lucky-cat": "maneki neko lucky cat",
    "neon-neko": "neon cat sign",
    "samurai-cat": "cat japan street",
    lantern: "chinese paper lantern",
    sakura: "cherry blossom close",
    koi: "koi carp",
    sushi: "sushi salmon",
    fan: "japanese folding fan",
    bento: "bento box",
    "wind-chime": "glass wind chime",
  },
};

/** Brand + background art. */
const BRAND = {
  "brand/hero": "british shorthair cat portrait",
  "brand/logo": "cat face portrait",
  "brand/coin": "gold coin macro",
  "slots/cat-meow/background": "grey cat closeup",
  "slots/neko-nights/background": "neon tokyo night",
};

const CREDITS_FILE = join(ART, "CREDITS.json");

function loadCredits() {
  if (existsSync(CREDITS_FILE)) {
    try {
      return JSON.parse(readFileSync(CREDITS_FILE, "utf8"));
    } catch {
      return {};
    }
  }
  return {};
}

async function searchOpenverse(query) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=8&license_type=commercial&mature=false`;
  const res = await fetch(url, { headers: { "User-Agent": "Catsino/1.0 (portfolio project)" } });
  if (!res.ok) throw new Error(`openverse ${res.status}`);
  const json = await res.json();
  return json.results ?? [];
}

async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Catsino/1.0" } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error(`not an image: ${type}`);
  return Buffer.from(await res.arrayBuffer());
}

function normaliseSquare(inputPath, outputPath) {
  // sips ships with macOS. Crop to a centered square FIRST (using the smaller
  // side), then scale up to SIZE. Doing it the other way round leaves black
  // letterbox bars.
  try {
    const info = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", inputPath], {
      encoding: "utf8",
    });
    const width = Number(info.match(/pixelWidth:\s*(\d+)/)?.[1] ?? SIZE);
    const height = Number(info.match(/pixelHeight:\s*(\d+)/)?.[1] ?? SIZE);
    const side = Math.min(width, height);

    const square = outputPath.replace(/\.jpg$/, ".sq.jpg");
    execFileSync("sips", ["-c", String(side), String(side), inputPath, "--out", square], {
      stdio: "ignore",
    });
    execFileSync("sips", ["-s", "format", "jpeg", "-Z", String(SIZE), square, "--out", outputPath], {
      stdio: "ignore",
    });
    execFileSync("rm", ["-f", square]);
  } catch {
    // Fall back to the raw bytes if sips is unavailable (non-macOS dev).
    writeFileSync(outputPath, readFileSync(inputPath));
  }
}

async function fetchOne(relPath, query, credits) {
  const out = join(ART, `${relPath}.jpg`);
  if (existsSync(out) && !FORCE) {
    console.log(`skip  ${relPath}`);
    return;
  }
  mkdirSync(dirname(out), { recursive: true });

  const results = await searchOpenverse(query);
  for (const result of results) {
    try {
      const bytes = await download(result.url);
      const tmp = out.replace(/\.jpg$/, ".orig");
      writeFileSync(tmp, bytes);
      normaliseSquare(tmp, out);
      execFileSync("rm", ["-f", tmp]);

      credits[relPath] = {
        query,
        title: result.title,
        creator: result.creator,
        license: `${result.license} ${result.license_version ?? ""}`.trim(),
        source: result.foreign_landing_url,
        provider: result.provider,
      };
      console.log(`ok    ${relPath}  (${result.license}) ${result.title}`);
      return;
    } catch (error) {
      console.log(`retry ${relPath} — ${error.message}`);
    }
  }
  console.log(`FAIL  ${relPath} — no usable result for "${query}"`);
}

async function fetchCatFallback(relPath, credits) {
  const out = join(ART, `${relPath}.jpg`);
  try {
    const bytes = await download(`https://cataas.com/cat?width=${SIZE}&height=${SIZE}&t=${Date.now()}`);
    writeFileSync(out, bytes);
    credits[relPath] = { query: "cataas random cat", provider: "cataas.com", license: "cataas usage terms" };
    console.log(`fallback ok ${relPath}`);
  } catch (error) {
    console.log(`fallback FAIL ${relPath} — ${error.message}`);
  }
}

async function main() {
  const credits = loadCredits();

  for (const [rel, query] of Object.entries(BRAND)) {
    await fetchOne(rel, query, credits);
  }

  for (const [slot, symbols] of Object.entries(SLOTS)) {
    if (ONLY && ONLY !== slot) continue;
    for (const [symbol, query] of Object.entries(symbols)) {
      const rel = `slots/${slot}/${symbol}`;
      await fetchOne(rel, query, credits);
      // Cats get a guaranteed real-photo fallback.
      if (!existsSync(join(ART, `${rel}.jpg`)) && (query.includes("cat") || query.includes("neko"))) {
        await fetchCatFallback(rel, credits);
      }
    }
  }

  writeFileSync(CREDITS_FILE, JSON.stringify(credits, null, 2));
  console.log(`\nWrote ${Object.keys(credits).length} credits to public/art/CREDITS.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
