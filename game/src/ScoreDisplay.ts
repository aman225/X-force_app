/**
 * ScoreDisplay — live score HUD rendered as a PixiJS Text in the top-right corner.
 */

import { Container, Text, TextStyle } from "pixi.js";

export class ScoreDisplay {
  private text: Text;
  private score = 0;

  constructor(stage: Container, canvasWidth: number) {
    this.text = new Text({
      text: "0 pts",
      style: new TextStyle({
        fontSize: 18,
        fontFamily: "Inter, Arial, sans-serif",
        fontWeight: "bold",
        fill: 0xffffff,
        dropShadow: {
          blur: 6,
          color: 0x000000,
          distance: 2,
          alpha: 0.7,
          angle: Math.PI / 4,
        },
      }),
    });

    this.text.anchor.set(1, 0); // right-aligned
    this.text.x = canvasWidth - 12;
    this.text.y = 12;
    stage.addChild(this.text);
  }

  addPoints(points: number): void {
    this.score += points;
    this.updateText();
  }

  setScore(score: number): void {
    this.score = score;
    this.updateText();
  }

  get currentScore(): number {
    return this.score;
  }

  private updateText(): void {
    this.text.text = `${this.score} pts`;
  }

  /** Update position if canvas was resized. */
  resize(canvasWidth: number): void {
    this.text.x = canvasWidth - 12;
  }

  destroy(): void {
    this.text.destroy();
  }
}
