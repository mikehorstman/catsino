import {
  Application,
  Assets,
  BlurFilter,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  type Ticker,
} from "pixi.js";
import type { SlotConfig, SpinResult } from "@/engine/slots/types";
import { buildStrip } from "@/engine/slots/engine";
import { symbolImage, type SlotTheme } from "@/games/slots/themes";

/**
 * PixiJS reel scene.
 *
 * Owns all per-frame animation so React never re-renders during a spin. The
 * scene is driven entirely by a server `SpinResult`: the client only animates
 * the outcome it was given, it never decides the outcome.
 *
 * Symbols render as real cat photos loaded into textures; the emoji in the
 * theme are only a fallback if a texture fails to load.
 */
export class SlotReels {
  private app = new Application();
  private reels: {
    container: Container;
    tiles: Container[];
    strip: string[];
    offset: number; // pixels scrolled
    speed: number;
    spinning: boolean;
    blur: BlurFilter;
  }[] = [];
  private overlay = new Graphics();
  private started = false;
  private cellW = 90;
  private cellH = 90;
  private cols: number;
  private rows: number;
  private tickerFn?: (t: Ticker) => void;
  private textures = new Map<string, Texture>();

  constructor(
    private config: SlotConfig,
    private theme: SlotTheme,
  ) {
    this.cols = config.cols;
    this.rows = config.rows;
  }

  /** Preload every symbol photo into a texture. */
  private async loadTextures() {
    const ids = this.config.symbols.map((s) => s.id);
    await Promise.all(
      ids.map(async (id) => {
        try {
          const texture = await Assets.load<Texture>(symbolImage(this.config.id, id));
          this.textures.set(id, texture);
        } catch {
          // Missing photo — the emoji fallback covers it.
        }
      }),
    );
  }

  async init(host: HTMLElement) {
    const width = Math.max(280, host.clientWidth);
    this.cellW = Math.floor(width / this.cols);
    this.cellH = Math.floor(this.cellW * 0.95);

    await this.loadTextures();

    await this.app.init({
      width: this.cellW * this.cols,
      height: this.cellH * this.rows,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1),
      autoDensity: true,
    });
    if (this.app.canvas) host.appendChild(this.app.canvas);
    this.started = true;

