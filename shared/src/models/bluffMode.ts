import type { HandNumber } from "../game.js";

export interface BluffPhase {
  id: string;
  name: string;
  startOver: number; // 1-based index (e.g. 1)
  endOver: number;   // 1-based index inclusive (e.g. 3)
  allowedNumbers: HandNumber[];
}

export interface BluffConfig {
  phases: BluffPhase[];
}

export const DEFAULT_BLUFF_CONFIG: BluffConfig = {
  phases: [
    {
      id: "phase-1",
      name: "Phase 1: Powerplay",
      startOver: 1,
      endOver: 3,
      allowedNumbers: [1, 3, 5]
    },
    {
      id: "phase-2",
      name: "Phase 2: Middle Shift",
      startOver: 4,
      endOver: 7,
      allowedNumbers: [2, 6, 8, 9]
    },
    {
      id: "phase-3",
      name: "Phase 3: Final Assault",
      startOver: 8,
      endOver: 10,
      allowedNumbers: [4, 7, 10]
    }
  ]
};

export function validateBluffPhases(phases: BluffPhase[]): { valid: boolean; error?: string } {
  if (!phases || phases.length === 0) {
    return { valid: false, error: "At least one phase must be defined" };
  }
  const sorted = [...phases].sort((a, b) => a.startOver - b.startOver);

  if (sorted[0].startOver !== 1) {
    return { valid: false, error: "Phases must start at Over 1" };
  }
  if (sorted[sorted.length - 1].endOver !== 10) {
    return { valid: false, error: "Phases must cover up to Over 10" };
  }

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (p.startOver > p.endOver) {
      return { valid: false, error: `Invalid over range for ${p.name}` };
    }
    if (!p.allowedNumbers || p.allowedNumbers.length === 0) {
      return { valid: false, error: `${p.name} must have at least one allowed number` };
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      if (p.startOver !== prev.endOver + 1) {
        return { valid: false, error: `Gap or overlap between ${prev.name} and ${p.name}` };
      }
    }
  }
  return { valid: true };
}

export function generateRandomBluffConfig(): BluffConfig {
  const numbers: HandNumber[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const shuffled = [...numbers].sort(() => Math.random() - 0.5);

  const phase1Nums = shuffled.slice(0, 4).sort((a, b) => a - b);
  const phase2Nums = shuffled.slice(4, 8).sort((a, b) => a - b);
  const phase3Nums = shuffled.slice(8, 11).sort((a, b) => a - b);

  return {
    phases: [
      { id: "phase-1", name: "Phase 1: Blitz", startOver: 1, endOver: 3, allowedNumbers: phase1Nums },
      { id: "phase-2", name: "Phase 2: Shift", startOver: 4, endOver: 7, allowedNumbers: phase2Nums },
      { id: "phase-3", name: "Phase 3: Endgame", startOver: 8, endOver: 10, allowedNumbers: phase3Nums }
    ]
  };
}

export function getBluffActivePhase(phases: BluffPhase[], currentOverOneBased: number): BluffPhase | undefined {
  const over = Math.min(Math.max(1, currentOverOneBased), 10);
  return phases.find((p) => over >= p.startOver && over <= p.endOver);
}
