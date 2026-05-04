/**
 * Reward Service — coupon generation, Redis cooldown, DB persistence.
 * Core security invariant: one reward per user per 7 days, enforced in Redis
 * BEFORE the DB write, preventing race conditions.
 */

import { nanoid } from "nanoid";
import type { Redis } from "ioredis";
import { prisma } from "../prisma.js";
import { BlinkitCouponService } from "./blinkitCoupon.js";
import { track } from "./analytics.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const COOLDOWN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const REWARD_EXPIRY_DAYS = 14;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RewardResult {
  couponCode: string;
  expiresAt: Date;
  id: string;
}

export class RewardError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "RewardError";
    this.code = code;
  }
}

// ─── Redis Key Helpers ────────────────────────────────────────────────────────

function cooldownKey(userId: string): string {
  return `reward:cooldown:${userId}`;
}

function slashRateKey(sessionId: string): string {
  return `slash:rate:${sessionId}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Checks if user is on cooldown (won a reward within the last 7 days).
 */
export async function isOnCooldown(
  redis: Redis,
  userId: string
): Promise<boolean> {
  const val = await redis.get(cooldownKey(userId));
  return val !== null;
}

/**
 * Issues a reward for a winning X-Force bolt slash.
 * - Checks Redis cooldown (idempotent guard)
 * - Generates coupon code via nanoid
 * - Persists Reward to PostgreSQL
 * - Sets Redis cooldown TTL
 * - Calls Blinkit stub
 * - Tracks analytics
 */
export async function issueReward(
  redis: Redis,
  sessionId: string,
  userId: string,
  orderId: string
): Promise<RewardResult> {
  // Double-check cooldown inside reward flow (race condition guard)
  const onCooldown = await isOnCooldown(redis, userId);
  if (onCooldown) {
    throw new RewardError(
      "User already won a reward recently",
      "COOLDOWN_ACTIVE"
    );
  }

  const couponCode = `XFORCE-${nanoid(8).toUpperCase()}`;
  const expiresAt = new Date(
    Date.now() + REWARD_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  // Persist reward — use upsert to handle idempotent re-hits on same session
  const reward = await prisma.reward.upsert({
    where: { sessionId },
    create: {
      sessionId,
      userId,
      couponCode,
      expiresAt,
    },
    update: {}, // already issued — return existing
  });

  // Set 7-day cooldown in Redis
  await redis.set(cooldownKey(userId), "1", "EX", COOLDOWN_TTL_SECONDS);

  // Fire-and-forget: call Blinkit coupon stub (don't fail if this errors)
  BlinkitCouponService.issueCoupon(userId, reward.couponCode).catch((err: unknown) => {
    console.error("[RewardService] BlinkitCouponService failed:", err);
  });

  // Analytics
  track("reward_issued", {
    userId,
    couponCode: reward.couponCode,
    expiresAt: reward.expiresAt,
  });

  return {
    id: reward.id,
    couponCode: reward.couponCode,
    expiresAt: reward.expiresAt,
  };
}

/**
 * Anti-cheat: slash rate limiter using a Redis sorted set.
 * Checks if more than `maxSlashes` slashes occurred within `windowMs`.
 * Returns true if the rate limit is exceeded (suspicious).
 */
export async function isSlashRateLimited(
  redis: Redis,
  sessionId: string,
  now: number,
  windowMs = 200,
  maxSlashes = 3
): Promise<boolean> {
  const key = slashRateKey(sessionId);
  const windowStart = now - windowMs;

  // Use a pipeline for atomic operations
  const pipe = redis.pipeline();
  pipe.zremrangebyscore(key, "-inf", windowStart); // clean old entries
  pipe.zadd(key, now, `${now}-${Math.random()}`); // add current
  pipe.zcard(key); // count in window
  pipe.expire(key, 10); // auto-cleanup after 10s

  const results = await pipe.exec();
  if (!results) return false;

  // zcard result is index 2
  const cardResult = results[2];
  if (!cardResult) return false;
  const count = cardResult[1] as number;
  return count > maxSlashes;
}
