import type { PlayerSlot, PlayerTeam } from "@hand-cricket/shared";

export interface ServerPlayer {
  id: string;
  name: string;
  slot: PlayerSlot;
  connected: boolean;
  ready: boolean;
  team: PlayerTeam;
  isCaptain: boolean;
  socketId?: string;
  latencyMs?: number;
}
