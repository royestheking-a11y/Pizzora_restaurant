import React from 'react';
import { useLocation } from 'react-router';
import { useApp } from '../context/AppContext';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function OfflineBanner() {
  const { state } = useApp();
  const location = useLocation();
  const { isSocketConnected } = state;

  // Only show on POS routes
  const isPosRoute = location.pathname.startsWith('/pos');

  if (!isPosRoute) return null;

  return (
    <AnimatePresence>
      {!isSocketConnected && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 w-full z-[9999] flex justify-center pt-4 pointer-events-none"
        >
          <div className="bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg shadow-red-500/30 flex items-center gap-3 border border-red-400 pointer-events-auto">
            <WifiOff className="w-5 h-5 animate-pulse" />
            <div>
              <p className="font-bold text-sm tracking-wide">⚠️ Offline - Reconnecting...</p>
              <p className="text-xs text-red-100">Live sync paused. Orders may not save.</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
