/**
 * WinOverlay — shown when the user slices the X-Force bolt.
 * - Golden background flash
 * - Bouncing can icon
 * - Coupon code in monospace badge
 * - "View in Wallet →" button
 * - Auto-dismisses after 5 seconds
 */

import React, { useEffect, useState } from "react";

interface WinOverlayProps {
  couponCode: string;
  expiresAt: string;
  onDismiss: () => void;
  onViewWallet?: () => void;
}

export const WinOverlay: React.FC<WinOverlayProps> = ({
  couponCode,
  expiresAt,
  onDismiss,
  onViewWallet,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onDismiss]);

  const expiryDate = new Date(expiresAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center
                 bg-[#02050a]/90
                 backdrop-blur-xl animate-[winFlash_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)] overflow-hidden"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-600/30 via-[#02050a]/50 to-[#02050a] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

      {/* Floating Sparkles Background */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-[pulse_3s_ease-in-out_infinite]" />

      {/* Thums Up Can Image */}
      <div className="relative z-10 mb-4 mt-6">
        <div className="absolute inset-0 bg-red-600/40 blur-[40px] rounded-full scale-150 animate-pulse" />
        <div className="absolute inset-0 bg-cyan-400/20 blur-[20px] rounded-full scale-110" />
        <img 
          src="/thums_up_can.png" 
          alt="Thums Up Xforce" 
          className="h-32 w-auto animate-[bounce_1.5s_ease-in-out_infinite] drop-shadow-[0_0_30px_rgba(227,24,55,0.8)] relative z-10 origin-bottom"
        />
      </div>

      <div className="relative z-10 text-center px-4 w-full flex flex-col items-center">
        <div className="inline-block px-3 py-1 bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border border-cyan-400/30 rounded-full mb-3 shadow-[0_0_15px_rgba(0,160,227,0.3)]">
          <h2 className="text-cyan-300 text-[10px] font-black uppercase tracking-widest leading-none drop-shadow-md">
            BE THE FIRST TO GRAB
          </h2>
        </div>
        
        <h3 className="text-white text-2xl sm:text-3xl font-black uppercase tracking-tight leading-none mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">ALL THUNDER</span><br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-700">NO SUGAR</span><span className="text-red-500 text-xs align-top font-normal">®</span>
        </h3>
        
        <p className="text-gray-300 text-sm font-medium mb-6 px-6 opacity-90 drop-shadow-sm">
          A free Thums Up Xforce has been <strong className="text-cyan-400 font-bold">added to your order!</strong>
        </p>

        {/* Premium Coupon badge */}
        <div className="bg-gradient-to-b from-white/10 to-white/5 border border-white/20 rounded-2xl p-[1px] mb-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative w-11/12 max-w-[300px] backdrop-blur-md">
          <div className="bg-[#02050a]/80 rounded-[15px] px-6 py-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-0.5 rounded-full text-[9px] text-white uppercase tracking-widest font-black shadow-lg border border-white/20">
              Your Code
            </div>
            <p className="font-mono text-2xl font-black text-white tracking-[0.2em] mt-2 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              {couponCode}
            </p>
            <p className="text-cyan-500 text-[10px] mt-1.5 font-bold uppercase tracking-widest">
              Valid until {expiryDate}
            </p>
          </div>
        </div>

        {/* Actions - Blinkit style super premium button */}
        <button
          onClick={onViewWallet ?? onDismiss}
          className="group relative bg-gradient-to-b from-red-500 to-red-700 text-white font-black text-sm px-8 py-3.5 rounded-xl
                     hover:from-red-400 hover:to-red-600 transition-all duration-300 shadow-[0_8px_20px_rgba(227,24,55,0.5),_inset_0_1px_2px_rgba(255,255,255,0.4)] 
                     active:scale-95 border border-red-400 flex items-center justify-center gap-2 w-11/12 max-w-[300px] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          <span>VIEW IN WALLET</span>
          <span className="font-light text-xl leading-none mb-0.5 transition-transform group-hover:translate-x-1">›</span>
        </button>

        {/* Auto-dismiss counter */}
        <div className="flex items-center gap-2 mt-5 opacity-60">
          <div className="w-4 h-4 rounded-full border-2 border-gray-500 border-t-gray-300 animate-spin" />
          <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">
            Resuming in {secondsLeft}s
          </p>
        </div>
      </div>
    </div>
  );
};
