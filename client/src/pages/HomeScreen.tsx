import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogIn, Plus, Volume2, VolumeX, ShieldAlert, Check, Flame, Zap, Settings } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CrazyRuleBuilder } from "../components/CrazyRuleBuilder";
import { STADIUMS, DEFAULT_CRAZY_RULES } from "@hand-cricket/shared";
import type { CrazyRulesConfig } from "@hand-cricket/shared";

export function HomeScreen({
  defaultName,
  error,
  onCreate,
  onJoin,
  muted,
  onMute,
  connectionStatus
}: {
  defaultName: string;
  error?: string;
  onCreate: (
    name: string,
    mode: "quick" | "team" | "series" | "crazy" | "t10",
    maxPlayers: number,
    stadium: string,
    overs: number,
    matchType: "single" | "double",
    crazyRules?: CrazyRulesConfig,
    subMode?: "quick" | "team" | "series" | "tournament"
  ) => void;
  onJoin: (code: string, name: string) => void;
  muted: boolean;
  onMute: () => void;
  connectionStatus?: "connected" | "connecting" | "disconnected";
}) {
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [mode, setMode] = useState<"quick" | "team" | "series" | "crazy" | "t10">("quick");
  const [subMode, setSubMode] = useState<"quick" | "team" | "series" | "tournament">("quick");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [stadium, setStadium] = useState<string>("hpca");
  const [overs, setOvers] = useState<number>(5);
  const [matchType, setMatchType] = useState<"single" | "double">("single");

  // Crazy Rules Configuration State
  const [crazyRules, setCrazyRules] = useState<CrazyRulesConfig>(DEFAULT_CRAZY_RULES);
  const [showCrazyBuilder, setShowCrazyBuilder] = useState(false);

  // Subtle desktop-only mouse parallax effect
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 768) return;
      const { innerWidth, innerHeight } = window;
      const x = ((e.clientX - innerWidth / 2) / innerWidth) * 12;
      const y = ((e.clientY - innerHeight / 2) / innerHeight) * 12;
      setParallaxOffset({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleModeChange = (newMode: "quick" | "team" | "series" | "crazy" | "t10") => {
    setMode(newMode);
    if (newMode === "t10") {
      setOvers(10);
    } else if (newMode === "quick") {
      setMaxPlayers(2);
      if (overs === 10 && mode === "t10") setOvers(5);
    } else if (newMode === "series" && maxPlayers < 4) {
      setMaxPlayers(4);
    } else if (newMode === "team" && maxPlayers === 2) {
      setMaxPlayers(4);
    }
  };

  // Generate 15 randomized floating dust particles
  const dustParticles = Array.from({ length: 15 });

  return (
    <>
      {showCrazyBuilder && (
        <CrazyRuleBuilder
          initialRules={crazyRules}
          onSave={(newRules) => setCrazyRules(newRules)}
          onClose={() => setShowCrazyBuilder(false)}
        />
      )}
      <main className="relative min-h-screen overflow-hidden px-4 py-8 flex flex-col justify-between bg-slate-950">
        {/* Permanent Stadium Artwork Background for Home Page ONLY */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
          <img
            src="/stadium_background.jpg"
            alt="Stadium Arena"
            className="w-full h-full object-cover object-center transform-gpu scale-105 transition-transform duration-300 ease-out"
            style={{
              transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0) scale(1.05)`
            }}
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]" />
          {/* Vignette overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(6,9,19,0.85)_100%)]" />
        </div>

        {/* Animated Dust Container */}
        <div className="dust-container">
          {dustParticles.map((_, i) => {
            const size = Math.random() * 4 + 2;
            const delay = Math.random() * 8;
            const left = Math.random() * 100;
            const duration = Math.random() * 7 + 7;
            return (
              <div
                key={i}
                className="dust-particle"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${left}%`,
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`
                }}
              />
            );
          })}
        </div>

        {/* Header controls */}
        <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-950/60 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
            {connectionStatus === "connected" && (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">🟢 Connected</span>
              </>
            )}
            {connectionStatus === "connecting" && (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">🟡 Connecting</span>
              </>
            )}
            {connectionStatus === "disconnected" && (
              <>
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-xs font-black uppercase tracking-wider text-red-500">🔴 Disconnected</span>
              </>
            )}
          </div>

          <button
            onClick={onMute}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-white transition-colors duration-150"
            title={muted ? "Unmute Sound" : "Mute Sound"}
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </header>

        {/* Main Content */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center gap-6 max-w-4xl mx-auto text-center w-full">
          {/* Title/Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="flex flex-col items-center"
          >
            <div className="text-emerald-400 font-extrabold text-sm tracking-[0.3em] uppercase mb-4 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
              🏏 Online PvP Arena V2
            </div>

            <h1 className="text-6xl sm:text-8xl font-black tracking-tighter text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.6)] flex items-center gap-3">
              Hand<span className="text-emerald-400">Arena</span>
            </h1>

            <p className="mt-3 text-slate-300 text-lg sm:text-xl font-bold tracking-wide">
              Real-Time Multiplayer Hand Cricket
            </p>
          </motion.div>

          {/* Lobby Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-md flex flex-col gap-3"
          >
            {/* Nickname */}
            <div className="relative glass p-5 rounded-2xl border-emerald-500/20">
              <label className="block text-left text-xs font-black uppercase tracking-wider text-emerald-400 mb-2">
                Lobby Nickname
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ENTER NICKNAME"
                maxLength={15}
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3.5 text-center font-black tracking-wide text-white outline-none focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all"
              />
            </div>

            {!showJoinForm && (
              <div className="relative glass p-5 rounded-2xl border-emerald-500/20 text-left">
                <label className="block text-xs font-black uppercase tracking-wider text-emerald-400 mb-3">
                  Select Game Mode
                </label>
                <div className="grid grid-cols-5 gap-1.5 mb-4">
                  {[
                    { id: "quick", label: "Quick", icon: "🏏", desc: "1v1 Classic" },
                    { id: "team", label: "Team", icon: "👥", desc: "Team Battle" },
                    { id: "series", label: "Series", icon: "🏆", desc: "League Cup" },
                    { id: "crazy", label: "Crazy", icon: "🔥", desc: "Crazy Rules" },
                    { id: "t10", label: "T10", icon: "⚡", desc: "Restricted" }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleModeChange(item.id as any)}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                        mode === item.id
                          ? "bg-emerald-500/25 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.15)] scale-105"
                          : "bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200"
                      }`}
                    >
                      <span className="text-base mb-0.5">{item.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* Crazy Mode Builder Button */}
                {mode === "crazy" && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Flame size={14} /> Crazy Rules Configured
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                        {crazyRules.numberRestriction !== "all" ? `${crazyRules.numberRestriction.toUpperCase()} Numbers` : "All Numbers"} • {crazyRules.turboTimer ? `${crazyRules.turboTimer}s Timer` : "No Timer"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCrazyBuilder(true)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-black uppercase transition-all flex items-center gap-1"
                    >
                      <Settings size={12} /> Configure
                    </button>
                  </div>
                )}

                {/* Sub-Mode Selection for Crazy or T10 */}
                {(mode === "crazy" || mode === "t10") && (
                  <div className="mb-4">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      Execution Format
                    </label>
                    <div className="flex gap-2">
                      {[
                        { id: "quick", label: "1v1 Match" },
                        { id: "team", label: "Team Battle" },
                        { id: "series", label: "Series Mode" }
                      ].map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setSubMode(sub.id as any)}
                          className={`flex-1 py-2 rounded-xl border text-xs font-black transition-all ${
                            subMode === sub.id
                              ? "bg-emerald-500/25 border-emerald-400 text-white"
                              : "bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10"
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Max Players */}
                <label className="block text-xs font-black uppercase tracking-wider text-emerald-400 mb-3">
                  Max Players Capacity
                </label>
                {mode === "quick" ? (
                  <div className="bg-slate-950/60 border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-400 font-bold text-center">
                    Locked at 2 Players (1v1 Match)
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {(mode === "series" ? [4, 6, 8, 10] : [2, 4, 6, 8, 10]).map((num) => (
                      <button
                        key={num}
                        onClick={() => setMaxPlayers(num)}
                        className={`flex-1 py-2 rounded-xl border font-black text-xs transition-all ${
                          maxPlayers === num
                            ? "bg-emerald-500/25 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                            : "bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                )}

                {/* Overs */}
                <label className="block text-xs font-black uppercase tracking-wider text-emerald-400 mt-4 mb-2 flex justify-between items-center">
                  <span>Match Overs Selection</span>
                  <span className="text-[10px] font-bold text-slate-400 lowercase italic">
                    {mode === "t10" ? "(Fixed at 10 Overs for T10)" : "(1 - 50 overs)"}
                  </span>
                </label>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    disabled={mode === "t10"}
                    value={overs === 0 ? "" : overs}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setOvers(0);
                        return;
                      }
                      const parsed = parseInt(val, 10);
                      if (isNaN(parsed)) return;
                      setOvers(parsed);
                    }}
                    className={`w-28 rounded-xl border px-4 py-2.5 text-center font-black text-white bg-slate-950/80 outline-none transition-all duration-200 ${
                      mode === "t10"
                        ? "border-amber-500/40 text-amber-300 font-extrabold cursor-not-allowed"
                        : (overs < 1 || overs > 50 || !Number.isInteger(overs))
                        ? "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                        : "border-white/10 focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    }`}
                  />
                  <span className={`text-xs font-black uppercase tracking-wider ${
                    mode === "t10" ? "text-amber-400" : (overs < 1 || overs > 50 || !Number.isInteger(overs)) ? "text-red-400" : "text-emerald-400"
                  }`}>
                    {mode === "t10" ? "⚡ Fixed 10 Overs" : overs === 1 ? "1 Over" : (overs >= 1 && overs <= 50 && Number.isInteger(overs)) ? `${overs} Overs` : "Invalid Overs"}
                  </span>
                </div>

                {mode !== "series" && (
                  <>
                    <label className="block text-xs font-black uppercase tracking-wider text-emerald-400 mb-3">
                      Match Innings Type
                    </label>
                    <div className="flex gap-2 mb-4">
                      {[
                        { id: "single", label: "Single Innings" },
                        { id: "double", label: "Double Innings" }
                      ].map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setMatchType(type.id as any)}
                          className={`flex-1 py-2.5 rounded-xl border font-black text-xs transition-all ${
                            matchType === type.id
                              ? "bg-emerald-500/25 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                              : "bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200"
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <label className="block text-xs font-black uppercase tracking-wider text-emerald-400 mt-4 mb-3">
                  Select Venue / Stadium
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {STADIUMS.map((s) => {
                    const isSelected = stadium === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStadium(s.id)}
                        className={`relative flex flex-col rounded-xl overflow-hidden border text-left transition-all duration-300 ${
                          isSelected
                            ? "border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.45)] scale-[1.03]"
                            : "border-white/10 bg-slate-950/60 hover:border-white/20 hover:scale-[1.01]"
                        }`}
                      >
                        {/* Stadium Image */}
                        <div className="relative w-full h-24 sm:h-28 overflow-hidden bg-slate-950">
                          <img
                            src={s.image}
                            alt={s.name}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                          />
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center shadow-lg z-10">
                              <Check size={12} className="text-slate-950 stroke-[4]" />
                            </div>
                          )}
                        </div>

                        {/* Stadium Info */}
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-black text-xs sm:text-sm text-white flex items-center gap-1.5 leading-snug">
                              {s.id === "hpca" ? "🏔" : "🏛"} {s.name}
                            </h4>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                              {s.location}
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-300 font-medium italic mt-2 border-l border-emerald-500/30 pl-2 leading-relaxed">
                            "{s.description}"
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* Action Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-md flex flex-col gap-4"
          >
            {!showJoinForm ? (
              <motion.div
                key="menu-buttons"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-4"
              >
                {/* Play Button */}
                <Button
                  onClick={() =>
                    onCreate(
                      name.trim() || defaultName,
                      mode,
                      maxPlayers,
                      stadium,
                      mode === "t10" ? 10 : overs,
                      matchType,
                      mode === "crazy" ? crazyRules : undefined,
                      (mode === "crazy" || mode === "t10") ? subMode : undefined
                    )
                  }
                  variant="primary"
                  disabled={overs < 1 || overs > 50 || !Number.isInteger(overs)}
                  className="w-full text-lg min-h-14 font-black shadow-[0_4px_20px_rgba(16,185,129,0.3)]"
                >
                  <Plus size={22} className="stroke-[3]" /> CREATE MATCH
                </Button>

                {/* Join Button */}
                <Button
                  onClick={() => setShowJoinForm(true)}
                  variant="secondary"
                  className="w-full text-lg min-h-14 font-black shadow-[0_4px_20px_rgba(6,182,212,0.2)]"
                >
                  <LogIn size={22} className="stroke-[3]" /> JOIN ARENA
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="join-form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-4"
              >
                <Card variant="cyan" className="p-5 flex flex-col gap-4 w-full">
                  <h3 className="text-cyan-400 font-extrabold text-lg uppercase tracking-wider text-left">
                    Enter Arena Code
                  </h3>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                      placeholder="6-LETTER CODE"
                      className="flex-1 rounded-xl border border-white/15 bg-slate-950/80 px-4 py-3 text-center font-black uppercase tracking-[0.2em] text-white outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all"
                    />
                    <Button
                      variant="secondary"
                      disabled={code.length !== 6}
                      onClick={() => onJoin(code, name.trim() || defaultName)}
                      className="px-6"
                    >
                      JOIN
                    </Button>
                  </div>

                  <button
                    onClick={() => setShowJoinForm(false)}
                    className="text-slate-400 hover:text-white text-xs font-black uppercase tracking-wider transition-colors pt-2"
                  >
                    ← Back to Menu
                  </button>
                </Card>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200"
              >
                <ShieldAlert size={18} className="text-red-400 flex-shrink-0" />
                <span className="text-left leading-relaxed">{error}</span>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 w-full max-w-6xl mx-auto text-center pt-8">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            HandArena V2.0 • Powered by Socket.IO & Framer Motion
          </p>
        </footer>
      </main>
    </>
  );
}
