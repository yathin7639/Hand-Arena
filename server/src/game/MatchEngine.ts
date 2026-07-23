import type {
  BallReveal,
  BatBowlChoice,
  HandNumber,
  InningsScore,
  MatchSummary,
  MatchView,
  PlayerTeam,
  CompletedInnings,
  InningsNumber,
  CrazyRulesConfig,
  CrazyBallState,
  MysteryEventType
} from "@hand-cricket/shared";
import {
  getRandomCommentary,
  getT10AllowedNumbers,
  getMirroredNumber
} from "@hand-cricket/shared";
import type { BallEvent } from "@hand-cricket/shared";

const emptyScore = (): InningsScore => ({ runs: 0, wickets: 0, balls: 0 });

export class MatchEngine {
  private innings: InningsNumber = 1;
  private battingTeam: PlayerTeam;
  private bowlingTeam: PlayerTeam;
  private battingTeamId: string;
  private bowlingTeamId: string;
  private teamAId: string;
  private teamBId: string;
  private battingPlayerId?: string;
  private bowlingPlayerId?: string;
  private firstInnings?: InningsScore;
  private completedInnings: CompletedInnings[] = [];
  private current: InningsScore = emptyScore();
  private target?: number;
  private pending = new Map<string, HandNumber>();
  private lastReveal?: BallReveal;
  private summary?: MatchSummary;
  private overs: number;
  private matchType: "single" | "double";
  private jokerPlayerId: string | null = null;

  private teamAPlayerIds: string[];
  private teamBPlayerIds: string[];
  private yetToBatPlayerIds: string[] = [];
  private dismissedPlayerIds: string[] = [];

  // V2 Extensions
  private crazyRules?: CrazyRulesConfig;
  private isT10: boolean = false;
  private crazyState: CrazyBallState = {};
  private crazyHighlights: string[] = [];
  private t10Timeline: string[] = [];

  // Match Timeline
  public timeline: BallEvent[] = [];

  constructor(
    tossWinnerTeam: PlayerTeam,
    tossWinnerChoice: BatBowlChoice,
    teamAPlayerIds: string[],
    teamBPlayerIds: string[],
    teamAId: string,
    teamBId: string,
    overs: number = 5,
    matchType: "single" | "double" = "single",
    jokerPlayerId: string | null = null,
    crazyRules?: CrazyRulesConfig,
    isT10: boolean = false
  ) {
    this.overs = isT10 ? 10 : overs;
    this.matchType = matchType;
    this.teamAPlayerIds = teamAPlayerIds;
    this.teamBPlayerIds = teamBPlayerIds;
    this.teamAId = teamAId;
    this.teamBId = teamBId;
    this.jokerPlayerId = jokerPlayerId;
    this.crazyRules = crazyRules;
    this.isT10 = isT10;

    const winnerBats = tossWinnerChoice === "bat";
    const otherTeam: PlayerTeam = tossWinnerTeam === "A" ? "B" : "A";

    this.battingTeam = winnerBats ? tossWinnerTeam : otherTeam;
    this.bowlingTeam = winnerBats ? otherTeam : tossWinnerTeam;

    this.battingTeamId = this.battingTeam === "A" ? teamAId : teamBId;
    this.bowlingTeamId = this.bowlingTeam === "A" ? teamAId : teamBId;

    this.initInnings();
    this.updateOverModifiers();
  }

  private initInnings(): void {
    const battingIds = this.battingTeam === "A" ? this.teamAPlayerIds : this.teamBPlayerIds;
    this.yetToBatPlayerIds = [...battingIds];
    this.dismissedPlayerIds = [];
    this.battingPlayerId = undefined;
    this.bowlingPlayerId = undefined;
    this.pending.clear();
  }

