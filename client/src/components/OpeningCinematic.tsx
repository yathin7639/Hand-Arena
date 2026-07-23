import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FastForward, Loader2 } from "lucide-react";

interface OpeningCinematicProps {
  onComplete: () => void;
}

export function OpeningCinematic({ onComplete }: OpeningCinematicProps) {
  const [loaded, setLoaded] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Trigger skip button after ~1 second
  useEffect(() => {
    const skipTimer = setTimeout(() => {
      setShowSkip(true);
    }, 1000);

    return () => clearTimeout(skipTimer);
  }, []);

  // Auto-finish cinematic after ~9.8s duration
  useEffect(() => {
    const durationTimer = setTimeout(() => {
      handleFinish();
    }, 9850);

    return () => clearTimeout(durationTimer);
  }, []);

  const handleFinish = () => {
    if (isExiting) return;
    setIsExiting(true);
    // Allow smooth fade out duration before completing
    setTimeout(() => {
      onComplete();
    }, 450);
  };

  const handleError = () => {
    // If cinematic fails to load, immediately continue to Home Page without showing an error
    onComplete();
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center overflow-hidden select-none"
        >
          {/* Loading state indicator before image resolves */}
          {!loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 z-10">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                Loading Arena...
              </span>
            </div>
          )}

          {/* Animated WebP Opening Cinematic */}
          <img
            src="/opening_cinematic.webp"
            alt="HandArena Opening Cinematic"
            onLoad={() => setLoaded(true)}
            onError={handleError}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* "Skip Intro" Button - appears after 1 second */}
          {loaded && showSkip && (
            <motion.button
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              onClick={handleFinish}
              className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-20 flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-950/70 hover:bg-slate-900/90 border border-white/20 hover:border-emerald-400/50 text-white hover:text-emerald-400 shadow-2xl backdrop-blur-md transition-all duration-200 group cursor-pointer"
            >
              <span className="text-xs font-black uppercase tracking-wider">
                Skip Intro
              </span>
              <FastForward size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
