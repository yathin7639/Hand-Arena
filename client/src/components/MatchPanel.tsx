import type { HandNumber, RoomView } from "@hand-cricket/shared";
import { motion } from "framer-motion";
import { Check, Loader2, Trophy, Shield, RefreshCw, Zap, Swords, User, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "./Button";
import { Card } from "./Card";
import { NumberPad } from "./NumberPad";
import { Scoreboard } from "./Scoreboard";
import { useAudio } from "../hooks/useAudio";
import { MatchScorecard } from "./MatchScorecard";

const nameFor = (room: RoomView, id?: string) => {
  if (!id) return "—";
  const isJoker = id === room.jokerPlayerId;
  const suffix = isJoker ? " ⭐" : "";

  const subState = room.substituteStates?.[id];
  if (subState) {
    if (subState.type === "captain") {
      return "Captain (Substitute)" + suffix;
    } else if (subState.type === "teammate") {
      const subPlayer = room.players.find(p => p.id === subState.playerId);
      return (subPlayer ? `${subPlayer.name} (Substitute)` : "Substitute") + suffix;
    }
  }
  const player = room.players.find((player) => player.id === id);
  if (player && !player.connected) {
    const teammates = room.players.filter(p => p.team === player.team && p.id !== player.id && p.connected);
    if (teammates.length > 0) {
      return "Captain (Substitute)" + suffix;
    }
  }
  return (player?.name ?? "—") + suffix;
};

export function MatchPanel({
  playerId,
  room,
  onPlay,
  onRematch,
  onSelectBatsman,
  onSelectBowler,
  onContinueToStandings,
  onSelectSubstitutionOption,
  onLeaveSpectating
}: {
  playerId: string;
  room: RoomView;
  onPlay: (number: HandNumber) => void;
  onRematch: () => void;
  onSelectBatsman: (selectedPlayerId: string) => void;
  onSelectBowler: (selectedPlayerId: string) => void;
  onContinueToStandings?: () => void;
  onSelectSubstitutionOption?: (targetPlayerId: string, option: "wait" | "captain" | "teammate", subPlayerId?: string) => void;
  onLeaveSpectating?: () => void;
}) {
  const { play } = useAudio();
  const match = room.match;
  if (!match) return null;

  const submitted = match.pendingPlayers.includes(playerId);
  const isActive = [match.battingPlayerId, match.bowlingPlayerId].includes(playerId);
  const summary = match.summary;

  const isBatter = match.battingPlayerId === playerId;
  const isBowler = match.bowlingPlayerId === playerId;

  const batterLocked = match.pendingPlayers.includes(match.battingPlayerId ?? "");
  const bowlerLocked = match.pendingPlayers.includes(match.bowlingPlayerId ?? "");

  // Determine captains for selectors
  const battingCaptainId = match.battingTeam === "A" ? room.captainAId : room.captainBId;
  const bowlingCaptainId = match.bowlingTeam === "A" ? room.captainAId : room.captainBId;

  const isBattingCaptain = playerId === battingCaptainId;
  const isBowlingCaptain = playerId === bowlingCaptainId;

  const connectedTeamPlayers = room.players.filter(
    (p) => (p.team === "A" || p.team === "B") && p.connected
  );

  const handleRematch = () => {
    play("coin");
    onRematch();
  };

  if (room.phase === ("match-over" as any)) {
    return (
      <MatchScorecard
        playerId={playerId}
        room={room}
        onRematch={handleRematch}
        onContinueToStandings={onContinueToStandings}
      />
    );
  }

  const getTeamName = (teamLetter: "A" | "B" | "spectator") => {
    if (teamLetter === "spectator") return "Spectators";
    if (room.mode === "series") {
      const isBattingA = match.battingTeam === "A";
      const idA = isBattingA ? match.battingTeamId : match.bowlingTeamId;
      const idB = isBattingA ? match.bowlingTeamId : match.battingTeamId;
      const targetId = teamLetter === "A" ? idA : idB;
      const found = room.teams.find(t => t.id === targetId);
      if (found) return `${found.brand.logo} ${found.name}`;
    }
    const found = room.teams.find((t) => t.id === `team-${teamLetter}`);
    if (found) return `${found.brand.logo} ${found.name}`;
    return teamLetter === "A" ? "🔵 TEAM SHARKS" : "🔴 TEAM TIGERS";
  };

  const getTeamPlayers = (teamLetter: "A" | "B") => {
    let players: any[] = [];
    if (room.mode === "series") {
      const isBattingA = match.battingTeam === "A";
      const idA = isBattingA ? match.battingTeamId : match.bowlingTeamId;
      const idB = isBattingA ? match.bowlingTeamId : match.battingTeamId;
      const targetTeamId = teamLetter === "A" ? idA : idB;
      const teamObj = room.teams.find(t => t.id === targetTeamId);
      if (teamObj) {
        players = room.players.filter(p => teamObj.playerIds.includes(p.id) && p.connected);
      }
    } else {
      const targetTeamId = `team-${teamLetter}`;
      const teamObj = room.teams.find(t => t.id === targetTeamId);
      if (teamObj) {
        players = room.players.filter(p => teamObj.playerIds.includes(p.id) && p.connected);
      } else {
        players = room.players.filter((p) => p.team === teamLetter && p.connected);
      }
    }

    if (room.jokerPlayerId && match.battingTeam === teamLetter) {
      const joker = room.players.find(p => p.id === room.jokerPlayerId);
      if (joker && joker.connected && !players.some(p => p.id === joker.id)) {
        players.push({
          ...joker,
          team: teamLetter
        });
      }
    }
    return players;
  };

  const getTeamPlayersInOrder = (teamLetter: "A" | "B") => {
    const players = getTeamPlayers(teamLetter);
    const playerIds = players.map(p => p.id);
    const isCurrentlyBatting = match.battingTeam === teamLetter;
    const hasAlreadyBatted = match.innings === 2 && match.bowlingTeam === teamLetter;
    
    if (isCurrentlyBatting) {
      const dismissed = match.dismissedPlayerIds.filter(id => playerIds.includes(id));
      const active = match.battingPlayerId && playerIds.includes(match.battingPlayerId) ? [match.battingPlayerId] : [];
      const yetToBat = match.yetToBatPlayerIds.filter(id => playerIds.includes(id));
      
      const orderedIds = [...dismissed, ...active, ...yetToBat];
      const missing = playerIds.filter(id => !orderedIds.includes(id));
      return [...orderedIds, ...missing].map(id => players.find(p => p.id === id)!).filter(Boolean);
    } else if (hasAlreadyBatted) {
      const dismissed = match.dismissedPlayerIds.filter(id => playerIds.includes(id));
      const remaining = playerIds.filter(id => !dismissed.includes(id));
      return [...dismissed, ...remaining].map(id => players.find(p => p.id === id)!).filter(Boolean);
    } else {
      const captainId = teamLetter === "A" ? room.captainAId : room.captainBId;
      return [...players].sort((a, b) => {
        if (a.id === captainId) return -1;
        if (b.id === captainId) return 1;
        return a.name.localeCompare(b.name);
      });
    }
  };

  const getPlayerStats = (playerId: string) => {
    let runs = 0;
    let balls = 0;
    if (match.timeline) {
      for (const event of match.timeline) {
        if (event.batterId === playerId) {
          balls += 1;
          if (!event.wicket) {
            runs += event.runsAdded;
          }
        }
      }
    }
    return { runs, balls };
  };

  const getPlayerStatus = (playerId: string): { label: string; icon: string; colorClass: string } => {
    if (match.battingPlayerId === playerId) {
      return { label: "Batting", icon: "🟢", colorClass: "text-emerald-400 font-bold bg-emerald-500/10 border-emerald-500/20" };
    }
    if (match.bowlingPlayerId === playerId) {
      return { label: "Bowling", icon: "🔴", colorClass: "text-red-400 font-bold bg-red-500/10 border-red-500/20" };
    }
    if (match.dismissedPlayerIds.includes(playerId)) {
      return { label: "Out", icon: "❌", colorClass: "text-slate-550 line-through bg-slate-900 border-white/5" };
    }
    return { label: "Waiting", icon: "⚪", colorClass: "text-slate-400 bg-slate-950/40 border-white/5" };
  };

  const getTeamMatchScore = (teamLetter: "A" | "B") => {
    const isBatting = match.battingTeam === teamLetter;
    
    let runs = 0;
    let wickets = 0;
    let balls = 0;
    
    if (match.completedInnings) {
      for (const inn of match.completedInnings) {
        if (inn.teamKey === teamLetter) {
          runs += inn.runs;
          wickets += inn.wickets;
          balls += inn.balls;
        }
      }
    }
    
    if (isBatting) {
      runs += match.current.runs;
      wickets += match.current.wickets;
      balls += match.current.balls;
    }
    
    return {
      runs,
      wickets,
      overs: `${Math.floor(balls / 6)}.${balls % 6} Overs`
    };
  };

  const renderTeamDashboard = (teamLetter: "A" | "B") => {
    const teamName = getTeamName(teamLetter);
    const score = getTeamMatchScore(teamLetter);
    const players = getTeamPlayersInOrder(teamLetter);
    
    const isBattingA = match.battingTeam === "A";
    const idA = isBattingA ? match.battingTeamId : match.bowlingTeamId;
    const idB = isBattingA ? match.bowlingTeamId : match.battingTeamId;
    const targetTeamId = teamLetter === "A" ? idA : idB;
    const teamObj = room.teams.find(t => t.id === targetTeamId);
    
    const primaryColor = teamObj?.brand.primaryColor ?? (teamLetter === "A" ? "#3b82f6" : "#ef4444");
    
    return (
      <Card
        variant={teamLetter === "A" ? "cyan" : "red"}
        className="p-4 flex flex-col gap-4 border-2 relative overflow-hidden backdrop-blur-md bg-slate-950/70"
        style={{ borderColor: `${primaryColor}30` }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: primaryColor }}
        />
        
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-black text-white truncate flex items-center gap-2">
            <span>{teamObj?.brand.logo ?? (teamLetter === "A" ? "🔵" : "🔴")}</span>
            <span className="truncate">{teamObj?.name ?? teamName}</span>
          </h3>
          <div className="flex justify-between items-baseline mt-1">
            <span className="text-2xl font-black text-yellow-400 font-mono tracking-tight">
              {score.runs}/{score.wickets}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase font-mono">
              {score.overs}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {players.map((player) => {
            const stats = getPlayerStats(player.id);
            const status = getPlayerStatus(player.id);
            const isHighlight = match.battingPlayerId === player.id || match.bowlingPlayerId === player.id;
            
            return (
              <motion.div
                key={player.id}
                layoutId={`player-card-${player.id}`}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 ${
                  isHighlight 
                    ? "bg-slate-900 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
                    : "bg-slate-950/60 border-white/5"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center font-bold text-xs text-slate-300 shrink-0">
                    {player.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate tracking-wide">
                      {player.name}
                    </span>
                    <span className={`text-[10px] uppercase font-black tracking-wider flex items-center gap-1 ${
                      status.label === "Batting" ? "text-emerald-400" :
                      status.label === "Bowling" ? "text-red-400" :
                      status.label === "Out" ? "text-slate-500 line-through" : "text-slate-400"
                    }`}>
                      {status.icon} {status.label}
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono shrink-0 leading-tight">
                  <div className="text-sm font-black text-white">
                    {stats.runs} <span className="text-[10px] text-slate-500 font-bold">r</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-450">
                    {stats.balls} <span className="text-[9px] text-slate-550">b</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>
    );
  };

  const renderTeamDashboardHeaderMobile = (teamLetter: "A" | "B") => {
    const score = getTeamMatchScore(teamLetter);
    const teamName = getTeamName(teamLetter);
    const isCurrentlyBatting = match.battingTeam === teamLetter;

    const isBattingA = match.battingTeam === "A";
    const idA = isBattingA ? match.battingTeamId : match.bowlingTeamId;
    const idB = isBattingA ? match.bowlingTeamId : match.battingTeamId;
    const targetTeamId = teamLetter === "A" ? idA : idB;
    const teamObj = room.teams.find(t => t.id === targetTeamId);
    const primaryColor = teamObj?.brand.primaryColor ?? (teamLetter === "A" ? "#3b82f6" : "#ef4444");

    return (
      <div 
        className={`p-3 rounded-2xl bg-slate-950/80 border flex flex-col gap-0.5 transition-all duration-300 ${
          isCurrentlyBatting ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "border-white/5"
        }`} 
        style={isCurrentlyBatting ? {} : { borderColor: `${primaryColor}20` }}
      >
        <span className="text-xs font-black text-white truncate flex items-center gap-1.5">
          <span>{teamObj?.brand.logo ?? (teamLetter === "A" ? "🔵" : "🔴")}</span>
          <span className="truncate">{teamObj?.name ?? teamName}</span>
          {isCurrentlyBatting && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block ml-auto shrink-0" />
          )}
        </span>
        <div className="flex justify-between items-baseline mt-1">
          <span className="text-xl font-black text-yellow-400 font-mono">
            {score.runs}/{score.wickets}
          </span>
          <span className="text-[10px] font-bold text-slate-400 font-mono">
            {score.overs}
          </span>
        </div>
      </div>
    );
  };

  const renderTeamPlayerListMobile = (teamLetter: "A" | "B") => {
    const players = getTeamPlayersInOrder(teamLetter);
    const isBattingA = match.battingTeam === "A";
    const idA = isBattingA ? match.battingTeamId : match.bowlingTeamId;
    const idB = isBattingA ? match.bowlingTeamId : match.battingTeamId;
    const targetTeamId = teamLetter === "A" ? idA : idB;
    const teamObj = room.teams.find(t => t.id === targetTeamId);
    const primaryColor = teamObj?.brand.primaryColor ?? (teamLetter === "A" ? "#3b82f6" : "#ef4444");

    return (
      <div 
        className="p-2.5 rounded-2xl bg-slate-950/70 border border-white/5 flex flex-col gap-1.5" 
        style={{ borderColor: `${primaryColor}15` }}
      >
        {players.map((player) => {
          const stats = getPlayerStats(player.id);
          const status = getPlayerStatus(player.id);
          const isHighlight = match.battingPlayerId === player.id || match.bowlingPlayerId === player.id;
          
          return (
            <motion.div
              key={player.id}
              layoutId={`player-card-mobile-${player.id}`}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-300 ${
                isHighlight 
                  ? "bg-slate-900 border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.03)]" 
                  : "bg-slate-950/80 border-white/5"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-[9px] text-slate-300 shrink-0">
                  {player.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold text-white truncate leading-tight">
                    {player.name}
                  </span>
                  <span className={`text-[9px] flex items-center gap-0.5 leading-none mt-0.5 ${
                    status.label === "Batting" ? "text-emerald-450" :
                    status.label === "Bowling" ? "text-red-450" :
                    status.label === "Out" ? "text-slate-550 line-through font-bold" : "text-slate-400"
                  }`}>
                    {status.icon} {status.label === "Batting" ? "Bat" : status.label === "Bowling" ? "Bowl" : status.label}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0 font-mono leading-none">
                <div className="text-[11px] font-black text-white">
                  {stats.runs} <span className="text-[8px] text-slate-550 font-bold">r</span>
                </div>
                <div className="text-[9px] text-slate-500 font-bold mt-0.5">
                  {stats.balls} <span className="text-[8px] text-slate-600">b</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Team Dashboard (Team A) - Desktop Only */}
        <div className="hidden lg:block lg:col-span-1">
          {renderTeamDashboard("A")}
        </div>

        {/* Center: Gameplay view (Desktop, Tablet, Mobile) */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6 w-full">
          {/* Spectator Mode Indicator / Return to Standings */}
          {room.mode === "series" && onLeaveSpectating && !isActive && (
            <Card className="p-4 bg-slate-950/40 border-white/5 flex justify-between items-center">
              <span className="text-2xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                Spectating Live Match
              </span>
              <Button
                variant="secondary"
                onClick={onLeaveSpectating}
                className="px-3 py-1.5 text-2xs font-bold uppercase tracking-wider rounded-lg"
              >
                Return to Standings ➔
              </Button>
            </Card>
          )}

          {/* Scoreboard (Top HUD) */}
          {room.phase !== "match-over" && <Scoreboard room={room} />}

          {/* Substitution Control Box */}
          {(() => {
            const myPlayer = room.players.find(p => p.id === playerId);
            const myTeamLetter = myPlayer?.team;
            const isCap = myPlayer?.isCaptain;
            if (!isCap || myTeamLetter === "spectator") return null;
            const disconnectedTeammates = room.players.filter(
              p => p.team === myTeamLetter && !p.connected && p.id !== room.jokerPlayerId
            );
            if (disconnectedTeammates.length === 0) return null;

            return (
              <Card variant="gold" className="p-4 border-amber-500/30 bg-slate-950/60 text-left">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  ⚠️ Substitution Control
                </h4>
                <p className="text-2xs text-slate-400 uppercase font-bold mb-3">
                  A teammate disconnected. Choose who should play their turn:
                </p>
                <div className="space-y-3">
                  {disconnectedTeammates.map((teammate) => {
                    const currentState = room.substituteStates?.[teammate.id]?.type || "captain";
                    const currentTeammateSubId = room.substituteStates?.[teammate.id]?.type === "teammate" 
                      ? (room.substituteStates[teammate.id] as any).playerId 
                      : "";
                      
                    const otherConnectedTeammates = room.players.filter(
                      p => p.team === myTeamLetter && p.id !== playerId && p.id !== teammate.id && p.connected
                    );

                    return (
                      <div key={teammate.id} className="p-3 rounded-xl bg-slate-950/80 border border-white/5 flex flex-col gap-2.5">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-xs text-white">{teammate.name} (Offline)</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => onSelectSubstitutionOption?.(teammate.id, "captain")}
                            className={`px-3 py-1.5 text-2xs font-black rounded-lg border transition-all ${
                              currentState === "captain"
                                ? "bg-amber-500 border-amber-400 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                                : "bg-slate-900 border-white/5 text-slate-400 hover:text-white"
                            }`}
                          >
                            👑 CAPTAIN AS SUB
                          </button>

                          {otherConnectedTeammates.map((other) => (
                            <button
                              key={other.id}
                              onClick={() => onSelectSubstitutionOption?.(teammate.id, "teammate", other.id)}
                              className={`px-3 py-1.5 text-2xs font-black rounded-lg border transition-all ${
                                currentState === "teammate" && currentTeammateSubId === other.id
                                  ? "bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                  : "bg-slate-900 border-white/5 text-slate-400 hover:text-white"
                              }`}
                            >
                              <User size={10} className="inline mr-1" /> {other.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })()}

          {/* Mobile Target Alert Banner */}
          {room.phase === "match" && match.target && (
            <div className="block md:hidden bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-black text-center py-2.5 rounded-xl uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5">
              <Trophy size={14} className="fill-current text-yellow-500" /> NEED {match.target - match.current.runs} RUNS IN {(match.overs * 6) - match.current.balls} BALLS TO WIN
            </div>
          )}

          {/* Mobile Team Header (Mobile Only) */}
          {room.phase !== "match-over" && (
            <div className="block md:hidden">
              <div className="grid grid-cols-2 gap-3">
                {renderTeamDashboardHeaderMobile("A")}
                {renderTeamDashboardHeaderMobile("B")}
              </div>
            </div>
          )}

          {/* Selection Screens */}
          {room.phase === "select-batsman" && (
            <Card variant="cyan" className="p-5 md:p-6 text-center max-w-lg mx-auto w-full flex flex-col gap-4 md:gap-5">
              <div>
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full flex items-center justify-center gap-1.5 w-max mx-auto">
                  <Swords size={12} className="text-cyan-400" /> BATSMAN SELECTION
                </span>
                <h3 className="text-lg md:text-xl font-black text-white mt-3 uppercase">
                  {isBattingCaptain ? "Select Opening / Next Batsman" : "Waiting for Batsman Selection"}
                </h3>
                <p className="text-[10px] md:text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">
                  {isBattingCaptain
                    ? "Choose who will face the bowler next"
                    : `Captain ${nameFor(room, battingCaptainId)} is choosing the batter`}
                </p>
              </div>

              {isBattingCaptain ? (
                <div className="grid gap-2 mt-2">
                  {match.yetToBatPlayerIds.map((pId) => (
                    <Button key={pId} onClick={() => onSelectBatsman(pId)} variant="primary" className="py-3 md:py-4 text-sm md:text-base flex items-center justify-center gap-1.5">
                      <Swords size={14} className="text-slate-950" /> {nameFor(room, pId)}
                    </Button>
                  ))}
                  {match.yetToBatPlayerIds.length === 0 && (
                    <p className="text-slate-500 text-xs md:text-sm font-bold">No batters remaining</p>
                  )}
                </div>
              ) : (
                <div className="py-4 md:py-6 flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-cyan-400 mb-2 md:mb-3" size={28} />
                  <p className="text-[10px] md:text-xs font-black text-cyan-300 uppercase tracking-widest animate-pulse">
                    Captain is selecting batter...
                  </p>
                </div>
              )}
            </Card>
          )}

          {room.phase === "select-bowler" && (
            <Card variant="red" className="p-5 md:p-6 text-center max-w-lg mx-auto w-full flex flex-col gap-4 md:gap-5">
              <div>
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full flex items-center justify-center gap-1.5 w-max mx-auto">
                  <Shield size={12} className="text-red-400" /> BOWLER SELECTION
                </span>
                <h3 className="text-lg md:text-xl font-black text-white mt-3 uppercase">
                  {isBowlingCaptain ? "Select Bowler for Next Over" : "Waiting for Bowler Selection"}
                </h3>
                <p className="text-[10px] md:text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">
                  {isBowlingCaptain
                    ? "Choose who will bowl the next over"
                    : `Captain ${nameFor(room, bowlingCaptainId)} is choosing the bowler`}
                </p>
              </div>

              {isBowlingCaptain ? (
                <div className="grid gap-2 mt-2">
                  {(() => {
                    const bowlingTeamObj = room.teams.find((t) => t.id === match.bowlingTeamId);
                    const bowlers = bowlingTeamObj
                      ? room.players.filter((p) => bowlingTeamObj.playerIds.includes(p.id) && p.connected)
                      : room.players.filter((p) => p.team === match.bowlingTeam && p.connected);
                    return bowlers.map((p) => (
                      <Button key={p.id} onClick={() => onSelectBowler(p.id)} variant="danger" className="py-3 md:py-4 text-sm md:text-base">
                        <Shield size={12} className="inline mr-1.5" /> {p.name}
                      </Button>
                    ));
                  })()}
                </div>
              ) : (
                <div className="py-4 md:py-6 flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-red-400 mb-2 md:mb-3" size={28} />
                  <p className="text-[10px] md:text-xs font-black text-red-300 uppercase tracking-widest animate-pulse">
                    Captain is selecting bowler...
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Innings Break Screen */}
          {room.phase === "innings-break" && (
            <Card variant="gold" className="p-6 md:p-8 text-center max-w-lg mx-auto w-full flex flex-col gap-4 md:gap-5">
              <div className="flex flex-col items-center gap-3 md:gap-4">
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-4 py-1 rounded-full animate-bounce flex items-center gap-1.5">
                  <Trophy size={12} className="fill-current text-yellow-400" /> INNINGS BREAK
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                  Innings 1 Complete!
                </h2>
                <div className="bg-slate-950/80 p-4 md:p-5 rounded-2xl border border-white/10 w-full mt-1 md:mt-2">
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">
                    Target Score to Chase
                  </p>
                  <h3 className="text-3xl md:text-4xl font-black text-yellow-400 mt-1">
                    {match.target} Runs
                  </h3>
                </div>
                <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-wider mt-1 md:mt-2 animate-pulse">
                  Switching roles and preparing for second innings...
                </p>
              </div>
            </Card>
          )}

          {/* Match Arena (Center Pitch) */}
          {room.phase === "match" && (
            <div className={`relative flex flex-col items-center justify-between min-h-[260px] md:min-h-[380px] p-4 md:p-6 bg-gradient-to-b from-slate-950/80 to-slate-900/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl ${match.lastReveal?.wicket ? "shake-screen" : ""}`}>
              {/* Pitch background perspective */}
              <div className="absolute inset-0 pitch-perspective pointer-events-none flex items-center justify-center p-2 opacity-80">
                <div className="w-full max-w-[200px] md:max-w-xs aspect-[1/3.5] bg-gradient-to-b from-emerald-800 to-emerald-950 border-y-4 border-x-2 border-emerald-505/40 pitch-surface relative">
                  {/* Lines */}
                  <div className="absolute top-[20%] inset-x-0 h-0.5 bg-white/20 border-dashed border-t border-white/30" />
                  <div className="absolute bottom-[20%] inset-x-0 h-0.5 bg-white/20 border-dashed border-t border-white/30" />
                  <div className="absolute top-[50%] inset-x-0 h-0.5 bg-white/10" />
                </div>
              </div>

              {/* Top Player (Bowler) info HUD */}
              <div className="relative z-10 flex justify-between items-center w-full px-3 py-1.5 md:px-4 md:py-2 bg-slate-950/70 border border-white/5 rounded-xl">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Shield size={16} className="text-red-400" />
                  <div>
                    <p className="text-[8px] md:text-[10px] font-black text-red-400 uppercase tracking-widest leading-none">Bowler</p>
                    <h4 className="text-xs md:text-sm font-black text-white mt-0.5">{nameFor(room, match.bowlingPlayerId)}</h4>
                  </div>
                </div>
                {bowlerLocked ? (
                  <span className="flex items-center gap-0.5 text-[8px] md:text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full uppercase animate-pulse">
                    <Check size={10} className="stroke-[3]" /> LOCKED
                  </span>
                ) : (
                  <span className="text-[8px] md:text-[10px] font-black text-slate-450 uppercase">CHOOSING...</span>
                )}
              </div>

              {/* Center reveal animations / Wicket Explosion */}
              <div className="relative z-10 flex flex-col items-center justify-center h-32 md:h-44 w-full">
                {match.lastReveal ? (
                  <motion.div
                    key={`${match.current.balls}-${match.lastReveal.wicket}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-2 md:gap-3"
                  >
                    {match.lastReveal.wicket ? (
                      <motion.div
                        initial={{ scale: 0.3 }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.35 }}
                        className="bg-red-500 text-slate-950 text-xl md:text-3xl font-black px-6 py-1.5 md:px-8 md:py-2.5 rounded-xl md:rounded-2xl border-2 md:border-4 border-red-300 shadow-[0_0_30px_rgba(239,68,68,0.6)] uppercase tracking-wider flex items-center gap-2"
                      >
                        <Zap size={20} className="fill-slate-950 stroke-slate-950 animate-pulse" /> OUT !
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ y: 20 }}
                        animate={{ y: 0 }}
                        className="bg-emerald-500 text-slate-950 text-xl md:text-3xl font-black px-5 py-1 md:px-6 md:py-2 rounded-xl md:rounded-2xl border-2 md:border-4 border-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.4)] uppercase tracking-wider"
                      >
                        +{match.lastReveal.runsAdded} RUNS
                      </motion.div>
                    )}

                    {/* Dual choices fly in */}
                    <div className="flex items-center gap-6 md:gap-8 mt-1 md:mt-2">
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase">BAT ({nameFor(room, match.lastReveal.batterId).slice(0, 6)})</span>
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-slate-900 border border-emerald-500/50 flex items-center justify-center text-lg md:text-xl font-black text-emerald-400">
                          {match.lastReveal.batterNumber}
                        </div>
                      </div>
                      <span className="font-black text-slate-500 text-xs">VS</span>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase">BOWL ({nameFor(room, match.lastReveal.bowlerId).slice(0, 6)})</span>
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-slate-900 border border-red-500/50 flex items-center justify-center text-lg md:text-xl font-black text-red-400">
                          {match.lastReveal.bowlerNumber}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center font-black uppercase text-[10px] md:text-xs tracking-[0.25em] text-slate-500 animate-pulse">
                    Waiting for selections...
                  </div>
                )}
              </div>

              {/* Bottom Player (Batter) info HUD */}
              <div className="relative z-10 flex justify-between items-center w-full px-3 py-1.5 md:px-4 md:py-2 bg-slate-950/70 border border-white/5 rounded-xl">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Swords size={16} className="text-cyan-400" />
                  <div>
                    <p className="text-[8px] md:text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Batsman</p>
                    <h4 className="text-xs md:text-sm font-black text-white mt-0.5">{nameFor(room, match.battingPlayerId)}</h4>
                  </div>
                </div>
                {batterLocked ? (
                  <span className="flex items-center gap-0.5 text-[8px] md:text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full uppercase animate-pulse">
                    <Check size={10} className="stroke-[3]" /> LOCKED
                  </span>
                ) : (
                  <span className="text-[8px] md:text-[10px] font-black text-slate-450 uppercase">CHOOSING...</span>
                )}
              </div>
            </div>
          )}

          {/* Mobile Team Player Lists (Mobile Only) */}
          {room.phase !== "match-over" && (
            <div className="block md:hidden mt-2">
              <div className="grid grid-cols-2 gap-3">
                {renderTeamPlayerListMobile("A")}
                {renderTeamPlayerListMobile("B")}
              </div>
            </div>
          )}

          {/* Controls (Interactive Number Pad or Spectator HUD) */}
          {room.phase === "match" && (
            <div className="flex flex-col gap-4 w-full">
              <NumberPad
                disabled={!isActive || submitted}
                onPick={onPlay}
                allowedNumbers={match.currentOverAllowedNumbers}
                frozenNumber={match.crazyState?.frozenNumber}
                hotNumber={match.crazyState?.hotNumber}
                luckyNumber={match.crazyState?.activeLuckyNumber}
                mirrorActive={match.crazyState?.mirrorActive}
                shuffledKeyMap={match.crazyState?.shuffledKeyMap}
                blindPick={room.crazyRules?.blindPick}
              />
              
              <div className="text-center flex flex-col items-center gap-3">
                {submitted ? (
                  <span className="inline-flex items-center gap-2 bg-slate-900/60 border border-white/10 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider text-emerald-400">
                    <Loader2 className="animate-spin text-emerald-400" size={14} /> CHOICE LOCKED! WAITING...
                  </span>
                ) : (
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                    {!isActive
                      ? `SPECTATING: ${nameFor(room, match.battingPlayerId)} vs ${nameFor(room, match.bowlingPlayerId)}`
                      : "LOCK IN YOUR NEXT PLAY"}
                  </span>
                )}

                {room.mode === "series" && !isActive && onLeaveSpectating && (
                  <Button
                    variant="secondary"
                    onClick={onLeaveSpectating}
                    className="px-5 py-2 text-2xs font-black uppercase tracking-wider rounded-xl bg-slate-900 border border-white/5 hover:border-white/10 text-slate-300 hover:text-white"
                  >
                    <ArrowLeft size={10} className="inline mr-1" /> Return to Standings
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Victory / Defeat Ceremony (For Match Over screen) */}
          {room.phase === "match-over" && summary && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-5 md:gap-6 max-w-lg mx-auto w-full py-4 md:py-8 text-center"
            >
              {/* Glowing Trophy */}
              <div className="relative flex items-center justify-center my-2 md:my-4">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="text-6xl md:text-8xl filter drop-shadow-[0_10px_25px_rgba(245,158,11,0.5)]"
                >
                  <Trophy size={64} className="text-yellow-500 fill-yellow-500" />
                </motion.div>
              </div>

              <div>
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase">
                  {summary.tie
                    ? "Match Tied!"
                    : `${
                        room.teams.find((t) => t.id === summary.winnerTeam || t.id === `team-${summary.winnerTeam}`)
                          ? `${
                              room.teams.find((t) => t.id === summary.winnerTeam || t.id === `team-${summary.winnerTeam}`)?.brand.logo
                            } ${
                              room.teams.find((t) => t.id === summary.winnerTeam || t.id === `team-${summary.winnerTeam}`)?.name
                            }`
                          : `TEAM ${summary.winnerTeam === "A" ? "SHARKS" : "TIGERS"}`
                      } WINS!`}
                </h2>
                <p className="text-slate-350 font-extrabold text-[10px] md:text-xs uppercase tracking-widest mt-2">
                  {summary.reason}
                </p>
              </div>

              {/* Scores summary list */}
              <div className="w-full flex flex-col gap-2.5 md:gap-3 my-2 md:my-4">
                {Object.entries(summary.scores).map(([teamKey, score]) => {
                  const teamObj = room.teams.find(
                    (t) => t.id === teamKey || t.id === `team-${teamKey}`
                  );
                  const teamName = teamObj ? `${teamObj.brand.logo} ${teamObj.name}` : teamKey === "A" ? "🔵 TEAM SHARKS" : "🔴 TEAM TIGERS";
                  return (
                    <div
                      key={teamKey}
                      className="flex items-center justify-between bg-slate-950/80 border border-white/10 p-3 md:p-4 rounded-xl md:rounded-2xl"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm md:text-base">{teamName}</span>
                      </div>
                      <div className="text-right font-mono text-sm md:text-base font-black text-yellow-400">
                        {score.runs} <span className="text-xs text-slate-500 font-bold">Runs</span> / {score.wickets}{" "}
                        <span className="text-xs text-slate-500 font-bold">Wkts</span> ({score.balls}b)
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Player Score lists on Victory Screen */}
              <div className="block md:hidden w-full mt-2 text-left">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 text-center">Final Scorecard</p>
                <div className="grid grid-cols-2 gap-3">
                  {renderTeamPlayerListMobile("A")}
                  {renderTeamPlayerListMobile("B")}
                </div>
              </div>

              {/* Interactive Action CTA */}
              <div className="flex flex-col gap-3 w-full mt-2">
                {room.mode === "series" ? (
                  playerId === room.hostId ? (
                    <Button
                      onClick={onContinueToStandings}
                      variant="gold"
                      className="w-full text-lg min-h-14 font-black shadow-[0_5px_20px_rgba(245,158,11,0.35)] animate-pulse flex items-center justify-center gap-2"
                    >
                      CONTINUE TO STANDINGS <ArrowRight size={18} />
                    </Button>
                  ) : (
                    <div className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">
                      Waiting for host to continue...
                    </div>
                  )
                ) : (
                  <Button
                    onClick={handleRematch}
                    variant="gold"
                    className="w-full text-lg min-h-14 font-black shadow-[0_5px_20px_rgba(245,158,11,0.35)]"
                  >
                    VOTE PLAY AGAIN ({room.rematchVotes.length}/{connectedTeamPlayers.length})
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Team Dashboard (Team B) - Desktop Only */}
        <div className="hidden lg:block lg:col-span-1">
          {renderTeamDashboard("B")}
        </div>

      </div>

      {/* Team Dashboard below gameplay on Tablet/Medium Screens (md to lg) */}
      <div className="hidden md:grid lg:hidden grid-cols-2 gap-6 mt-6">
        {renderTeamDashboard("A")}
        {renderTeamDashboard("B")}
      </div>
    </div>
  );
}
