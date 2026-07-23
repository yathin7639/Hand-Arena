import { Copy, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { Button } from "./Button";
import { motion } from "framer-motion";

export function ShellHeader({
  code,
  connected,
  connectionStatus,
  latency,
  muted,
  onMute,
  onLeave
}: {
  code?: string;
  connected: boolean;
  connectionStatus?: "connected" | "connecting" | "disconnected";
  latency?: number;
  muted: boolean;
  onMute: () => void;
  onLeave?: () => void;
}) {
  const getLatencyColor = () => {
    if (connectionStatus === "disconnected") return "text-red-500 bg-red-500/10 border-red-500/20";
    if (connectionStatus === "connecting") return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    if (!latency || latency < 70) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (latency < 150) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-red-400 bg-red-500/10 border-red-500/20";
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-950/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/5 shadow-2xl"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-xl text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          🏟️
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-400">Match Lobby</p>
          </div>
          <h2 className="text-lg font-black tracking-tight text-white uppercase">
            Hand Cricket Arena
          </h2>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {code && (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(code);
              }}
              title="Copy room code"
              className="px-4 py-2 text-sm border-white/10"
            >
              <Copy size={16} className="text-cyan-400" />
              <span className="font-mono text-cyan-200 tracking-wider">{code}</span>
            </Button>
          </motion.div>
        )}

        {/* Audio control */}
        <button
          onClick={onMute}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white transition-colors duration-150"
          title={muted ? "Unmute Sound" : "Mute Sound"}
        >
          {muted ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} className="text-emerald-400" />}
        </button>

        {/* Leave control */}
        {onLeave && (
          <button
            onClick={onLeave}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-xs font-black uppercase tracking-wider text-white rounded-xl border border-red-500/30 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] font-bold"
            title="Leave Match"
          >
            ❌ LEAVE
          </button>
        )}

        {/* Status */}
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider ${getLatencyColor()}`}>
          {connectionStatus === "connecting" ? (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Connecting...</span>
            </>
          ) : connectionStatus === "disconnected" ? (
            <>
              <WifiOff size={16} className="text-current" />
              <span>Offline</span>
            </>
          ) : (
            <>
              <Wifi size={16} className="text-current animate-pulse" />
              <span>{latency ?? "--"} ms</span>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
