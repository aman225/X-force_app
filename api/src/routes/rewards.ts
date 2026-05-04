/**
 * Route: GET /rewards/status/:userId
 * Returns all active (non-expired) rewards for a user.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";

const ParamsSchema = z.object({
  userId: z.string().min(1),
});

export async function rewardRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/rewards/status/:userId",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = ParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        return reply.status(400).send({
          error: parsed.error.message,
          code: "VALIDATION_ERROR",
        });
      }
      const { userId } = parsed.data;

      const rewards = await prisma.reward.findMany({
        where: {
          userId,
          expiresAt: { gt: new Date() },
        },
        orderBy: { issuedAt: "desc" },
        select: {
          id: true,
          couponCode: true,
          issuedAt: true,
          expiresAt: true,
          redeemed: true,
          redeemedAt: true,
        },
      });

      return reply.status(200).send({ rewards });
    }
  );
}
