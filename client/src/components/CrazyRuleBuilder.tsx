import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, X, Check, Zap, EyeOff, ShieldAlert, Sparkles, Clock, RefreshCw } from "lucide-react";
import type { CrazyRulesConfig, NumberRestrictionType, TurboTimerSeconds, LuckyNumberFreq, JackpotMultiplier } from "@hand-cricket/shared";
import { DEFAULT_CRAZY_RULES } from "@hand-cricket/shared";

interface CrazyRuleBuilderProps {
  initialRules?: CrazyRulesConfig;
  onSave: (rules: CrazyRulesConfig) => void;
  onClose: () => void;
}

export function CrazyRuleBuilder({ initialRules = DEFAULT_CRAZY_RULES, onSave, onClose }: CrazyRuleBuilderProps) {
  const [rules, setRules] = useState<CrazyRulesConfig>({ ...initialRules });

  const updateRule = <K extends keyof CrazyRulesConfig>(key: K, value: CrazyRulesConfig[K]) => {
    setRules((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Flame size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                Crazy Rule Builder 🔥
              </h2>
              <p className="text-xs text-slate-400 font-medium">Configure match modifiers & custom game rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-left">
          {/* 1. Number Restrictions */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Zap size={16} /> 1. Number Restrictions
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "all", label: "All Numbers (0-10)" },
                { id: "even", label: "Even Numbers" },
                { id: "odd", label: "Odd Numbers" },
                { id: "any3", label: "Choose Any 3" }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateRule("numberRestriction", opt.id as NumberRestrictionType)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                    rules.numberRestriction === opt.id
                      ? "bg-amber-500/25 border-amber-400 text-amber-300"
                      : "bg-slate-900 border-white/5 text-slate-400 hover:border-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Turbo Timer */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Clock size={16} /> 2. Turbo Timer
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: null, label: "Unlimited" },
                { val: 10, label: "10 Secs" },
                { val: 5, label: "5 Secs" },
                { val: 3, label: "3 Secs" }
              ].map((t) => (
                <button
                  key={String(t.val)}
                  type="button"
                  onClick={() => updateRule("turboTimer", t.val as TurboTimerSeconds)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                    rules.turboTimer === t.val
                      ? "bg-amber-500/25 border-amber-400 text-amber-300"
                      : "bg-slate-900 border-white/5 text-slate-400 hover:border-white/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Lucky Number & Jackpot Ball */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  🍀 3. Lucky Number (2x)
                </label>
                <input
                  type="checkbox"
                  checked={rules.luckyNumberEnabled}
                  onChange={(e) => updateRule("luckyNumberEnabled", e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
              </div>
              {rules.luckyNumberEnabled && (
                <div className="flex gap-2 pt-1">
                  {(["over", "innings", "match"] as LuckyNumberFreq[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => updateRule("luckyNumberFreq", f)}
                      className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                        rules.luckyNumberFreq === f
                          ? "bg-amber-500/20 border-amber-400 text-amber-300"
                          : "bg-slate-900 border-white/5 text-slate-400"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  💥 4. Jackpot Ball
                </label>
                <input
                  type="checkbox"
                  checked={rules.jackpotBallEnabled}
                  onChange={(e) => updateRule("jackpotBallEnabled", e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
              </div>
              {rules.jackpotBallEnabled && (
                <div className="flex gap-2 pt-1">
                  {([2, 3, 5] as JackpotMultiplier[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateRule("jackpotMultiplier", m)}
                      className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                        rules.jackpotMultiplier === m
                          ? "bg-amber-500/20 border-amber-400 text-amber-300"
                          : "bg-slate-900 border-white/5 text-slate-400"
                      }`}
                    >
                      {m}x Runs
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 5. Toggles Grid (Mystery, Golden, Pressure, Sudden Death, etc.) */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Sparkles size={16} /> Gameplay Modifiers
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-300">
              {[
                { key: "mysteryBallEnabled", label: "🔮 Mystery Ball Events" },
                { key: "goldenOverEnabled", label: "⭐ Golden Over (2x Runs)" },
                { key: "pressureOverEnabled", label: "🔥 Pressure Over (2x)" },
                { key: "frozenNumberEnabled", label: "❄️ Frozen Number (Per Over)" },
                { key: "hotNumberEnabled", label: "🌶️ Hot Number (+1 Bonus)" },
                { key: "blindPick", label: "🙈 Blind Pick (Hidden Lock)" },
                { key: "shuffleButtons", label: "🔀 Shuffle Buttons (Every Over)" },
                { key: "mirrorMode", label: "🪞 Mirror Mode (0↔7, 1↔6)" },
                { key: "suddenDeath", label: "☠️ Sudden Death (1 Wicket = End)" },
                { key: "chaosMode", label: "🌀 Chaos Mode (Shift Every Over)" }
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-white/5 cursor-pointer hover:border-white/10"
                >
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(rules[item.key as keyof CrazyRulesConfig])}
                    onChange={(e) => updateRule(item.key as keyof CrazyRulesConfig, e.target.checked as any)}
                    className="w-4 h-4 accent-amber-500"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 pt-4 border-t border-white/10 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-white/10 font-bold text-slate-300 hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(rules);
              onClose();
            }}
            className="flex-1 py-3 rounded-2xl font-black bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Check size={18} className="stroke-[3]" /> Save Crazy Settings
          </button>
        </div>
      </motion.div>
    </div>
  );
}
