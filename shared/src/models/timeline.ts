export interface BallEvent {
  ballNumber: number;       // Ball index in the current over (1-6)
  overNumber: number;       // Current over index (0-4)
  batterId: string;
  bowlerId: string;
  batterNumber: number;
  bowlerNumber: number;
  runsAdded: number;
  wicket: boolean;
  commentary: string;
  innings: number;
}

export interface MatchTimeline {
  matchId: string;
  events: BallEvent[];
}
