/**
 * useGameSession — custom hook that manages all API communication
 * for the Thunder Slash game session lifecycle.
 */

import { useCallback, useRef } from "react";
import type {
  GameConfig,
  SessionStartResponse,
  SlashResponse,
  SessionEndResponse,
} from "../types.js";

interface UseGameSessionOptions {
  apiBaseUrl: string;
}

interface GameSessionAPI {
  startSession: (
    orderId: string,
    userId: string,
    orderToken: string
  ) => Promise<SessionStartResponse>;

  sendSlash: (
    sessionToken: string,
    boltIndex: number,
    slashX: number,
    slashY: number
  ) => Promise<SlashResponse>;

  endSession: (
    sessionToken: string,
    finalScore: number
  ) => Promise<SessionEndResponse>;
}

export function useGameSession({ apiBaseUrl }: UseGameSessionOptions): GameSessionAPI {
  const abortRef = useRef<AbortController | null>(null);

  const post = useCallback(
    async <T>(path: string, body: unknown): Promise<T> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(`${apiBaseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
        credentials: "include",
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        throw new APIError(
          err.error ?? `HTTP ${res.status}`,
          err.code ?? "UNKNOWN",
          res.status
        );
      }

      return res.json() as Promise<T>;
    },
    [apiBaseUrl]
  );

  const startSession = useCallback(
    (orderId: string, userId: string, orderToken: string) =>
      post<SessionStartResponse>("/game/session/start", {
        orderId,
        userId,
        orderToken,
      }),
    [post]
  );

  const sendSlash = useCallback(
    (
      sessionToken: string,
      boltIndex: number,
      slashX: number,
      slashY: number
    ) =>
      post<SlashResponse>("/game/slash", {
        sessionToken,
        boltIndex,
        slashX,
        slashY,
        timestamp: Date.now(),
      }),
    [post]
  );

  const endSession = useCallback(
    (sessionToken: string, finalScore: number) =>
      post<SessionEndResponse>("/game/session/end", {
        sessionToken,
        finalScore,
      }),
    [post]
  );

  return { startSession, sendSlash, endSession };
}

// ─── Error type ───────────────────────────────────────────────────────────────

export class APIError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "APIError";
    this.code = code;
    this.status = status;
  }
}
