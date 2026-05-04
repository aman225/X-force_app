/**
 * Shared TypeScript types for the React UI layer.
 */

// ─── Order Status ─────────────────────────────────────────────────────────────

export type OrderStatus =
  | "rider_assigned"
  | "out_for_delivery"
  | "arriving"
  | "delivered";

// ─── API Response Types ───────────────────────────────────────────────────────

export interface GameConfig {
  boltSpeedMin: number;
  boltSpeedMax: number;
  durationSeconds: number;
}

export interface SessionStartResponse {
  sessionId: string;
  sessionToken: string;
  totalBolts: number;
  gameConfig: GameConfig;
  eligible: boolean;
  reason?: string;
}

export interface SlashResponse {
  hit: boolean;
  isXForce: boolean;
  score: number;
  reward?: RewardData;
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

// ─── Widget Props ─────────────────────────────────────────────────────────────

export interface ThunderSlashWidgetProps {
  orderId: string;
  userId: string;
  orderToken: string; // JWT passed by Blinkit's order tracking page
  orderStatus: OrderStatus;
  apiBaseUrl?: string; // defaults to /api/v1
  onRewardWon?: (couponCode: string) => void;
}

// ─── Game Session State ───────────────────────────────────────────────────────

export type GamePhase =
  | "idle"
  | "loading"
  | "playing"
  | "won"
  | "ended"
  | "ineligible"
  | "error";

export interface GameSessionState {
  phase: GamePhase;
  sessionToken: string;
  totalBolts: number;
  gameConfig: GameConfig | null;
  score: number;
  reward: RewardData | null;
  error: string | null;
}
