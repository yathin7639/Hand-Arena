import type { HandNumber, PlayerTeam, TossSide, BatBowlChoice } from "@hand-cricket/shared";

export function validateCreateRoomPayload(payload: unknown): {
  playerId: string;
  name: string;
  mode: "quick" | "team" | "series" | "crazy" | "t10";
  maxPlayers: number;
  stadium: string;
  overs: number;
  matchType: "single" | "double";
  crazyRules?: any;
  subMode?: any;
} {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload structure");
  }

  const p = payload as Record<string, any>;

  if (typeof p.playerId !== "string" || !p.playerId.trim()) {
    throw new Error("Invalid or missing playerId");
  }
  if (typeof p.name !== "string" || !p.name.trim()) {
    throw new Error("Invalid or missing name");
  }

  const validModes = ["quick", "team", "series", "crazy", "t10"];
  if (!validModes.includes(p.mode)) {
    throw new Error("Invalid game mode");
  }

  const maxPlayers = Number(p.maxPlayers);
  if (isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 10) {
    throw new Error("maxPlayers must be between 2 and 10");
  }

  if (typeof p.stadium !== "string" || !p.stadium.trim()) {
    throw new Error("Invalid venue stadium selection");
  }

  const overs = Number(p.overs ?? 5);
  if (isNaN(overs) || overs < 1 || overs > 50) {
    throw new Error("overs must be an integer between 1 and 50");
  }

  const matchType = p.matchType === "double" ? "double" : "single";

  return {
    playerId: p.playerId.trim(),
    name: p.name.trim().slice(0, 20),
    mode: p.mode,
    maxPlayers,
    stadium: p.stadium.trim(),
    overs,
    matchType,
    crazyRules: p.crazyRules,
    subMode: p.subMode
  };
}

export function validateJoinRoomPayload(payload: unknown): {
  roomCode: string;
  playerId: string;
  name: string;
} {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload structure");
  }
  const p = payload as Record<string, any>;

  if (typeof p.roomCode !== "string" || !p.roomCode.trim()) {
    throw new Error("Invalid or missing room code");
  }
  if (typeof p.playerId !== "string" || !p.playerId.trim()) {
    throw new Error("Invalid or missing playerId");
  }
  if (typeof p.name !== "string" || !p.name.trim()) {
    throw new Error("Invalid or missing name");
  }

  return {
    roomCode: p.roomCode.trim().toUpperCase(),
    playerId: p.playerId.trim(),
    name: p.name.trim().slice(0, 20)
  };
}

export function validateRoomActionPayload(payload: unknown): {
  roomCode: string;
  playerId: string;
} {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload structure");
  }
  const p = payload as Record<string, any>;

  if (typeof p.roomCode !== "string" || !p.roomCode.trim()) {
    throw new Error("Invalid or missing room code");
  }
  if (typeof p.playerId !== "string" || !p.playerId.trim()) {
    throw new Error("Invalid or missing playerId");
  }

  return {
    roomCode: p.roomCode.trim().toUpperCase(),
    playerId: p.playerId.trim()
  };
}

export function validateBallPlayedPayload(payload: unknown): {
  roomCode: string;
  playerId: string;
  number: HandNumber;
} {
  const base = validateRoomActionPayload(payload);
  const p = payload as Record<string, any>;

  const num = Number(p.number);
  if (isNaN(num) || num < 0 || num > 10) {
    throw new Error("Hand number must be between 0 and 10");
  }

  return {
    ...base,
    number: num as HandNumber
  };
}
