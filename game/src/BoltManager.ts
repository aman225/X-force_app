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
import { AssetFactory } from "./AssetFactory.js";
import { SlashDetector } from "./SlashDetector.js";
import { AnimationManager } from "./AnimationManager.js";
import type { BoltState, GameConfig, GameCallbacks } from "./types.js";

export class BoltManager {
  private stage: Container;
  private config: GameConfig;
  private callbacks: GameCallbacks;
  private slashDetector: SlashDetector;
  private animManager: AnimationManager;

  private bolts: BoltState[] = [];
  private spawnSchedule: number[] = []; // elapsed seconds when each bolt spawns
  private nextSpawnIdx = 0;
  private totalBolts = 0;

  // X-Force bolt visual tracking
  private xForceBoltIndex = -1;
  private thumsUpTexture: import("pixi.js").Texture | null = null;
  private xForceGlows: Map<number, { glow: ReturnType<typeof AssetFactory.createThumsUpBolt>["glow"]; phase: number }> = new Map();

  constructor(
    stage: Container,
    config: GameConfig,
    callbacks: GameCallbacks,
    slashDetector: SlashDetector,
    animManager: AnimationManager
  ) {
    this.stage = stage;
    this.config = config;
    this.callbacks = callbacks;
    this.slashDetector = slashDetector;
    this.animManager = animManager;
  }

  // ── Initialization ─────────────────────────────────────────────────────────

  init(totalBolts: number): void {
    this.totalBolts = totalBolts;
    this.spawnSchedule = this.buildSpawnSchedule(totalBolts, this.config.durationSeconds);
    this.nextSpawnIdx = 0;
    this.bolts = [];
  }

  setXForceBoltVisualIndex(index: number, texture: import("pixi.js").Texture | null): void {
    this.xForceBoltIndex = index;
    this.thumsUpTexture = texture;
  }

  // ── Spawn schedule ─────────────────────────────────────────────────────────

  private buildSpawnSchedule(count: number, duration: number): number[] {
    const usableDuration = duration - 5;
    const times: number[] = [];

    for (let i = 0; i < count; i++) {
      const base = (i / count) * usableDuration;
      const slot = usableDuration / count;
      const jitter = (Math.random() - 0.5) * slot * 0.6;
      times.push(Math.max(0.5, base + jitter));
    }

    return times.sort((a, b) => a - b);
  }

  // ── Canvas dimensions ──────────────────────────────────────────────────────

  private canvasWidth = 400;
  private canvasHeight = 300;

  setDimensions(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  // ── Spawn a bolt ───────────────────────────────────────────────────────────

  private spawnBolt(index: number): void {
    const isXForceVisual = index === this.xForceBoltIndex && this.thumsUpTexture !== null;

    // Always spawn regular bolt initially
    const result = AssetFactory.createBolt();
    const container = result.container;
    const radius = result.radius;

    const x = radius + Math.random() * (this.canvasWidth - radius * 2);
    const speed =
      this.config.boltSpeedMin +
      Math.random() * (this.config.boltSpeedMax - this.config.boltSpeedMin);
    const rotationSpeed = (Math.random() - 0.5) * 1.5; // rad/s wobble

    container.x = x;
    container.y = -40;
    container.rotation = (Math.random() - 0.5) * 0.3;
    this.stage.addChild(container);

    const bolt: BoltState = {
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

  update(elapsed: number, dt: number): void {
    // Random ambient flashes for more "thunder" adventure
    if (Math.random() < 0.005) { // Occasional background flash
      this.animManager.playLightningFlash(this.canvasWidth, this.canvasHeight);
    }

    // Spawn due bolts
    while (
      this.nextSpawnIdx < this.spawnSchedule.length &&
      elapsed >= (this.spawnSchedule[this.nextSpawnIdx] ?? Infinity)
    ) {
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
      if (bolt.sliced || bolt.missed) continue;

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

  private sliceBolt(bolt: BoltState): void {
    bolt.sliced = true;
    this.stage.removeChild(bolt.container);
    this.xForceGlows.delete(bolt.index);

    const mid = this.slashDetector.lastMidpoint ?? { x: bolt.x, y: bolt.y };

    // Play slice animation at bolt position
    this.animManager.playSlice(
      bolt.container,
      bolt.index === this.xForceBoltIndex ? this.thumsUpTexture : null
    );
    this.animManager.playSparks(
      bolt.x,
      bolt.y,
      bolt.index === this.xForceBoltIndex
    );

    // Emit event for the game orchestrator to handle
    this.callbacks.onBoltSliced(bolt.index, mid.x, mid.y);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  destroy(): void {
    for (const bolt of this.bolts) {
      if (!bolt.sliced && !bolt.missed) {
        this.stage.removeChild(bolt.container);
      }
      bolt.container.destroy({ children: true });
    }
    this.bolts = [];
    this.xForceGlows.clear();
  }

  get remainingBolts(): number {
    return this.bolts.filter((b) => !b.sliced && !b.missed).length;
  }
}
