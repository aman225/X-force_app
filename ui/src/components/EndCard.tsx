/**
 * EndCard — shown when the game ends without a win.
 * Shows final score and a gentle "try next order" message.
 */

import React from "react";

interface EndCardProps {
  score: number;
}

export const EndCard: React.FC<EndCardProps> = ({ score }) => {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center
                 bg-gradient-to-br from-[#06101c]/95 via-[#0b1c31]/95 to-[#040810]/95
                 backdrop-blur-md rounded-xl"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-transparent to-transparent pointer-events-none" />

      {/* Bolt icon (subdued) */}
      <div className="text-5xl mb-3 opacity-30 drop-shadow-[0_0_10px_rgba(0,160,227,0.5)]">⚡</div>

      <h2 className="text-white text-2xl font-black uppercase tracking-tight text-center mb-1 drop-shadow-md">
        THE THUNDER GOT AWAY
      </h2>

      {/* Score */}
      <div className="bg-black/40 border border-white/10 rounded-xl px-10 py-4 mb-5 text-center mt-2 shadow-inner">
        <p className="text-cyan-500/80 text-[10px] mb-1 uppercase tracking-[0.2em] font-bold">
          Your Score
        </p>
        <p className="text-white text-4xl font-black tabular-nums drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
          {score}
          <span className="text-sm text-cyan-500/60 font-semibold ml-1.5 uppercase">pts</span>
        </p>
      </div>

      <p className="text-gray-400 text-xs text-center px-8 leading-relaxed font-medium">
        Try again on your next Blinkit order
        <br />
        <span className="text-cyan-400/80">to grab the Thums Up Xforce can.</span>
      </p>

      {/* Blinkit branding hint */}
      <div className="mt-6 flex items-center gap-2 opacity-80">
        <div className="w-1 h-1 rounded-full bg-cyan-500" />
        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold">Powered by Thums Up Xforce</p>
        <div className="w-1 h-1 rounded-full bg-red-600" />
      </div>
    </div>
  );
};
