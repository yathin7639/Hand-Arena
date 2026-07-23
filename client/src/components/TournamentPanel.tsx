import { useState } from "react";
import type { RoomView, Team, TournamentFixture } from "@hand-cricket/shared";
import { calculateNRR, STADIUMS } from "@hand-cricket/shared";
import { Card } from "./Card";
import { Button } from "./Button";
import { Trophy, Swords, Zap, Radio, MapPin, Eye, Shield } from "lucide-react";

interface TournamentPanelProps {
  room: RoomView;
  playerId: string;
  onSetMatchReady: () => void;
  onSpectateFixture: (fixtureId: string | null) => void;
}

export function TournamentPanel({ room, playerId, onSetMatchReady, onSpectateFixture }: TournamentPanelProps) {
  const [activeTab, setActiveTab] = useState<"standings" | "fixtures" | "spectate" | "playoffs">("standings");
  const t = room.tournament;

  if (!t) {
    return (
      <Card className="text-center p-8 space-y-4">
        <h2 className="text-2xl font-bold text-white">No Active Series</h2>
        <p className="text-slate-400">Waiting for host to start Series Mode...</p>
      </Card>
    );
  }

  // Get next active fixture
  const getNextFixture = (): TournamentFixture | undefined => {
    if (t.phase === "round-robin") {
      return t.fixtures.find((f) => f.status === "pending" || f.status === "playing");
    } else if (t.phase === "semifinals") {
      return t.playoffs.semis.find((f) => f.status === "pending" || f.status === "playing");
    } else if (t.phase === "finals") {
      return t.playoffs.final?.status === "pending" || t.playoffs.final?.status === "playing"
        ? t.playoffs.final
        : undefined;
    }
    return undefined;
  };

  const nextFixture = getNextFixture();
  const isHost = playerId === room.hostId;

  // Sorting standings
  const sortedStandings = [...t.teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const nrrA = calculateNRR(a.stats);
    const nrrB = calculateNRR(b.stats);
    if (nrrB !== nrrA) return nrrB - nrrA;
    return b.stats.wins - a.stats.wins;
  });

  const getTeamName = (id: string) => t.teams.find((tm) => tm.id === id)?.name ?? "TBD";
  const getTeamLogo = (id: string) => t.teams.find((tm) => tm.id === id)?.brand.logo ?? "❓";
  const getTeamColor = (id: string) => t.teams.find((tm) => tm.id === id)?.brand.primaryColor ?? "#cbd5e1";

  // Check if champion is crowned
  const isCompleted = t.phase === "completed";
  const championTeamId = isCompleted && t.playoffs.final?.status === "completed" ? t.playoffs.final.winnerTeamId : undefined;
  const championTeam = championTeamId ? t.teams.find((tm) => tm.id === championTeamId) : undefined;

  // Aggregate individual player statistics for Top Performers Board
  const statsList = Object.entries(t.playerStats || {}).map(([id, stats]) => ({
    id,
    name: room.players.find((p) => p.id === id)?.name || id,
    team: t.teams.find((tm) => tm.captainId === id),
    runs: stats.runs,
    wickets: stats.wickets
  }));

  const topBatters = [...statsList].sort((a, b) => b.runs - a.runs).slice(0, 5);
  const topBowlers = [...statsList].sort((a, b) => b.wickets - a.wickets).slice(0, 5);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Celebration / Champion Card */}
      {isCompleted && championTeam && (
        <Card className="text-center p-8 border-2 border-yellow-500 bg-slate-950/90 relative overflow-hidden shadow-2xl shadow-yellow-500/20 animate-scale-up space-y-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.1),transparent)]" />
          <Trophy size={48} className="mx-auto text-yellow-500 fill-yellow-500 animate-bounce" />
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-yellow-500">CHAMPIONS</span>
            <h1 className="text-4xl sm:text-5xl font-black text-white" style={{ textShadow: `0 0 15px ${championTeam.brand.primaryColor}80` }}>
              {championTeam.brand.logo} {championTeam.name}
            </h1>
            <p className="text-slate-400 max-w-md mx-auto pt-2">
              All matches played. This squad has navigated the bracket and claimed the ultimate hand cricket glory!
            </p>
          </div>
        </Card>
      )}

      {/* Mode Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Trophy className="text-yellow-500 fill-yellow-500" size={24} /> HandArena Series
          </h1>
          <p className="text-slate-400 text-sm">
            Mode: Round Robin League + Bracket Playoffs ({t.teams.length} Teams)
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          {(["standings", "fixtures", "spectate", "playoffs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${
                activeTab === tab
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Panel Content */}
      {activeTab === "standings" && (
        <div className="space-y-6">
          <Card className="p-0 overflow-hidden border-slate-850">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-850 text-slate-400 text-xs font-black uppercase tracking-wider">
                    <th className="py-4 px-6 text-center w-12">#</th>
                    <th className="py-4 px-4">Team</th>
                    <th className="py-4 px-4 text-center">Played</th>
                    <th className="py-4 px-4 text-center">W</th>
                    <th className="py-4 px-4 text-center">L</th>
                    <th className="py-4 px-4 text-center">NRR</th>
                    <th className="py-4 px-4 text-center">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50">
                  {sortedStandings.map((team, idx) => {
                    const played = team.stats.wins + team.stats.losses;
                    const nrr = calculateNRR(team.stats);
                    const isTop = idx < 4;
                    return (
                      <tr
                        key={team.id}
                        className={`text-sm text-white font-bold transition hover:bg-slate-900/30 ${
                          isTop ? "bg-cyan-500/[0.01]" : ""
                        }`}
                      >
                        <td className="py-4 px-6 text-center font-black text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-4 px-4 flex items-center gap-3">
                          <span className="text-2xl">{team.brand.logo}</span>
                          <div>
                            <div className="font-extrabold text-white">{team.name}</div>
                            <div className="text-2xs text-slate-500 font-semibold tracking-wider uppercase">
                              Captain: {room.players.find((p) => p.id === team.captainId)?.name || "CPU"}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center font-mono">{played}</td>
                        <td className="py-4 px-4 text-center font-mono text-emerald-400">{team.stats.wins}</td>
                        <td className="py-4 px-4 text-center font-mono text-red-400">{team.stats.losses}</td>
                        <td className={`py-4 px-4 text-center font-mono ${nrr >= 0 ? "text-cyan-400" : "text-orange-400"}`}>
                          {nrr >= 0 ? "+" : ""}{nrr.toFixed(3)}
                        </td>
                        <td className="py-4 px-4 text-center font-black text-cyan-400 text-base">{team.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Top Performers Board */}
          {statsList.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Batters */}
              <Card className="p-5 border-slate-850 bg-slate-900/40">
                <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400 mb-4 flex items-center gap-2">
                  <Swords size={16} className="text-cyan-400" /> Top Batters
                </h3>
                <div className="space-y-3">
                  {topBatters.map((player, idx) => (
                    <div key={player.id} className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-500 w-4">{idx + 1}</span>
                        <span className="text-xl">{player.team?.brand.logo ?? "👤"}</span>
                        <div>
                          <div className="font-bold text-white text-sm">{player.name}</div>
                          <div className="text-2xs text-slate-500 font-semibold uppercase">{player.team?.name ?? "Independent"}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-black text-cyan-400 text-sm">{player.runs} Runs</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Top Bowlers */}
              <Card className="p-5 border-slate-850 bg-slate-900/40">
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2">
                  <Shield size={16} className="text-emerald-400" /> Top Bowlers
                </h3>
                <div className="space-y-3">
                  {topBowlers.map((player, idx) => (
                    <div key={player.id} className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-500 w-4">{idx + 1}</span>
                        <span className="text-xl">{player.team?.brand.logo ?? "👤"}</span>
                        <div>
                          <div className="font-bold text-white text-sm">{player.name}</div>
                          <div className="text-2xs text-slate-500 font-semibold uppercase">{player.team?.name ?? "Independent"}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-black text-emerald-400 text-sm">{player.wickets} Wickets</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {activeTab === "fixtures" && (
        <div className="space-y-4">
          {t.fixtures.map((f, idx) => {
            const isPlaying = nextFixture?.id === f.id;
            const isPlayerInFixture = f.teamAId === `team-${playerId}` || f.teamBId === `team-${playerId}`;
            return (
              <div
                key={f.id}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-4 transition ${
                  isPlaying
                    ? "bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/5 animate-pulse"
                    : f.status === "completed"
                    ? "bg-slate-900/40 border-slate-850 opacity-75"
                    : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="font-black text-xs text-slate-500 uppercase tracking-widest">
                    Match {idx + 1}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTeamLogo(f.teamAId)}</span>
                    <span className="font-bold text-white">{getTeamName(f.teamAId)}</span>
                    <span className="text-slate-500 font-extrabold italic px-2">VS</span>
                    <span className="text-2xl">{getTeamLogo(f.teamBId)}</span>
                    <span className="font-bold text-white">{getTeamName(f.teamBId)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  {f.status === "completed" ? (
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-black">
                        Winner: <span style={{ color: getTeamColor(f.winnerTeamId ?? "") }}>{getTeamName(f.winnerTeamId ?? "")}</span>
                      </div>
                      <div className="text-2xs text-slate-500 font-mono">
                        {f.scoreA?.runs}/{f.scoreA?.wickets} vs {f.scoreB?.runs}/{f.scoreB?.wickets}
                      </div>
                    </div>
                  ) : isPlaying ? (
                    isPlayerInFixture ? (
                      <Button variant="secondary" onClick={onSetMatchReady} className="w-full sm:w-auto flex items-center justify-center gap-1.5">
                        <Zap size={14} className="fill-current" /> LAUNCH LOBBY
                      </Button>
                    ) : (
                      <span className="text-xs text-cyan-400 font-black uppercase tracking-wider animate-pulse bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/20 flex items-center gap-1.5">
                        <Zap size={10} className="fill-cyan-400 text-cyan-400" /> MATCH IN PROGRESS
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                      QUEUED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "spectate" && (
        <div className="space-y-4">
          {(() => {
            const liveFixtures = [
              ...t.fixtures.filter((f) => f.status === "playing"),
              ...t.playoffs.semis.filter((f) => f.status === "playing"),
              ...(t.playoffs.final?.status === "playing" ? [t.playoffs.final] : [])
            ];

            if (liveFixtures.length === 0) {
              return (
                <Card className="text-center p-8 space-y-4">
                  <Radio size={36} className="mx-auto text-cyan-400 animate-pulse" />
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">No Matches Currently Live</h3>
                  <p className="text-slate-450 text-xs">
                    When captains launch their fixtures, they will appear here as live streams you can spectate.
                  </p>
                </Card>
              );
            }

            return liveFixtures.map((f) => {
              const teamA = t.teams.find((tm) => tm.id === f.teamAId);
              const teamB = t.teams.find((tm) => tm.id === f.teamBId);
              const activeMatch = room.activeMatches?.[f.id];
              const stadiumObj = STADIUMS.find((s) => s.id === room.stadium) || STADIUMS[0];

              return (
                <div
                  key={f.id}
                  className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-4 transition shadow-lg shadow-cyan-500/5"
                >
                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                    {/* Live Indicator + Stadium */}
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                        LIVE
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <MapPin size={10} className="text-slate-400" /> {stadiumObj.name}
                      </span>
                    </div>

                    {/* Team A vs Team B */}
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{teamA?.brand.logo ?? "❓"}</span>
                      <span className="font-extrabold text-white text-base">{teamA?.name ?? "TBD"}</span>
                      <span className="text-slate-550 font-extrabold italic text-xs px-1">VS</span>
                      <span className="text-2xl">{teamB?.brand.logo ?? "❓"}</span>
                      <span className="font-extrabold text-white text-base">{teamB?.name ?? "TBD"}</span>
                    </div>

                    {/* Score, Overs, Innings details */}
                    {activeMatch ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-medium">
                        <span className="font-bold text-yellow-400 font-mono">
                          {activeMatch.innings === 1 ? (
                            `${activeMatch.current.runs}/${activeMatch.current.wickets}`
                          ) : (
                            `${activeMatch.current.runs}/${activeMatch.current.wickets} (Target: ${activeMatch.target})`
                          )}
                        </span>
                        <span className="text-slate-650">•</span>
                        <span className="font-mono">
                          {Math.floor(activeMatch.current.balls / 6)}.{activeMatch.current.balls % 6} / {room.overs} Overs
                        </span>
                        <span className="text-slate-650">•</span>
                        <span className="uppercase text-[10px] font-black tracking-wider text-cyan-400">
                          {activeMatch.innings === 1 ? "1st Innings" : "2nd Innings"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-2xs font-bold text-slate-550 uppercase tracking-widest">
                        Match Starting...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => onSpectateFixture(f.id)}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Eye size={14} className="align-middle" /> Spectate
                    </Button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {activeTab === "playoffs" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center py-4">
          
          {/* Semifinals */}
          <div className="space-y-4 md:col-span-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 text-center mb-2">Semifinals</h3>
            {t.playoffs.semis.length === 0 ? (
              <Card className="text-center p-6 text-slate-500 text-xs">
                Pending Round Robin completion...
              </Card>
            ) : (
              t.playoffs.semis.map((semi, idx) => {
                const isSFPlaying = nextFixture?.id === semi.id;
                const isPlayerInSemi = semi.teamAId === `team-${playerId}` || semi.teamBId === `team-${playerId}`;
                return (
                  <Card
                    key={semi.id}
                    className={`p-4 border transition ${
                      isSFPlaying ? "border-cyan-500/40 bg-cyan-500/5 animate-pulse" : "border-slate-800"
                    }`}
                  >
                    <div className="text-2xs text-slate-500 font-black uppercase mb-2">SF {idx + 1}</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-white">
                          {getTeamLogo(semi.teamAId)} {getTeamName(semi.teamAId)}
                        </span>
                        {semi.status === "completed" && semi.winnerTeamId === semi.teamAId && (
                          <span className="text-emerald-400 font-black text-xs">W</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-800/50 pt-2">
                        <span className="font-bold text-sm text-white">
                          {getTeamLogo(semi.teamBId)} {getTeamName(semi.teamBId)}
                        </span>
                        {semi.status === "completed" && semi.winnerTeamId === semi.teamBId && (
                          <span className="text-emerald-400 font-black text-xs">W</span>
                        )}
                      </div>
                    </div>
                    {isSFPlaying && (
                      <div className="mt-3">
                        {isPlayerInSemi ? (
                          <Button variant="secondary" onClick={onSetMatchReady} className="w-full py-2 flex items-center justify-center gap-1.5">
                            <Zap size={14} className="fill-current" /> LAUNCH SF LOBBY
                          </Button>
                        ) : (
                          <span className="text-xs text-cyan-400 font-black uppercase tracking-wider block text-center animate-pulse bg-cyan-500/10 py-1 rounded-lg border border-cyan-500/20 flex items-center justify-center gap-1.5">
                            <Zap size={10} className="fill-cyan-400 text-cyan-400" /> MATCH IN PROGRESS
                          </span>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {/* Bracket Connector Arrow */}
          <div className="hidden md:flex justify-center items-center text-slate-650 text-2xl font-black md:col-span-1">
            ➔ ➔
          </div>

          {/* Grand Final */}
          <div className="space-y-4 md:col-span-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 text-center mb-2">Grand Final</h3>
            {!t.playoffs.final ? (
              <Card className="text-center p-6 text-slate-500 text-xs">
                Awaiting Semifinal results...
              </Card>
            ) : (
              <Card
                className={`p-4 border border-yellow-500/20 bg-yellow-500/[0.01] transition ${
                  nextFixture?.id === t.playoffs.final.id ? "border-yellow-500/40 bg-yellow-500/5 animate-pulse" : ""
                }`}
              >
                <div className="text-2xs text-yellow-500 font-black uppercase mb-2">Final</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-white">
                      {getTeamLogo(t.playoffs.final.teamAId)} {getTeamName(t.playoffs.final.teamAId)}
                    </span>
                    {t.playoffs.final.status === "completed" && t.playoffs.final.winnerTeamId === t.playoffs.final.teamAId && (
                      <span className="text-yellow-400 font-black text-xs">CHAMPION</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-800/50 pt-2">
                    <span className="font-bold text-sm text-white">
                      {getTeamLogo(t.playoffs.final.teamBId)} {getTeamName(t.playoffs.final.teamBId)}
                    </span>
                    {t.playoffs.final.status === "completed" && t.playoffs.final.winnerTeamId === t.playoffs.final.teamBId && (
                      <span className="text-yellow-400 font-black text-xs">CHAMPION</span>
                    )}
                  </div>
                </div>
                {nextFixture?.id === t.playoffs.final.id && (
                  <div className="mt-3">
                    {t.playoffs.final.teamAId === `team-${playerId}` || t.playoffs.final.teamBId === `team-${playerId}` ? (
                      <Button variant="gold" onClick={onSetMatchReady} className="w-full py-2 flex items-center justify-center gap-1.5">
                        <Trophy size={14} className="fill-current" /> LAUNCH FINAL LOBBY
                      </Button>
                    ) : (
                      <span className="text-xs text-yellow-500 font-black uppercase tracking-wider block text-center animate-pulse bg-yellow-500/10 py-1 rounded-lg border border-yellow-500/20 flex items-center justify-center gap-1.5">
                        <Zap size={10} className="fill-yellow-500 text-yellow-500" /> MATCH IN PROGRESS
                      </span>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