  public getCurrentAllowedNumbers(): HandNumber[] {
    const overOneBased = Math.floor(this.current.balls / 6) + 1;
    if (this.isT10) {
      return getT10AllowedNumbers(overOneBased);
    }

    if (this.crazyRules) {
      const allowed: HandNumber[] = [];
      const all: HandNumber[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const restriction = this.crazyRules.numberRestriction;

      for (const n of all) {
        let valid = true;
        if (restriction === "even" && n % 2 !== 0) valid = false;
        if (restriction === "odd" && n % 2 === 0) valid = false;
        if (
          (restriction === "any2" || restriction === "any3" || restriction === "any4" || restriction === "custom") &&
          this.crazyRules.customNumbers
        ) {
          if (!this.crazyRules.customNumbers.includes(n)) valid = false;
        }

        if (this.crazyRules.frozenNumberEnabled && this.crazyState.frozenNumber === n) {
          valid = false;
        }

        if (valid) allowed.push(n);
      }

      return allowed.length > 0 ? allowed : all;
    }

    return [0, 1, 2, 3, 4, 5, 6];
  }

  private updateOverModifiers(): void {
    const overIndex = Math.floor(this.current.balls / 6);
    const overOneBased = overIndex + 1;

    if (this.isT10) {
      const phaseMsg = `T10 Phase: Overs ${overOneBased <= 3 ? "1-3 (1,2,3,4)" : overOneBased <= 7 ? "4-7 (5,6,7,0)" : "8-10 (All)"}`;
      if (!this.t10Timeline.includes(phaseMsg)) {
        this.t10Timeline.push(phaseMsg);
      }
    }

    if (!this.crazyRules) return;

    // Reset over state
    this.crazyState = {
      ...this.crazyState,
      isGoldenOver: this.crazyRules.goldenOverEnabled && overIndex === (this.crazyRules.goldenOverIndex ?? 0),
      isPressureOver: this.crazyRules.pressureOverEnabled && overIndex === (this.crazyRules.pressureOverIndex ?? 4),
      mirrorActive: this.crazyRules.mirrorMode
    };

    if (this.crazyRules.frozenNumberEnabled) {
      const candidates: HandNumber[] = [0, 1, 2, 3, 4, 5, 6];
      this.crazyState.frozenNumber = candidates[Math.floor(Math.random() * candidates.length)];
    }

    if (this.crazyRules.hotNumberEnabled) {
      const candidates: HandNumber[] = [1, 2, 3, 4, 5, 6];
      this.crazyState.hotNumber = candidates[Math.floor(Math.random() * candidates.length)];
    }

    if (this.crazyRules.luckyNumberEnabled && (this.crazyRules.luckyNumberFreq === "over" || !this.crazyState.activeLuckyNumber)) {
      const candidates: HandNumber[] = [1, 2, 3, 4, 5, 6];
      this.crazyState.activeLuckyNumber = candidates[Math.floor(Math.random() * candidates.length)];
    }

    if (this.crazyRules.shuffleButtons) {
      const nums: HandNumber[] = [0, 1, 2, 3, 4, 5, 6];
      for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
      }
      this.crazyState.shuffledKeyMap = nums;
    }
  }

  selectBatsman(playerId: string): void {
    const idx = this.yetToBatPlayerIds.indexOf(playerId);
    if (idx === -1) {
      throw new Error("Selected player is not in the batting list or has already batted");
    }
    this.battingPlayerId = playerId;
    this.yetToBatPlayerIds.splice(idx, 1);
  }

  selectBowler(playerId: string): void {
    if (this.jokerPlayerId && playerId === this.jokerPlayerId) {
      throw new Error("Joker cannot bowl");
    }
    const bowlingIds = this.bowlingTeam === "A" ? this.teamAPlayerIds : this.teamBPlayerIds;
    if (!bowlingIds.includes(playerId)) {
      throw new Error("Selected player is not on the bowling team");
    }
    this.bowlingPlayerId = playerId;
  }

