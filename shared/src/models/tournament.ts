import type { Team } from "./team.js";

export interface FixtureScore {
  runs: number;
  wickets: number;
  balls: number;
}

export interface TournamentFixture {
  id: string;
  teamAId: string;
  teamBId: string;
  status: "pending" | "playing" | "completed";
  winnerTeamId?: string;
  scoreA?: FixtureScore;
  scoreB?: FixtureScore;
  stage: "round-robin" | "semifinal" | "final";
  round: number;
}

export interface Tournament {
  id: string;
  teams: Team[];
  fixtures: TournamentFixture[];
  currentFixtureIndex: number;
  phase: "round-robin" | "semifinals" | "finals" | "completed";
  playoffs: {
    semis: TournamentFixture[];
    final?: TournamentFixture;
  };
  currentRound: number;
  totalRounds: number;
  eliminatedTeamIds: string[];
  playerStats?: Record<string, { runs: number; wickets: number }>;
}

export function generateRoundRobin(teamIds: string[]): { teamAId: string; teamBId: string; round: number }[] {
  const list = [...teamIds];
  const isOdd = list.length % 2 !== 0;
  if (isOdd) {
    list.push("bye");
  }
  const n = list.length;
  const fixtures: { teamAId: string; teamBId: string; round: number }[] = [];
  const rounds = n - 1;

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a !== "bye" && b !== "bye") {
        // Alternating home/away for balance
        if (round % 2 === 0) {
          fixtures.push({ teamAId: a, teamBId: b, round: round + 1 });
        } else {
          fixtures.push({ teamAId: b, teamBId: a, round: round + 1 });
        }
      }
    }
    // Rotate list (keep first element fixed)
    const last = list.pop();
    if (last !== undefined) {
      list.splice(1, 0, last);
    }
  }
  return fixtures;
}

