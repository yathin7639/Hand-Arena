import type {
  Team,
  Tournament,
  TournamentFixture,
  FixtureScore
} from "@hand-cricket/shared";
import { generateRoundRobin, calculateNRR } from "@hand-cricket/shared";

export class TournamentEngine {
  public tournament: Tournament;

  constructor(teams: Team[]) {
    // Generate Round Robin fixtures
    const teamIds = teams.map((t) => t.id);
    const generated = generateRoundRobin(teamIds);

    const fixtures: TournamentFixture[] = generated.map((f, index) => ({
      id: `f-${index + 1}`,
      teamAId: f.teamAId,
      teamBId: f.teamBId,
      status: "pending",
      stage: "round-robin",
      round: f.round
    }));

    const totalRounds = teamIds.length % 2 === 0 ? teamIds.length - 1 : teamIds.length;

    this.tournament = {
      id: `t-${Date.now()}`,
      teams,
      fixtures,
      currentFixtureIndex: 0,
      phase: "round-robin",
      playoffs: {
        semis: []
      },
      currentRound: 1,
      totalRounds,
      eliminatedTeamIds: [],
      playerStats: {}
    };
  }

  renameTeam(teamId: string, name: string): void {
    const team = this.tournament.teams.find((t: Team) => t.id === teamId);
    if (team) {
      team.name = name;
    }
  }

  updateBrand(teamId: string, logo: string, primaryColor: string, secondaryColor: string, banner: string): void {
    const team = this.tournament.teams.find((t: Team) => t.id === teamId);
    if (team) {
      team.brand = { logo, primaryColor, secondaryColor, banner };
    }
  }

  getSortedStandings(): Team[] {
    return [...this.tournament.teams].sort((a, b) => {
      // 1. Points
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      // 2. Net Run Rate
      const nrrA = calculateNRR(a.stats);
      const nrrB = calculateNRR(b.stats);
      if (nrrB !== nrrA) {
        return nrrB - nrrA;
      }
      // 3. Wins count directly
      if (b.stats.wins !== a.stats.wins) {
        return b.stats.wins - a.stats.wins;
      }
      // 4. Alphabetical order
      return a.name.localeCompare(b.name);
    });
  }

  completeMatch(
    fixtureId: string,
    scoreA: FixtureScore,
    scoreB: FixtureScore,
    winnerTeamId?: string,
    matchPlayerStats?: Record<string, { runs: number; wickets: number }>,
    matchOvers: number = 5
  ): void {
    // Find active fixture
    let fixture = this.tournament.fixtures.find((f: TournamentFixture) => f.id === fixtureId);
    if (!fixture) {
      fixture = this.tournament.playoffs.semis.find((f: TournamentFixture) => f.id === fixtureId);
    }
    if (!fixture && this.tournament.playoffs.final?.id === fixtureId) {
      fixture = this.tournament.playoffs.final;
    }

    if (!fixture) return;

    fixture.status = "completed";
    fixture.scoreA = scoreA;
    fixture.scoreB = scoreB;
    fixture.winnerTeamId = winnerTeamId;

    // Aggregate player stats
    if (matchPlayerStats) {
      if (!this.tournament.playerStats) {
        this.tournament.playerStats = {};
      }
      for (const [pId, pStats] of Object.entries(matchPlayerStats)) {
        if (!this.tournament.playerStats[pId]) {
          this.tournament.playerStats[pId] = { runs: 0, wickets: 0 };
        }
        this.tournament.playerStats[pId].runs += pStats.runs;
        this.tournament.playerStats[pId].wickets += pStats.wickets;
      }
    }

    // Only update stats for round-robin matches
    if (fixture.stage === "round-robin") {
      const teamA = this.tournament.teams.find((t: Team) => t.id === fixture.teamAId);
      const teamB = this.tournament.teams.find((t: Team) => t.id === fixture.teamBId);

      if (teamA && teamB) {
        // In Series Mode, team size is 1 (captain only)
        const teamASize = teamA.playerIds.length || 1;
        const teamBSize = teamB.playerIds.length || 1;

        // Apply All-Out rule: if team A is all out, count full quota of overs (matchOvers * 6)
        const teamAAllOut = scoreA.wickets >= teamASize;
        const teamAAdjustedBallsFaced = teamAAllOut ? matchOvers * 6 : scoreA.balls;

        // Apply All-Out rule: if team B is all out, count full quota of overs (matchOvers * 6)
        const teamBAllOut = scoreB.wickets >= teamBSize;
        const teamBAdjustedBallsFaced = teamBAllOut ? matchOvers * 6 : scoreB.balls;

        // Update runs & balls faced/bowled
        teamA.stats.runsScored += scoreA.runs;
        teamA.stats.runsConceded += scoreB.runs;
        teamA.stats.ballsFaced += teamAAdjustedBallsFaced;
        teamA.stats.ballsBowled += teamBAdjustedBallsFaced;

        teamB.stats.runsScored += scoreB.runs;
        teamB.stats.runsConceded += scoreA.runs;
        teamB.stats.ballsFaced += teamBAdjustedBallsFaced;
        teamB.stats.ballsBowled += teamAAdjustedBallsFaced;

        if (winnerTeamId === teamA.id) {
          teamA.stats.wins += 1;
          teamA.points += 2;
          teamB.stats.losses += 1;
        } else if (winnerTeamId === teamB.id) {
          teamB.stats.wins += 1;
          teamB.points += 2;
          teamA.stats.losses += 1;
        } else {
          // Tie
          teamA.points += 1;
          teamB.points += 1;
        }
      }

      this.tournament.currentFixtureIndex += 1;
      this.checkRoundRobinCompletion();
    } else if (fixture.stage === "semifinal") {
      this.checkPlayoffsProgress();
    } else if (fixture.stage === "final") {
      this.tournament.phase = "completed";
      const runnerUpId = winnerTeamId === fixture.teamAId ? fixture.teamBId : fixture.teamAId;
      if (runnerUpId && !this.tournament.eliminatedTeamIds.includes(runnerUpId)) {
        this.tournament.eliminatedTeamIds.push(runnerUpId);
      }
    }
  }