    this.buildReels();
    this.app.stage.addChild(this.overlay);
    this.startTicker();
  }

  private tile(symbolId: string): Container {
    const cell = new Container();
    const radius = Math.round(this.cellW * 0.16);
    const pad = Math.round(this.cellW * 0.06);
    const w = this.cellW - pad * 2;
    const h = this.cellH - pad * 2;

    const texture = this.textures.get(symbolId);
    if (texture) {
      // Photo symbol: cover the rounded tile.
      const sprite = new Sprite(texture);
      const scale = Math.max(w / texture.width, h / texture.height);
      sprite.scale.set(scale);
      sprite.anchor.set(0.5);
      sprite.position.set(this.cellW / 2, this.cellH / 2);

      const mask = new Graphics().roundRect(pad, pad, w, h, radius).fill(0xffffff);
      sprite.mask = mask;
      cell.addChild(mask, sprite);

      // Gold rim on wild/scatter symbols so they read as special.
      const symbol = this.config.symbols.find((s) => s.id === symbolId);
      const rimColour =
        symbol?.kind === "wild" ? 0xf0d27a : symbol?.kind === "scatter" ? 0xec4899 : 0x2a2a38;
      const rim = new Graphics()
        .roundRect(pad, pad, w, h, radius)
        .stroke({ width: symbol?.kind === "regular" ? 2 : 3, color: rimColour, alpha: symbol?.kind === "regular" ? 0.6 : 1 });
      cell.addChild(rim);
    } else {
      // Fallback tile with emoji.
      const bg = new Graphics();
      bg.roundRect(pad, pad, w, h, radius)
        .fill({ color: 0x10101a, alpha: 0.9 })
        .stroke({ width: 2, color: 0x2a2a38 });
      cell.addChild(bg);
      const emoji = new Text({
        text: this.theme.symbolEmoji[symbolId] ?? "🐱",
        style: { fontSize: Math.round(this.cellH * 0.5), align: "center" },
      });
      emoji.anchor.set(0.5);
      emoji.position.set(this.cellW / 2, this.cellH / 2);
      cell.addChild(emoji);
    }

    return cell;
  }

  private buildReels() {
    for (let col = 0; col < this.cols; col += 1) {
      const strip = buildStrip(this.config, col);
      const container = new Container();
      // Each reel is its own column; position it horizontally.
      container.x = col * this.cellW;
      // Mask so tiles only show inside the visible window.
      const mask = new Graphics()
        .rect(0, 0, this.cellW, this.cellH * this.rows)
        .fill(0xffffff);
      container.mask = mask;
      container.addChild(mask);

      const blur = new BlurFilter({ strength: 0, quality: 2 });
      container.filters = [blur];

      const tiles: Container[] = [];
      for (let i = 0; i < strip.length; i += 1) {
        const t = this.tile(strip[i]);
        t.x = 0; // local to the column container
        t.y = i * this.cellH;
        container.addChild(t);
        tiles.push(t);
      }

      this.app.stage.addChild(container);
      this.setColumnOffset(container, tiles, strip, 0);
      this.reels.push({ container, tiles, strip, offset: 0, speed: 0, spinning: false, blur });
    }
    this.app.stage.addChild(this.overlay);
    // Bring overlay to the front each time it is used.
    this.app.stage.setChildIndex(this.overlay, this.app.stage.children.length - 1);
  }

  /** Position tiles for a given pixel offset, wrapping around the strip. */
  private setColumnOffset(container: Container, tiles: Container[], strip: string[], offset: number) {
    const L = strip.length;
    const wrapped = ((offset % (L * this.cellH)) + L * this.cellH) % (L * this.cellH);
    const shift = Math.floor(wrapped / this.cellH);
    const frac = wrapped - shift * this.cellH;
    for (let i = 0; i < L; i += 1) {
      const tile = tiles[i];
      const idx = (i - shift + L * 2) % L;
      tile.y = idx * this.cellH - frac;
      // Hide tiles far outside the window for performance.
      tile.visible = tile.y > -this.cellH * 1.5 && tile.y < this.cellH * (this.rows + 0.5);
      const symbol = strip[((i - shift) % L + L) % L];
      void symbol;
    }
    void container;
  }

  private startTicker() {
    this.tickerFn = () => {
      for (const reel of this.reels) {
        if (!reel.spinning) continue;
        reel.offset += reel.speed;
        this.setColumnOffset(reel.container, reel.tiles, reel.strip, reel.offset);
      }
    };
    this.app.ticker.add(this.tickerFn);
  }

  /** Begin the spin animation (visual only). */
  startSpin() {
    this.clearOverlay();
    for (const reel of this.reels) {
      reel.spinning = true;
      reel.blur.strength = 6;
    }
    // Slight speed variation per reel for a natural feel.
    this.reels.forEach((reel, i) => {
      reel.speed = this.cellH * (0.85 + i * 0.05);
    });
  }

  /**
   * Animate the stopping of every reel so the final visible grid equals the
   * server-provided result. Resolves when all reels have stopped.
   */
  async reveal(result: SpinResult): Promise<void> {
    const gsap = (await import("gsap")).default;

    await Promise.all(
      this.reels.map(
        (reel, col) =>
          new Promise<void>((resolve) => {
            const L = reel.strip.length;
            reel.spinning = false;

            const stop = result.stops[col];
            // Offset so the top visible symbol is strip[stop].
            const base = ((stop % L) + L) % L;
            const targetBase = base * this.cellH;
            const period = L * this.cellH;
            // Ensure at least two extra full loops of travel.
            let target = targetBase;
            while (target < reel.offset + period * 1.5) target += period;

            reel.blur.strength = 0;
            gsap.to(reel, {
              offset: target,
              duration: 0.9 + col * 0.12,
              ease: "power3.out",
              onUpdate: () => this.setColumnOffset(reel.container, reel.tiles, reel.strip, reel.offset),
              onComplete: () => resolve(),
            });
          }),
      ),
    );

    this.highlight(result);
  }

  private highlight(result: SpinResult) {
    this.clearOverlay();
    const pad = Math.round(this.cellW * 0.12);
    for (const win of result.lineWins) {
      const points = win.positions.map((p) => ({
        x: p.col * this.cellW + this.cellW / 2,
        y: p.row * this.cellH + this.cellH / 2,
      }));
      this.overlay.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) this.overlay.lineTo(points[i].x, points[i].y);
      this.overlay.stroke({ width: 4, color: 0xf0d27a, alpha: 0.9, cap: "round" });

      for (const p of points) {
        this.overlay
          .roundRect(p.x - this.cellW / 2 + pad, p.y - this.cellH / 2 + pad, this.cellW - pad * 2, this.cellH - pad * 2, 12)
          .stroke({ width: 3, color: 0xf0d27a, alpha: 0.8 });
      }
    }
  }

  private clearOverlay() {
    this.overlay.clear();
  }

  resize(host: HTMLElement) {
    if (!this.started) return;
    const width = Math.max(280, host.clientWidth);
    this.cellW = Math.floor(width / this.cols);
    this.cellH = Math.floor(this.cellW * 0.95);
    if (this.app.renderer) {
      this.app.renderer.resize(this.cellW * this.cols, this.cellH * this.rows);
    }
    // Rebuild tiles for the new metrics.
    for (const reel of this.reels) reel.container.destroy({ children: true });
    for (const reel of this.reels) this.app.stage.removeChild(reel.container);
    this.reels = [];
    this.app.stage.removeChild(this.overlay);
    this.buildReels();
  }

  destroy() {
    // Guard: React StrictMode can unmount before `init()` finishes.
    if (!this.started) return;
    try {
      if (this.tickerFn) this.app.ticker.remove(this.tickerFn);
      this.app.destroy({ removeView: true }, { children: true });
    } catch {
      // Already torn down.
    }
    this.started = false;
  }
}
