/**
 * AnimationManager — handles all non-bolt-movement animations:
 *  - Bolt slice (split into halves, fly apart, fade)
 *  - Spark particles (burst outward with gravity)
 *  - X-Force win (radial flash + bouncing text)
 *  - Missed bolt fade-out
 *
 * All animations use PixiJS Ticker delta for frame-rate independence.
 */
import { Graphics, Text, TextStyle, Sprite, } from "pixi.js";
import { AssetFactory } from "./AssetFactory.js";
export class AnimationManager {
    animations = [];
    stage;
    constructor(stage) {
        this.stage = stage;
    }
    // ── Tick all active animations ─────────────────────────────────────────────
    update(dt) {
        this.animations = this.animations.filter((anim) => {
            const done = anim.update(dt);
            if (done)
                anim.cleanup();
            return !done;
        });
    }
    // ── Bolt slice animation ───────────────────────────────────────────────────
    /**
     * Splits a bolt container into top/bottom halves that fly apart and fade.
     * Duration: 300ms
     */
    playSlice(boltContainer, thumsUpTexture) {
        const x = boltContainer.x;
        const y = boltContainer.y;
        if (thumsUpTexture) {
            // X-Force Hit: Thums Up can bursts out of the sliced bolt!
            const can = new Sprite(thumsUpTexture);
            can.anchor.set(0.5);
            can.x = x;
            can.y = y;
            can.scale.set(0);
            // Add a red glow behind it
            const glow = new Graphics();
            glow.circle(0, 0, 50);
            glow.fill({ color: 0xe31837, alpha: 0.6 });
            glow.x = x;
            glow.y = y;
            glow.scale.set(0);
            this.stage.addChild(glow);
            this.stage.addChild(can);
            let elapsed = 0;
            const DURATION = 0.8;
            // Determine the base scale to make the can ~180px tall (nice and punchy)
            const baseScale = 180 / thumsUpTexture.height;
            this.animations.push({
                update: (dt) => {
                    elapsed += dt;
                    const t = Math.min(elapsed / 0.4, 1); // bounce up in 400ms
                    // Apply bounce easing multiplied by our baseScale
                    const scale = bounceEase(t) * baseScale;
                    can.scale.set(scale);
                    // Glow scales independently
                    const glowScale = bounceEase(t) * 1.5;
                    glow.scale.set(glowScale * (1 + 0.15 * Math.sin(elapsed * 12)));
                    glow.alpha = 0.6 * (1 - Math.min(elapsed / DURATION, 1));
                    return elapsed >= DURATION;
                },
                cleanup: () => {
                    // Leave the can on stage, it looks cool during the win animation!
                    // ThunderSlash.ts destroy() will clean it up.
                    glow.destroy();
                },
            });
        }
        // Create top half (moves up-right)
        const topHalf = new Graphics();
        topHalf.rect(-14, -26, 28, 26);
        topHalf.fill({ color: 0x00a0e3, alpha: 1 }); // Cyan
        topHalf.x = x;
        topHalf.y = y;
        this.stage.addChild(topHalf);
        // Create bottom half (moves down-left)
        const botHalf = new Graphics();
        botHalf.rect(-14, 0, 28, 26);
        botHalf.fill({ color: 0x44c8f5, alpha: 1 }); // Lighter cyan
        botHalf.x = x;
        botHalf.y = y;
        this.stage.addChild(botHalf);
        let elapsed = 0;
        const DURATION = 0.3; // seconds
        this.animations.push({
            update: (dt) => {
                elapsed += dt;
                const t = Math.min(elapsed / DURATION, 1);
                const alpha = 1 - t;
                topHalf.x = x + t * 30;
                topHalf.y = y - t * 40;
                topHalf.rotation = t * 0.8;
                topHalf.alpha = alpha;
                botHalf.x = x - t * 30;
                botHalf.y = y + t * 40;
                botHalf.rotation = -t * 0.8;
                botHalf.alpha = alpha;
                return t >= 1;
            },
            cleanup: () => {
                this.stage.removeChild(topHalf);
                this.stage.removeChild(botHalf);
                topHalf.destroy();
                botHalf.destroy();
            },
        });
    }
    // ── Spark particles ────────────────────────────────────────────────────────
    /**
     * Bursts 8–12 spark particles outward from (x, y) with gravity.
     * Duration: 400ms
     */
    playSparks(x, y, isXForce) {
        const count = 8 + Math.floor(Math.random() * 5);
        const colors = isXForce
            ? [0x00a0e3, 0xe31837, 0xffffff, 0x00a0e3] // Cyan, Red, White
            : [0x00a0e3, 0xffffff, 0x44c8f5, 0x0084c2]; // Cyan variations
        const particles = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            const speed = 80 + Math.random() * 120;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const g = AssetFactory.createSparkParticle(color);
            g.x = x;
            g.y = y;
            this.stage.addChild(g);
            particles.push({ g, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
        }
        let elapsed = 0;
        const DURATION = 0.4;
        const GRAVITY = 200;
        this.animations.push({
            update: (dt) => {
                elapsed += dt;
                const t = Math.min(elapsed / DURATION, 1);
                for (const p of particles) {
                    p.vy += GRAVITY * dt;
                    p.g.x += p.vx * dt;
                    p.g.y += p.vy * dt;
                    p.g.alpha = 1 - t;
                }
                return t >= 1;
            },
            cleanup: () => {
                for (const p of particles) {
                    this.stage.removeChild(p.g);
                    p.g.destroy();
                }
            },
        });
    }
    // ── X-Force win animation ──────────────────────────────────────────────────
    /**
     * Full-canvas radial golden flash + bouncing win text.
     * Uses bounce easing: 0 → 1.2 → 1.0 over 600ms.
     */
    playXForceWin(app) {
        const W = app.screen.width;
        const H = app.screen.height;
        // Radial flash overlay
        const flash = new Graphics();
        flash.rect(0, 0, W, H);
        flash.fill({ color: 0x00a0e3, alpha: 0.6 }); // Cyan flash
        this.stage.addChild(flash);
        // Win text
        const winText = new Text({
            text: "YOU WON THUMS UP XFORCE!",
            style: new TextStyle({
                fontSize: 26,
                fontFamily: "Inter, Arial, sans-serif",
                fontWeight: "bold",
                fill: 0xffffff,
                dropShadow: {
                    blur: 12,
                    color: 0xe31837, // Red shadow
                    distance: 0,
                    alpha: 0.9,
                },
                align: "center",
                wordWrap: true,
                wordWrapWidth: W - 40,
            }),
        });
        winText.anchor.set(0.5, 0.5);
        winText.x = W / 2;
        winText.y = H / 2;
        winText.scale.set(0);
        this.stage.addChild(winText);
        // Sub-text
        const sub = new Text({
            text: "⚡ Slashing the Xforce can ⚡",
            style: new TextStyle({
                fontSize: 14,
                fontFamily: "Inter, Arial, sans-serif",
                fill: 0x44c8f5,
                align: "center",
            }),
        });
        sub.anchor.set(0.5, 0.5);
        sub.x = W / 2;
        sub.y = H / 2 + 38;
        sub.alpha = 0;
        this.stage.addChild(sub);
        let elapsed = 0;
        const TOTAL = 1.2; // seconds total animation
        this.animations.push({
            update: (dt) => {
                elapsed += dt;
                const t = Math.min(elapsed / TOTAL, 1);
                // Flash fades out quickly
                flash.alpha = Math.max(0, 0.6 * (1 - t * 2));
                // Bounce easing for text scale
                const scale = bounceEase(Math.min(elapsed / 0.6, 1));
                winText.scale.set(scale);
                // Sub-text fades in after 0.3s
                sub.alpha = Math.max(0, (elapsed - 0.3) / 0.3);
                return t >= 1;
            },
            cleanup: () => {
                // Keep text visible — ThunderSlash.ts will handle the end state
                this.stage.removeChild(flash);
                flash.destroy();
                // winText and sub persist until game.end() clears stage
            },
        });
    }
    // ── Ambient Lightning Flash ──────────────────────────────────────────────────
    playLightningFlash(width, height) {
        const flash = new Graphics();
        flash.rect(0, 0, width, height);
        flash.fill({ color: 0xffffff, alpha: 0.15 }); // subtle white flash
        this.stage.addChildAt(flash, 0); // Put it behind the bolts
        let elapsed = 0;
        const DURATION = 0.15; // very quick flash
        this.animations.push({
            update: (dt) => {
                elapsed += dt;
                const t = Math.min(elapsed / DURATION, 1);
                flash.alpha = 0.15 * (1 - t);
                return t >= 1;
            },
            cleanup: () => {
                this.stage.removeChild(flash);
                flash.destroy();
            },
        });
    }
    // ── Missed bolt fade ───────────────────────────────────────────────────────
    playMiss(container) {
        let elapsed = 0;
        const DURATION = 0.25;
        const startAlpha = container.alpha;
        this.animations.push({
            update: (dt) => {
                elapsed += dt;
                const t = Math.min(elapsed / DURATION, 1);
                container.alpha = startAlpha * (1 - t);
                return t >= 1;
            },
            cleanup: () => {
                // BoltManager removes the container from stage
            },
        });
    }
    // ── Helpers ────────────────────────────────────────────────────────────────
    get activeCount() {
        return this.animations.length;
    }
}
// ─── Easing ───────────────────────────────────────────────────────────────────
/** Bounce easing: goes to 1.2 at t=0.7, settles to 1.0 at t=1.0 */
function bounceEase(t) {
    if (t < 0.7) {
        return (t / 0.7) * 1.2;
    }
    return 1.2 - ((t - 0.7) / 0.3) * 0.2;
}
//# sourceMappingURL=AnimationManager.js.map