/**
 * ThunderSlashWidget — main React component for Blinkit integration.
 *
 * Orchestrates:
 *  - Session lifecycle (start → slash → end)
 *  - PixiJS game engine (dynamically imported)
 *  - Sub-components: GameHeader, WinOverlay, EndCard
 *  - Analytics events
 */

import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { GameHeader } from "./GameHeader.js";
import { WinOverlay } from "./WinOverlay.js";
import { EndCard } from "./EndCard.js";
import { useGameSession } from "../hooks/useGameSession.js";
import type {
  ThunderSlashWidgetProps,
  GameSessionState,
  RewardData,
  GameConfig,
} from "../types.js";

// ─── Stub analytics ───────────────────────────────────────────────────────────

function trackEvent(event: string, props: Record<string, unknown>): void {
  console.info("[Analytics]", event, props);
}

// ─── State machine ────────────────────────────────────────────────────────────

type Action =
  | { type: "LOADING" }
  | {
      type: "SESSION_STARTED";
      sessionToken: string;
      totalBolts: number;
      gameConfig: GameConfig;
    }
  | { type: "SCORE_UPDATE"; score: number }
  | { type: "WON"; reward: RewardData }
  | { type: "ENDED"; finalScore: number; reward: RewardData | null }
  | { type: "INELIGIBLE" }
  | { type: "ERROR"; message: string }
  | { type: "DISMISS_WIN" };

function reducer(state: GameSessionState, action: Action): GameSessionState {
  switch (action.type) {
    case "LOADING":
      return { ...state, phase: "loading", error: null };
    case "SESSION_STARTED":
      return {
        ...state,
        phase: "playing",
        sessionToken: action.sessionToken,
        totalBolts: action.totalBolts,
        gameConfig: action.gameConfig,
      };
    case "SCORE_UPDATE":
      return { ...state, score: action.score };
    case "WON":
      return { ...state, phase: "won", reward: action.reward };
    case "ENDED":
      return {
        ...state,
        phase: state.phase === "won" ? "won" : "ended",
        score: action.finalScore,
        reward: action.reward ?? state.reward,
      };
    case "INELIGIBLE":
      return { ...state, phase: "ineligible" };
    case "ERROR":
      return { ...state, phase: "error", error: action.message };
    case "DISMISS_WIN":
      return { ...state, phase: "ended" };
    default:
      return state;
  }
}

const initialState: GameSessionState = {
  phase: "idle",
  sessionToken: "",
  totalBolts: 0,
  gameConfig: null,
  score: 0,
  reward: null,
  error: null,
};

// ─── Active order statuses ────────────────────────────────────────────────────

const ACTIVE_STATUSES = new Set(["rider_assigned", "out_for_delivery"]);

// ─── Component ────────────────────────────────────────────────────────────────

