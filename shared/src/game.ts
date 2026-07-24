import type { Team } from "./models/team.js";
import type { Tournament } from "./models/tournament.js";
import type { PlayerView } from "./models/player.js";
import type { BallEvent } from "./models/timeline.js";

export type HandNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type PlayerSlot = string;
export type ReadyStatus = "idle" | "ready";

import type { CrazyRulesConfig, CrazyBallState } from "./models/crazyRules.js";
import type { BluffConfig, BluffPhase } from "./models/bluffMode.js";

export type RoomPhase =
  | "lobby"
  | "rule-summary"
  | "tournament-dashboard"
  | "match-center"
  | "toss-choice"
  | "toss-number"
  | "bat-choice"
  | "select-batsman"
  | "select-bowler"
  | "match"
  | "innings-break"
  | "match-over";

export type TossSide = "odd" | "even";
export type BatBowlChoice = "bat" | "bowl";
export type InningsNumber = 1 | 2 | 3 | 4;
export type PlayerTeam = "A" | "B" | "spectator";

export type SubstituteState =
  | { type: "waiting" }
  | { type: "captain" }
  | { type: "teammate"; playerId: string };

export interface TossView {
  chooserId?: string;
  side?: TossSide;
  numbers?: Record<string, HandNumber>;
  winnerId?: string;
  winnerChoice?: BatBowlChoice;
  reveal?: {
    total: number;
    result: TossSide;
    numbers: Record<string, HandNumber>;
  };
}

export interface InningsScore {
  runs: number;
  wickets: number;
  balls: number;
}

export interface BallReveal {
  batterNumber: HandNumber;
  bowlerNumber: HandNumber;
  runsAdded: number;
  wicket: boolean;
  batterId: string;
  bowlerId: string;
  commentary?: string;
  crazyEvents?: string[];
  multiplier?: number;
  isFreeHit?: boolean;
}

export interface CompletedInnings {
  runs: number;
  wickets: number;
  balls: number;
  teamId: string;
  teamKey: PlayerTeam;
  inningsNum: number;
}

export interface MatchView {
  innings: InningsNumber;
  battingTeam: PlayerTeam;
  bowlingTeam: PlayerTeam;
  battingTeamId?: string;  // Explicit Team ID
  bowlingTeamId?: string;  // Explicit Team ID
  battingPlayerId?: string;
  bowlingPlayerId?: string;
  firstInnings?: InningsScore;
  completedInnings: CompletedInnings[];
  current: InningsScore;
  target?: number;
  lastReveal?: BallReveal;
  pendingPlayers: string[];
  summary?: MatchSummary;
  dismissedPlayerIds: string[];
  yetToBatPlayerIds: string[];
  timeline: BallEvent[];
  overs: number;
  matchType: "single" | "double";
  teamAPlayerIds?: string[];
  teamBPlayerIds?: string[];
  crazyState?: CrazyBallState;
  isT10?: boolean;
  isBluff?: boolean;
  bluffConfig?: BluffConfig;
  currentOverAllowedNumbers?: HandNumber[];
}

export interface MatchSummary {
  winnerTeam?: string; // Winner team ID or name
  winnerTeamId?: string;
  tie: boolean;
  reason: string;
  scores: Record<string, InningsScore>; // mapped by team ID or team key
  crazyHighlights?: string[];
  t10Timeline?: string[];
  bluffTimeline?: string[];
}

export interface RoomView {
  code: string;
  mode: "quick" | "team" | "series" | "crazy" | "bluff";
  subMode?: "quick" | "team" | "series" | "tournament";
  phase: RoomPhase;
  players: PlayerView[];
  teams: Team[];
  tournament?: Tournament;
  hostId: string;
  toss: TossView;
  match?: MatchView;
  activeMatches?: Record<string, MatchView>;
  rematchVotes: string[];
  matchReadyIds: string[]; // Track ready status for Match Center
  error?: string;
  captainAId?: string;
  captainBId?: string;
  maxPlayers: number;
  stadium: string;
  overs: number;
  matchType: "single" | "double";
  jokerPlayerId?: string | null;
  disconnectTimes?: Record<string, number>;
  substituteStates?: Record<string, SubstituteState>;
  matchHistory?: MatchHistoryItem[];
  crazyRules?: CrazyRulesConfig;
  bluffConfig?: BluffConfig;
  ruleSummaryReadyIds?: string[];
}

export interface MatchHistoryItem {
  id: string;
  timestamp: number;
  stadium: string;
  overs: number;
  matchType: "single" | "double";
  mode: "quick" | "team" | "series" | "crazy" | "bluff";
  teamA: {
    id: string;
    name: string;
    logo: string;
    runs: number;
    wickets: number;
    balls: number;
    runRate: number;
    netRunRate: number;
  };
  teamB: {
    id: string;
    name: string;
    logo: string;
    runs: number;
    wickets: number;
    balls: number;
    runRate: number;
    netRunRate: number;
  };
  winnerId: string | null;
  marginOfVictory: string;
  playerOfTheMatch: {
    name: string;
    runs: number;
    wickets: number;
    impact: number;
  };
  highestScorer: {
    name: string;
    runs: number;
  };
  bestBowler: {
    name: string;
    wickets: number;
    runsConceded: number;
  };
  fallOfWickets: {
    teamA: string[];
    teamB: string[];
  };
  duration: string;
}


export interface ClientSession {
  playerId: string;
  roomCode?: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  senderId: string; // "system" for system messages
  senderName: string;
  channel: "all" | "team";
  text: string;
  timestamp: number;
  reactions: Record<string, string[]>; // emoji -> playerIds who reacted
}

export * from "./models/player.js";

