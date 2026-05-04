/**
 * Analytics stub — logs events to Pino (real Mixpanel integration TBD).
 * All event names and property shapes match the spec analytics table.
 */

import { FastifyBaseLogger } from "fastify";

export type AnalyticsEvent =
  | "game_session_started"
  | "bolt_sliced"
  | "xforce_hit"
  | "reward_issued"
  | "game_ended"
  | "reward_redeemed";

export interface EventProperties {
  game_session_started: {
    orderId: string;
    userId: string;
    totalBolts: number;
  };
  bolt_sliced: {
    sessionId: string;
    boltIndex: number;
    isXForce: boolean;
    score: number;
  };
  xforce_hit: {
    sessionId: string;
    userId: string;
    orderId: string;
  };
  reward_issued: {
    userId: string;
    couponCode: string;
    expiresAt: Date;
  };
  game_ended: {
    sessionId: string;
    finalScore: number;
    won: boolean;
    duration: number; // seconds
  };
  reward_redeemed: {
    userId: string;
    couponCode: string;
  };
}

let _logger: FastifyBaseLogger | null = null;

export function initAnalytics(logger: FastifyBaseLogger): void {
  _logger = logger;
}

export function track<E extends AnalyticsEvent>(
  event: E,
  properties: EventProperties[E]
): void {
  // Stub: log to Pino. Replace with Mixpanel.track(event, properties) when ready.
  if (_logger) {
    _logger.info({ analytics: true, event, properties }, "Analytics event");
  } else {
    console.info("[Analytics]", event, properties);
  }
}
