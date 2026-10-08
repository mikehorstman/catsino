import { Application, Container, Graphics, Text } from "pixi.js";
import { WHEEL_ORDER, isRed } from "@/engine/roulette/bets";

/**
 * PixiJS European roulette wheel. Renders the 37 pockets with correct colours
 * and spins so the ball lands on the server-provided winning number.
 */
export class RouletteWheel {
  private app = new Application();
  private wheel = new Container();
  private ball = new Graphics();
  private radius = 150;

  private started = false;

  async init(host: HTMLElement) {
    const size = Math.min(360, Math.max(240, host.clientWidth));
    this.radius = size / 2 - 12;

    await this.app.init({
      width: size,
      height: size,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1),
      autoDensity: true,
    });
    if (this.app.canvas) host.appendChild(this.app.canvas);
    this.started = true;

    this.drawWheel(size / 2, size / 2);
    this.app.stage.addChild(this.wheel);

    this.ball.circle(0, 0, 6).fill(0xf5f5f7);
    this.ball.x = size / 2;
    this.ball.y = size / 2 - this.radius * 0.78;
    this.app.stage.addChild(this.ball);
  }

  private drawWheel(cx: number, cy: number) {
    const pockets = WHEEL_ORDER.length;
    const seg = (Math.PI * 2) / pockets;

    const rim = new Graphics();
    rim.circle(cx, cy, this.radius).fill(0x8f711d);
    rim.circle(cx, cy, this.radius - 5).fill(0x0b0b12);
    this.wheel.addChild(rim);

    WHEEL_ORDER.forEach((num, i) => {
      const start = i * seg - Math.PI / 2 - seg / 2;
      const g = new Graphics();
      const colour = num === 0 ? 0x0d5c3a : isRed(num) ? 0xb91c1c : 0x1f1f2b;
      g.moveTo(cx, cy)
        .arc(cx, cy, this.radius - 8, start, start + seg)
        .lineTo(cx, cy)
        .fill(colour)
        .stroke({ width: 1, color: 0x000000, alpha: 0.4 });
      this.wheel.addChild(g);

      const label = new Text({
        text: String(num),
        style: { fontSize: 11, fill: 0xf5f5f7, fontWeight: "700" },
      });
      label.anchor.set(0.5);
      const angle = start + seg / 2;
      label.x = cx + Math.cos(angle) * (this.radius - 20);
      label.y = cy + Math.sin(angle) * (this.radius - 20);
      this.wheel.addChild(label);
    });

    const hub = new Graphics();
    hub.circle(cx, cy, this.radius * 0.42).fill(0x16161f).stroke({ width: 3, color: 0xd4af37 });
    this.wheel.addChild(hub);
    this.wheel.pivot.set(cx, cy);
    this.wheel.position.set(cx, cy);
  }

  /** Spin so `winningNumber` ends under the ball pointer at the top. */
  async spinTo(winningNumber: number): Promise<void> {
    const gsap = (await import("gsap")).default;
    const pockets = WHEEL_ORDER.length;
    const index = WHEEL_ORDER.indexOf(winningNumber);
    const seg = (Math.PI * 2) / pockets;
    // Rotation that brings the winning pocket to the top pointer.
    const targetAngle = -index * seg;
    const turns = Math.PI * 2 * 5;

    return new Promise((resolve) => {
      gsap.to(this.wheel, {
        rotation: targetAngle + turns,
        duration: 4,
        ease: "power4.out",
        onUpdate: () => {
          // Ball orbits opposite the wheel for realism.
          const t = this.wheel.rotation;
          this.ball.x = this.wheel.position.x + Math.sin(-t * 0.15) * this.radius * 0.8;
          this.ball.y = this.wheel.position.y - Math.cos(-t * 0.15) * this.radius * 0.8;
        },
        onComplete: () => {
          this.ball.x = this.wheel.position.x;
          this.ball.y = this.wheel.position.y - this.radius * 0.78;
          resolve();
        },
      });
    });
  }

  /** Reset rotation for a fresh spin. */
  reset() {
    this.wheel.rotation = 0;
  }

  destroy() {
    if (!this.started) return;
    try {
      this.app.destroy({ removeView: true }, { children: true });
    } catch {
      // Already torn down.
    }
    this.started = false;
  }
}
