/**
 * SlashDetector — tracks pointer/touch trail and tests intersection with bolts.
 *
 * Uses a circular buffer of the last 8 pointer positions.
 * Each frame, tests if the most recent line segment intersects a bolt's bounding circle.
 * Also renders the slash trail as a fading white line.
 */
const TRAIL_LENGTH = 8;
const TRAIL_FADE_MS = 120;
export class SlashDetector {
    trail = [];
    isPointerDown = false;
    // ── Trail management ───────────────────────────────────────────────────────
    onPointerMove(x, y) {
        if (!this.isPointerDown)
            return;
        this.trail.push({ x, y, t: performance.now() });
        if (this.trail.length > TRAIL_LENGTH) {
            this.trail.shift();
        }
    }
    onPointerDown(x, y) {
        this.isPointerDown = true;
        this.trail = [{ x, y, t: performance.now() }];
    }
    onPointerUp() {
        this.isPointerDown = false;
        this.trail = [];
    }
    // ── Intersection test ─────────────────────────────────────────────────────
    /**
     * Tests if the most recent line segment of the trail intersects
     * the given bounding circle (center bx/by, radius br).
     * Returns true if intersecting.
     */
    checkIntersection(bx, by, br) {
        if (this.trail.length < 2)
            return false;
        const now = performance.now();
        // Only consider trail points from the last TRAIL_FADE_MS
        const recent = this.trail.filter((p) => now - p.t < TRAIL_FADE_MS * 2);
        if (recent.length < 2)
            return false;
        // Check each consecutive segment
        for (let i = 1; i < recent.length; i++) {
            const a = recent[i - 1];
            const b = recent[i];
            if (segmentCircleIntersects(a.x, a.y, b.x, b.y, bx, by, br)) {
                return true;
            }
        }
        return false;
    }
    // ── Trail rendering ────────────────────────────────────────────────────────
    /**
     * Renders the slash trail onto the provided Graphics object.
     * Called once per frame — clears and redraws.
     */
    renderTrail(g) {
        g.clear();
        if (this.trail.length < 2)
            return;
        const now = performance.now();
        for (let i = 1; i < this.trail.length; i++) {
            const a = this.trail[i - 1];
            const b = this.trail[i];
            const age = now - b.t;
            const alpha = Math.max(0, 1 - age / TRAIL_FADE_MS);
            if (alpha <= 0)
                continue;
            const width = 3 * alpha + 1;
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
            g.setStrokeStyle({
                width,
                color: 0xffffff,
                alpha,
                cap: "round",
                join: "round",
            });
            g.stroke();
        }
    }
    get hasTrail() {
        return this.trail.length >= 2;
    }
    /** Returns the midpoint of the last trail segment (for spark origin). */
    get lastMidpoint() {
        if (this.trail.length < 2)
            return null;
        const a = this.trail[this.trail.length - 2];
        const b = this.trail[this.trail.length - 1];
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
}
// ─── Geometry helpers ─────────────────────────────────────────────────────────
/**
 * Returns true if line segment (ax,ay)→(bx,by) intersects circle (cx,cy,r).
 * Uses closest-point-on-segment projection.
 */
function segmentCircleIntersects(ax, ay, bx, by, cx, cy, r) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
        t = ((cx - ax) * dx + (cy - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
    }
    const nearX = ax + t * dx;
    const nearY = ay + t * dy;
    const distSq = (cx - nearX) ** 2 + (cy - nearY) ** 2;
    return distSq <= r * r;
}
//# sourceMappingURL=SlashDetector.js.map