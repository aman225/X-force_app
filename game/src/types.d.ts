import type { Container } from "pixi.js";
export interface GameConfig {
    boltSpeedMin: number;
    boltSpeedMax: number;
    durationSeconds: number;
}
export interface BoltState {
    index: number;
    isXForce: boolean;
    x: number;
    y: number;
    speed: number;
    rotationSpeed: number;
    radius: number;
    sliced: boolean;
    missed: boolean;
    container: Container;
}
export interface TrailPoint {
    x: number;
    y: number;
    t: number;
}
export interface GameCallbacks {
    onBoltSliced: (boltIndex: number, slashX: number, slashY: number) => void;
    onXForceHit: () => void;
    onGameEnd: (score: number) => void;
}
export interface SessionStartResponse {
    sessionId: string;
    sessionToken: string;
    totalBolts: number;
    gameConfig: GameConfig;
}
export interface SlashResponse {
    hit: boolean;
    isXForce: boolean;
    score: number;
}
export interface SessionEndResponse {
    won: boolean;
    reward: RewardData | null;
    finalScore: number;
}
export interface RewardData {
    id: string;
    couponCode: string;
    expiresAt: string;
    redeemed: boolean;
}
//# sourceMappingURL=types.d.ts.map