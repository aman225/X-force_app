/**
 * SlashDetector — tracks pointer/touch trail and tests intersection with bolts.
 *
 * Uses a circular buffer of the last 8 pointer positions.
 * Each frame, tests if the most recent line segment intersects a bolt's bounding circle.
 * Also renders the slash trail as a fading white line.
 */
import { Graphics } from "pixi.js";
export declare class SlashDetector {
    private trail;
    private isPointerDown;
    onPointerMove(x: number, y: number): void;
    onPointerDown(x: number, y: number): void;
    onPointerUp(): void;
    /**
     * Tests if the most recent line segment of the trail intersects
     * the given bounding circle (center bx/by, radius br).
     * Returns true if intersecting.
     */
    checkIntersection(bx: number, by: number, br: number): boolean;
    /**
     * Renders the slash trail onto the provided Graphics object.
     * Called once per frame — clears and redraws.
     */
    renderTrail(g: Graphics): void;
    get hasTrail(): boolean;
    /** Returns the midpoint of the last trail segment (for spark origin). */
    get lastMidpoint(): {
        x: number;
        y: number;
    } | null;
}
//# sourceMappingURL=SlashDetector.d.ts.map