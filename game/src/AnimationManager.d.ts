/**
 * AnimationManager — handles all non-bolt-movement animations:
 *  - Bolt slice (split into halves, fly apart, fade)
 *  - Spark particles (burst outward with gravity)
 *  - X-Force win (radial flash + bouncing text)
 *  - Missed bolt fade-out
 *
 * All animations use PixiJS Ticker delta for frame-rate independence.
 */
import { Container, type Application } from "pixi.js";
export declare class AnimationManager {
    private animations;
    private stage;
    constructor(stage: Container);
    update(dt: number): void;
    /**
     * Splits a bolt container into top/bottom halves that fly apart and fade.
     * Duration: 300ms
     */
    playSlice(boltContainer: Container, thumsUpTexture: import("pixi.js").Texture | null): void;
    /**
     * Bursts 8–12 spark particles outward from (x, y) with gravity.
     * Duration: 400ms
     */
    playSparks(x: number, y: number, isXForce: boolean): void;
    /**
     * Full-canvas radial golden flash + bouncing win text.
     * Uses bounce easing: 0 → 1.2 → 1.0 over 600ms.
     */
    playXForceWin(app: Application): void;
    playLightningFlash(width: number, height: number): void;
    playMiss(container: Container): void;
    get activeCount(): number;
}
//# sourceMappingURL=AnimationManager.d.ts.map