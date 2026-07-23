import { useState } from "react";
import type { RoomView, PlayerView, PlayerTeam, Team } from "@hand-cricket/shared";
import { STADIUMS } from "@hand-cricket/shared";
import { Check, Shield, RefreshCw, Eye, Settings, Trash2, Trophy, Swords, Zap, AlertTriangle, MapPin, Star } from "lucide-react";
import { Button } from "./Button";
import { Card } from "./Card";
import { TeamCustomizer } from "./TeamCustomizer";
import { motion } from "framer-motion";

export function LobbyPanel({
  playerId,
  room,
  onReady,
  onAssignTeam,
  onRandomizeTeams,
  onRenameTeam,
  onUpdateTeamBrand,
  onStartSeriesMode,
  onStartMatch,
  onKickPlayer,
  onSetJokerPlayer
}: {
  playerId: string;
  room: RoomView;
  onReady: () => void;
  onAssignTeam: (targetPlayerId: string, team: PlayerTeam) => void;
  onRandomizeTeams: () => void;
  onRenameTeam: (teamId: string, name: string) => void;
  onUpdateTeamBrand: (
    teamId: string,
    logo: string,
    primaryColor: string,
    secondaryColor: string,
    banner: string
  ) => void;
  onStartSeriesMode: () => void;
  onStartMatch: () => void;
  onKickPlayer: (targetPlayerId: string) => void;
  onSetJokerPlayer?: (jokerPlayerId: string) => void;
}) {
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  
  const me = room.players.find((p) => p.id === playerId);
  const isHost = room.hostId === playerId;
  
  const selectedStadiumObj = STADIUMS.find((s) => s.id === room.stadium) || STADIUMS[0];

  const teamAPlayers = room.players.filter((p) => p.team === "A");
  const teamBPlayers = room.players.filter((p) => p.team === "B");
  const spectators = room.players.filter((p) => p.team === "spectator" && p.id !== room.jokerPlayerId);

  const getAvatarGradient = (name: string) => {
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      "from-violet-600 to-indigo-600",
      "from-cyan-500 to-blue-600",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-pink-600",
      "from-red-500 to-rose-700"
    ];
    return gradients[hash % gradients.length];
  };

  const myTeamObj = room.teams.find((t) => t.captainId === playerId);

  const renderSlotList = (teamLetter: "A" | "B") => {
    const players = teamLetter === "A" ? teamAPlayers : teamBPlayers;
    const slots = Array.from({ length: 5 });
    const teamObj = room.teams.find((t) => t.id === `team-${teamLetter}`);

    return (
      <div className="flex flex-col gap-3">
        {slots.map((_, index) => {
          const p = players[index];
          if (p) {
            const isTargetMe = p.id === playerId;
            const canManage = isHost || (me?.isCaptain && me?.team === teamLetter);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: teamLetter === "A" ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center justify-between p-3.5 rounded-xl border bg-slate-950/80 transition-all ${
                  isTargetMe
                    ? "border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                    : p.ready
                    ? "border-slate-800"
                    : "border-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${getAvatarGradient(p.name)} flex items-center justify-center text-lg font-bold border border-white/10 shadow-md`}>
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-sm text-white">{p.name}</span>
                      {isTargetMe && (
                        <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                          YOU
                        </span>
                      )}
                      {p.isCaptain && (
                        <span className="text-[9px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                          <Shield size={8} className="fill-current" /> CAPTAIN
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {p.connected ? "Online" : "Disconnected"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {p.ready && (
                    <span className="flex items-center gap-1 text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase">
                      <Check size={10} className="stroke-[3]" /> READY
                    </span>
                  )}

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onAssignTeam(p.id, teamLetter === "A" ? "B" : "A")}
                        className="px-2 py-1 text-[10px] font-black bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-slate-300 uppercase transition-all"
                        title={`Move to Team ${teamLetter === "A" ? "B" : "A"}`}
                      >
                        SWAP
                      </button>
                      <button
                        onClick={() => onAssignTeam(p.id, "spectator")}
                        className="px-2 py-1 text-[10px] font-black bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-slate-300 uppercase transition-all"
                        title="Move to Spectator"
                      >
                        SPEC
                      </button>
                      {isHost && room.mode === "team" && onSetJokerPlayer && (
                        <button
                          onClick={() => onSetJokerPlayer(p.id)}
                          className="px-2 py-1 text-[10px] font-black bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-amber-300 uppercase transition-all"
                          title="Designate as Joker"
                        >
                          JOKER
                        </button>
                      )}
                      {isHost && !isTargetMe && (
                        <button
                          onClick={() => onKickPlayer(p.id)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                          title="Kick Player"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          } else {
            return (
              <div
                key={`empty-${teamLetter}-${index}`}
                className="flex items-center justify-center p-3.5 rounded-xl border border-dashed border-white/5 bg-slate-950/20 text-slate-600 font-bold text-xs uppercase tracking-widest min-h-[58px]"
              >
                Empty Slot
              </div>
            );
          }
        })}
      </div>
    );
  };

  const showUnassignedLobby = room.mode === "team" && room.phase === "lobby" && teamAPlayers.length === 0 && teamBPlayers.length === 0;

  return (
    <div className="flex flex-col gap-6 w-full">
      {room.mode === "team" && room.players.length % 2 !== 0 && (
        <Card variant="gold" className="p-4 border-amber-500/30 bg-amber-500/5 text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-amber-400 font-black text-xs sm:text-sm uppercase tracking-wider text-amber-400">
                Odd Player Count Balanced
              </h4>
              <p className="text-2xs sm:text-xs text-slate-300 font-medium mt-0.5">
                {room.jokerPlayerId ? (
                  <>
                    <strong className="text-white">{room.players.find(p => p.id === room.jokerPlayerId)?.name}</strong> has been designated as the <strong className="text-amber-400">Joker ⭐</strong>. They will bat for whichever team is currently batting.
                  </>
                ) : (
                  "The lobby has an odd number of players. The host can assign a Joker below, or the game will automatically designate one when the match starts."
                )}
              </p>
            </div>
          </div>
        </Card>
      )}
      
      {/* Venue Banner */}
      <div className="relative h-24 rounded-2xl overflow-hidden border border-white/10 shadow-lg flex items-center justify-between px-6 bg-slate-900">
        {/* Background Image with blur & dim */}
        <div 
          className="absolute inset-0 bg-cover bg-center filter brightness-[0.35] z-0 scale-105"
          style={{ backgroundImage: `url(${selectedStadiumObj.image})` }}
        />
        
        {/* Text Details */}
        <div className="relative z-10 flex flex-col justify-center text-left">
          <span className="text-[8px] font-black uppercase text-emerald-400 tracking-[0.2em] bg-emerald-500/10 px-2.5 py-0.5 rounded-full w-max border border-emerald-500/20 mb-1">
            Selected Venue
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 drop-shadow">
            <MapPin size={18} className="text-emerald-400" /> {selectedStadiumObj.name}
          </h2>
          <p className="text-2xs sm:text-xs text-slate-300 font-bold uppercase tracking-wider">
            {selectedStadiumObj.location.split(',')[0]}
          </p>
        </div>
        
        {/* Micro-badge */}
        <div className="relative z-10 hidden sm:flex items-center gap-2 bg-slate-950/80 backdrop-blur border border-white/10 px-3 py-1.5 rounded-xl text-2xs font-black uppercase text-slate-300">
          <MapPin size={12} className="text-emerald-400" /> {selectedStadiumObj.location}
        </div>
      </div>
      {/* Locked Settings Summary Header */}
      <Card className="p-4 bg-slate-900/60 border-slate-800 backdrop-blur border-emerald-500/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Lobby Room Settings</h3>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">
              Settings locked after room creation
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-white/5">
              <Swords size={12} className="text-emerald-400" />
              <span className="text-2xs font-black uppercase text-slate-200">
                {room.mode === "quick" ? "Quick Match" : room.mode === "team" ? "Team Battle" : "League Series"}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-white/5">
              <Zap size={12} className="text-amber-400" />
              <span className="text-2xs font-black uppercase text-slate-200">
                {room.overs} {room.overs === 1 ? "Over" : "Overs"}
              </span>
            </div>
            {room.mode !== "series" && (
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-white/5">
                <span className="text-2xs font-black uppercase text-slate-200">
                  {room.matchType === "single" ? "Single" : "Double"} Innings
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-white/5">
              <span className="text-2xs font-black uppercase text-slate-400">Players:</span>
              <span className="text-2xs font-black text-slate-200">{room.maxPlayers}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Customize branding Banner for Captains */}
      {myTeamObj && (
        <Card
          className="p-5 border-2 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4 transition-all"
          style={{
            borderColor: myTeamObj.brand.primaryColor,
            background: `linear-gradient(135deg, ${myTeamObj.brand.primaryColor}15, #020617)`
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">{myTeamObj.brand.logo}</span>
            <div>
              <span className="text-2xs font-black uppercase text-slate-400 tracking-wider">YOUR SQUAD</span>
              <h2 className="text-xl font-black text-white">{myTeamObj.name}</h2>
            </div>
          </div>
          <Button
            onClick={() => setEditingTeam(myTeamObj)}
            style={{
              backgroundColor: myTeamObj.brand.primaryColor,
              color: "#000000",
              fontWeight: 900
            }}
            className="w-full sm:w-auto hover:brightness-110 shadow-lg"
          >
            <Settings size={14} className="stroke-[3] animate-spin-hover" /> CUSTOMIZE BRAND
          </Button>
        </Card>
      )}

      {/* Mode Layouts */}
      {showUnassignedLobby ? (
        /* Unassigned Lobby Players flat list */
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Unassigned Lobby Players ({room.players.length} / {room.maxPlayers})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {room.players.map((p, idx) => {
              const isTargetMe = p.id === playerId;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    className={`p-4 border bg-slate-950/80 relative overflow-hidden transition-all flex items-center justify-between ${
                      isTargetMe
                        ? "border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                        : "border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${getAvatarGradient(p.name)} flex items-center justify-center text-lg font-bold border border-white/10 shadow-md`}>
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-white flex items-center gap-2">
                          {p.name}
                          {isTargetMe && (
                            <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          {p.connected ? "Online" : "Disconnected"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {p.ready ? (
                        <span className="flex items-center gap-1 text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase">
                          <Check size={10} className="stroke-[3]" /> READY
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-slate-500 bg-slate-950/60 border border-white/5 px-2.5 py-1 rounded-full uppercase">
                          NOT READY
                        </span>
                      )}

                      {isHost && room.mode === "team" && onSetJokerPlayer && (
                        <button
                          onClick={() => onSetJokerPlayer(p.id)}
                          className="px-2 py-1 text-[10px] font-black bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-amber-300 uppercase transition-all"
                          title="Designate as Joker"
                        >
                          JOKER
                        </button>
                      )}
                      {isHost && !isTargetMe && (
                        <button
                          onClick={() => onKickPlayer(p.id)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                          title="Kick Player"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : room.mode !== "series" ? (
        <div className="grid md:grid-cols-2 gap-6 relative">
          
          {/* Team A Card */}
          <Card variant="cyan" className="p-5 border-cyan-500/25 bg-slate-950/40 relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-cyan-400 font-black text-lg uppercase tracking-widest flex items-center gap-2">
                🦈 TEAM SHARKS <span className="text-xs text-slate-400">({teamAPlayers.length}/5)</span>
              </h3>
              {room.mode === "team" && room.teams[0] && playerId === room.teams[0].captainId && (
                <button
                  onClick={() => setEditingTeam(room.teams[0])}
                  className="text-xs font-black text-cyan-400 hover:text-cyan-300"
                >
                  Edit Brand
                </button>
              )}
            </div>
            {renderSlotList("A")}
          </Card>

          {/* Team B Card */}
          <Card variant="red" className="p-5 border-red-500/25 bg-slate-950/40 relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-red-400 font-black text-lg uppercase tracking-widest flex items-center gap-2">
                🐯 TEAM TIGERS <span className="text-xs text-slate-400">({teamBPlayers.length}/5)</span>
              </h3>
              {room.mode === "team" && room.teams[1] && playerId === room.teams[1].captainId && (
                <button
                  onClick={() => setEditingTeam(room.teams[1])}
                  className="text-xs font-black text-red-400 hover:text-red-300"
                >
                  Edit Brand
                </button>
              )}
            </div>
            {renderSlotList("B")}
          </Card>

          {/* Joker Card */}
          {room.jokerPlayerId && (() => {
            const joker = room.players.find(p => p.id === room.jokerPlayerId);
            if (!joker) return null;
            const isJokerMe = joker.id === playerId;
            return (
              <div className="col-span-1 md:col-span-2">
                <Card variant="gold" className="p-5 border-amber-500/25 bg-slate-950/40 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-amber-400 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                      <Star size={14} className="fill-amber-400 stroke-amber-400" /> JOKER PLAYER <span className="text-2xs text-slate-400 lowercase font-medium">(Shared Batter for both teams)</span>
                    </h3>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center justify-between p-3.5 rounded-xl border bg-slate-950/80 transition-all border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center text-lg font-bold border border-white/10 shadow-md text-slate-950`}>
                        <Star size={16} className="fill-slate-950 stroke-slate-950" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-sm text-white">{joker.name}</span>
                          <span className="text-[9px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                            JOKER
                          </span>
                          {isJokerMe && (
                            <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          {joker.connected ? "Online" : "Disconnected"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isHost && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => onAssignTeam(joker.id, "A")}
                            className="px-2 py-1 text-[10px] font-black bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-slate-300 uppercase transition-all"
                          >
                            To Sharks
                          </button>
                          <button
                            onClick={() => onAssignTeam(joker.id, "B")}
                            className="px-2 py-1 text-[10px] font-black bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-slate-300 uppercase transition-all"
                          >
                            To Tigers
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </Card>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Series Mode Teams Grid */
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tournament Participants ({room.teams.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {room.teams.map((t, idx) => {
              const capInfo = room.players.find((p) => p.id === t.captainId);
              const isTargetMe = t.captainId === playerId;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    className="p-4 border bg-slate-950/80 relative overflow-hidden transition-all flex items-center justify-between"
                    style={{
                      borderColor: isTargetMe ? t.brand.primaryColor : "#1e293b"
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl filter drop-shadow">{t.brand.logo}</span>
                      <div>
                        <div className="font-extrabold text-sm text-white flex items-center gap-2">
                          {t.name}
                          {isTargetMe && (
                            <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                          Owner: {capInfo?.name || "CPU Player"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isTargetMe && (
                        <button
                          onClick={() => setEditingTeam(t)}
                          className="px-2.5 py-1.5 text-[10px] font-black bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition"
                        >
                          DESIGN
                        </button>
                      )}
                      {isHost && !isTargetMe && capInfo && (
                        <button
                          onClick={() => onKickPlayer(capInfo.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                          title="Kick from Lobby"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spectators Panel */}
      {spectators.length > 0 && (
        <Card variant="default" className="p-4 bg-slate-950/30 border-white/5">
          <h4 className="text-slate-400 font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
            <Eye size={14} className="text-slate-400" /> Spectators ({spectators.length})
          </h4>
          <div className="flex flex-wrap gap-2.5">
            {spectators.map((p) => {
              const canManage = isHost || me?.isCaptain;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-slate-300"
                >
                  <span className="flex items-center gap-1.5">
                    <Eye size={12} className="text-slate-400" />
                    {p.name}
                  </span>
                  {canManage && room.mode !== "series" && (
                    <div className="flex gap-1 border-l border-white/10 pl-2">
                      <button
                        onClick={() => onAssignTeam(p.id, "A")}
                        className="text-[9px] font-black text-cyan-400 hover:text-cyan-300 uppercase"
                      >
                        Team A
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        onClick={() => onAssignTeam(p.id, "B")}
                        className="text-[9px] font-black text-red-400 hover:text-red-300 uppercase"
                      >
                        Team B
                      </button>
                    </div>
                  )}
                  {isHost && (
                    <button
                      onClick={() => onKickPlayer(p.id)}
                      className="text-[9px] font-black text-red-400 hover:text-red-300 pl-1 border-l border-white/10"
                    >
                      KICK
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Actions and Status Row */}
      <div className="flex flex-col items-center justify-center gap-4 w-full mt-2 bg-slate-950/40 border border-white/5 p-5 rounded-2xl">
        <div className="flex flex-wrap gap-4 w-full max-w-xl justify-center">
          
          {/* Series Mode Action */}
          {room.mode === "series" ? (
            isHost ? (
              <Button
                disabled={room.teams.length < 3}
                onClick={onStartSeriesMode}
                variant="gold"
                className="w-full py-4 text-lg font-black uppercase tracking-wider animate-pulse hover:scale-105 flex items-center justify-center gap-2"
              >
                <Trophy size={18} className="fill-current" /> Start Series Tournament
              </Button>
            ) : (
              <div className="text-center text-slate-400 text-sm font-bold uppercase tracking-wider">
                Waiting for the host to launch the Series...
              </div>
            )
          ) : (
            /* Match / Team mode actions */
            <>
              {isHost ? (
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  {room.mode === "team" && (
                    <Button
                      onClick={onRandomizeTeams}
                      variant="secondary"
                      className="flex-1 min-h-14 font-black text-xs uppercase tracking-wider"
                    >
                      <RefreshCw size={14} className="animate-spin-hover mr-1.5" /> Shuffle Teams
                    </Button>
                  )}
                  <Button
                    onClick={onStartMatch}
                    variant="gold"
                    className="flex-1 min-h-14 text-lg font-black tracking-wider shadow-[0_5px_25px_rgba(245,158,11,0.25)] animate-pulse flex items-center justify-center gap-2"
                  >
                    <Trophy size={18} className="fill-current" /> START MATCH
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={onReady}
                  variant={me?.ready ? "danger" : "primary"}
                  className="w-full min-h-14 text-lg font-black tracking-wider shadow-[0_5px_25px_rgba(16,185,129,0.25)]"
                >
                  {me?.ready ? "NOT READY" : "READY UP"}
                </Button>
              )}
            </>
          )}
        </div>

        {room.mode !== "series" && (
          <div className="text-center">
            <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mb-1">
              Match requires at least 1 player on each team
            </p>
            <p className="text-slate-500 font-extrabold text-[10px] uppercase tracking-widest">
              {room.players.filter((p) => p.connected && (p.team === "A" || p.team === "B")).length} connected players •{" "}
              {room.players.filter((p) => p.team !== "spectator" && p.ready).length} ready
            </p>
          </div>
        )}

        {room.mode === "series" && room.teams.length < 3 && (
          <p className="text-orange-400 font-black text-xs uppercase tracking-widest">
            Requires at least 3 players connected to start
          </p>
        )}
      </div>

      {/* Brand customizer modal rendering */}
      {editingTeam && (
        <TeamCustomizer
          team={editingTeam}
          onRename={onRenameTeam}
          onSaveBrand={onUpdateTeamBrand}
          onClose={() => setEditingTeam(null)}
        />
      )}
    </div>
  );
}
