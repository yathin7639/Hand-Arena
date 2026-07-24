import * as fs from "node:fs";
import * as path from "node:path";
import { Room } from "../game/Room.js";
import { logger } from "../utils/logger.js";

export interface IRoomStore {
  get(code: string): Room | undefined;
  set(code: string, room: Room): void;
  has(code: string): boolean;
  delete(code: string): boolean;
  entries(): IterableIterator<[string, Room]>;
  size(): number;
  save(): void;
  load(): void;
}

export class FileRoomStore implements IRoomStore {
  private readonly rooms = new Map<string, Room>();
  private readonly savePath: string;

  constructor(filePath: string = "./gameState.json") {
    this.savePath = path.resolve(filePath);
    this.load();
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  set(code: string, room: Room): void {
    this.rooms.set(code.toUpperCase(), room);
  }

  has(code: string): boolean {
    return this.rooms.has(code.toUpperCase());
  }

  delete(code: string): boolean {
    return this.rooms.delete(code.toUpperCase());
  }

  entries(): IterableIterator<[string, Room]> {
    return this.rooms.entries();
  }

  size(): number {
    return this.rooms.size;
  }

  save(): void {
    try {
      const data: Record<string, unknown> = {};
      for (const [code, room] of this.rooms.entries()) {
        data[code] = room.toJSON();
      }
      fs.writeFileSync(this.savePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      logger.error("RoomStore", "Failed to save room state to disk", err);
    }
  }

  load(): void {
    try {
      if (!fs.existsSync(this.savePath)) return;
      const content = fs.readFileSync(this.savePath, "utf-8");
      const data = JSON.parse(content);
      for (const [code, roomData] of Object.entries(data) as [string, any][]) {
        if (roomData.players) {
          for (const p of roomData.players) {
            p[1].connected = false;
            p[1].socketId = undefined;
          }
        }
        const room = Room.fromJSON(roomData);
        this.rooms.set(code.toUpperCase(), room);
      }
      logger.info("RoomStore", `Loaded ${this.rooms.size} rooms from persistent state`);
    } catch (err) {
      logger.error("RoomStore", "Failed to load room state from disk", err);
    }
  }
}