export const ThunderSlashWidget: React.FC<ThunderSlashWidgetProps> = ({
  orderId,
  userId,
  orderToken,
  orderStatus,
  apiBaseUrl = "/api/v1",
  onRewardWon,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const canvasRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameRef = useRef<any>(null);
  const elapsedRef = useRef(0);
  const [elapsed, setElapsed] = React.useState(0);

  const { startSession, sendSlash, endSession } = useGameSession({ apiBaseUrl });

  const isActive = ACTIVE_STATUSES.has(orderStatus);

  // ── Initialize session + game ──────────────────────────────────────────────

  useEffect(() => {
    if (!isActive || state.phase !== "idle") return;

    let cancelled = false;

    const init = async (): Promise<void> => {
      dispatch({ type: "LOADING" });

      try {
        const session = await startSession(orderId, userId, orderToken);

        if (cancelled) return;

        if (!session.eligible) {
          dispatch({ type: "INELIGIBLE" });
          return;
        }

        dispatch({
          type: "SESSION_STARTED",
          sessionToken: session.sessionToken,
          totalBolts: session.totalBolts,
          gameConfig: session.gameConfig,
        });

        trackEvent("game_session_started", {
          orderId,
          userId,
          totalBolts: session.totalBolts,
        });

        // Dynamically import game engine (code-split)
        // @ts-ignore: Hide path from TS static analysis to prevent rootDir violation
        const { ThunderSlashGame } = await import("../../../game/src/ThunderSlash.js");

        if (cancelled || !canvasRef.current) return;

        const game = new ThunderSlashGame();
        await game.init(canvasRef.current);
        gameRef.current = game;

        // Wire events
        game.onBoltSliced = (
          boltIndex: number,
          slashX: number,
          slashY: number
        ) => {
          void handleBoltSliced(
            session.sessionToken,
            boltIndex,
            slashX,
            slashY
          );
        };

        game.onXForceHit = () => {
          // Win animation already triggered by triggerXForceWin()
        };

        game.onGameEnd = (score: number) => {
          void handleGameEnd(session.sessionToken, score);
        };

        // Start! X-Force visual index = server's deterministic pick
        // We pass totalBolts/2 as a fallback visual hint (it's overridden by server anyway)
        // In production, a separate authenticated endpoint could return the visual index
        // after session start. For now: the golden bolt appears at index derived from orderId hash.
        const visualXForceIdx = Math.floor(
          simpleHash(orderId) * session.totalBolts
        );

        game.start(
          session.sessionToken,
          session.totalBolts,
          session.gameConfig,
          visualXForceIdx
        );

        // Start elapsed timer
        const interval = setInterval(() => {
          elapsedRef.current += 0.1;
          setElapsed(Math.round(elapsedRef.current * 10) / 10);
        }, 100);

        // Clean up timer when game ends
        const origOnGameEnd = game.onGameEnd;
        game.onGameEnd = (score: number) => {
          clearInterval(interval);
          origOnGameEnd(score);
        };
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to start game";
        dispatch({ type: "ERROR", message: msg });
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [isActive, orderId, userId, orderToken]); // eslint-disable-line

  // ── End game when order is delivered ──────────────────────────────────────

  useEffect(() => {
    if (orderStatus === "delivered" && gameRef.current) {
      gameRef.current.end?.();
    }
  }, [orderStatus]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      gameRef.current?.destroy?.();
    };
  }, []);

  // ── API handlers ───────────────────────────────────────────────────────────

  const handleBoltSliced = useCallback(
    async (
      sessionToken: string,
      boltIndex: number,
      slashX: number,
      slashY: number
    ): Promise<void> => {
      try {
        const result = await sendSlash(sessionToken, boltIndex, slashX, slashY);

        dispatch({ type: "SCORE_UPDATE", score: result.score });

        trackEvent("bolt_sliced", {
          sessionId: sessionToken,
          boltIndex,
          isXForce: result.isXForce,
          score: result.score,
        });

        if (result.isXForce && result.reward) {
          // Trigger win animation in game canvas
          gameRef.current?.triggerXForceWin?.();

          dispatch({ type: "WON", reward: result.reward });
          onRewardWon?.(result.reward.couponCode);

          trackEvent("xforce_hit", {
            sessionId: sessionToken,
            userId,
            orderId,
          });
        }
      } catch {
        // Silent — don't interrupt game on slash API errors
      }
    },
    [sendSlash, userId, orderId, onRewardWon]
  );

  const handleGameEnd = useCallback(
    async (sessionToken: string, finalScore: number): Promise<void> => {
      try {
        const result = await endSession(sessionToken, finalScore);
        dispatch({
          type: "ENDED",
          finalScore: result.finalScore,
          reward: result.reward,
        });

        trackEvent("game_ended", {
          sessionId: sessionToken,
          finalScore: result.finalScore,
          won: result.won,
          duration: 30,
        });
      } catch {
        dispatch({ type: "ENDED", finalScore, reward: null });
      }
    },
    [endSession]
  );

  // ── Render guards ──────────────────────────────────────────────────────────

  if (!isActive) return null;
  if (state.phase === "ineligible") return null;
  if (state.phase === "idle") return null;

  const duration = state.gameConfig?.durationSeconds ?? 30;
  const showGame = ["loading", "playing", "won", "ended"].includes(state.phase);

  return (
    <div
      id="xforce-thunder-slash-widget"
      className="w-full max-w-[480px] mx-auto rounded-2xl overflow-hidden
                 bg-[#02050a] border border-cyan-800/40
                 shadow-[0_8px_32px_rgba(0,0,0,0.8),_0_0_40px_rgba(0,160,227,0.15)] relative"
    >
      {/* Animated Storm Background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1122] via-[#040810] to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent opacity-80" />
      
      {/* Lightning flash overlay - uses an arbitrary animation from Tailwind */}
      <div className="absolute inset-0 bg-cyan-400 mix-blend-screen opacity-0 animate-[flash_8s_ease-out_infinite] pointer-events-none" />

      {/* Header */}
      <GameHeader
        score={state.score}
        elapsedSeconds={elapsed}
        durationSeconds={duration}
      />

      {/* Game canvas area */}
      {showGame && (
        <div className="relative w-full touch-none" style={{ minHeight: 300 }}>
          {/* PixiJS mounts here */}
          <div ref={canvasRef} className="w-full touch-none" />

          {/* Loading state */}
          {state.phase === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80">
              <div className="text-4xl animate-spin mb-3">⚡</div>
              <p className="text-gray-400 text-sm">Loading game…</p>
            </div>
          )}

          {/* Win overlay */}
          {state.phase === "won" && state.reward && (
            <WinOverlay
              couponCode={state.reward.couponCode}
              expiresAt={state.reward.expiresAt}
              onDismiss={() => dispatch({ type: "DISMISS_WIN" })}
              onViewWallet={() => {
                dispatch({ type: "DISMISS_WIN" });
                // Blinkit wallet navigation TBD
              }}
            />
          )}

          {/* End card */}
          {state.phase === "ended" && !state.reward && (
            <EndCard score={state.score} />
          )}
        </div>
      )}

      {/* Error state */}
      {state.phase === "error" && (
        <div className="px-4 py-6 text-center">
          <p className="text-gray-500 text-sm">{state.error}</p>
        </div>
      )}
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Client-side djb2 hash for visual X-Force bolt index (mirrors server RNG). */
function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  h = (h + 0x6d2b79f5) | 0;
  let t = Math.imul(h ^ (h >>> 15), 1 | h);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
