import type { RoomView, CrazyRulesConfig, BluffConfig } from "@hand-cricket/shared";
import { Room } from "./Room.js";
import { FileRoomStore, type IRoomStore } from "../services/RoomStore.js";
import { logger } from "../utils/logger.js";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class GameManager {
  private readonly roomStore: IRoomStore;

  constructor(roomStore: IRoomStore = new FileRoomStore()) {
    this.roomStore = roomStore;
  }

  createRoom(
    playerId: string,
    name: string,
    socketId: string,
    mode: "quick" | "team" | "series" | "crazy" | "bluff",
    maxPlayers: number,
    stadium: string,
    overs: number = 5,
    matchType: "single" | "double" = "single",
    crazyRules?: CrazyRulesConfig,
    subMode?: "quick" | "team" | "series" | "tournament",
    bluffConfig?: BluffConfig
  ): Room {
    const code = this.generateCode();
    const room = new Room(code, { id: playerId, name, socketId }, mode, maxPlayers, stadium, overs, matchType, crazyRules, subMode, bluffConfig);
    this.roomStore.set(code, room);
    this.saveState();
    logger.info("GameManager", `Room created: ${code} by player ${playerId}`);
    return room;
  }

  joinRoom(code: string, playerId: string, name: string, socketId: string): Room {
    const room = this.getRoom(code);
    room.addPlayer({ id: playerId, name, socketId });
    this.saveState();
    logger.info("GameManager", `Player ${playerId} (${name}) joined room ${code}`);
    return room;
  }

  recoverRoom(code: string, playerId: string, socketId: string): Room {
    const room = this.getRoom(code);
    room.markConnected(playerId, socketId);
    this.saveState();
    logger.info("GameManager", `Player ${playerId} recovered session in room ${code}`);
    return room;
  }

  getRoom(code: string): Room {
    const room = this.roomStore.get(code);
    if (!room) throw new Error("Invalid room code");
    return room;
  }

  markDisconnected(socketId: string): RoomView[] {
    const changed: RoomView[] = [];
    for (const [code, room] of this.roomStore.entries()) {
      if (room.markDisconnected(socketId)) {
        changed.push(room.toView());
      }
      if (room.isEmpty()) {
        setTimeout(() => {
          const candidate = this.roomStore.get(code);
          if (candidate?.isEmpty()) {
            this.roomStore.delete(code);
            this.saveState();
            logger.info("GameManager", `Cleaned up empty room: ${code}`);
          }
        }, 60_000);
      }
    }
    if (changed.length > 0) {
      this.saveState();
    }
    return changed;
  }

  private generateCode(): string {
    let code = "";
    do {
      code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    } while (this.roomStore.has(code));
    return code;
  }

  public saveState(): void {
    this.roomStore.save();
  }
}
