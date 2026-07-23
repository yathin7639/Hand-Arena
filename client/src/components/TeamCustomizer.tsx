import { useState } from "react";
import type { Team } from "@hand-cricket/shared";
import { Card } from "./Card";
import { Button } from "./Button";

interface TeamCustomizerProps {
  team: Team;
  onSaveBrand: (
    teamId: string,
    logo: string,
    primaryColor: string,
    secondaryColor: string,
    banner: string
  ) => void;
  onRename: (teamId: string, name: string) => void;
  onClose: () => void;
}

const EMOJIS = ["🦁", "🐯", "🦅", "🐉", "🦈", "⚔️", "🛡️", "☄️", "🐺", "🐼", "👑", "🔥", "⚡", "🌟"];
const PRESETS = [
  { name: "Neon Cyan", primary: "#06b6d4", secondary: "#0891b2" },
  { name: "Crimson Blaze", primary: "#ef4444", secondary: "#b91c1c" },
  { name: "Gold Elite", primary: "#eab308", secondary: "#ca8a04" },
  { name: "Emerald Viper", primary: "#10b981", secondary: "#047857" },
  { name: "Royal Amethyst", primary: "#a855f7", secondary: "#7e22ce" },
  { name: "Sunset Pulse", primary: "#f97316", secondary: "#c2410c" }
];

export function TeamCustomizer({ team, onSaveBrand, onRename, onClose }: TeamCustomizerProps) {
  const [name, setName] = useState(team.name);
  const [logo, setLogo] = useState(team.brand.logo);
  const [primary, setPrimary] = useState(team.brand.primaryColor);
  const [secondary, setSecondary] = useState(team.brand.secondaryColor);

  const handleSave = () => {
    if (name.trim() !== team.name) {
      onRename(team.id, name.trim());
    }
    const banner = `linear-gradient(135deg, ${primary}, #020617)`;
    onSaveBrand(team.id, logo, primary, secondary, banner);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/10">
        
        {/* Banner Preview */}
        <div
          className="h-28 flex items-center justify-between px-6 relative"
          style={{ background: `linear-gradient(135deg, ${primary}, #0f172a)` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl filter drop-shadow-md">{logo}</span>
            <div>
              <h2 className="text-xl font-bold text-white drop-shadow">{name || "Team Name"}</h2>
              <span className="text-xs text-white/70 tracking-widest uppercase font-semibold">Brand Preview</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white text-lg transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Team Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Team Name</label>
            <input
              type="text"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition font-bold"
              placeholder="Enter team name..."
            />
          </div>

          {/* Logo Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Select Mascot Logo</label>
            <div className="grid grid-cols-7 gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setLogo(emoji)}
                  className={`aspect-square flex items-center justify-center text-2xl rounded-xl transition ${
                    logo === emoji
                      ? "bg-cyan-500/20 border-2 border-cyan-500 scale-105"
                      : "bg-slate-950 border border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Branding Color Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setPrimary(preset.primary);
                    setSecondary(preset.secondary);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition ${
                    primary === preset.primary
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-slate-800 bg-slate-950 hover:bg-slate-850"
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <span className="text-xs font-bold text-white truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Primary Color</label>
              <div className="flex gap-2 items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                <input
                  type="color"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs font-bold font-mono text-white">{primary.toUpperCase()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Secondary Color</label>
              <div className="flex gap-2 items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                <input
                  type="color"
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs font-bold font-mono text-white">{secondary.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t border-slate-800/80">
            <Button variant="danger" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSave} className="flex-1">
              Apply Design
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
