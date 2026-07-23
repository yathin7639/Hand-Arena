export interface PlayerLifetimeStats {
  matches: number;
  wins: number;
  highestScore: number;
  average: number;
  strikeRate: number;
  sixes: number;
  wickets: number;
}

export interface PlayerView {
  id: string;
  name: string;
  connected: boolean;
  ready: boolean;
  isCaptain?: boolean;
  team?: string;
  slot?: string;
  isJoker?: boolean;
  lifetimeStats?: PlayerLifetimeStats;
}
