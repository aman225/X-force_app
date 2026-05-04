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
import { Container } from "pixi.js";
import { SlashDetector } from "./SlashDetector.js";
import { AnimationManager } from "./AnimationManager.js";
import type { GameConfig, GameCallbacks } from "./types.js";
export declare class BoltManager {
    private stage;
    private config;
    private callbacks;
    private slashDetector;
    private animManager;
    private bolts;
    private spawnSchedule;
    private nextSpawnIdx;
    private totalBolts;
    private xForceBoltIndex;
    private thumsUpTexture;
    private xForceGlows;
    constructor(stage: Container, config: GameConfig, callbacks: GameCallbacks, slashDetector: SlashDetector, animManager: AnimationManager);
    init(totalBolts: number): void;
    setXForceBoltVisualIndex(index: number, texture: import("pixi.js").Texture | null): void;
    private buildSpawnSchedule;
    private canvasWidth;
    private canvasHeight;
    setDimensions(w: number, h: number): void;
    private spawnBolt;
    update(elapsed: number, dt: number): void;
    private sliceBolt;
    destroy(): void;
    get remainingBolts(): number;
}
//# sourceMappingURL=BoltManager.d.ts.map