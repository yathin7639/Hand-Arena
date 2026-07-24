import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import type {
  BatBowlChoice,
  ClientSession,
  ClientToServerEvents,
  HandNumber,
  RoomView,
  ServerAck,
  TossSide,
  ChatMessage
} from "@hand-cricket/shared";
import { loadSession, saveSession } from "../lib/session.js";
import { SOCKET_URL } from "../config.js";

interface GameSocket {
  connected: boolean;
  emit: (eventName: string, ...args: unknown[]) => void;
  on: (eventName: string, listener: (...args: any[]) => void) => void;
  off: (eventName: string, listener?: (...args: any[]) => void) => void;
}

export function useSocketGame() {
  const [socket] = useState<GameSocket>(() => {
    console.log("[HandArena] Connecting Socket.IO to backend:", SOCKET_URL);
    return io(SOCKET_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    }) as unknown as GameSocket;
  });
  const [session, setSession] = useState<ClientSession>(() => loadSession());
  const [room, setRoom] = useState<RoomView>();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string>();
  const [latency, setLatency] = useState<number>();
  const [connected, setConnected] = useState(socket.connected);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">(
    socket.connected ? "connected" : "connecting"
  );

  const updateSession = useCallback((next: ClientSession) => {
    setSession(next);
    saveSession(next);
  }, []);

  const ack = useCallback(<T,>(event: keyof ClientToServerEvents, payload: unknown) => {
    setError(undefined);
    if (!connected) {
      const msg = "Server is offline or not connected";
      setError(msg);
      return Promise.reject(new Error(msg));
    }
    return new Promise<T>((resolve, reject) => {
      (socket.emit as any)(event, payload, (response: ServerAck<T>) => {
        if (!response.ok || !response.data) {
          const message = response.error ?? "Request failed";
          setError(message);
          reject(new Error(message));
          return;
        }
        resolve(response.data);
      });
    });
  }, [socket, connected]);

  useEffect(() => {
    const update = (next: RoomView) => {
      console.log("[DEBUG] Room state received - Room Code:", next.code, "Phase:", next.phase);
      setRoom(next);
    };
    const rawSocket = socket as any;

    socket.on("connect", () => {
      console.log("[Socket Connected] Socket connected successfully");
      setConnected(true);
      setConnectionStatus("connected");
      setError(undefined);
    });

    socket.on("connect_error", (err) => {
      console.error("[Connection Error] Socket connection error:", err);
      setConnected(false);
      setConnectionStatus("disconnected");
      setError("Unable to connect to the server.");
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket Disconnected] Reason:", reason);
      setConnected(false);
      setConnectionStatus("disconnected");
    });

    if (rawSocket.io) {
      rawSocket.io.on("reconnect_attempt", (attempt: number) => {
        console.log(`[Reconnect Attempt] Attempt #${attempt}`);
        setConnectionStatus("connecting");
      });
    }

    socket.on("roomUpdated", update);
    socket.on("startGame", update);
    socket.on("inningsChange", update);
    socket.on("scoreUpdate", update);
    socket.on("matchOver", update);
    socket.on("playerDisconnected", update);
    socket.on("errorMessage", setError);

    socket.on("chatMessageReceived", (msg: ChatMessage) => {
      setChatHistory((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const next = [...prev, msg];
        if (next.length > 200) next.shift();
        return next;
      });
    });

    socket.on("chatReactionUpdated", (payload: { messageId: string; reactions: Record<string, string[]> }) => {
      setChatHistory((prev) =>
        prev.map((m) => (m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m))
      );
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
      if (rawSocket.io) {
        rawSocket.io.off("reconnect_attempt");
      }
      socket.off("roomUpdated", update);
      socket.off("startGame", update);
      socket.off("inningsChange", update);
      socket.off("scoreUpdate", update);
      socket.off("matchOver", update);
      socket.off("playerDisconnected", update);
      socket.off("errorMessage", setError);
      socket.off("chatMessageReceived");
      socket.off("chatReactionUpdated");
    };
  }, [socket]);

  useEffect(() => {
    if (!connected || !session.roomCode) return;
    socket.emit("recoverSession", { roomCode: session.roomCode, playerId: session.playerId }, (response: ServerAck<{ room: RoomView; chatHistory: ChatMessage[] }>) => {
      if (response.ok && response.data) {
        setRoom(response.data.room);
        setChatHistory(response.data.chatHistory || []);
      }
    });
  }, [connected, session.playerId, session.roomCode, socket]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (connected) {
        const sentAt = Date.now();
        socket.emit("pingCheck", sentAt, (echo: number) => setLatency(Date.now() - echo));
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [socket, connected]);

  const actions = useMemo(
    () => ({
      reconnect: () => {
        console.log("[Reconnect Attempt] Manually triggered reconnection");
        setConnectionStatus("connecting");
        const rawSocket = socket as any;
        if (rawSocket.disconnect) rawSocket.disconnect();
        if (rawSocket.connect) rawSocket.connect();
      },
      createRoom: async (
        name: string,
        mode: "quick" | "team" | "series" | "crazy" | "bluff",
        maxPlayers: number,
        stadium: string,
        overs: number,
        matchType: "single" | "double",
        crazyRules?: any,
        subMode?: any,
        bluffConfig?: any
      ) => {
        const result = await ack<{ room: RoomView; session: ClientSession; chatHistory: ChatMessage[] }>("createRoom", {
          playerId: session.playerId,
          name,
          mode,
          maxPlayers,
          stadium,
          overs,
          matchType,
          crazyRules,
          subMode,
          bluffConfig
        });
        updateSession(result.session);
        setRoom(result.room);
        setChatHistory(result.chatHistory || []);
      },
      joinRoom: async (roomCode: string, name: string) => {
        const result = await ack<{ room: RoomView; session: ClientSession; chatHistory: ChatMessage[] }>("joinRoom", { roomCode, playerId: session.playerId, name });
        updateSession(result.session);
        setRoom(result.room);
        setChatHistory(result.chatHistory || []);
      },
      ready: () => room && ack<RoomView>("playerReady", { roomCode: room.code, playerId: session.playerId }).then(setRoom),
      tossChoice: (choice: TossSide) => room && ack<RoomView>("tossChoice", { roomCode: room.code, playerId: session.playerId, choice }).then(setRoom),
      tossNumber: (number: HandNumber) => room && ack<RoomView>("tossNumber", { roomCode: room.code, playerId: session.playerId, number }).then(setRoom),
      batOrBowl: (choice: BatBowlChoice) => room && ack<RoomView>("batOrBowl", { roomCode: room.code, playerId: session.playerId, choice }).then(setRoom),
      playBall: (number: HandNumber) => room && ack<RoomView>("ballPlayed", { roomCode: room.code, playerId: session.playerId, number }).then(setRoom),
      rematch: () => room && ack<RoomView>("rematchVote", { roomCode: room.code, playerId: session.playerId }).then(setRoom),
      assignTeam: (targetPlayerId: string, team: any) =>
        room && ack<RoomView>("assignTeam", { roomCode: room.code, playerId: session.playerId, targetPlayerId, team }).then(setRoom),
      randomizeTeams: () =>
        room && ack<RoomView>("randomizeTeams", { roomCode: room.code, playerId: session.playerId }).then(setRoom),
      selectBatsman: (selectedPlayerId: string) =>
        room && ack<RoomView>("selectBatsman", { roomCode: room.code, playerId: session.playerId, selectedPlayerId }).then(setRoom),
      selectBowler: (selectedPlayerId: string) =>
        room && ack<RoomView>("selectBowler", { roomCode: room.code, playerId: session.playerId, selectedPlayerId }).then(setRoom),
      renameTeam: (teamId: string, name: string) =>
        room && ack<RoomView>("renameTeam", { roomCode: room.code, playerId: session.playerId, teamId, name }).then(setRoom),
      updateTeamBrand: (teamId: string, logo: string, primaryColor: string, secondaryColor: string, banner: string) =>
        room && ack<RoomView>("updateTeamBrand", { roomCode: room.code, playerId: session.playerId, teamId, logo, primaryColor, secondaryColor, banner }).then(setRoom),
      transferCaptain: (teamId: string, targetPlayerId: string) =>
        room && ack<RoomView>("transferCaptain", { roomCode: room.code, playerId: session.playerId, teamId, targetPlayerId }).then(setRoom),
      kickPlayer: (targetPlayerId: string) =>
        room && ack<RoomView>("kickPlayer", { roomCode: room.code, playerId: session.playerId, targetPlayerId }).then(setRoom),
      setRoomMode: (mode: "quick" | "team" | "series") =>
        room && ack<RoomView>("setRoomMode", { roomCode: room.code, playerId: session.playerId, mode }).then(setRoom),
      startSeriesMode: () =>
        room && ack<RoomView>("startSeriesMode", { roomCode: room.code, playerId: session.playerId }).then(setRoom),
      startMatch: () =>
        room && ack<RoomView>("startMatch", { roomCode: room.code, playerId: session.playerId }).then(setRoom),
      setMatchReady: () =>
        room && ack<RoomView>("setMatchReady", { roomCode: room.code, playerId: session.playerId }).then(setRoom),
      setJokerPlayer: (jokerPlayerId: string) =>
        room && ack<RoomView>("setJokerPlayer", { roomCode: room.code, playerId: session.playerId, jokerPlayerId }).then(setRoom),
      selectSubstitutionOption: (targetPlayerId: string, option: "wait" | "captain" | "teammate", subPlayerId?: string) =>
        room && ack<RoomView>("selectSubstitutionOption", { roomCode: room.code, playerId: session.playerId, targetPlayerId, option, subPlayerId }).then(setRoom),
      continueToStandings: () =>
        room && ack<RoomView>("continueToStandings", { roomCode: room.code, playerId: session.playerId }).then(setRoom),
      spectateFixture: (fixtureId: string | null) =>
        room && ack<RoomView>("spectateFixture", { roomCode: room.code, playerId: session.playerId, fixtureId }).then(setRoom),
      sendChatMessage: (channel: "all" | "team", text: string) =>
        room && ack<ChatMessage>("sendChatMessage", { roomCode: room.code, playerId: session.playerId, channel, text }).then((msg) => {
          setChatHistory((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        }),
      addChatReaction: (messageId: string, emoji: string) =>
        room && ack<{ messageId: string; emoji: string; playerId: string }>("addChatReaction", { roomCode: room.code, playerId: session.playerId, messageId, emoji }),
      returnToLobby: () =>
        room && ack<RoomView>("returnToLobby", { roomCode: room.code, playerId: session.playerId }).then(setRoom),
      leaveRoom: () => {
        localStorage.removeItem("hand-cricket-session");
        setSession({ playerId: session.playerId, name: session.name });
        setRoom(undefined);
        setChatHistory([]);
        const rawSocket = socket as any;
        if (rawSocket.disconnect) rawSocket.disconnect();
        if (rawSocket.connect) rawSocket.connect();
      }
    }),
    [ack, room, session.playerId, session.name, socket, updateSession]
  );

  return { actions, connected, connectionStatus, error, latency, room, session, setSession: updateSession, chatHistory, socket };
}
