import type { RoomView, PlayerTeam } from "@hand-cricket/shared";
import { getBluffActivePhase } from "@hand-cricket/shared";
import { Flame, Sparkles, ShieldCheck } from "lucide-react";

const nameFor = (room: RoomView, id?: string) =>
  room.players.find((player) => player.id === id)?.name ?? "—";

export function Scoreboard({ room }: { room: RoomView }) {
  const match = room.match;
  if (!match) return null;

  const isCrazy = room.mode === "crazy";
  const isBluff = room.mode === "bluff" || match.isBluff;
  const crazyState = match.crazyState;
  const crazyRules = room.crazyRules;
  const bluffConfig = room.bluffConfig || match.bluffConfig;

  const currentOverOneBased = Math.floor(match.current.balls / 6) + 1;
  const activeBluffPhase = isBluff && bluffConfig?.phases
    ? getBluffActivePhase(bluffConfig.phases, currentOverOneBased)
    : null;

  const getTeamName = (teamLetter: PlayerTeam) => {
    if (teamLetter === "spectator") return "Spectators";
    if (room.mode === "series") {
      const isBattingA = match.battingTeam === "A";
      const idA = isBattingA ? match.battingTeamId : match.bowlingTeamId;
      const idB = isBattingA ? match.bowlingTeamId : match.battingTeamId;
      const targetId = teamLetter === "A" ? idA : idB;
      const found = room.teams.find((t) => t.id === targetId);
      if (found) return `${found.brand.logo} ${found.name}`;
    }
    const found = room.teams.find((t) => t.id === `team-${teamLetter}`);
    if (found) return `${found.brand.logo} ${found.name}`;
    return teamLetter === "A" ? "🔵 TEAM SHARKS" : "🔴 TEAM TIGERS";
  };

  const batTeamName = getTeamName(match.battingTeam);
  const bowlTeamName = getTeamName(match.bowlingTeam);

  return (
    <div className="hidden md:flex flex-col gap-4 w-full">
      {/* LED Stadium Board */}
      <div className="bg-slate-950 border border-white/10 rounded-2xl p-5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8),_0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-white/5 text-center">
          {/* Runs & Wickets */}
          <div className="flex flex-col justify-center py-2 md:py-0">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
              {batTeamName}
            </span>
            <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight mt-1 flex items-center justify-center gap-1.5">
              <span>{match.current.runs}</span>
              <span className="text-slate-600">/</span>
              <span className="text-red-400">{match.current.wickets}</span>
            </div>
          </div>

          {/* Balls */}
          <div className="flex flex-col justify-center py-2 md:py-0">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">OVERS (BALLS)</span>
            <div className="text-3xl font-black text-cyan-400 font-mono tracking-tight mt-1">
              {Math.floor(match.current.balls / 6)}.{match.current.balls % 6}{" "}
              <span className="text-xs text-slate-500 font-bold">({match.current.balls}b / {match.overs * 6}b)</span>
            </div>
          </div>

          {/* Innings */}
          <div className="flex flex-col justify-center py-2 md:py-0">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">INNINGS</span>
            <div className="text-2xl font-black text-amber-400 uppercase mt-1">
              {match.innings === 1 ? "1st" : match.innings === 2 ? "2nd" : match.innings === 3 ? "3rd" : "4th"} INNS
            </div>
          </div>

          {/* Target */}
          <div className="flex flex-col justify-center py-2 md:py-0">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">TARGET</span>
            <div className="text-3xl font-black text-yellow-400 font-mono tracking-tight mt-1">
              {match.target ?? "—"}
            </div>
          </div>
        </div>

        {/* 2nd/4th innings chasing info */}
        {match.target && (
          <div className="mt-4 pt-3 border-t border-white/5 text-center">
            <p className="text-sm font-bold text-yellow-400/80 animate-pulse">
              NEED {match.target - match.current.runs} RUNS IN {(match.overs * 6) - match.current.balls} BALLS TO WIN
            </p>
          </div>
        )}

        {/* Mode Indicators & Active Rule Badges */}
        {(isBluff || isCrazy) && (
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-2 text-xs">
            {isBluff && activeBluffPhase && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black uppercase flex items-center gap-1 shadow-md">
                <Sparkles size={12} /> {activeBluffPhase.name} (Overs {activeBluffPhase.startOver}-{activeBluffPhase.endOver}) • Allowed: [{activeBluffPhase.allowedNumbers.join(", ")}]
              </span>
            )}
            {isCrazy && (
              <>
                <span className="px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 font-extrabold flex items-center gap-1">
                  <Flame size={12} /> Crazy Mode Active
                </span>
                {crazyState?.activeLuckyNumber !== undefined && crazyState.activeLuckyNumber !== null && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
                    🍀 Lucky #{crazyState.activeLuckyNumber} (2x)
                  </span>
                )}
                {crazyState?.frozenNumber !== undefined && crazyState.frozenNumber !== null && (
                  <span className="px-2.5 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold">
                    ❄️ Frozen #{crazyState.frozenNumber}
                  </span>
                )}
                {crazyState?.hotNumber !== undefined && crazyState.hotNumber !== null && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                    🌶️ Hot #{crazyState.hotNumber} (+1)
                  </span>
                )}
                {crazyState?.isGoldenOver && (
                  <span className="px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-black animate-pulse">
                    ⭐ Golden Over (2x)
                  </span>
                )}
                {crazyState?.isPressureOver && (
                  <span className="px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 font-black animate-pulse">
                    🔥 Pressure Over (2x)
                  </span>
                )}
                {crazyRules?.suddenDeath && (
                  <span className="px-2.5 py-1 rounded-full bg-red-950 border border-red-600 text-red-400 font-bold">
                    ☠️ Sudden Death
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Role HUD */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Batter Info */}
        <div className="flex flex-col items-center justify-center bg-slate-900/60 border border-white/5 p-3 rounded-xl text-center min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400/90 mb-1 flex items-center gap-1 max-w-full truncate">
            🏏 BATTER ({batTeamName})
          </span>
          <span className="text-sm font-black text-white tracking-wide truncate w-full">
            {nameFor(room, match.battingPlayerId)}
          </span>
        </div>

        {/* Bowler Info */}
        <div className="flex flex-col items-center justify-center bg-slate-900/60 border border-white/5 p-3 rounded-xl text-center min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-400/90 mb-1 flex items-center gap-1 max-w-full truncate">
            🛡️ BOWLER ({bowlTeamName})
          </span>
          <span className="text-sm font-black text-white tracking-wide truncate w-full">
            {nameFor(room, match.bowlingPlayerId)}
          </span>
        </div>

        {/* Completed Innings Scores or First Innings Score */}
        {match.completedInnings && match.completedInnings.length > 0 ? (
          <div className="col-span-2 md:col-span-1 flex flex-col items-center justify-center bg-slate-900/60 border border-white/5 p-3 rounded-xl text-center min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/90 mb-1 max-w-full truncate">
              COMPLETED INNINGS
            </span>
            <div className="flex flex-col gap-1 w-full text-2xs font-extrabold uppercase text-slate-300">
              {match.completedInnings.map((inn, idx) => (
                <div key={idx} className="flex justify-between px-2">
                  <span>INNS {idx + 1} ({inn.teamKey}):</span>
                  <span>{inn.runs}/{inn.wickets} <span className="text-[10px] text-slate-500 font-normal">({inn.balls}b)</span></span>
                </div>
              ))}
            </div>
          </div>
        ) : match.firstInnings ? (
          <div className="col-span-2 md:col-span-1 flex flex-col items-center justify-center bg-slate-900/60 border border-white/5 p-3 rounded-xl text-center min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/90 mb-1 max-w-full truncate">
              1ST INNS SCORE
            </span>
            <span className="text-sm font-black text-white tracking-wide truncate w-full">
              {match.firstInnings.runs}/{match.firstInnings.wickets} <span className="text-xs text-slate-400 font-bold">({match.firstInnings.balls}b)</span>
            </span>
          </div>
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center bg-slate-900/30 border border-dashed border-white/5 p-3 rounded-xl text-center min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 max-w-full truncate">
              MATCH STATE
            </span>
            <span className="text-xs font-bold text-slate-400 truncate w-full">
              1ST INNINGS
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
