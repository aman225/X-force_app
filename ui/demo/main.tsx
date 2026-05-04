import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ThunderSlashWidget } from "../src/components/ThunderSlashWidget.tsx";

const DemoApp = () => {
  const [status, setStatus] = useState<"rider_assigned" | "out_for_delivery" | "delivered">("rider_assigned");

  return (
    <div className="w-full max-w-sm">
      {/* Order status bar */}
      <div className="bg-[#040810] rounded-2xl p-4 mb-4 border border-cyan-800/40 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-cyan-900/40 border border-cyan-500/40 flex items-center justify-center text-xl">🛵</div>
          <div>
            <p className="text-white text-sm font-bold">Rider is on the way!</p>
            <p className="text-gray-400 text-xs">Estimated: 12 minutes</p>
          </div>
        </div>
        
        {/* Status controls for demo */}
        <p className="text-gray-500 text-xs mb-2">Simulate order status:</p>
        <div className="flex gap-2 flex-wrap">
          {(["rider_assigned", "out_for_delivery", "delivered"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                status === s
                  ? "bg-cyan-900/40 border-cyan-500/40 text-cyan-400 hover:bg-cyan-800/60"
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
              }`}
            >
              {s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Actual Widget Mounts Here! */}
      <ThunderSlashWidget 
        orderId="demo-order-123"
        userId="demo-user-456"
        orderToken="valid-token"
        orderStatus={status}
        apiBaseUrl="" 
        onRewardWon={(coupon) => console.log("Won!", coupon)}
      />

      {/* Info note */}
      <div className="mt-4 bg-cyan-900/10 border border-cyan-800/30 rounded-xl p-3">
        <p className="text-cyan-500/70 text-xs text-center">
          ⚡ This demo runs against the actual React components.
        </p>
      </div>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<DemoApp />);
