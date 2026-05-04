/**
 * Route: POST /game/slash
 * Anti-cheat validated slash handler.
 * The xforceBoltIdx is looked up from DB here — NEVER from client.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Redis } from "ioredis";
import { prisma } from "../prisma.js";
import { verifySessionToken, AuthError } from "../middleware/auth.js";
import { issueReward, isOnCooldown, isSlashRateLimited } from "../services/rewardService.js";
import { track } from "../services/analytics.js";

// ─── Schema ───────────────────────────────────────────────────────────────────

const SlashSchema = z.object({
  sessionToken: z.string().min(1),
  boltIndex: z.number().int().min(0),
  slashX: z.number().finite(),
  slashY: z.number().finite(),
  timestamp: z.number().int().positive(), // Unix ms
});

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMESTAMP_TOLERANCE_MS = 500;
const POINTS_REGULAR = 50;
const POINTS_XFORCE = 50; // same points — reward is the coupon

// ─── Route Plugin ─────────────────────────────────────────────────────────────

export async function slashRoutes(
  fastify: FastifyInstance,
  opts: { redis: Redis }
): Promise<void> {
  const { redis } = opts;

  fastify.post(
    "/game/slash",
    async (req: FastifyRequest, reply: FastifyReply) => {
      // 1. Validate body
      const parsed = SlashSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: parsed.error.message,
          code: "VALIDATION_ERROR",
        });
      }
      const { sessionToken, boltIndex, slashX, slashY, timestamp } = parsed.data;

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

      // 3. Anti-cheat: timestamp within ±500ms of server time
      const serverNow = Date.now();
      if (Math.abs(serverNow - timestamp) > TIMESTAMP_TOLERANCE_MS) {
        return reply.status(400).send({
          error: "Slash timestamp is out of sync",
          code: "TIMESTAMP_SKEW",
        });
      }

      // 4. Anti-cheat: slash rate limit (>3 slashes in 200ms window)
      const rateLimited = await isSlashRateLimited(redis, sessionId, serverNow);
      if (rateLimited) {
        req.log.warn({ sessionId, boltIndex }, "Suspicious slash rate detected");
        return reply.status(429).send({
          error: "Too many slashes in a short window",
          code: "SLASH_RATE_LIMIT",
        });
      }

      // 5. Load session from DB
      const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          orderId: true,
          userId: true,
          xforceBoltIdx: true, // secret — lives only in DB
          totalBolts: true,
          score: true,
          won: true,
          endedAt: true,
        },
      });

      if (!session) {
        return reply.status(404).send({ error: "Session not found", code: "SESSION_NOT_FOUND" });
      }

      if (session.endedAt) {
        return reply.status(409).send({ error: "Session already ended", code: "SESSION_ENDED" });
      }

      // 6. Validate bolt index
      if (boltIndex < 0 || boltIndex >= session.totalBolts) {
        return reply.status(400).send({
          error: `boltIndex must be in [0, ${session.totalBolts - 1}]`,
          code: "INVALID_BOLT_INDEX",
        });
      }

      // 7. Server-side X-Force check — the ONLY place this comparison occurs
      const isXForce = boltIndex === session.xforceBoltIdx;

      // 8. Compute new score
      const points = isXForce ? POINTS_XFORCE : POINTS_REGULAR;
      const newScore = session.score + points;

      // 9. Persist slash event and update score
      await prisma.$transaction([
        prisma.slashEvent.create({
          data: {
            sessionId,
            boltIndex,
            slashX,
            slashY,
            wasXForce: isXForce,
          },
        }),
        prisma.gameSession.update({
          where: { id: sessionId },
          data: { score: newScore },
        }),
      ]);

      // 10. Analytics
      track("bolt_sliced", {
        sessionId,
        boltIndex,
        isXForce,
        score: newScore,
      });

      // 11. X-Force hit flow
      if (isXForce && !session.won) {
        // Check cooldown once more (defence in depth)
        const onCooldown = await isOnCooldown(redis, session.userId);
        if (!onCooldown) {
          try {
            // Mark won immediately (before reward issue, prevent double-win race)
            await prisma.gameSession.update({
              where: { id: sessionId },
              data: { won: true },
            });

            const reward = await issueReward(
              redis,
              sessionId,
              session.userId,
              session.orderId
            );

            track("xforce_hit", {
              sessionId,
              userId: session.userId,
              orderId: session.orderId,
            });

            return reply.status(200).send({
              hit: true,
              isXForce: true,
              score: newScore,
              reward: {
                id: reward.id,
                couponCode: reward.couponCode,
                expiresAt: reward.expiresAt,
              },
            });
          } catch (rewardErr: unknown) {
            req.log.error({ rewardErr, sessionId }, "Reward issuance failed");
            // Still return a successful slash response — don't punish the user
            return reply.status(200).send({
              hit: true,
              isXForce: true,
              score: newScore,
              reward: null,
            });
          }
        }
      }

      return reply.status(200).send({
        hit: true,
        isXForce: false,
        score: newScore,
      });
    }
  );
}
