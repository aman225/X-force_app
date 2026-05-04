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
                 bg-gradient-to-br from-[#06101c] via-[#0b1c31] to-[#040810]
                 backdrop-blur-md rounded-xl animate-[winFlash_0.4s_ease-out] border border-cyan-800/50 overflow-hidden"
      style={{ animation: "winFlash 0.4s ease-out" }}
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent pointer-events-none" />

      {/* Thums Up Can Image */}
      <div className="relative z-10 mb-2 mt-4">
        <div className="absolute inset-0 bg-red-600/20 blur-xl rounded-full" />
        <img 
          src="/thums_up_can.png" 
          alt="Thums Up Xforce" 
          className="h-28 w-auto animate-[bounce_0.8s_ease-out_3] drop-shadow-[0_0_25px_rgba(0,160,227,0.6)] relative z-10"
        />
      </div>

      <div className="relative z-10 text-center px-4 w-full flex flex-col items-center">
        <h2 className="text-white text-2xl font-black uppercase tracking-tight leading-none mb-1 drop-shadow-md">
          BE THE FIRST TO GRAB
        </h2>
        <h3 className="text-white text-xl font-black uppercase tracking-tight leading-none mb-3 drop-shadow-md">
          ALL THUNDER NO SUGAR<span className="text-xs align-top font-normal">®</span>
        </h3>
        
        <p className="text-cyan-200 text-xs font-medium mb-5 px-6 opacity-90">
          Free Thums Up Xforce added to your order!
        </p>

        {/* Coupon badge */}
        <div className="bg-black/40 border border-white/20 rounded px-6 py-2 mb-6 text-center shadow-inner relative w-11/12 max-w-[280px]">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#0b1c31] px-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            Coupon Code
          </div>
          <p className="font-mono text-xl font-black text-white tracking-widest mt-1">
            {couponCode}
          </p>
          <p className="text-gray-400 text-[10px] mt-1 uppercase tracking-wider">
            Valid until {expiryDate}
          </p>
        </div>

        {/* Actions - Styled like "Pre-Book Now >" */}
        <button
          onClick={onViewWallet ?? onDismiss}
          className="bg-gradient-to-b from-red-600 to-red-800 text-white font-bold text-sm px-8 py-3 rounded-lg
                     hover:from-red-500 hover:to-red-700 transition-all shadow-[0_4px_15px_rgba(227,24,55,0.4)] 
                     active:scale-95 border border-red-500 flex items-center justify-center gap-2 w-11/12 max-w-[280px]"
        >
          View in Wallet <span className="font-light text-lg leading-none mb-0.5">›</span>
        </button>

        {/* Auto-dismiss counter */}
        <p className="text-gray-500 text-[10px] mt-4 uppercase tracking-widest">
          Dismisses in {secondsLeft}s
        </p>
      </div>
    </div>
  );
};
