import { useState } from "react";
import { X, Plus, Trash2, Dices, Check, AlertCircle, Sparkles } from "lucide-react";
import type { BluffConfig, BluffPhase, HandNumber } from "@hand-cricket/shared";
import {
  DEFAULT_BLUFF_CONFIG,
  generateRandomBluffConfig,
  validateBluffPhases
} from "@hand-cricket/shared";

interface BluffPhaseBuilderProps {
  initialConfig?: BluffConfig;
  onSave: (config: BluffConfig) => void;
  onClose: () => void;
}

export function BluffPhaseBuilder({
  initialConfig = DEFAULT_BLUFF_CONFIG,
  onSave,
  onClose
}: BluffPhaseBuilderProps) {
  const [phases, setPhases] = useState<BluffPhase[]>(
    initialConfig.phases && initialConfig.phases.length > 0
      ? initialConfig.phases
      : DEFAULT_BLUFF_CONFIG.phases
  );
  const [error, setError] = useState<string | undefined>();

  const allNumbers: HandNumber[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const handleToggleNumber = (phaseIndex: number, num: HandNumber) => {
    setPhases((prev) => {
      const next = [...prev];
      const targetPhase = { ...next[phaseIndex] };
      const exists = targetPhase.allowedNumbers.includes(num);
      if (exists) {
        targetPhase.allowedNumbers = targetPhase.allowedNumbers.filter((n) => n !== num);
      } else {
        targetPhase.allowedNumbers = [...targetPhase.allowedNumbers, num].sort((a, b) => a - b);
      }
      next[phaseIndex] = targetPhase;
      return next;
    });
  };

  const handleUpdateOverRange = (phaseIndex: number, startOver: number, endOver: number) => {
    setPhases((prev) => {
      const next = [...prev];
      next[phaseIndex] = {
        ...next[phaseIndex],
        startOver: Math.max(1, Math.min(10, startOver)),
        endOver: Math.max(1, Math.min(10, endOver))
      };
      return next;
    });
  };

  const handleUpdatePhaseName = (phaseIndex: number, name: string) => {
    setPhases((prev) => {
      const next = [...prev];
      next[phaseIndex] = { ...next[phaseIndex], name };
      return next;
    });
  };

  const handleAddPhase = () => {
    setPhases((prev) => {
      const lastEnd = prev.length > 0 ? prev[prev.length - 1].endOver : 0;
      const startOver = Math.min(10, lastEnd + 1);
      const endOver = 10;
      const newPhase: BluffPhase = {
        id: `phase-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: `Phase ${prev.length + 1}`,
        startOver,
        endOver,
        allowedNumbers: [1, 2, 3]
      };
      return [...prev, newPhase];
    });
  };

  const handleRemovePhase = (index: number) => {
    if (phases.length <= 1) {
      setError("At least one phase is required");
      return;
    }
    setPhases((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateRandom = () => {
    const randomConfig = generateRandomBluffConfig();
    setPhases(randomConfig.phases);
    setError(undefined);
  };

  const handleSave = () => {
    const validation = validateBluffPhases(phases);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    setError(undefined);
    onSave({ phases });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-6 text-left my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-black uppercase text-white tracking-wide">
                Bluff Mode Phase Configurator
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-bold mt-1">
              Configure allowed hand numbers for 10 overs. Players can only choose numbers allowed in the active phase.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Action Preset */}
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
            <Dices size={18} className="text-emerald-400" />
            <span>Generate a random balanced phase layout automatically</span>
          </div>
          <button
            type="button"
            onClick={handleGenerateRandom}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase transition-all flex items-center gap-1.5"
          >
            <Dices size={14} /> Random Preset
          </button>
        </div>

        {/* Validation Error Banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl text-xs font-bold text-red-300">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Phase List */}
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {phases.map((phase, idx) => (
            <div
              key={phase.id || idx}
              className="bg-slate-950/70 border border-white/10 p-4 rounded-2xl space-y-3"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <input
                  type="text"
                  value={phase.name}
                  onChange={(e) => handleUpdatePhaseName(idx, e.target.value)}
                  className="bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs font-black text-white outline-none focus:border-emerald-400"
                />

                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                  <span>Overs:</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={phase.startOver}
                    onChange={(e) =>
                      handleUpdateOverRange(idx, parseInt(e.target.value) || 1, phase.endOver)
                    }
                    className="w-12 bg-slate-900 border border-white/15 rounded-lg px-2 py-1 text-center text-white font-bold"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={phase.endOver}
                    onChange={(e) =>
                      handleUpdateOverRange(idx, phase.startOver, parseInt(e.target.value) || 10)
                    }
                    className="w-12 bg-slate-900 border border-white/15 rounded-lg px-2 py-1 text-center text-white font-bold"
                  />
                  {phases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhase(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Number Selector for this phase */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Allowed Hand Numbers ({phase.allowedNumbers.length} selected):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {allNumbers.map((num) => {
                    const isSelected = phase.allowedNumbers.includes(num);
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleToggleNumber(idx, num)}
                        className={`w-8 h-8 rounded-xl font-black text-xs transition-all flex items-center justify-center ${
                          isSelected
                            ? "bg-emerald-500 border border-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.3)] scale-105"
                            : "bg-slate-900 border border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Phase & Footer Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={handleAddPhase}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={16} /> Add Phase
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-white/15 text-slate-300 font-black text-xs uppercase hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-1.5"
            >
              <Check size={16} className="stroke-[3]" /> Save Config
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
