import type { Container } from "pixi.js";

// ─── Game Config (received from API session start) ────────────────────────────

export interface GameConfig {
  boltSpeedMin: number; // px/s
  boltSpeedMax: number; // px/s
  durationSeconds: number; // total game duration
}

// ─── Bolt ─────────────────────────────────────────────────────────────────────

export interface BoltState {
  index: number; // sequential index (0-based), used for X-Force identification
  isXForce: boolean; // only set server-side; client uses visual cues only
  x: number;
  y: number;
  speed: number; // px/s
  rotationSpeed: number; // rad/s wobble
  radius: number; // bounding circle radius for slash detection
  sliced: boolean;
  missed: boolean;
  container: Container;
}

// ─── Slash Trail ──────────────────────────────────────────────────────────────

export interface TrailPoint {
  x: number;
  y: number;
  t: number; // timestamp (performance.now())
}

// ─── Callbacks ────────────────────────────────────────────────────────────────

export interface GameCallbacks {
  onBoltSliced: (boltIndex: number, slashX: number, slashY: number) => void;
  onXForceHit: () => void;
  onGameEnd: (score: number) => void;
}

// ─── API Types ────────────────────────────────────────────────────────────────

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
