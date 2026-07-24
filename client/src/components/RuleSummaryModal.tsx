import { motion } from "framer-motion";
import { Flame, Zap, ShieldCheck, CheckCircle2, Award, Clock, Sparkles } from "lucide-react";
import type { RoomView } from "@hand-cricket/shared";

interface RuleSummaryModalProps {
  room: RoomView;
  onReady: () => void;
}

export function RuleSummaryModal({ room, onReady }: RuleSummaryModalProps) {
  const isCrazy = room.mode === "crazy";
  const isBluff = room.mode === "bluff";
  const rules = room.crazyRules;
  const bluffConfig = room.bluffConfig;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-6 text-left"
      >
        {/* Title */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            {isCrazy ? <Flame size={28} /> : isBluff ? <Sparkles size={28} /> : <ShieldCheck size={28} />}
          </div>
          <div>
            <div className="text-emerald-400 font-extrabold text-xs tracking-widest uppercase">
              {isCrazy ? "🔥 Crazy Mode Rules" : isBluff ? "🎭 Bluff Mode Phases" : "🏏 Match Settings"}
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
              Pre-Match Rule Summary
            </h2>
          </div>
        </div>

        {/* Basic Match Info */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">Overs</span>
            <span className="text-lg font-black text-white">{room.overs} Overs</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">Innings</span>
            <span className="text-lg font-black text-white capitalize">{room.matchType}</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">Venue</span>
            <span className="text-lg font-black text-emerald-400 uppercase">{room.stadium}</span>
          </div>
        </div>

        {/* Bluff Mode Specific Phases */}
        {isBluff && bluffConfig && (
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles size={14} /> Bluff Phase Restrictions (10 Overs)
            </h4>
            <div className="space-y-2 text-xs text-slate-300">
              {bluffConfig.phases.map((phase) => (
                <div key={phase.id} className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-white/5">
                  <div>
                    <span className="font-black text-white text-xs block">{phase.name}</span>
                    <span className="text-[10px] font-bold text-slate-400">Overs {phase.startOver} – {phase.endOver}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-black text-emerald-400 text-xs bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    [{phase.allowedNumbers.join(", ")}]
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Crazy Mode Modifiers Active */}
        {isCrazy && rules && (
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-amber-500/20 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Flame size={14} /> Active Crazy Modifiers
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                Restrictions: {rules.numberRestriction.toUpperCase()}
              </span>
              {rules.turboTimer && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1">
                  <Clock size={12} /> {rules.turboTimer}s Turbo Timer
                </span>
              )}
              {rules.luckyNumberEnabled && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
                  🍀 Lucky Number (2x)
                </span>
              )}
              {rules.jackpotBallEnabled && (
                <span className="px-2.5 py-1 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 font-bold">
                  💥 Jackpot {rules.jackpotMultiplier}x Ball
                </span>
              )}
              {rules.mysteryBallEnabled && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold">
                  🔮 Mystery Ball Events
                </span>
              )}
              {rules.suddenDeath && (
                <span className="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 font-bold">
                  ☠️ Sudden Death Wicket
                </span>
              )}
              {rules.mirrorMode && (
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold">
                  🪞 Mirror Mode
                </span>
              )}
              {rules.shuffleButtons && (
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold">
                  🔀 Shuffle Buttons
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onReady}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-lg shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={22} className="stroke-[3]" /> I UNDERSTAND – START MATCH
        </button>
      </motion.div>
    </div>
  );
}
