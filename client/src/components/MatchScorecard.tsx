import React, { useState } from "react";
import type { RoomView, ChatMessage } from "@hand-cricket/shared";
import { Trophy, Shield, Calendar, Users, Award, Eye, Swords, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./Button";

interface MatchScorecardProps {
  playerId: string;
  room: RoomView;
  onRematch: () => void;
  onContinueToStandings?: () => void;
}

interface ComputedPlayerStats {
  id: string;
  name: string;
  team: "A" | "B";
  runsScored: number;
  ballsFaced: number;
  wicketsTaken: number;
  runsConceded: number;
  ballsBowled: number;
  isOut: boolean;
}

export function MatchScorecard({
  playerId,
  room,
  onRematch,
  onContinueToStandings
}: MatchScorecardProps) {
  const match = room.match;
  if (!match || !match.summary) return null;

  const [activeTab, setActiveTab] = useState<"A" | "B">("A");

  const summary = match.summary;

  // 1. Compute stats for all players from match timeline
  const statsMap: Record<string, ComputedPlayerStats> = {};

  // Initialize with all players in the room
  for (const p of room.players) {
    if (p.team === "A" || p.team === "B") {
      statsMap[p.id] = {
        id: p.id,
        name: p.name,
        team: p.team,
        runsScored: 0,
        ballsFaced: 0,
        wicketsTaken: 0,
        runsConceded: 0,
        ballsBowled: 0,
        isOut: false
      };
    }
  }

  // Parse timeline
  for (const event of match.timeline) {
    if (event.batterId && statsMap[event.batterId]) {
      statsMap[event.batterId].runsScored += event.runsAdded;
      statsMap[event.batterId].ballsFaced += 1;
    }
    if (event.bowlerId && statsMap[event.bowlerId]) {
      statsMap[event.bowlerId].runsConceded += event.runsAdded;
      statsMap[event.bowlerId].ballsBowled += 1;
      if (event.wicket) {
        statsMap[event.bowlerId].wicketsTaken += 1;
      }
    }
  }

  // Mark who got out
  for (const outId of match.dismissedPlayerIds) {
    if (statsMap[outId]) {
      statsMap[outId].isOut = true;
    }
  }

  const allStats = Object.values(statsMap);

  // 2. Identify Man of the Match (highest impact score)
  // Impact Score = Runs Scored + (Wickets * 15) - (Runs Conceded / 2)
  let bestPlayer: ComputedPlayerStats | null = null;
  let bestImpact = -999;
  for (const s of allStats) {
    const impact = s.runsScored + s.wicketsTaken * 15 - s.runsConceded * 0.5;
    if (impact > bestImpact) {
      bestImpact = impact;
      bestPlayer = s;
    }
  }

  const getTeamName = (teamLetter: "A" | "B") => {
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
    return teamLetter === "A" ? "🔵 Team Sharks" : "🔴 Team Tigers";
  };

  const getTeamBannerStyle = (teamLetter: "A" | "B") => {
    if (room.mode === "series") {
      const isBattingA = match.battingTeam === "A";
      const idA = isBattingA ? match.battingTeamId : match.bowlingTeamId;
      const idB = isBattingA ? match.bowlingTeamId : match.battingTeamId;
      const targetId = teamLetter === "A" ? idA : idB;
      const found = room.teams.find((t) => t.id === targetId);
      if (found) {
        return {
          background: `linear-gradient(135deg, ${found.brand.primaryColor}dd, ${found.brand.secondaryColor}dd)`,
          border: `1px solid ${found.brand.primaryColor}50`
        };
      }
    }
    const found = room.teams.find((t) => t.id === `team-${teamLetter}`);
    if (found) {
      return {
        background: `linear-gradient(135deg, ${found.brand.primaryColor}dd, ${found.brand.secondaryColor}dd)`,
        border: `1px solid ${found.brand.primaryColor}50`
      };
    }
    return teamLetter === "A"
      ? { background: "linear-gradient(135deg, #1e3a8a, #3b82f6)", border: "1px solid rgba(59,130,246,0.3)" }
      : { background: "linear-gradient(135deg, #7f1d1d, #ef4444)", border: "1px solid rgba(239,68,68,0.3)" };
  };

  const formatOvers = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const extra = balls % 6;
    return `${overs}.${extra}`;
  };

  const connectedTeamPlayers = room.players.filter(
    (p) => (p.team === "A" || p.team === "B") && p.connected
  );

  const teamAStats = allStats.filter((s) => s.team === "A");
  const teamBStats = allStats.filter((s) => s.team === "B");

  const currentTabStats = activeTab === "A" ? teamAStats : teamBStats;
  const currentTabScore = summary.scores[activeTab === "A" ? (match.battingTeam === "A" ? match.battingTeamId || "A" : match.bowlingTeamId || "A") : (match.battingTeam === "B" ? match.battingTeamId || "B" : match.bowlingTeamId || "B")];
  
  // Safe accessor for scores
  const getScoreForTeam = (teamLetter: "A" | "B") => {
    const isBattingA = match.battingTeam === "A";
    const idA = isBattingA ? match.battingTeamId : match.bowlingTeamId;
    const idB = isBattingA ? match.bowlingTeamId : match.battingTeamId;
    const teamId = teamLetter === "A" ? idA : idB;
    if (teamId && summary.scores[teamId]) {
      return summary.scores[teamId];
    }
    return summary.scores[teamLetter] || { runs: 0, wickets: 0, balls: 0 };
  };

  const scoreA = getScoreForTeam("A");
  const scoreB = getScoreForTeam("B");

  return (
    <div className="w-full flex flex-col gap-6 max-w-4xl mx-auto py-2">
      {/* Broadcast Banner - Header HUD */}
      <div className="relative bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-red-500/5 pointer-events-none" />
        
        {/* Match Outcome Title */}
        <div className="flex flex-col items-center md:items-start gap-2 z-10">
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-black tracking-widest uppercase rounded-full">
            <Trophy size={12} className="animate-bounce" /> Match Over
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight text-center md:text-left">
            {summary.tie
              ? "Match Tied!"
              : `${
                  summary.winnerTeam
                    ? getTeamName(
                        summary.winnerTeam === "A" ||
                        summary.winnerTeam === "team-A" ||
                        summary.winnerTeam === (match.battingTeam === "A" ? match.battingTeamId : match.bowlingTeamId)
                          ? "A"
                          : "B"
                      )
                    : "Winner"
                } Wins!`}
          </h2>
          <p className="text-xs sm:text-sm font-bold text-slate-400 tracking-wider">
            {summary.reason}
          </p>
        </div>

        {/* Global Summary Info */}
        <div className="flex items-center gap-6 z-10 bg-slate-950/60 border border-slate-800 px-6 py-3 rounded-2xl">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{getTeamName("A")}</p>
            <p className="text-xl font-black text-white font-mono mt-1">
              {scoreA.runs}/{scoreA.wickets}
            </p>
            <p className="text-[10px] font-bold text-slate-400 font-mono">({formatOvers(scoreA.balls)} Ov)</p>
          </div>
          <div className="text-slate-700 font-black text-xs">VS</div>
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{getTeamName("B")}</p>
            <p className="text-xl font-black text-white font-mono mt-1">
              {scoreB.runs}/{scoreB.wickets}
            </p>
            <p className="text-[10px] font-bold text-slate-400 font-mono">({formatOvers(scoreB.balls)} Ov)</p>
          </div>
        </div>
      </div>

      {/* Main Scorecard Section */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col">
        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2">
          <button
            onClick={() => setActiveTab("A")}
            style={activeTab === "A" ? getTeamBannerStyle("A") : {}}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider text-center transition-all ${
              activeTab === "A"
                ? "text-white shadow-md scale-[0.99]"
                : "text-slate-400 hover:text-white bg-transparent hover:bg-slate-900/50"
            }`}
          >
            {getTeamName("A")} Scorecard
          </button>
          <button
            onClick={() => setActiveTab("B")}
            style={activeTab === "B" ? getTeamBannerStyle("B") : {}}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider text-center transition-all ${
              activeTab === "B"
                ? "text-white shadow-md scale-[0.99]"
                : "text-slate-400 hover:text-white bg-transparent hover:bg-slate-900/50"
            }`}
          >
            {getTeamName("B")} Scorecard
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 flex flex-col gap-6">
          {/* Batting Performances */}
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Swords size={14} className="text-cyan-400" /> Batting Summary
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Player</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Runs</th>
                    <th className="py-2.5 px-3 text-right">Balls</th>
                    <th className="py-2.5 px-3 text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-200">
                  {currentTabStats.map((p) => {
                    const sr = p.ballsFaced > 0 ? ((p.runsScored / p.ballsFaced) * 100).toFixed(1) : "—";
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/20 text-xs sm:text-sm">
                        <td className="py-3 px-3 font-bold text-white">{p.name}</td>
                        <td className="py-3 px-3">
                          {p.ballsFaced === 0 ? (
                            <span className="text-slate-500 text-[10px] font-black uppercase tracking-wider">DNB</span>
                          ) : p.isOut ? (
                            <span className="text-red-500 text-[10px] font-black uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">Out</span>
                          ) : (
                            <span className="text-emerald-400 text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Not Out</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-emerald-400 font-mono">{p.runsScored}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-350 font-mono">{p.ballsFaced}</td>
                        <td className="py-3 px-3 text-right font-extrabold text-slate-400 font-mono">{sr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bowling Performances */}
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Shield size={14} className="text-red-400" /> Bowling Summary
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Player</th>
                    <th className="py-2.5 px-3">Overs</th>
                    <th className="py-2.5 px-3 text-right">Runs Conceded</th>
                    <th className="py-2.5 px-3 text-right">Wickets</th>
                    <th className="py-2.5 px-3 text-right">Economy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-200">
                  {currentTabStats.map((p) => {
                    const economy = p.ballsBowled > 0 ? ((p.runsConceded / (p.ballsBowled / 6))).toFixed(2) : "—";
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/20 text-xs sm:text-sm">
                        <td className="py-3 px-3 font-bold text-white">{p.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-350">{formatOvers(p.ballsBowled)}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-350 font-mono">{p.runsConceded}</td>
                        <td className="py-3 px-3 text-right font-black text-red-400 font-mono">{p.wicketsTaken}</td>
                        <td className="py-3 px-3 text-right font-extrabold text-slate-400 font-mono">{economy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Highlight Box - Man of the Match */}
      {bestPlayer && (
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-yellow-500/5 to-transparent pointer-events-none" />
          <div className="h-16 w-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 text-3xl shadow-lg">
            <Award size={32} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Player of the Match</p>
            <h3 className="text-xl font-black text-white mt-0.5">{bestPlayer.name}</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Outstanding contribution of <strong className="text-emerald-400">{bestPlayer.runsScored} runs</strong>
              {bestPlayer.ballsBowled > 0 && (
                <> and <strong className="text-red-400">{bestPlayer.wicketsTaken} wickets</strong> (conceding {bestPlayer.runsConceded} runs)</>
              )}
              .
            </p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 px-4 py-2.5 rounded-2xl font-mono text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Impact Index</p>
            <p className="text-lg font-black text-yellow-400 mt-0.5">+{bestImpact.toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* Crazy Highlights & T10 Timeline */}
      {((summary.crazyHighlights && summary.crazyHighlights.length > 0) || (summary.t10Timeline && summary.t10Timeline.length > 0)) && (
        <div className="bg-slate-900/90 backdrop-blur-md border border-amber-500/20 rounded-3xl p-6 shadow-xl text-left space-y-4">
          {summary.crazyHighlights && summary.crazyHighlights.length > 0 && (
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                🔥 Crazy Match Highlights
              </h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {summary.crazyHighlights.map((hl, idx) => (
                  <span key={idx} className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold">
                    {hl}
                  </span>
                ))}
              </div>
            </div>
          )}

          {summary.t10Timeline && summary.t10Timeline.length > 0 && (
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                ⚡ T10 Phase Timeline
              </h4>
              <div className="space-y-1 text-xs font-medium text-slate-300">
                {summary.t10Timeline.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mt-2">
        {room.mode === "series" ? (
          playerId === room.hostId ? (
            <Button
              onClick={onContinueToStandings}
              variant="gold"
              className="w-full py-4 text-lg font-black shadow-[0_5px_20px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2"
            >
              Continue to Standings <ArrowRight size={18} />
            </Button>
          ) : (
            <div className="w-full text-center p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">
              Waiting for host to continue...
            </div>
          )
        ) : (
          <Button
            onClick={onRematch}
            variant="gold"
            className="w-full py-4 text-lg font-black shadow-[0_5px_20px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2"
          >
            Vote Play Again ({room.rematchVotes.length}/{connectedTeamPlayers.length})
          </Button>
        )}
      </div>
    </div>
  );
}
