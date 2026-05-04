/**
 * BoltManager — handles bolt spawning, physics, and lifecycle.
 *
 * Bolts are spawned over a 30-second window using a scheduled queue.
 * Each bolt falls from a random X position with a random speed and wobble.
 * One bolt per session is designated X-Force (determined by index from API).
 *
 * The X-Force designation is NOT stored in BoltState.isXForce on the client.
 * The server determines it via boltIndex comparison. On the client, X-Force
 * bolt only has a visually different appearance.
 */
import { AssetFactory } from "./AssetFactory.js";
export class BoltManager {
    stage;
    config;
    callbacks;
    slashDetector;
    animManager;
    bolts = [];
    spawnSchedule = []; // elapsed seconds when each bolt spawns
    nextSpawnIdx = 0;
    totalBolts = 0;
    // X-Force bolt visual tracking
    xForceBoltIndex = -1;
    thumsUpTexture = null;
    xForceGlows = new Map();
    constructor(stage, config, callbacks, slashDetector, animManager) {
        this.stage = stage;
        this.config = config;
        this.callbacks = callbacks;
        this.slashDetector = slashDetector;
        this.animManager = animManager;
    }
    // ── Initialization ─────────────────────────────────────────────────────────
    init(totalBolts) {
        this.totalBolts = totalBolts;
        this.spawnSchedule = this.buildSpawnSchedule(totalBolts, this.config.durationSeconds);
        this.nextSpawnIdx = 0;
        this.bolts = [];
    }
    setXForceBoltVisualIndex(index, texture) {
        this.xForceBoltIndex = index;
        this.thumsUpTexture = texture;
    }
    // ── Spawn schedule ─────────────────────────────────────────────────────────
    buildSpawnSchedule(count, duration) {
        const usableDuration = duration - 5;
        const times = [];
        for (let i = 0; i < count; i++) {
            const base = (i / count) * usableDuration;
            const slot = usableDuration / count;
            const jitter = (Math.random() - 0.5) * slot * 0.6;
            times.push(Math.max(0.5, base + jitter));
        }
        return times.sort((a, b) => a - b);
    }
    // ── Canvas dimensions ──────────────────────────────────────────────────────
    canvasWidth = 400;
    canvasHeight = 300;
    setDimensions(w, h) {
        this.canvasWidth = w;
        this.canvasHeight = h;
    }
    // ── Spawn a bolt ───────────────────────────────────────────────────────────
    spawnBolt(index) {
        const isXForceVisual = index === this.xForceBoltIndex && this.thumsUpTexture !== null;
        // Always spawn regular bolt initially
        const result = AssetFactory.createBolt();
        const container = result.container;
        const radius = result.radius;
        const x = radius + Math.random() * (this.canvasWidth - radius * 2);
        const speed = this.config.boltSpeedMin +
            Math.random() * (this.config.boltSpeedMax - this.config.boltSpeedMin);
        const rotationSpeed = (Math.random() - 0.5) * 1.5; // rad/s wobble
        container.x = x;
        container.y = -40;
        container.rotation = (Math.random() - 0.5) * 0.3;
        this.stage.addChild(container);
        const bolt = {
            index,
            isXForce: false, // never set true on client — server decides
            x,
            y: -40,
            speed,
            rotationSpeed,
            radius,
            sliced: false,
            missed: false,
            container,
        };
        this.bolts.push(bolt);
        // No pre-glow for X-Force bolt since it's hidden as a regular bolt
    }
    // ── Per-frame update ───────────────────────────────────────────────────────
    update(elapsed, dt) {
        // Random ambient flashes for more "thunder" adventure
        if (Math.random() < 0.005) { // Occasional background flash
            this.animManager.playLightningFlash(this.canvasWidth, this.canvasHeight);
        }
        // Spawn due bolts
        while (this.nextSpawnIdx < this.spawnSchedule.length &&
            elapsed >= (this.spawnSchedule[this.nextSpawnIdx] ?? Infinity)) {
            this.spawnBolt(this.nextSpawnIdx);
            this.nextSpawnIdx++;
        }
        // Update X-Force glow pulses
        for (const [, entry] of this.xForceGlows) {
            entry.phase += dt * (Math.PI / 0.3); // 0.6s cycle = π/0.3 rad/s
            const scale = 1.0 + 0.15 * Math.sin(entry.phase);
            entry.glow.alpha = 0.15 + 0.2 * Math.abs(Math.sin(entry.phase));
            entry.glow.scale.set(scale);
        }
        // Move bolts
        for (const bolt of this.bolts) {
            if (bolt.sliced || bolt.missed)
                continue;
            bolt.y += bolt.speed * dt;
            bolt.container.y = bolt.y;
            bolt.container.x = bolt.x;
            bolt.container.rotation += bolt.rotationSpeed * dt;
            // Check slash intersection
            if (this.slashDetector.checkIntersection(bolt.x, bolt.y, bolt.radius)) {
                this.sliceBolt(bolt);
                continue;
            }
            // Check if missed (exited bottom)
            if (bolt.y > this.canvasHeight + 60) {
                bolt.missed = true;
                this.animManager.playMiss(bolt.container);
                setTimeout(() => {
                    this.stage.removeChild(bolt.container);
                    this.xForceGlows.delete(bolt.index);
                }, 300);
            }
        }
    }
    // ── Slice a bolt ───────────────────────────────────────────────────────────
    sliceBolt(bolt) {
        bolt.sliced = true;
        this.stage.removeChild(bolt.container);
        this.xForceGlows.delete(bolt.index);
        const mid = this.slashDetector.lastMidpoint ?? { x: bolt.x, y: bolt.y };
        // Play slice animation at bolt position
        this.animManager.playSlice(bolt.container, bolt.index === this.xForceBoltIndex ? this.thumsUpTexture : null);
        this.animManager.playSparks(bolt.x, bolt.y, bolt.index === this.xForceBoltIndex);
        // Emit event for the game orchestrator to handle
        this.callbacks.onBoltSliced(bolt.index, mid.x, mid.y);
    }
    // ── Cleanup ────────────────────────────────────────────────────────────────
    destroy() {
        for (const bolt of this.bolts) {
            if (!bolt.sliced && !bolt.missed) {
                this.stage.removeChild(bolt.container);
            }
            bolt.container.destroy({ children: true });
        }
        this.bolts = [];
        this.xForceGlows.clear();
    }
    get remainingBolts() {
        return this.bolts.filter((b) => !b.sliced && !b.missed).length;
    }
}
//# sourceMappingURL=BoltManager.js.map