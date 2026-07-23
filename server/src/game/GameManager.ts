import type { RoomView } from "@hand-cricket/shared";
import { Room } from "./Room.js";
import * as fs from "node:fs";
import * as path from "node:path";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SAVE_PATH = path.resolve("./gameState.json");

import type { CrazyRulesConfig } from "@hand-cricket/shared";

export class GameManager {
  private rooms = new Map<string, Room>();

  constructor() {
    this.loadState();
  }

  createRoom(
    playerId: string,
    name: string,
    socketId: string,
    mode: "quick" | "team" | "series" | "crazy" | "t10",
    maxPlayers: number,
    stadium: string,
    overs: number = 5,
    matchType: "single" | "double" = "single",
    crazyRules?: CrazyRulesConfig,
    subMode?: "quick" | "team" | "series" | "tournament"
  ): Room {
    const code = this.generateCode();
    const room = new Room(code, { id: playerId, name, socketId }, mode, maxPlayers, stadium, overs, matchType, crazyRules, subMode);
    this.rooms.set(code, room);
    this.saveState();
    return room;
  }

  joinRoom(code: string, playerId: string, name: string, socketId: string): Room {
    const room = this.getRoom(code);
    room.addPlayer({ id: playerId, name, socketId });
    this.saveState();
    return room;
  }

  recoverRoom(code: string, playerId: string, socketId: string): Room {
    const room = this.getRoom(code);
    room.markConnected(playerId, socketId);
    this.saveState();
    return room;
  }

  getRoom(code: string): Room {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error("Invalid room code");
    return room;
  }

  markDisconnected(socketId: string): RoomView[] {
    const changed: RoomView[] = [];
    for (const [code, room] of this.rooms) {
      if (room.markDisconnected(socketId)) changed.push(room.toView());
      if (room.isEmpty()) {
        setTimeout(() => {
          const candidate = this.rooms.get(code);
          if (candidate?.isEmpty()) {
            this.rooms.delete(code);
            this.saveState();
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
    } while (this.rooms.has(code));
    return code;
  }

  public saveState(): void {
    try {
      const data: Record<string, any> = {};
      for (const [code, room] of this.rooms.entries()) {
        data[code] = room.toJSON();
      }
      fs.writeFileSync(SAVE_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("[GameManager] Failed to save state:", err);
    }
  }

  private loadState(): void {
    try {
      if (!fs.existsSync(SAVE_PATH)) return;
      const content = fs.readFileSync(SAVE_PATH, "utf-8");
      const data = JSON.parse(content);
      for (const [code, roomData] of Object.entries(data) as [string, any][]) {
        // Set all player connections to false on startup/reload
        // since they will need to reconnect and call recoverSession
        if (roomData.players) {
          for (const p of roomData.players) {
            p[1].connected = false;
            p[1].socketId = undefined;
          }
        }
        const room = Room.fromJSON(roomData);
        this.rooms.set(code, room);
      }
      console.log(`[GameManager] Loaded ${this.rooms.size} rooms from persistent state`);
    } catch (err) {
      console.error("[GameManager] Failed to load state:", err);
    }
  }
}
