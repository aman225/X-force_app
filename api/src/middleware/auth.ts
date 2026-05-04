/**
 * JWT authentication helpers.
 * Two tokens are used:
 *   1. orderToken  — issued by Blinkit, validated via BLINKIT_JWT_SECRET
 *   2. sessionToken — issued by this API, validated via SESSION_JWT_SECRET
 */

import jwt from "jsonwebtoken";

// ─── Environment ──────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

// ─── Order Token (Blinkit-issued) ─────────────────────────────────────────────

export interface OrderTokenPayload {
  orderId: string;
  userId: string;
  iat: number;
  exp: number;
}

export function verifyOrderToken(token: string): OrderTokenPayload {
  const secret = requireEnv("BLINKIT_JWT_SECRET");
  try {
    const payload = jwt.verify(token, secret) as OrderTokenPayload;
    return payload;
  } catch (err) {
    throw new AuthError("Invalid or expired order token", "INVALID_ORDER_TOKEN");
  }
}

// ─── Session Token (this API-issued) ─────────────────────────────────────────

export interface SessionTokenPayload {
  sessionId: string;
  iat: number;
  exp: number;
}

export function signSessionToken(sessionId: string): string {
  const secret = requireEnv("SESSION_JWT_SECRET");
  return jwt.sign({ sessionId }, secret, { expiresIn: "15m" });
}

export function verifySessionToken(token: string): SessionTokenPayload {
  const secret = requireEnv("SESSION_JWT_SECRET");
  try {
    const payload = jwt.verify(token, secret) as SessionTokenPayload;
    return payload;
  } catch (err) {
    throw new AuthError(
      "Invalid or expired session token",
      "INVALID_SESSION_TOKEN"
    );
  }
}

// ─── Auth Error ───────────────────────────────────────────────────────────────

export class AuthError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}
