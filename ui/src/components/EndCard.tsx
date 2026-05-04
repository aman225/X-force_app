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
                 bg-[#02050a]/95
                 backdrop-blur-xl animate-[winFlash_0.4s_ease-out]"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-transparent to-transparent pointer-events-none" />

      {/* Floating Sparkles Background */}
      <div className="absolute inset-0 opacity-20 mix-blend-screen bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

      {/* Bolt icon (subdued) */}
      <div className="relative mb-4 mt-2">
        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
        <div className="text-6xl opacity-40 drop-shadow-[0_0_15px_rgba(0,160,227,0.5)] relative z-10 grayscale-[50%]">⚡</div>
      </div>

      <h2 className="text-gray-300 text-xl sm:text-2xl font-black uppercase tracking-[0.1em] text-center mb-1 drop-shadow-md">
        THE THUNDER GOT AWAY
      </h2>

      {/* Premium Score display */}
      <div className="bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl p-[1px] mb-6 mt-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative w-10/12 max-w-[260px] backdrop-blur-md">
        <div className="bg-[#02050a]/80 rounded-[15px] px-8 py-5 relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
          <p className="text-cyan-500/60 text-[10px] mb-1.5 uppercase tracking-[0.3em] font-bold">
            Your Score
          </p>
          <p className="text-white text-5xl font-black tabular-nums drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] tracking-tight">
            {score}
            <span className="text-sm text-cyan-500/40 font-bold ml-1.5 uppercase tracking-widest relative -top-3">pts</span>
          </p>
        </div>
      </div>

      <p className="text-gray-400 text-sm text-center px-8 leading-relaxed font-medium">
        Try again on your <strong className="text-white">next Blinkit order</strong>
        <br />
        <span className="text-cyan-500/80 text-xs">to grab the Thums Up Xforce can.</span>
      </p>

      {/* Blinkit branding hint */}
      <div className="mt-8 flex items-center gap-3 opacity-60">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_rgba(0,160,227,0.8)]" />
        <p className="text-gray-500 text-[9px] uppercase tracking-[0.2em] font-bold">Powered by Thums Up Xforce</p>
        <div className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_5px_rgba(227,24,55,0.8)]" />
      </div>
    </div>
  );
};
