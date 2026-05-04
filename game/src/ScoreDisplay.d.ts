/**
 * ScoreDisplay — live score HUD rendered as a PixiJS Text in the top-right corner.
 */
import { Container } from "pixi.js";
export declare class ScoreDisplay {
    private text;
    private score;
    constructor(stage: Container, canvasWidth: number);
    addPoints(points: number): void;
    setScore(score: number): void;
    get currentScore(): number;
    private updateText;
    /** Update position if canvas was resized. */
    resize(canvasWidth: number): void;
    destroy(): void;
}
//# sourceMappingURL=ScoreDisplay.d.ts.map