  submitBall(
    playerId: string,
    number: HandNumber
  ): { event: "pending" | "score" | "wicket" | "over-completed" | "innings" | "over"; view: MatchView } {
    if (this.summary) return { event: "over", view: this.toView() };
    if (playerId !== this.battingPlayerId && playerId !== this.bowlingPlayerId) {
      throw new Error("Player is not active in this ball");
    }

    // Number Restriction Validation
    const allowed = this.getCurrentAllowedNumbers();
    if (!allowed.includes(number)) {
      throw new Error(`Hand number ${number} is restricted in the current mode/phase.`);
    }

    this.pending.set(playerId, number);
    if (this.pending.size < 2) return { event: "pending", view: this.toView() };

    const batterNumber = this.pending.get(this.battingPlayerId!);
    const bowlerNumber = this.pending.get(this.bowlingPlayerId!);
    if (batterNumber === undefined || bowlerNumber === undefined) {
      throw new Error("Ball submission is incomplete");
    }

    this.pending.clear();
    this.current.balls += 1;

    let wicket = batterNumber === bowlerNumber;
    let baseRuns = batterNumber === 0 ? bowlerNumber : batterNumber;
    let runsAdded: number = wicket ? 0 : baseRuns;
    let multiplier = 1;
    let isFreeHit = false;
    const crazyEvents: string[] = [];

    // Crazy Rules Logic
    if (this.crazyRules) {
      // Mystery Ball Trigger (15% chance if enabled)
      if (this.crazyRules.mysteryBallEnabled && Math.random() < 0.15) {
        const events: MysteryEventType[] = [
          "double_runs",
          "triple_runs",
          "free_hit",
          "safe_ball",
          "bonus_ball",
          "reverse_score",
          "no_wicket"
        ];
        const evt = events[Math.floor(Math.random() * events.length)];
        this.crazyState.activeMysteryEvent = evt;

        if (evt === "free_hit" || evt === "safe_ball" || evt === "no_wicket") {
          if (wicket) {
            wicket = false;
            runsAdded = 1;
            isFreeHit = true;
            crazyEvents.push(`🔮 Mystery Event: ${evt.toUpperCase()} - Wicket Avoided!`);
          }
        } else if (evt === "double_runs") {
          multiplier *= 2;
          crazyEvents.push("🔮 Mystery Event: DOUBLE RUNS!");
        } else if (evt === "triple_runs") {
          multiplier *= 3;
          crazyEvents.push("🔮 Mystery Event: TRIPLE RUNS!");
        } else if (evt === "bonus_ball") {
          runsAdded += 2;
          crazyEvents.push("🔮 Mystery Event: +2 BONUS RUNS!");
        } else if (evt === "reverse_score") {
          runsAdded = Math.abs(7 - batterNumber);
          crazyEvents.push(`🔮 Mystery Event: REVERSE SCORE (${runsAdded} Runs)!`);
        }
      }

      // Lucky Number
      if (this.crazyRules.luckyNumberEnabled && batterNumber === this.crazyState.activeLuckyNumber && !wicket) {
        multiplier *= 2;
        crazyEvents.push(`🍀 Lucky Number ${batterNumber} Hit! 2x Runs!`);
      }

      // Jackpot Ball
      if (this.crazyRules.jackpotBallEnabled && (this.current.balls % 3 === 0)) {
        this.crazyState.isJackpotBall = true;
        this.crazyState.jackpotMultiplier = this.crazyRules.jackpotMultiplier;
        if (!wicket) {
          multiplier *= this.crazyRules.jackpotMultiplier;
          crazyEvents.push(`💥 Jackpot Ball! ${this.crazyRules.jackpotMultiplier}x Runs!`);
        }
      }

      // Golden Over / Pressure Over
      if (this.crazyState.isGoldenOver && !wicket) {
        multiplier *= 2;
        crazyEvents.push("⭐ Golden Over Multiplier (2x)!");
      }
      if (this.crazyState.isPressureOver && !wicket) {
        multiplier *= 2;
        crazyEvents.push("🔥 Pressure Over Multiplier (2x)!");
      }

      // Hot Number
      if (this.crazyRules.hotNumberEnabled && batterNumber === this.crazyState.hotNumber && !wicket) {
        runsAdded += 1;
        crazyEvents.push(`🔥 Hot Number ${batterNumber} (+1 Bonus Run)!`);
      }

      // Calculate final runs added
      if (!wicket) {
        runsAdded = runsAdded * multiplier;
        this.current.runs += runsAdded;
      }

      // Sudden Death Check
      if (this.crazyRules.suddenDeath && wicket) {
        crazyEvents.push("☠️ Sudden Death! First Wicket Ends Match!");
      }

      if (crazyEvents.length > 0) {
        this.crazyHighlights.push(...crazyEvents);
      }
    } else {
      if (!wicket) {
        this.current.runs += runsAdded;
      }
    }

    if (wicket) {
      this.current.wickets += 1;
      this.dismissedPlayerIds.push(this.battingPlayerId!);
      this.battingPlayerId = undefined;
    }

    // Dynamic Commentary Picker
    let commentCategory: "six" | "four" | "wicket" | "dot" | "run" | "thriller" = "run";
    if (wicket) {
      commentCategory = "wicket";
    } else if (runsAdded >= 6) {
      commentCategory = "six";
    } else if (runsAdded === 4) {
      commentCategory = "four";
    } else if (runsAdded === 0) {
      commentCategory = "dot";
    }

    // Check if target is chased down or close in chasing innings
    const isChasing = (this.matchType === "single" && this.innings === 2) || (this.matchType === "double" && this.innings === 4);
    if (isChasing && this.target) {
      const remainingRuns = this.target - this.current.runs;
      if (remainingRuns <= 6 && (this.overs * 6) - this.current.balls <= 6) {
        commentCategory = "thriller";
      }
    }

    const commentary = getRandomCommentary(commentCategory);

    const batterId = wicket ? this.dismissedPlayerIds[this.dismissedPlayerIds.length - 1] : this.battingPlayerId!;
    const bowlerId = this.bowlingPlayerId!;

    this.lastReveal = {
      batterNumber,
      bowlerNumber,
      runsAdded,
      wicket,
      batterId,
      bowlerId,
      commentary,
      crazyEvents: crazyEvents.length > 0 ? crazyEvents : undefined,
      multiplier: multiplier > 1 ? multiplier : undefined,
      isFreeHit
    };

    // Save to Match Timeline
    const overNumber = Math.floor((this.current.balls - 1) / 6);
    const ballNumber = ((this.current.balls - 1) % 6) + 1;
    this.timeline.push({
      ballNumber,
      overNumber,
      batterId,
      bowlerId,
      batterNumber,
      bowlerNumber,
      runsAdded,
      wicket,
      commentary,
      innings: this.innings
    });

    // Check if target is chased down in chasing innings
    if (isChasing && this.target && this.current.runs >= this.target) {
      this.finish(`Target chased down by team`);
      return { event: "over", view: this.toView() };
    }

    // Handle Sudden Death
    if (wicket && this.crazyRules?.suddenDeath) {
      this.finish("Sudden Death: Wicket lost!");
      return { event: "over", view: this.toView() };
    }

    // Handle Wicket / All-Out
    if (wicket) {
      const battingIds = this.battingTeam === "A" ? this.teamAPlayerIds : this.teamBPlayerIds;
      const allOut = this.dismissedPlayerIds.length >= battingIds.length;

      if (allOut) {
        if (this.matchType === "single") {
          if (this.innings === 1) {
            this.switchInnings();
            return { event: "innings", view: this.toView() };
          }
          this.finish(`Bowled out to end match`);
          return { event: "over", view: this.toView() };
        } else {
          // Double Innings
          if (this.innings === 1 || this.innings === 2) {
            this.switchInnings();
            return { event: "innings", view: this.toView() };
          } else if (this.innings === 3) {
            // Check for Innings Defeat
            const totalA = this.completedInnings[0].runs + this.current.runs;
            const totalB = this.completedInnings[1].runs;
            if (totalA < totalB) {
              this.completedInnings.push({
                runs: this.current.runs,
                wickets: this.current.wickets,
                balls: this.current.balls,
                teamId: this.battingTeamId,
                teamKey: this.battingTeam,
                inningsNum: 2
              });
              this.finish("Innings defeat");
              return { event: "over", view: this.toView() };
            }
            this.switchInnings();
            return { event: "innings", view: this.toView() };
          } else {
            this.finish(`Bowled out to end match`);
            return { event: "over", view: this.toView() };
          }
        }
      }

      return { event: "wicket", view: this.toView() };
    }

    // Check if over completed or max overs reached
    const overCompleted = this.current.balls % 6 === 0;
    const maxOversReached = this.current.balls >= this.overs * 6;

    if (maxOversReached) {
      if (this.matchType === "single") {
        if (this.innings === 1) {
          this.switchInnings();
          return { event: "innings", view: this.toView() };
        }
        this.finish(`Overs completed`);
        return { event: "over", view: this.toView() };
      } else {
        // Double Innings
        if (this.innings === 1 || this.innings === 2) {
          this.switchInnings();
          return { event: "innings", view: this.toView() };
        } else if (this.innings === 3) {
          // Check for Innings Defeat
          const totalA = this.completedInnings[0].runs + this.current.runs;
          const totalB = this.completedInnings[1].runs;
          if (totalA < totalB) {
            this.completedInnings.push({
              runs: this.current.runs,
              wickets: this.current.wickets,
              balls: this.current.balls,
              teamId: this.battingTeamId,
              teamKey: this.battingTeam,
              inningsNum: 2
            });
            this.finish("Innings defeat");
            return { event: "over", view: this.toView() };
          }
          this.switchInnings();
          return { event: "innings", view: this.toView() };
        } else {
          this.finish(`Overs completed`);
          return { event: "over", view: this.toView() };
        }
      }
    }

    if (overCompleted) {
      this.bowlingPlayerId = undefined; // Force bowling captain to choose next bowler
      this.updateOverModifiers();
      return { event: "over-completed", view: this.toView() };
    }

    return { event: "score", view: this.toView() };
  }

