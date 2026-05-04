/**
 * AssetFactory — creates all PixiJS Graphics objects for the game.
 * No external image assets are required (MVP).
 *
 * All shapes use PixiJS v8 Graphics API (chaining style).
 */

import { Graphics, Container, Text, TextStyle, Sprite, type Texture } from "pixi.js";

// ─── Bolt shape path helper ───────────────────────────────────────────────────

/**
 * Draws a lightning bolt shape into a Graphics object.
 * The bolt is centered at (0, 0), pointing downward.
 * Width ≈ 28px, Height ≈ 52px.
 */
function drawBoltPath(g: Graphics, fillColor: number, strokeColor: number): void {
  g.clear();
  g.setStrokeStyle({ width: 2, color: strokeColor, alpha: 1 });

  // Lightning bolt polygon (points relative to center)
  // Top-right → mid-right → center-right → bottom-left → mid-left → center-left
  g.poly([
    8, -26,   // top-right
    2, -2,    // mid upper-right
    14, -2,   // inner right jag
    -8, 26,   // bottom-left
    -2, 2,    // mid lower-left
    -14, 2,   // inner left jag
  ]);
  g.fill({ color: fillColor, alpha: 1 });
  g.stroke();
}

// ─── Public Factory ───────────────────────────────────────────────────────────

export class AssetFactory {
  /**
   * Regular thunder bolt — cyan fill, white stroke.
   * Returns a Container with the bolt Graphics + bounding radius.
   */
  static createBolt(): { container: Container; radius: number } {
    const container = new Container();
    const g = new Graphics();
    drawBoltPath(g, 0x00a0e3, 0xffffff); // Cyan fill
    container.addChild(g);
    return { container, radius: 22 };
  }

  /**
   * Thums Up Xforce can — using a Sprite.
   * Glow is cyan and red.
   */
  static createThumsUpBolt(texture: Texture): {
    container: Container;
    glow: Graphics;
    radius: number;
  } {
    const container = new Container();

    // Outer glow aura (pulsed externally)
    const glow = new Graphics();
    glow.circle(0, 0, 36);
    glow.fill({ color: 0x00a0e3, alpha: 0.25 }); // Cyan glow
    container.addChild(glow);

    // Second aura ring
    const ring = new Graphics();
    ring.circle(0, 0, 28);
    ring.fill({ color: 0xe31837, alpha: 0.18 }); // Red ring
    container.addChild(ring);

    // Thums Up Can Sprite
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    // Scale it to roughly fit the hit radius (height ~60, width ~30 for a can)
    const aspect = texture.width / texture.height;
    sprite.height = 64;
    sprite.width = 64 * aspect;
    container.addChild(sprite);

    return { container, glow, radius: 26 };
  }

  /**
   * Spark particle — small filled circle.
   * Color is randomized by caller for variety.
   */
  static createSparkParticle(color: number = 0x00a0e3): Graphics {
    const g = new Graphics();
    const radius = 3 + Math.random() * 3;
    g.circle(0, 0, radius);
    g.fill({ color, alpha: 1 });
    return g;
  }

  /**
   * Slash trail segment — white-to-transparent line rendered per frame.
   * Caller clears and redraws each frame.
   */
  static createTrailGraphics(): Graphics {
    return new Graphics();
  }
}
