/**
 * AssetFactory — creates all PixiJS Graphics objects for the game.
 * No external image assets are required (MVP).
 *
 * All shapes use PixiJS v8 Graphics API (chaining style).
 */
import { Graphics, Container, type Texture } from "pixi.js";
export declare class AssetFactory {
    /**
     * Regular thunder bolt — cyan fill, white stroke.
     * Returns a Container with the bolt Graphics + bounding radius.
     */
    static createBolt(): {
        container: Container;
        radius: number;
    };
    /**
     * Thums Up Xforce can — using a Sprite.
     * Glow is cyan and red.
     */
    static createThumsUpBolt(texture: Texture): {
        container: Container;
        glow: Graphics;
        radius: number;
    };
    /**
     * Spark particle — small filled circle.
     * Color is randomized by caller for variety.
     */
    static createSparkParticle(color?: number): Graphics;
    /**
     * Slash trail segment — white-to-transparent line rendered per frame.
     * Caller clears and redraws each frame.
     */
    static createTrailGraphics(): Graphics;
}
//# sourceMappingURL=AssetFactory.d.ts.map