  private switchInnings(): void {
    // 1. Save the completed innings score
    this.completedInnings.push({
      runs: this.current.runs,
      wickets: this.current.wickets,
      balls: this.current.balls,
      teamId: this.battingTeamId,
      teamKey: this.battingTeam,
      inningsNum: (this.matchType === "double" && this.innings > 2) ? 2 : 1
    });

    // 2. Set firstInnings reference if this was Innings 1
    if (this.innings === 1) {
      this.firstInnings = { ...this.current };
      if (this.matchType === "single") {
        this.target = this.current.runs + 1;
      }
    }

    // 3. Increment Innings count
    this.innings = (this.innings + 1) as InningsNumber;

    // 4. Calculate target in Double Innings mode if entering Innings 4
    if (this.matchType === "double" && this.innings === 4) {
      const teamARuns = (this.battingTeam === "A" ? this.completedInnings[0].runs : this.completedInnings[1].runs) +
                        (this.completedInnings.length > 2 ? this.completedInnings[2].runs : 0);
      const teamBRuns = (this.bowlingTeam === "A" ? this.completedInnings[0].runs : this.completedInnings[1].runs) +
                        (this.completedInnings.length > 2 ? this.completedInnings[2].runs : 0);

      this.target = (teamBRuns - teamARuns) + 1;
    }

    // 5. Swap Batting and Bowling Teams & IDs
    const prevBattingTeam = this.battingTeam;
    this.battingTeam = this.bowlingTeam;
    this.bowlingTeam = prevBattingTeam;

    const prevBattingTeamId = this.battingTeamId;
    this.battingTeamId = this.bowlingTeamId;
    this.bowlingTeamId = prevBattingTeamId;

    // 6. Reset current innings score
    this.current = emptyScore();

    // 7. Reset player state for the new innings
    this.initInnings();
    this.updateOverModifiers();
  }

