import type { HandNumber } from "../game.js";

export type NumberRestrictionType =
  | "all"
  | "even"
  | "odd"
  | "any2"
  | "any3"
  | "any4"
  | "custom";

export type TurboTimerSeconds = null | 10 | 5 | 3;

export type LuckyNumberFreq = "match" | "innings" | "over";

export type JackpotMultiplier = 2 | 3 | 5;

export type MysteryEventType =
  | "double_runs"
  | "triple_runs"
  | "free_hit"
  | "safe_ball"
  | "bonus_ball"
  | "reverse_score"
  | "no_wicket";

export interface CrazyRulesConfig {
  numberRestriction: NumberRestrictionType;
  customNumbers?: HandNumber[];
  turboTimer: TurboTimerSeconds;
  luckyNumberEnabled: boolean;
  luckyNumberFreq: LuckyNumberFreq;
  jackpotBallEnabled: boolean;
  jackpotMultiplier: JackpotMultiplier;
  mysteryBallEnabled: boolean;
  goldenOverEnabled: boolean;
  goldenOverIndex?: number; // 0-based over index e.g. over 0 (1st over) or host choice
  pressureOverEnabled: boolean;
  pressureOverIndex?: number; // Host chosen over index
  frozenNumberEnabled: boolean;
  hotNumberEnabled: boolean;
  blindPick: boolean;
  shuffleButtons: boolean;
  reverseInnings: boolean;
  suddenDeath: boolean;
  chaosMode: boolean;
  mirrorMode: boolean;
  ruleVoting: boolean;
}

export interface CrazyBallState {
  activeLuckyNumber?: HandNumber | null;
  isJackpotBall?: boolean;
  jackpotMultiplier?: number;
  activeMysteryEvent?: MysteryEventType | null;
  isGoldenOver?: boolean;
  isPressureOver?: boolean;
  frozenNumber?: HandNumber | null;
  hotNumber?: HandNumber | null;
  mirrorActive?: boolean;
  shuffledKeyMap?: HandNumber[]; // Current shuffled positions of numbers 0..6
  mysteryEventNotification?: string | null;
}

export interface T10PhaseInfo {
  phaseName: string;
  allowedNumbers: HandNumber[];
  oversRange: string;
}

export function getT10AllowedNumbers(currentOverOneBased: number): HandNumber[] {
  if (currentOverOneBased <= 3) {
    return [1, 2, 3, 4];
  } else if (currentOverOneBased <= 7) {
    return [5, 6, 7, 0];
  } else {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  }
}

export function getT10PhaseInfo(currentOverOneBased: number): T10PhaseInfo {
  if (currentOverOneBased <= 3) {
    return {
      phaseName: "Powerplay Restrictions (Overs 1-3)",
      allowedNumbers: [1, 2, 3, 4],
      oversRange: "Overs 1-3"
    };
  } else if (currentOverOneBased <= 7) {
    return {
      phaseName: "Middle Overs Shift (Overs 4-7)",
      allowedNumbers: [5, 6, 7, 0],
      oversRange: "Overs 4-7"
    };
  } else {
    return {
      phaseName: "Final Assault (Overs 8-10)",
      allowedNumbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      oversRange: "Overs 8-10"
    };
  }
}

export const DEFAULT_CRAZY_RULES: CrazyRulesConfig = {
  numberRestriction: "all",
  customNumbers: [0, 1, 2, 3, 4, 5, 6],
  turboTimer: null,
  luckyNumberEnabled: false,
  luckyNumberFreq: "over",
  jackpotBallEnabled: false,
  jackpotMultiplier: 2,
  mysteryBallEnabled: false,
  goldenOverEnabled: false,
  goldenOverIndex: 0,
  pressureOverEnabled: false,
  pressureOverIndex: 4,
  frozenNumberEnabled: false,
  hotNumberEnabled: false,
  blindPick: false,
  shuffleButtons: false,
  reverseInnings: false,
  suddenDeath: false,
  chaosMode: false,
  mirrorMode: false,
  ruleVoting: false
};

// Mirror number helper: 0<->7, 1<->6, 2<->5, 3<->4
export function getMirroredNumber(num: HandNumber): HandNumber {
  const map: Record<number, HandNumber> = {
    0: 7,
    1: 6,
    2: 5,
    3: 4,
    4: 3,
    5: 2,
    6: 1,
    7: 0,
    8: 8,
    9: 9,
    10: 10
  };
  return map[num] ?? num;
}
