/**
 * ThunderSlashGame — main PixiJS v8 game orchestrator.
 *
 * Usage:
 *   const game = new ThunderSlashGame();
 *   await game.init(containerElement);
 *   game.onBoltSliced = (idx, x, y) => { ... };
 *   game.onXForceHit = () => { ... };
 *   game.onGameEnd = (score) => { ... };
 *   game.start(sessionToken, totalBolts, gameConfig);
 */

import { Application, Container, Graphics, Assets, type Texture } from "pixi.js";
import { AssetFactory } from "./AssetFactory.js";
import { SlashDetector } from "./SlashDetector.js";
import { BoltManager } from "./BoltManager.js";
import { AnimationManager } from "./AnimationManager.js";
import { ScoreDisplay } from "./ScoreDisplay.js";
import type { GameConfig, GameCallbacks } from "./types.js";

// Points per bolt type
const POINTS_REGULAR = 50;
const POINTS_XFORCE = 50;

export class ThunderSlashGame {
  // ── PixiJS internals ───────────────────────────────────────────────────────
  private app!: Application;
  private gameLayer!: Container;
  private trailGraphics!: Graphics;
  private thumsUpTexture: Texture | null = null;

  // ── Subsystems ─────────────────────────────────────────────────────────────
  private slashDetector!: SlashDetector;
  private boltManager!: BoltManager;
  private animManager!: AnimationManager;
  private scoreDisplay!: ScoreDisplay;

  // ── State ──────────────────────────────────────────────────────────────────
  private sessionToken = "";
  private running = false;
  private elapsed = 0; // seconds since start
  private score = 0;
  private xForceHit = false;
  private timerHandle: ReturnType<typeof setTimeout> | null = null;

  // ── Public callbacks ───────────────────────────────────────────────────────
  public onBoltSliced: GameCallbacks["onBoltSliced"] = () => {};
  public onXForceHit: GameCallbacks["onXForceHit"] = () => {};
  public onGameEnd: GameCallbacks["onGameEnd"] = () => {};

  // ── Initialization ─────────────────────────────────────────────────────────

  async init(container: HTMLElement): Promise<void> {
    const isMobile = window.innerWidth < 768;
    const canvasHeight = isMobile ? 400 : 300;
    const canvasWidth = container.clientWidth || window.innerWidth;

    this.app = new Application();
    await this.app.init({
      width: canvasWidth,
      height: canvasHeight,
      backgroundAlpha: 0, // transparent background
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);

    // Game layer (all game objects go here)
    this.gameLayer = new Container();
    this.app.stage.addChild(this.gameLayer);

    // Slash trail (rendered on top)
    this.trailGraphics = AssetFactory.createTrailGraphics();
    this.app.stage.addChild(this.trailGraphics);

    // Subsystems
    this.slashDetector = new SlashDetector();
    this.animManager = new AnimationManager(this.gameLayer);
    this.scoreDisplay = new ScoreDisplay(this.app.stage, canvasWidth);

    // Pointer events on canvas
    this.bindPointerEvents();

    // Resize handler
    window.addEventListener("resize", this.handleResize);

    // Preload texture
    try {
      this.thumsUpTexture = await Assets.load("/thums_up_can.png");
    } catch (e) {
      console.warn("Failed to load thums_up_can.png", e);
    }
  }

  // ── Game lifecycle ─────────────────────────────────────────────────────────

  start(
    sessionToken: string,
    totalBolts: number,
    config: GameConfig,
    xForceBoltVisualIndex: number
  ): void {
    this.sessionToken = sessionToken;
    this.running = true;
    this.elapsed = 0;
    this.score = 0;
    this.xForceHit = false;

    const callbacks: GameCallbacks = {
      onBoltSliced: this.handleBoltSliced,
      onXForceHit: this.onXForceHit,
      onGameEnd: this.onGameEnd,
    };

    this.boltManager = new BoltManager(
      this.gameLayer,
      config,
      callbacks,
      this.slashDetector,
      this.animManager
    );
    this.boltManager.init(totalBolts);
    this.boltManager.setXForceBoltVisualIndex(xForceBoltVisualIndex, this.thumsUpTexture);
    this.boltManager.setDimensions(
      this.app.screen.width,
      this.app.screen.height
    );

    // 30-second game timer
    this.timerHandle = setTimeout(
      () => this.end(),
      config.durationSeconds * 1000
    );

    // Add ticker callback
    this.app.ticker.add(this.tick);
  }

  end(): void {
    if (!this.running) return;
    this.running = false;

    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    this.app.ticker.remove(this.tick);
    this.boltManager?.destroy();
    this.onGameEnd(this.score);
  }

  destroy(): void {
    this.end();
    window.removeEventListener("resize", this.handleResize);
    this.scoreDisplay?.destroy();
    this.app?.destroy(true, { children: true });
  }

  // ── Ticker ─────────────────────────────────────────────────────────────────

  private tick = (ticker: { deltaTime: number; deltaMS: number }): void => {
    if (!this.running) return;

    const dt = ticker.deltaMS / 1000; // convert ms to seconds
    this.elapsed += dt;

    // Update subsystems
    this.boltManager.update(this.elapsed, dt);
    this.animManager.update(dt);

    // Render slash trail
    this.slashDetector.renderTrail(this.trailGraphics);
  };

  // ── Bolt sliced handler ────────────────────────────────────────────────────

  private handleBoltSliced = (
    boltIndex: number,
    slashX: number,
    slashY: number
  ): void => {
    // Score update (optimistic; server confirms isXForce separately)
    this.score += POINTS_REGULAR;
    this.scoreDisplay.setScore(this.score);

    // Emit to React widget → API call
    this.onBoltSliced(boltIndex, slashX, slashY);
  };

  /**
   * Called by the React widget after the API confirms isXForce === true.
   * Triggers the win animation and updates score if needed.
   */
  triggerXForceWin(): void {
    if (this.xForceHit) return;
    this.xForceHit = true;
    this.score += POINTS_XFORCE - POINTS_REGULAR; // adjust if needed
    this.scoreDisplay.setScore(this.score);
    this.animManager.playXForceWin(this.app);
    this.onXForceHit();
  }

  // ── Pointer events ─────────────────────────────────────────────────────────

  private bindPointerEvents(): void {
    const canvas = this.app.canvas;

    // Use pointer events for unified mouse + touch
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerUp);

    // Prevent scroll on touch
    canvas.style.touchAction = "none";
  }

  private onPointerDown = (e: PointerEvent): void => {
    const { x, y } = this.canvasCoords(e);
    this.slashDetector.onPointerDown(x, y);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const { x, y } = this.canvasCoords(e);
    this.slashDetector.onPointerMove(x, y);
  };

  private onPointerUp = (): void => {
    this.slashDetector.onPointerUp();
  };

  private canvasCoords(e: PointerEvent): { x: number; y: number } {
    const rect = this.app.canvas.getBoundingClientRect();
    const scaleX = this.app.screen.width / rect.width;
    const scaleY = this.app.screen.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  private handleResize = (): void => {
    const container = this.app.canvas.parentElement;
    if (!container) return;

    const newWidth = container.clientWidth;
    this.app.renderer.resize(newWidth, this.app.screen.height);
    this.scoreDisplay.resize(newWidth);
    this.boltManager?.setDimensions(newWidth, this.app.screen.height);
  };

  // ── Getters ────────────────────────────────────────────────────────────────

  get currentScore(): number {
    return this.score;
  }

  get isRunning(): boolean {
    return this.running;
  }
}
