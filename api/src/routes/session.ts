/**
 * Routes: POST /game/session/start  and  POST /game/session/end
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Redis } from "ioredis";
import { prisma } from "../prisma.js";
import { verifyOrderToken, signSessionToken, AuthError } from "../middleware/auth.js";
import { verifySessionToken } from "../middleware/auth.js";
import { isOnCooldown } from "../services/rewardService.js";
import { pickXForceBoltIdx } from "../utils/seededRandom.js";
import { track } from "../services/analytics.js";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const StartSessionSchema = z.object({
  orderId: z.string().min(1),
  userId: z.string().min(1),
  orderToken: z.string().min(1),
});

const EndSessionSchema = z.object({
  sessionToken: z.string().min(1),
  finalScore: z.number().int().min(0),
});

// ─── Game Config (constant — could be DB-driven in future) ───────────────────

const GAME_CONFIG = {
  boltSpeedMin: 150,
  boltSpeedMax: 280,
  durationSeconds: 30,
} as const;

function randomBoltCount(): number {
  return Math.floor(Math.random() * 6) + 15; // 15–20
}

// ─── Route Plugin ─────────────────────────────────────────────────────────────

export async function sessionRoutes(
  fastify: FastifyInstance,
  opts: { redis: Redis }
): Promise<void> {
  const { redis } = opts;

  // ── POST /game/session/start ───────────────────────────────────────────────
  fastify.post(
    "/game/session/start",
    async (req: FastifyRequest, reply: FastifyReply) => {
      // 1. Validate request body
      const parsed = StartSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: parsed.error.message,
          code: "VALIDATION_ERROR",
        });
      }
      const { orderId, userId, orderToken } = parsed.data;

      // 2. Verify Blinkit order token
      try {
        verifyOrderToken(orderToken);
      } catch (err) {
        if (err instanceof AuthError) {
          return reply.status(401).send({ error: err.message, code: err.code });
        }
        return reply.status(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }

      // 3. Check reward cooldown
      const onCooldown = await isOnCooldown(redis, userId);
      if (onCooldown) {
        return reply.status(200).send({ eligible: false, reason: "cooldown" });
      }

      // 4. Upsert session (idempotent — return existing if already started)
      const existing = await prisma.gameSession.findUnique({
        where: { orderId },
        select: { id: true, totalBolts: true },
      });

      if (existing) {
        const sessionToken = signSessionToken(existing.id);
        return reply.status(200).send({
          sessionId: existing.id,
          sessionToken,
          totalBolts: existing.totalBolts,
          gameConfig: GAME_CONFIG,
          eligible: true,
        });
      }

      // 5. Create new session
      const totalBolts = randomBoltCount();
      // xforceBoltIdx is computed server-side and NEVER returned to client
      const xforceBoltIdx = pickXForceBoltIdx(orderId, totalBolts);

      const session = await prisma.gameSession.create({
        data: { orderId, userId, xforceBoltIdx, totalBolts },
        select: { id: true, totalBolts: true },
      });

      const sessionToken = signSessionToken(session.id);

      // 6. Analytics
      track("game_session_started", { orderId, userId, totalBolts });

      return reply.status(201).send({
        sessionId: session.id,
        sessionToken,
        totalBolts: session.totalBolts,
        gameConfig: GAME_CONFIG,
        eligible: true,
      });
    }
  );

  // ── POST /game/session/end ─────────────────────────────────────────────────
  fastify.post(
    "/game/session/end",
    async (req: FastifyRequest, reply: FastifyReply) => {
      // 1. Validate body
      const parsed = EndSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: parsed.error.message,
          code: "VALIDATION_ERROR",
        });
      }
      const { sessionToken, finalScore } = parsed.data;

      // 2. Verify session token
      let sessionId: string;
      try {
        ({ sessionId } = verifySessionToken(sessionToken));
      } catch (err) {
        if (err instanceof AuthError) {
          return reply.status(401).send({ error: err.message, code: err.code });
        }
        return reply.status(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }

      // 3. Find session
      const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        include: { reward: true },
      });

      if (!session) {
        return reply.status(404).send({ error: "Session not found", code: "SESSION_NOT_FOUND" });
      }

      // 4. Mark ended (idempotent)
      const endedAt = new Date();
      const duration = Math.round(
        (endedAt.getTime() - session.startedAt.getTime()) / 1000
      );

      const updated = await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          endedAt: session.endedAt ?? endedAt,
          score: finalScore,
        },
        include: { reward: true },
      });

      // 5. Analytics
      track("game_ended", {
        sessionId,
        finalScore,
        won: updated.won,
        duration,
      });

      return reply.status(200).send({
        won: updated.won,
        reward: updated.reward
          ? {
              id: updated.reward.id,
              couponCode: updated.reward.couponCode,
              expiresAt: updated.reward.expiresAt,
              redeemed: updated.reward.redeemed,
            }
          : null,
        finalScore,
      });
    }
  );
}
