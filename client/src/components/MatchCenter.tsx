import type { RoomView } from "@hand-cricket/shared";
import { Button } from "./Button";
import { Card } from "./Card";

interface MatchCenterProps {
  room: RoomView;
  playerId: string;
  onReady: () => void;
  onLeaveSpectating?: () => void;
}

export function MatchCenter({ room, playerId, onReady, onLeaveSpectating }: MatchCenterProps) {
  // Find active fixture
  const getActiveFixture = () => {
    const t = room.tournament;
    if (!t) return undefined;
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

  const fixture = getActiveFixture();
  if (!fixture) {
    return (
      <Card className="text-center p-8 space-y-4">
        <h2 className="text-2xl font-bold text-white">No Active Match</h2>
        <p className="text-slate-400">Waiting for tournament progression...</p>
      </Card>
    );
  }

  const teamA = room.teams.find((t) => t.id === fixture.teamAId);
  const teamB = room.teams.find((t) => t.id === fixture.teamBId);

  if (!teamA || !teamB) {
    return (
      <Card className="text-center p-8 space-y-4">
        <h2 className="text-2xl font-bold text-white">Loading Match details...</h2>
      </Card>
    );
  }

  const capA = teamA.captainId;
  const capB = teamB.captainId;

  const isCapA = playerId === capA;
  const isCapB = playerId === capB;
  const isCaptainInMatch = isCapA || isCapB;

  const readyA = room.matchReadyIds.includes(capA);
  const readyB = room.matchReadyIds.includes(capB);

  const playerReady = room.matchReadyIds.includes(playerId);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 py-6">
      
      {/* Stage Header */}
      <div className="text-center space-y-2">
        <div className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xs uppercase tracking-widest animate-pulse">
          Match Center
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {fixture.stage === "round-robin"
            ? "League Match"
            : fixture.stage === "semifinal"
            ? "Semi-Final Match"
            : "The Grand Final"}
        </h1>
        <p className="text-slate-400 text-sm">Captains must ready up to start the coin toss</p>
      </div>

      {/* Versus Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
        {/* Team A */}
        <Card
          className="md:col-span-3 p-6 text-center space-y-4 border-2 transition-all relative overflow-hidden"
          style={{
            borderColor: readyA ? teamA.brand.primaryColor : "#1e293b",
            boxShadow: readyA ? `0 0 20px ${teamA.brand.primaryColor}20` : "none"
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: teamA.brand.primaryColor }}
          />
          <span className="text-6xl filter drop-shadow-lg inline-block animate-bounce">{teamA.brand.logo}</span>
          <div>
            <h2 className="text-2xl font-black text-white">{teamA.name}</h2>
            <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
              Captain: {room.players.find((p) => p.id === capA)?.name || "Unknown"}
            </span>
          </div>
          <div className="pt-2">
            <span
              className={`inline-block px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                readyA ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-950 text-slate-500"
              }`}
            >
              {readyA ? "READY" : "PREPARING"}
            </span>
          </div>
        </Card>

        {/* VS Spacer */}
        <div className="md:col-span-1 text-center py-4">
          <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center mx-auto text-cyan-500 text-xl font-black italic drop-shadow-glow">
            VS
          </div>
        </div>

        {/* Team B */}
        <Card
          className="md:col-span-3 p-6 text-center space-y-4 border-2 transition-all relative overflow-hidden"
          style={{
            borderColor: readyB ? teamB.brand.primaryColor : "#1e293b",
            boxShadow: readyB ? `0 0 20px ${teamB.brand.primaryColor}20` : "none"
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: teamB.brand.primaryColor }}
          />
          <span className="text-6xl filter drop-shadow-lg inline-block animate-bounce">{teamB.brand.logo}</span>
          <div>
            <h2 className="text-2xl font-black text-white">{teamB.name}</h2>
            <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
              Captain: {room.players.find((p) => p.id === capB)?.name || "Unknown"}
            </span>
          </div>
          <div className="pt-2">
            <span
              className={`inline-block px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                readyB ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-950 text-slate-500"
              }`}
            >
              {readyB ? "READY" : "PREPARING"}
            </span>
          </div>
        </Card>
      </div>

      {/* Ready Action Center */}
      <Card className="p-6 text-center max-w-lg mx-auto bg-slate-900/60 border-slate-800/80 backdrop-blur">
        {isCaptainInMatch ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Your Status</h3>
            {playerReady ? (
              <div className="space-y-2">
                <div className="text-emerald-400 font-extrabold flex items-center justify-center gap-2">
                  <span className="animate-ping w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  YOU ARE READY!
                </div>
                <p className="text-xs text-slate-400">Waiting for the other captain to confirm...</p>
              </div>
            ) : (
              <Button variant="primary" onClick={onReady} className="w-full py-4 text-lg font-black uppercase tracking-wider animate-pulse hover:scale-105">
                Ready to Toss 🏏
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-md font-bold text-slate-400 uppercase tracking-widest">Spectating</h3>
              <p className="text-sm text-slate-400">
                You are watching this match. Waiting for captains to ready up and launch toss...
              </p>
            </div>
            {onLeaveSpectating && (
              <Button
                variant="secondary"
                onClick={onLeaveSpectating}
                className="w-full py-3 font-bold uppercase tracking-wider text-xs bg-slate-950 border border-slate-800 text-slate-350 hover:text-white"
              >
                🔙 Return to Standings
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
