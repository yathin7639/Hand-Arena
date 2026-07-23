import type { TeamBrand } from "./brand.js";

export interface TeamStats {
  wins: number;
  losses: number;
  runsScored: number;
  runsConceded: number;
  ballsFaced: number;
  ballsBowled: number;
}

export interface Team {
  id: string;
  name: string;
  brand: TeamBrand;
  captainId: string;
  playerIds: string[];
  stats: TeamStats;
  points: number;
}

export function calculateNRR(stats: TeamStats): number {
  const oversFaced = stats.ballsFaced / 6;
  const oversBowled = stats.ballsBowled / 6;
  const rateScored = oversFaced > 0 ? stats.runsScored / oversFaced : 0;
  const rateConceded = oversBowled > 0 ? stats.runsConceded / oversBowled : 0;
  return Number((rateScored - rateConceded).toFixed(3));
}

export function formatOvers(balls: number): string {
  const overs = Math.floor(balls / 6);
  const extra = balls % 6;
  return `${overs}.${extra}`;
}

