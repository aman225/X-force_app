/**
 * GameHeader — sits above the game canvas.
 * Shows: "⚡ Slash while you wait" label, live score, draining time bar.
 */

import React from "react";

interface GameHeaderProps {
  score: number;
  elapsedSeconds: number;
  durationSeconds: number;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  score,
  elapsedSeconds,
  durationSeconds,
}) => {
  const progress = Math.max(0, 1 - elapsedSeconds / durationSeconds);
  const progressPct = `${progress * 100}%`;

  // Color: Red gradient
  const barColor =
    progress > 0.5
      ? "from-red-500 to-red-600"
      : progress > 0.25
        ? "from-red-600 to-red-700"
        : "from-red-700 to-red-800";

  return (
    <div className="px-5 py-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent relative z-10 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col leading-none">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 text-sm sm:text-base font-black tracking-[0.2em] italic uppercase drop-shadow-[0_0_8px_rgba(0,160,227,0.8)] pb-1">
            ALL THUNDER
          </span>
          <span className="text-red-500 text-[10px] sm:text-xs font-black tracking-widest uppercase drop-shadow-[0_0_4px_rgba(227,24,55,0.8)]">
            NO SUGAR
          </span>
        </div>
        
        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 backdrop-blur-lg shadow-[inset_0_1px_4px_rgba(255,255,255,0.1),_0_4px_12px_rgba(0,0,0,0.5)]">
          <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider mr-2 mt-0.5">SCORE</span>
          <span className="text-white text-xl font-black tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]">
            {score}
          </span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
        <div
          className={`absolute top-0 left-0 h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-100 shadow-[0_0_10px_rgba(227,24,55,0.8)] relative overflow-hidden`}
          style={{ width: progressPct }}
        >
          {/* Animated shimmer on the bar */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        </div>
      </div>
    </div>
  );
};
