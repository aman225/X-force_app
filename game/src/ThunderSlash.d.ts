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
import type { GameConfig, GameCallbacks } from "./types.js";
export declare class ThunderSlashGame {
    private app;
    private gameLayer;
    private trailGraphics;
    private thumsUpTexture;
    private slashDetector;
    private boltManager;
    private animManager;
    private scoreDisplay;
    private sessionToken;
    private running;
    private elapsed;
    private score;
    private xForceHit;
    private timerHandle;
    onBoltSliced: GameCallbacks["onBoltSliced"];
    onXForceHit: GameCallbacks["onXForceHit"];
    onGameEnd: GameCallbacks["onGameEnd"];
    init(container: HTMLElement): Promise<void>;
    start(sessionToken: string, totalBolts: number, config: GameConfig, xForceBoltVisualIndex: number): void;
    end(): void;
    destroy(): void;
    private tick;
    private handleBoltSliced;
    /**
     * Called by the React widget after the API confirms isXForce === true.
     * Triggers the win animation and updates score if needed.
     */
    triggerXForceWin(): void;
    private bindPointerEvents;
    private onPointerDown;
    private onPointerMove;
    private onPointerUp;
    private canvasCoords;
    private handleResize;
    get currentScore(): number;
    get isRunning(): boolean;
}
//# sourceMappingURL=ThunderSlash.d.ts.map