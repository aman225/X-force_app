/**
 * Fastify server entry point.
 * Bootstraps: CORS, rate-limit, routes, Redis, Pino logging.
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Redis from "ioredis";
import { sessionRoutes } from "./routes/session.js";
import { slashRoutes } from "./routes/slash.js";
import { rewardRoutes } from "./routes/rewards.js";
import { initAnalytics } from "./services/analytics.js";
import { prisma } from "./prisma.js";

// ─── Environment helpers ──────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function getEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  const PORT = parseInt(getEnv("PORT", "3001"), 10);
  const REDIS_URL = requireEnv("REDIS_URL");
  const ALLOWED_ORIGINS = getEnv("ALLOWED_ORIGINS", "http://localhost:3000")
    .split(",")
    .map((s) => s.trim());

  // ── Fastify instance ───────────────────────────────────────────────────────
  const isDev = process.env["NODE_ENV"] !== "production";
  const fastify = Fastify({
    logger: isDev
      ? {
          level: getEnv("LOG_LEVEL", "info"),
          transport: { target: "pino-pretty", options: { colorize: true } },
        }
      : {
          level: getEnv("LOG_LEVEL", "info"),
        },
  });

  // ── Redis ──────────────────────────────────────────────────────────────────
  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  redis.on("error", (err: Error) => {
    fastify.log.error({ err }, "Redis connection error");
  });

  await redis.connect();
  fastify.log.info("Redis connected");

  // ── Analytics ──────────────────────────────────────────────────────────────
  initAnalytics(fastify.log);

  // ── CORS ───────────────────────────────────────────────────────────────────
  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"), false);
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  });

  // ── Rate limit: 60 req/min per IP ──────────────────────────────────────────
  await fastify.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
    redis,
    keyGenerator: (req) =>
      (req.headers["x-forwarded-for"] as string | undefined) ??
      req.ip ??
      "unknown",
    errorResponseBuilder: () => ({
      error: "Too many requests",
      code: "RATE_LIMIT_EXCEEDED",
    }),
  });

  // ── Routes ─────────────────────────────────────────────────────────────────
  await fastify.register(
    async (instance) => {
      await instance.register(sessionRoutes, { redis });
      await instance.register(slashRoutes, { redis });
      await instance.register(rewardRoutes);
    },
    { prefix: "/api/v1" }
  );

  // Health check
  fastify.get("/health", async () => ({ status: "ok", ts: Date.now() }));

  // ── Global error handler ───────────────────────────────────────────────────
  fastify.setErrorHandler((error, req, reply) => {
    req.log.error({ err: error }, "Unhandled error");
    reply.status(error.statusCode ?? 500).send({
      error: error.message ?? "Internal server error",
      code: "INTERNAL_ERROR",
    });
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    fastify.log.info({ signal }, "Shutting down");
    await fastify.close();
    await redis.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  // ── Start ──────────────────────────────────────────────────────────────────
  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  fastify.log.info(`Server listening on port ${PORT}`);
}

bootstrap().catch((err: unknown) => {
  console.error("Fatal bootstrap error:", err);
  process.exit(1);
});