  private checkRoundRobinCompletion(): void {
    const allCompleted = this.tournament.fixtures.every((f: TournamentFixture) => f.status === "completed");
    if (!allCompleted) return;

    const standings = this.getSortedStandings();
    const count = standings.length;

    if (count === 3) {
      // 3 Teams: Top 2 qualify directly for final, 3rd eliminated.
      this.tournament.phase = "finals";
      this.tournament.playoffs.final = {
        id: "final-1",
        teamAId: standings[0].id, // 1st
        teamBId: standings[1].id, // 2nd
        status: "pending",
        stage: "final",
        round: this.tournament.totalRounds + 1
      };
      this.tournament.eliminatedTeamIds = [standings[2].id];
    } else if (count === 4) {
      // 4 Teams: bottom 1 eliminated, top team straight to final, 2nd vs 3rd play semi
      this.tournament.phase = "semifinals";
      this.tournament.playoffs.semis = [
        {
          id: "semi-1",
          teamAId: standings[1].id, // 2nd
          teamBId: standings[2].id, // 3rd
          status: "pending",
          stage: "semifinal",
          round: this.tournament.totalRounds + 1
        }
      ];
      this.tournament.eliminatedTeamIds = [standings[3].id];
    } else if (count >= 5) {
      // 5-10 Teams: top 4 qualify for semifinals (1 vs 4 and 2 vs 3). Teams 5 and below eliminated.
      this.tournament.phase = "semifinals";
      this.tournament.playoffs.semis = [
        {
          id: "semi-1",
          teamAId: standings[0].id, // 1st
          teamBId: standings[3].id, // 4th
          status: "pending",
          stage: "semifinal",
          round: this.tournament.totalRounds + 1
        },
        {
          id: "semi-2",
          teamAId: standings[1].id, // 2nd
          teamBId: standings[2].id, // 3rd
          status: "pending",
          stage: "semifinal",
          round: this.tournament.totalRounds + 1
        }
      ];
      this.tournament.eliminatedTeamIds = standings.slice(4).map((t) => t.id);
    } else {
      // Fallback
      this.tournament.phase = "completed";
    }
  }

  private checkPlayoffsProgress(): void {
    const standings = this.getSortedStandings();
    const count = standings.length;

    if (count === 4) {
      // Semifinal winner faces 1st place team in the Final
      const semi = this.tournament.playoffs.semis[0];
      if (semi.status === "completed" && semi.winnerTeamId) {
        this.tournament.phase = "finals";
        this.tournament.playoffs.final = {
          id: "final-1",
          teamAId: standings[0].id, // 1st
          teamBId: semi.winnerTeamId, // Semi winner
          status: "pending",
          stage: "final",
          round: this.tournament.totalRounds + 2
        };
        const loserId = semi.winnerTeamId === semi.teamAId ? semi.teamBId : semi.teamAId;
        if (loserId && !this.tournament.eliminatedTeamIds.includes(loserId)) {
          this.tournament.eliminatedTeamIds.push(loserId);
        }
      }
    } else if (count >= 5) {
      // Both semifinals must complete
      const allSemisDone = this.tournament.playoffs.semis.every((f: TournamentFixture) => f.status === "completed");
      if (allSemisDone) {
        const w1 = this.tournament.playoffs.semis[0].winnerTeamId;
        const w2 = this.tournament.playoffs.semis[1].winnerTeamId;
        if (w1 && w2) {
          this.tournament.phase = "finals";
          this.tournament.playoffs.final = {
            id: "final-1",
            teamAId: w1,
            teamBId: w2,
            status: "pending",
            stage: "final",
            round: this.tournament.totalRounds + 2
          };
          const loser1 = w1 === this.tournament.playoffs.semis[0].teamAId ? this.tournament.playoffs.semis[0].teamBId : this.tournament.playoffs.semis[0].teamAId;
          const loser2 = w2 === this.tournament.playoffs.semis[1].teamAId ? this.tournament.playoffs.semis[1].teamBId : this.tournament.playoffs.semis[1].teamAId;
          if (loser1 && !this.tournament.eliminatedTeamIds.includes(loser1)) {
            this.tournament.eliminatedTeamIds.push(loser1);
          }
          if (loser2 && !this.tournament.eliminatedTeamIds.includes(loser2)) {
            this.tournament.eliminatedTeamIds.push(loser2);
          }
        }
      }
    }
  }

  toJSON() {
    return {
      tournament: this.tournament
    };
  }

  static fromJSON(data: any): TournamentEngine {
    const engine = Object.create(TournamentEngine.prototype);
    Object.assign(engine, data);
    return engine;
  }
}