  private finish(reason: string): void {
    const firstTeamId = this.battingTeam === "A" ? this.battingTeamId : this.bowlingTeamId;
    const secondTeamId = this.battingTeam === "A" ? this.bowlingTeamId : this.battingTeamId;

    let totalFirst = 0;
    let totalSecond = 0;
    let wicketsFirst = 0;
    let wicketsSecond = 0;
    let ballsFirst = 0;
    let ballsSecond = 0;

    if (this.matchType === "double") {
      totalFirst += this.completedInnings[0].runs;
      wicketsFirst += this.completedInnings[0].wickets;
      ballsFirst += this.completedInnings[0].balls;

      totalSecond += this.completedInnings[1].runs;
      wicketsSecond += this.completedInnings[1].wickets;
      ballsSecond += this.completedInnings[1].balls;

      if (this.completedInnings.length > 2) {
        totalFirst += this.completedInnings[2].runs;
        wicketsFirst += this.completedInnings[2].wickets;
        ballsFirst += this.completedInnings[2].balls;
      } else if (this.innings === 3) {
        totalFirst += this.current.runs;
        wicketsFirst += this.current.wickets;
        ballsFirst += this.current.balls;
      }

      if (this.innings === 4) {
        totalSecond += this.current.runs;
        wicketsSecond += this.current.wickets;
        ballsSecond += this.current.balls;
      }
    } else {
      totalFirst = this.firstInnings?.runs ?? 0;
      wicketsFirst = this.firstInnings?.wickets ?? 0;
      ballsFirst = this.firstInnings?.balls ?? 0;

      totalSecond = this.current.runs;
      wicketsSecond = this.current.wickets;
      ballsSecond = this.current.balls;
    }

    const firstWon = totalFirst > totalSecond;
    const tie = totalFirst === totalSecond;

    this.summary = {
      winnerTeam: tie ? undefined : firstWon ? firstTeamId : secondTeamId,
      winnerTeamId: tie ? undefined : firstWon ? firstTeamId : secondTeamId,
      tie,
      reason,
      scores: {
        [firstTeamId]: { runs: totalFirst, wickets: wicketsFirst, balls: ballsFirst },
        [secondTeamId]: { runs: totalSecond, wickets: wicketsSecond, balls: ballsSecond }
      },
      crazyHighlights: this.crazyHighlights.length > 0 ? this.crazyHighlights : undefined,
      t10Timeline: this.t10Timeline.length > 0 ? this.t10Timeline : undefined
    };
  }

