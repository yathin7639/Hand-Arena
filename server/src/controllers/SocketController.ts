import type { ClientToServerEvents, RoomActionPayload, RoomView, ServerAck, ServerToClientEvents } from "@hand-cricket/shared";
import type { Server, Socket } from "socket.io";
import { GameManager } from "../game/GameManager.js";
import { logger } from "../utils/logger.js";
import {
  validateCreateRoomPayload,
  validateJoinRoomPayload,
  validateRoomActionPayload,
  validateBallPlayedPayload
} from "../socket/socketValidator.js";

type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type RoomBroadcastEvent = "roomUpdated" | "startGame";

export class SocketController {
  constructor(private readonly io: GameServer, private readonly manager: GameManager) {}

  register(): void {
    this.io.on("connection", (socket) => {
      logger.info("Socket", `Client connected: ${socket.id}`);
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: GameSocket): void {
    socket.on("createRoom", (rawPayload, ack) =>
      this.safeAck(ack, () => {
        const payload = validateCreateRoomPayload(rawPayload);
        const room = this.manager.createRoom(
          payload.playerId,
          payload.name,
          socket.id,
          payload.mode,
          payload.maxPlayers,
          payload.stadium,
          payload.overs,
          payload.matchType,
          payload.crazyRules,
          payload.subMode
        );
        socket.join(room.code);
        logger.info("Socket", `Room created: ${room.code} by player: ${payload.playerId}`);
        this.emitSystemMessages(room);
        return {
          room: room.toView(payload.playerId),
          session: { playerId: payload.playerId, roomCode: room.code, name: payload.name },
          chatHistory: room.chatMessages
        };
      })
    );

    socket.on("joinRoom", (rawPayload, ack) =>
      this.safeAck(ack, () => {
        const payload = validateJoinRoomPayload(rawPayload);
        const room = this.manager.joinRoom(payload.roomCode, payload.playerId, payload.name, socket.id);
        socket.join(room.code);
        this.emitRoom(room.code);
        logger.info("Socket", `Player ${payload.playerId} joined room: ${room.code}`);
        this.emitSystemMessages(room);
        return {
          room: room.toView(payload.playerId),
          session: { playerId: payload.playerId, roomCode: room.code, name: payload.name },
          chatHistory: room.chatMessages
        };
      })
    );

    socket.on("recoverSession", (rawPayload, ack) =>
      this.safeAck(ack, () => {
        const payload = validateRoomActionPayload(rawPayload);
        const room = this.manager.recoverRoom(payload.roomCode, payload.playerId, socket.id);
        socket.join(room.code);
        this.emitRoom(room.code);
        logger.info("Socket", `Player ${payload.playerId} recovered session in room: ${room.code}`);
        this.emitSystemMessages(room);
        return { room: room.toView(payload.playerId), chatHistory: room.chatMessages };
      })
    );

    socket.on("playerReady", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.toggleReady(payload.playerId), "startGame")
    );
    socket.on("tossChoice", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.chooseToss(payload.playerId, payload.choice))
    );
    socket.on("tossNumber", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.submitTossNumber(payload.playerId, payload.number))
    );
    socket.on("batOrBowl", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.chooseBatOrBowl(payload.playerId, payload.choice), "startGame")
    );
    socket.on("rematchVote", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.voteRematch(payload.playerId))
    );

    socket.on("assignTeam", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.assignTeam(payload.playerId, payload.targetPlayerId, payload.team))
    );

    socket.on("randomizeTeams", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.randomizeTeams(payload.playerId))
    );

    socket.on("selectBatsman", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.selectBatsman(payload.playerId, payload.selectedPlayerId))
    );

    socket.on("selectBowler", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.selectBowler(payload.playerId, payload.selectedPlayerId))
    );

    socket.on("renameTeam", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.renameTeam(payload.playerId, payload.teamId, payload.name))
    );

    socket.on("updateTeamBrand", (payload, ack) =>
      this.roomAction(
        payload,
        ack,
        (room) =>
          room.updateTeamBrand(
            payload.playerId,
            payload.teamId,
            payload.logo,
            payload.primaryColor,
            payload.secondaryColor,
            payload.banner
          )
      )
    );

    socket.on("transferCaptain", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.transferCaptain(payload.playerId, payload.teamId, payload.targetPlayerId))
    );

    socket.on("kickPlayer", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.kickPlayer(payload.playerId, payload.targetPlayerId))
    );

    socket.on("setRoomMode", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.setRoomMode(payload.playerId, payload.mode))
    );

    socket.on("startSeriesMode", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.startSeriesMode(payload.playerId))
    );

    socket.on("startMatch", (payload, ack) => {
      logger.info("Socket", `Host requested Start Match in room: ${payload.roomCode}`);
      return this.roomAction(payload, ack, (room) => room.startMatch(payload.playerId));
    });

    socket.on("setMatchReady", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.setMatchReady(payload.playerId))
    );

    socket.on("continueToStandings", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.continueToStandings(payload.playerId))
    );

    socket.on("spectateFixture", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.spectateFixture(payload.playerId, payload.fixtureId))
    );

    socket.on("setJokerPlayer", (payload, ack) =>
      this.roomAction(payload, ack, (room) => room.setJokerPlayer(payload.playerId, payload.jokerPlayerId))
    );

    socket.on("selectSubstitutionOption", (payload, ack) =>
      this.roomAction(payload, ack, (room) =>
        room.selectSubstitutionOption(payload.playerId, payload.targetPlayerId, payload.option, payload.subPlayerId)
      )
    );

    socket.on("sendChatMessage", (rawPayload, ack) => {
      try {
        const payload = validateRoomActionPayload(rawPayload) as any;
        const textRaw = (rawPayload as any)?.text;
        const channelRaw = (rawPayload as any)?.channel;

        const room = this.manager.getRoom(payload.roomCode);
        const sender = room.getPlayer(payload.playerId);
        if (!sender) {
          ack({ ok: false, error: "Sender player not found in room" });
          return;
        }

        let text = typeof textRaw === "string" ? textRaw.trim() : "";
        if (text.length === 0) {
          ack({ ok: false, error: "Empty message" });
          return;
        }
        if (text.length > 200) {
          text = text.substring(0, 200);
        }

        const channel = channelRaw === "team" ? "team" : "all";
        const msg = room.addChatMessage(payload.playerId, sender.name, channel, text);

        if (channel === "all") {
          this.io.to(room.code).emit("chatMessageReceived", msg);
        } else if (channel === "team") {
          const targetPlayers = [...room.getPlayers()].filter((p) => p.team === sender.team);
          for (const p of targetPlayers) {
            if (p.connected && p.socketId) {
              this.io.to(p.socketId).emit("chatMessageReceived", msg);
            }
          }
        }
        this.manager.saveState();
        ack({ ok: true, data: msg });
      } catch (error) {
        ack({ ok: false, error: error instanceof Error ? error.message : "Failed to send chat message" });
      }
    });

    socket.on("addChatReaction", (rawPayload, ack) => {
      try {
        const payload = validateRoomActionPayload(rawPayload) as any;
        const messageId = (rawPayload as any)?.messageId;
        const emoji = (rawPayload as any)?.emoji;

        const room = this.manager.getRoom(payload.roomCode);
        const message = room.chatMessages.find((m) => m.id === messageId);
        if (!message) {
          ack({ ok: false, error: "Message not found" });
          return;
        }

        const validEmojis = ["🔥", "😂", "👏", "😭", "😎", "❤️", "🎉"];
        if (typeof emoji !== "string" || !validEmojis.includes(emoji)) {
          ack({ ok: false, error: "Invalid reaction emoji" });
          return;
        }

        if (!message.reactions) {
          message.reactions = {};
        }
        if (!message.reactions[emoji]) {
          message.reactions[emoji] = [];
        }

        const list = message.reactions[emoji];
        const idx = list.indexOf(payload.playerId);
        if (idx > -1) {
          list.splice(idx, 1);
        } else {
          list.push(payload.playerId);
        }

        if (list.length === 0) {
          delete message.reactions[emoji];
        }

        this.io.to(room.code).emit("chatReactionUpdated", {
          messageId: message.id,
          reactions: message.reactions
        });
        this.manager.saveState();
        ack({ ok: true, data: { messageId: message.id, emoji, playerId: payload.playerId } });
      } catch (error) {
        ack({ ok: false, error: error instanceof Error ? error.message : "Failed to add reaction" });
      }
    });

    socket.on("returnToLobby", (payload, ack) => {
      this.roomAction(payload, ack, (room) => {
        room.returnToLobby(payload.playerId);
      });
    });

    socket.on("ballPlayed", (rawPayload, ack) => {
      try {
        const payload = validateBallPlayedPayload(rawPayload);
        const room = this.manager.getRoom(payload.roomCode);
        const event = room.submitBall(payload.playerId, payload.number);
        this.emitSystemMessages(room);

        const playerView = room.toView(payload.playerId);
        ack({ ok: true, data: playerView });

        if (event === "pending") {
          this.emitRoom(room.code, "roomUpdated");
        } else if (event === "score") {
          this.emitRoom(room.code, "scoreUpdate");
        } else if (event === "wicket" || event === "over-completed") {
          this.emitRoom(room.code, "roomUpdated");
        } else if (event === "innings") {
          const fixture = room.getFixtureForPlayer(payload.playerId);
          if (fixture) {
            const teamA = room.getTeamsList().find((t) => t.id === fixture.teamAId);
            const teamB = room.getTeamsList().find((t) => t.id === fixture.teamBId);
            const capA = room.getPlayer(teamA?.captainId ?? "");
            const capB = room.getPlayer(teamB?.captainId ?? "");
            if (capA?.socketId && capA.connected) {
              this.io.to(capA.socketId).emit("inningsChange", room.toView(capA.id));
            }
            if (capB?.socketId && capB.connected) {
              this.io.to(capB.socketId).emit("inningsChange", room.toView(capB.id));
            }
            this.emitRoom(room.code);
            setTimeout(() => {
              room.continueAfterInningsBreakForFixture(fixture.id);
              this.emitRoom(room.code);
            }, 1800);
          } else {
            const view = room.toView();
            this.io.to(room.code).emit("inningsChange", view);
            this.emitRoom(room.code);
            setTimeout(() => {
              room.continueAfterInningsBreak();
              this.emitRoom(room.code);
            }, 1800);
          }
        } else if (event === "over") {
          const fixture = room.getFixtureForPlayer(payload.playerId);
          if (fixture) {
            const teamA = room.getTeamsList().find((t) => t.id === fixture.teamAId);
            const teamB = room.getTeamsList().find((t) => t.id === fixture.teamBId);
            const capA = room.getPlayer(teamA?.captainId ?? "");
            const capB = room.getPlayer(teamB?.captainId ?? "");
            if (capA?.socketId && capA.connected) {
              this.io.to(capA.socketId).emit("matchOver", room.toView(capA.id));
            }
            if (capB?.socketId && capB.connected) {
              this.io.to(capB.socketId).emit("matchOver", room.toView(capB.id));
            }
            this.emitRoom(room.code);
          } else {
            const view = room.toView();
            this.io.to(room.code).emit("matchOver", view);
          }
        }
        this.manager.saveState();
      } catch (error) {
        ack({ ok: false, error: error instanceof Error ? error.message : "Unexpected server error" });
      }
    });

    socket.on("pingCheck", (sentAt, ack) => ack(sentAt));

    socket.on("disconnect", (reason) => {
      logger.info("Socket", `Client disconnected: ${socket.id}, Reason: ${reason}`);
      const changedRooms = this.manager.markDisconnected(socket.id);
      for (const roomView of changedRooms) {
        try {
          const room = this.manager.getRoom(roomView.code);
          for (const player of room.getPlayers()) {
            if (player.socketId && player.connected) {
              const view = room.toView(player.id);
              this.io.to(player.socketId).emit("playerDisconnected", view);
              this.io.to(player.socketId).emit("roomUpdated", view);
            }
          }
        } catch {}
      }
    });
  }

  private roomAction<T extends RoomActionPayload>(
    rawPayload: T,
    ack: (response: ServerAck<RoomView>) => void,
    action: (room: ReturnType<GameManager["getRoom"]>) => void,
    event?: RoomBroadcastEvent
  ): void {
    try {
      const payload = validateRoomActionPayload(rawPayload);
      const room = this.manager.getRoom(payload.roomCode);
      action(room);
      this.emitSystemMessages(room);
      const playerView = room.toView(payload.playerId);
      ack({ ok: true, data: playerView });
      this.emitRoom(room.code, event ?? "roomUpdated");
      this.manager.saveState();
    } catch (error) {
      ack({ ok: false, error: error instanceof Error ? error.message : "Unexpected server error" });
    }
  }

  private emitSystemMessages(room: ReturnType<GameManager["getRoom"]>): void {
    while (room.pendingSystemMessages.length > 0) {
      const msg = room.pendingSystemMessages.shift();
      if (msg) {
        this.io.to(room.code).emit("chatMessageReceived", msg);
      }
    }
  }

  private emitRoom(roomCode: string, event: string = "roomUpdated"): void {
    const room = this.manager.getRoom(roomCode);
    logger.debug("Socket", `Emitting ${event} for room: ${room.code}`);
    for (const player of room.getPlayers()) {
      if (player.socketId && player.connected) {
        const playerView = room.toView(player.id);
        this.io.to(player.socketId).emit(event as any, playerView);
      }
    }
  }

  private safeAck<T>(ack: (response: ServerAck<T>) => void, fn: () => T): void {
    try {
      ack({ ok: true, data: fn() });
    } catch (error) {
      ack({ ok: false, error: error instanceof Error ? error.message : "Unexpected server error" });
    }
  }
}
