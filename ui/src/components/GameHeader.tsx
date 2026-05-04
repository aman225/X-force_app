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
    <div className="px-4 pt-3 pb-2 bg-black/60 border-b border-cyan-800/60 relative z-10 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white text-xs sm:text-sm font-black tracking-widest italic uppercase">
          ALL THUNDER NO SUGAR <span className="text-cyan-400 not-italic ml-1">⚡</span>
        </span>
        <span className="text-white text-sm font-black tabular-nums bg-red-600/20 border border-red-500/40 rounded-sm px-3 py-0.5 shadow-[0_0_10px_rgba(227,24,55,0.2)]">
          {score}
        </span>
      </div>

      {/* Timer bar */}
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-100`}
          style={{ width: progressPct }}
        />
      </div>
    </div>
  );
};