  toView(): MatchView {
    return {
      innings: this.innings,
      battingTeam: this.battingTeam,
      bowlingTeam: this.bowlingTeam,
      battingTeamId: this.battingTeamId,
      bowlingTeamId: this.bowlingTeamId,
      battingPlayerId: this.battingPlayerId,
      bowlingPlayerId: this.bowlingPlayerId,
      firstInnings: this.firstInnings,
      completedInnings: this.completedInnings,
      current: this.current,
      target: this.target,
      lastReveal: this.lastReveal,
      pendingPlayers: [...this.pending.keys()],
      summary: this.summary,
      yetToBatPlayerIds: this.yetToBatPlayerIds,
      dismissedPlayerIds: this.dismissedPlayerIds,
      timeline: this.timeline,
      overs: this.overs,
      matchType: this.matchType,
      teamAPlayerIds: this.teamAPlayerIds,
      teamBPlayerIds: this.teamBPlayerIds,
      crazyState: this.crazyState,
      isT10: this.isT10,
      currentOverAllowedNumbers: this.getCurrentAllowedNumbers()
    };
  }

  getBattingPlayerId(): string | undefined {
    return this.battingPlayerId;
  }

  getBowlingPlayerId(): string | undefined {
    return this.bowlingPlayerId;
  }

  getPlayerStats(): Record<string, { runs: number; wickets: number }> {
    const stats: Record<string, { runs: number; wickets: number }> = {};
    for (const pId of [...this.teamAPlayerIds, ...this.teamBPlayerIds]) {
      stats[pId] = { runs: 0, wickets: 0 };
    }
    for (const event of this.timeline) {
      if (!stats[event.batterId]) {
        stats[event.batterId] = { runs: 0, wickets: 0 };
      }
      if (!stats[event.bowlerId]) {
        stats[event.bowlerId] = { runs: 0, wickets: 0 };
      }
      if (!event.wicket) {
        stats[event.batterId].runs += event.runsAdded;
      }
      if (event.wicket) {
        stats[event.bowlerId].wickets += 1;
      }
    }
    return stats;
  }

  toJSON() {
    return {
      innings: this.innings,
      battingTeam: this.battingTeam,
      bowlingTeam: this.bowlingTeam,
      battingTeamId: this.battingTeamId,
      bowlingTeamId: this.bowlingTeamId,
      teamAId: this.teamAId,
      teamBId: this.teamBId,
      battingPlayerId: this.battingPlayerId,
      bowlingPlayerId: this.bowlingPlayerId,
      firstInnings: this.firstInnings,
      completedInnings: this.completedInnings,
      current: this.current,
      target: this.target,
      pending: Array.from(this.pending.entries()),
      lastReveal: this.lastReveal,
      summary: this.summary,
      overs: this.overs,
      matchType: this.matchType,
      jokerPlayerId: this.jokerPlayerId,
      teamAPlayerIds: this.teamAPlayerIds,
      teamBPlayerIds: this.teamBPlayerIds,
      yetToBatPlayerIds: this.yetToBatPlayerIds,
      dismissedPlayerIds: this.dismissedPlayerIds,
      timeline: this.timeline,
      crazyRules: this.crazyRules,
      isT10: this.isT10,
      crazyState: this.crazyState,
      crazyHighlights: this.crazyHighlights,
      t10Timeline: this.t10Timeline
    };
  }

  static fromJSON(data: any): MatchEngine {
    const engine = Object.create(MatchEngine.prototype);
    Object.assign(engine, {
      ...data,
      pending: new Map(data.pending)
    });
    return engine;
  }
}
