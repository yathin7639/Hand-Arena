import type {
  BatBowlChoice,
  HandNumber,
  PlayerSlot,
  PlayerTeam,
  PlayerView,
  RoomPhase,
  RoomView,
  TossSide,
  Team,
  TeamBrand,
  FixtureScore,
  TossView,
  MatchView,
  TournamentFixture,
  ChatMessage,
  SubstituteState,
  MatchHistoryItem,
  CrazyRulesConfig
} from "@hand-cricket/shared";
import type { ServerPlayer } from "../types/runtime.js";
import { MatchEngine } from "./MatchEngine.js";
import { TournamentEngine } from "./TournamentEngine.js";
import { logger } from "../utils/logger.js";

const DEFAULT_BRAND = (logo: string, color: string): TeamBrand => ({
  logo,
  primaryColor: color,
  secondaryColor: "#000000",
  banner: `linear-gradient(135deg, ${color}, #020617)`
});

const EMOJIS = ["🦁", "🐯", "🦅", "🐉", "🦈", "⚔️", "🛡️", "☄️", "🐺", "🐼"];
const COLORS = [
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Gold
  "#06b6d4", // Cyan
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f97316"  // Orange
];

export class Room {
  readonly code: string;
  private hostId: string;
  private players = new Map<string, ServerPlayer>();
  private phase: RoomPhase = "lobby";
  private mode: "quick" | "team" | "series" | "crazy" | "t10";
  private subMode?: "quick" | "team" | "series" | "tournament";
  private crazyRules?: CrazyRulesConfig;
  private toss: RoomView["toss"] = {};
  private match?: MatchEngine;
  private tournament?: TournamentEngine;
  private rematchVotes = new Set<string>();
  private matchReadyIds = new Set<string>();
  private teamsList: Team[] = [];
  private matchHistory: MatchHistoryItem[] = [];
  readonly maxPlayers: number;
  readonly stadium: string;
  readonly overs: number;
  readonly matchType: "single" | "double";

  private jokerPlayerId: string | null = null;
  private disconnectTimes = new Map<string, number>();
  private substituteStates = new Map<string, SubstituteState>();

  private matches = new Map<string, MatchEngine>();
  private tosses = new Map<string, TossView>();
  private playerPhases = new Map<string, RoomPhase>();
  private fixtureReadyIds = new Map<string, Set<string>>();
  private spectatingFixtureIds = new Map<string, string>();

  public chatMessages: ChatMessage[] = [];
  public pendingSystemMessages: ChatMessage[] = [];

  addChatMessage(senderId: string, senderName: string, channel: "all" | "team", text: string): ChatMessage {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId,
      senderName,
      channel,
      text,
      timestamp: Date.now(),
      reactions: {}
    };
    this.chatMessages.push(msg);
    if (this.chatMessages.length > 200) {
      this.chatMessages.shift();
    }
    return msg;
  }

  addSystemMessage(text: string): void {
    const msg = this.addChatMessage("system", "System", "all", text);
    this.pendingSystemMessages.push(msg);
  }

  constructor(
    code: string,
    host: Omit<ServerPlayer, "slot" | "connected" | "ready" | "team" | "isCaptain">,
    mode: "quick" | "team" | "series" | "crazy" | "t10",
    maxPlayers: number,
    stadium: string,
    overs: number = 5,
    matchType: "single" | "double" = "single",
    crazyRules?: CrazyRulesConfig,
    subMode?: "quick" | "team" | "series" | "tournament"
  ) {
    this.code = code;
    this.hostId = host.id;
    this.mode = mode;
    this.subMode = subMode;
    this.crazyRules = crazyRules;
    this.maxPlayers = maxPlayers;
    this.stadium = stadium;
    this.overs = mode === "t10" ? 10 : overs;
    this.matchType = mode === "series" ? "single" : matchType;
    this.addPlayer(host);
  }

  getHostId(): string {
    return this.hostId;
  }

  isHost(playerId: string): boolean {
    return this.hostId === playerId;
  }

  getPlayer(playerId: string): ServerPlayer | undefined {
    return this.players.get(playerId);
  }

  getPlayers(): IterableIterator<ServerPlayer> {
    return this.players.values();
  }

  getTeamsList(): Team[] {
    return this.teamsList;
  }

  returnToLobby(playerId: string): void {
    if (playerId !== this.hostId) {
      throw new Error("Only the host can return players to the lobby");
    }
    this.resetForRematch();
    this.addSystemMessage("Returned to lobby.");
  }

  addPlayer(player: Omit<ServerPlayer, "slot" | "connected" | "ready" | "team" | "isCaptain">): ServerPlayer {
    const existing = this.players.get(player.id);
    if (existing) {
      existing.connected = true;
      existing.socketId = player.socketId;
      existing.name = player.name;
      logger.info("Room", `[LOBBY ACTION] Reconnect: ${existing.name} reconnected`);
      this.addSystemMessage(`${existing.name} reconnected.`);
      this.rebuildTeams();
      this.validateState("Reconnect Player");
      return existing;
    }

    if (this.players.size >= this.maxPlayers) {
      throw new Error(`Room is full (maximum ${this.maxPlayers} players)`);
    }

    // Default team assignment: everyone joins as a spectator in Team/Series mode initially
    let defaultTeam: PlayerTeam = "spectator";
    if (this.mode === "quick") {
      const teamACount = [...this.players.values()].filter(p => p.team === "A").length;
      const teamBCount = [...this.players.values()].filter(p => p.team === "B").length;
      if (teamACount === 0) defaultTeam = "A";
      else if (teamBCount === 0) defaultTeam = "B";
    }

    const created: ServerPlayer = {
      ...player,
      slot: player.id,
      connected: true,
      ready: false,
      team: defaultTeam,
      isCaptain: false
    };

    this.players.set(created.id, created);
    this.playerPhases.set(created.id, this.phase);
    console.log(`[LOBBY ACTION] Player Joined: ${created.name} joined room as ${created.team}`);
    this.addSystemMessage(`${created.name} joined the room.`);
    this.rebuildTeams();
    this.validateState("Join Player");
    return created;
  }

  markConnected(playerId: string, socketId: string): void {
    const player = this.requirePlayer(playerId);
    player.connected = true;
    player.socketId = socketId;
    this.disconnectTimes.delete(playerId);
    this.substituteStates.delete(playerId);
    console.log(`[LOBBY ACTION] Reconnect: ${player.name} reconnected`);
    this.addSystemMessage(`${player.name} reconnected.`);
    this.rebuildTeams();
    this.validateState("Reconnect Player Mark");
  }

  markDisconnected(socketId: string): boolean {
    const player = [...this.players.values()].find((candidate) => candidate.socketId === socketId);
    if (!player) return false;

    console.log(`[LOBBY ACTION] Disconnect: ${player.name} disconnected`);
    this.addSystemMessage(`${player.name} disconnected.`);

    if (this.phase === "lobby") {
      this.players.delete(player.id);
      this.playerPhases.delete(player.id);
      if (this.jokerPlayerId === player.id) {
        this.jokerPlayerId = null;
      }
      this.disconnectTimes.delete(player.id);
      this.substituteStates.delete(player.id);
      console.log(`[LOBBY ACTION] Lobby Disconnect: Removed ${player.name} from room`);
    } else {
      player.connected = false;
      player.socketId = undefined;
      player.ready = false;
      this.disconnectTimes.set(player.id, Date.now());
      if (!this.substituteStates.has(player.id)) {
        this.substituteStates.set(player.id, { type: "waiting" });
      }
    }

    if (this.hostId === player.id) {
      const nextHost = [...this.players.values()].find((p) => p.connected);
      if (nextHost) {
        this.hostId = nextHost.id;
        console.log(`[LOBBY ACTION] Host Transferred: Host transferred to ${nextHost.name} due to host disconnect`);
      }
    }

    this.rebuildTeams();
    this.validateState("Disconnect Player");
    return true;
  }

  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    const name = player.name;

    this.players.delete(playerId);
    this.playerPhases.delete(playerId);
    console.log(`[LOBBY ACTION] Player Left: ${name} left the room`);
    this.addSystemMessage(`${name} left the room.`);

    if (this.hostId === playerId) {
      const nextHost = [...this.players.values()].find((p) => p.connected);
      if (nextHost) {
        this.hostId = nextHost.id;
        console.log(`[LOBBY ACTION] Host Transferred: Host transferred to ${nextHost.name} due to host leaving`);
      }
    }

    this.rebuildTeams();
    this.validateState("Remove Player");
  }

  setRoomMode(playerId: string, mode: "quick" | "team" | "series" | "crazy" | "t10"): void {
    throw new Error("Lobby settings are locked after room creation.");
  }

  private validateAndRefreshCaptains(): void {
    if (this.mode !== "team") return;
    if (this.phase === "lobby") {
      // No captains assigned before match starts
      for (const p of this.players.values()) {
        p.isCaptain = false;
      }
      return;
    }

    const allPlayers = [...this.players.values()];
    const teamAPlayers = allPlayers.filter((p) => p.team === "A");
    const teamBPlayers = allPlayers.filter((p) => p.team === "B");

    // Manage Team A Captains
    const capsA = teamAPlayers.filter((p) => p.isCaptain);
    if (capsA.length > 1) {
      capsA.forEach((p, idx) => {
        const keep = idx === 0;
        p.isCaptain = keep;
        if (keep) {
          console.log(`[LOBBY ACTION] Captain Assigned: ${p.name} validated as captain of Team A`);
        }
      });
    } else if (capsA.length === 0 && teamAPlayers.length > 0) {
      const firstConnected = teamAPlayers.find((p) => p.connected);
      if (firstConnected) {
        firstConnected.isCaptain = true;
        console.log(`[LOBBY ACTION] Captain Assigned: ${firstConnected.name} automatically appointed captain of Team A`);
      } else {
        teamAPlayers[0].isCaptain = true;
        console.log(`[LOBBY ACTION] Captain Assigned: ${teamAPlayers[0].name} automatically appointed captain of Team A`);
      }
    }

    // Manage Team B Captains
    const capsB = teamBPlayers.filter((p) => p.isCaptain);
    if (capsB.length > 1) {
      capsB.forEach((p, idx) => {
        const keep = idx === 0;
        p.isCaptain = keep;
        if (keep) {
          console.log(`[LOBBY ACTION] Captain Assigned: ${p.name} validated as captain of Team B`);
        }
      });
    } else if (capsB.length === 0 && teamBPlayers.length > 0) {
      const firstConnected = teamBPlayers.find((p) => p.connected);
      if (firstConnected) {
        firstConnected.isCaptain = true;
        console.log(`[LOBBY ACTION] Captain Assigned: ${firstConnected.name} automatically appointed captain of Team B`);
      } else {
        teamBPlayers[0].isCaptain = true;
        console.log(`[LOBBY ACTION] Captain Assigned: ${teamBPlayers[0].name} automatically appointed captain of Team B`);
      }
    }

    // Ensure spectators are not captains
    allPlayers.forEach((p) => {
      if (p.team === "spectator") {
        p.isCaptain = false;
      }
    });
  }

  private rebuildTeams(): void {
    if (this.jokerPlayerId) {
      const jokerPlayer = this.players.get(this.jokerPlayerId);
      if (jokerPlayer) {
        jokerPlayer.team = "spectator";
        jokerPlayer.isCaptain = false;
      }
    }
    const allPlayers = [...this.players.values()];

    if (this.mode === "quick") {
      let idx = 0;
      const newTeams: Team[] = [];
      for (const player of allPlayers) {
        if (idx < 2) {
          player.team = idx === 0 ? "A" : "B";
          player.isCaptain = true;

          const existing = this.teamsList.find(t => t.id === `team-${player.id}`);
          newTeams.push({
            id: `team-${player.id}`,
            name: existing?.name ?? `${player.name}'s XI`,
            brand: existing?.brand ?? DEFAULT_BRAND(EMOJIS[idx % EMOJIS.length], COLORS[idx % COLORS.length]),
            captainId: player.id,
            playerIds: [player.id],
            stats: existing?.stats ?? { wins: 0, losses: 0, runsScored: 0, runsConceded: 0, ballsFaced: 0, ballsBowled: 0 },
            points: existing?.points ?? 0
          });
          idx++;
        } else {
          player.team = "spectator";
          player.isCaptain = false;
        }
      }
      this.teamsList = newTeams;
    } else if (this.mode === "team") {
      if (this.phase === "lobby") {
        const existingA = this.teamsList.find(t => t.id === "team-A");
        const existingB = this.teamsList.find(t => t.id === "team-B");

        this.teamsList = [
          {
            id: "team-A",
            name: existingA?.name ?? "Team Sharks",
            brand: existingA?.brand ?? DEFAULT_BRAND("🦈", "#06b6d4"),
            captainId: "",
            playerIds: [],
            stats: existingA?.stats ?? { wins: 0, losses: 0, runsScored: 0, runsConceded: 0, ballsFaced: 0, ballsBowled: 0 },
            points: existingA?.points ?? 0
          },
          {
            id: "team-B",
            name: existingB?.name ?? "Team Tigers",
            brand: existingB?.brand ?? DEFAULT_BRAND("🐯", "#ef4444"),
            captainId: "",
            playerIds: [],
            stats: existingB?.stats ?? { wins: 0, losses: 0, runsScored: 0, runsConceded: 0, ballsFaced: 0, ballsBowled: 0 },
            points: existingB?.points ?? 0
          }
        ];
      } else {
        this.validateAndRefreshCaptains();

        const teamAPlayerIds = allPlayers.filter((p) => p.team === "A").map((p) => p.id);
        const teamBPlayerIds = allPlayers.filter((p) => p.team === "B").map((p) => p.id);

        const capA = allPlayers.find((p) => p.team === "A" && p.isCaptain);
        const capB = allPlayers.find((p) => p.team === "B" && p.isCaptain);

        const existingA = this.teamsList.find(t => t.id === "team-A");
        const existingB = this.teamsList.find(t => t.id === "team-B");

        this.teamsList = [
          {
            id: "team-A",
            name: existingA?.name ?? "Team Sharks",
            brand: existingA?.brand ?? DEFAULT_BRAND("🦈", "#06b6d4"),
            captainId: capA?.id ?? "",
            playerIds: teamAPlayerIds,
            stats: existingA?.stats ?? { wins: 0, losses: 0, runsScored: 0, runsConceded: 0, ballsFaced: 0, ballsBowled: 0 },
            points: existingA?.points ?? 0
          },
          {
            id: "team-B",
            name: existingB?.name ?? "Team Tigers",
            brand: existingB?.brand ?? DEFAULT_BRAND("🐯", "#ef4444"),
            captainId: capB?.id ?? "",
            playerIds: teamBPlayerIds,
            stats: existingB?.stats ?? { wins: 0, losses: 0, runsScored: 0, runsConceded: 0, ballsFaced: 0, ballsBowled: 0 },
            points: existingB?.points ?? 0
          }
        ];
      }
    } else if (this.mode === "series") {
      this.teamsList = allPlayers.map((player, idx) => {
        player.team = "A";
        player.isCaptain = false;

        console.log(`[Debug] [Rebuild Teams] Series Mode - Player ID: ${player.id}, Team ID: team-${player.id}, Captain status forced to false`);

        const existing = this.teamsList.find(t => t.id === `team-${player.id}`);
        return {
          id: `team-${player.id}`,
          name: existing?.name ?? `${player.name}'s XI`,
          brand: existing?.brand ?? DEFAULT_BRAND(EMOJIS[idx % EMOJIS.length], COLORS[idx % COLORS.length]),
          captainId: player.id,
          playerIds: [player.id],
          stats: existing?.stats ?? { wins: 0, losses: 0, runsScored: 0, runsConceded: 0, ballsFaced: 0, ballsBowled: 0 },
          points: existing?.points ?? 0
        };
      });
    }
  }

  assignTeam(playerId: string, targetPlayerId: string, team: PlayerTeam): void {
    this.requirePhase("lobby");
    if (this.mode !== "team") {
      throw new Error("Team reassignment is only allowed in Team Battle mode");
    }

    const actor = this.requirePlayer(playerId);
    const target = this.requirePlayer(targetPlayerId);

    const isHost = playerId === this.hostId;
    const isSelf = playerId === targetPlayerId;
    const isCaptain = actor.isCaptain && actor.team === target.team;
    if (!isHost && !isSelf && !isCaptain) {
      throw new Error("Only host, team captain, or the player themselves can reassign players");
    }

    if (team !== "spectator") {
      const teamCount = [...this.players.values()].filter((p) => p.team === team).length;
      if (teamCount >= 5) {
        throw new Error("Team is full (max 5)");
      }
    }

    const oldTeam = target.team;
    target.team = team;
    target.isCaptain = false;
    target.ready = false;

    if (team === "spectator") {
      console.log(`[LOBBY ACTION] Player Spectated: ${target.name} moved from Team ${oldTeam} to Spectators`);
    } else {
      console.log(`[LOBBY ACTION] Player Swapped: ${target.name} moved from Team ${oldTeam} to Team ${team}`);
    }

    this.rebuildTeams();
    this.validateState(`Swap/Spectate ${target.name}`);
  }

  randomizeTeams(playerId: string): void {
    this.requirePhase("lobby");
    if (playerId !== this.hostId) {
      throw new Error("Only the host can shuffle teams");
    }
    if (this.mode !== "team") {
      throw new Error("Shuffle teams is only allowed in Team Battle mode");
    }

    const jokerPlayer = this.jokerPlayerId ? this.players.get(this.jokerPlayerId) : null;
    const playersToShuffle = [...this.players.values()].filter(p => p.id !== this.jokerPlayerId);

    for (let i = playersToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playersToShuffle[i], playersToShuffle[j]] = [playersToShuffle[j], playersToShuffle[i]];
    }

    let teamACount = 0;
    let teamBCount = 0;
    for (const player of playersToShuffle) {
      player.isCaptain = false;
      if (teamACount < 5 && (teamACount <= teamBCount || teamBCount >= 5)) {
        player.team = "A";
        teamACount++;
      } else if (teamBCount < 5) {
        player.team = "B";
        teamBCount++;
      } else {
        player.team = "spectator";
      }
      player.ready = false;
    }

    if (jokerPlayer) {
      jokerPlayer.team = "spectator";
      jokerPlayer.isCaptain = false;
      jokerPlayer.ready = false;
    }

    const teamAPlayers = playersToShuffle.filter(p => p.team === "A");
    const teamBPlayers = playersToShuffle.filter(p => p.team === "B");

    const capA = teamAPlayers.find(p => p.connected) ?? teamAPlayers[0];
    if (capA) capA.isCaptain = true;

    const capB = teamBPlayers.find(p => p.connected) ?? teamBPlayers[0];
    if (capB) capB.isCaptain = true;

    console.log(`[LOBBY ACTION] Teams Shuffled: Shuffled all players into teams by host`);
    this.rebuildTeams();
    this.validateState("Shuffle Teams");
  }

  renameTeam(playerId: string, teamId: string, name: string): void {
    const team = this.teamsList.find((t) => t.id === teamId);
    if (!team) throw new Error("Team not found");
    if (team.captainId !== playerId) throw new Error("Only the captain can rename the team");

    team.name = name;
    if (this.tournament) {
      this.tournament.renameTeam(teamId, name);
    }
    console.log(`[LOBBY ACTION] Team Renamed: Team ${teamId} renamed to ${name}`);
  }

  updateTeamBrand(playerId: string, teamId: string, logo: string, primaryColor: string, secondaryColor: string, banner: string): void {
    const team = this.teamsList.find((t) => t.id === teamId);
    if (!team) throw new Error("Team not found");
    if (team.captainId !== playerId) throw new Error("Only the captain can customize branding");

    team.brand = { logo, primaryColor, secondaryColor, banner };
    if (this.tournament) {
      this.tournament.updateBrand(teamId, logo, primaryColor, secondaryColor, banner);
    }
    console.log(`[LOBBY ACTION] Brand Updated: Brand of team ${teamId} updated`);
  }

  transferCaptain(playerId: string, teamId: string, targetPlayerId: string): void {
    const team = this.teamsList.find((t) => t.id === teamId);
    if (!team) throw new Error("Team not found");
    if (team.captainId !== playerId) throw new Error("Only the captain can transfer captaincy");

    const target = this.requirePlayer(targetPlayerId);
    const targetTeamLetter = teamId.replace("team-", "");
    if (this.mode === "team" && target.team !== targetTeamLetter) {
      throw new Error("Target player must be a member of your team");
    }

    const oldCaptain = this.requirePlayer(playerId);
    oldCaptain.isCaptain = false;
    target.isCaptain = true;
    team.captainId = targetPlayerId;

    console.log(`[LOBBY ACTION] Captain Transferred: Captaincy of Team ${targetTeamLetter} transferred from ${oldCaptain.name} to ${target.name}`);
    this.rebuildTeams();
    this.validateState("Transfer Captain");
  }

  kickPlayer(playerId: string, targetPlayerId: string): void {
    if (playerId !== this.hostId) {
      throw new Error("Only the lobby host can kick players");
    }
    if (playerId === targetPlayerId) {
      throw new Error("You cannot kick yourself");
    }
    const targetName = this.players.get(targetPlayerId)?.name ?? "Unknown";
    console.log(`[LOBBY ACTION] Player Kicked: ${targetName} was kicked by host`);
    this.removePlayer(targetPlayerId);
  }

  toggleReady(playerId: string): void {
    this.requirePhase("lobby");
    const player = this.requirePlayer(playerId);
    player.ready = !player.ready;

    if (this.mode !== "series") {
      const active = [...this.players.values()].filter((p) => p.connected);
      const allReady = active.every((p) => p.ready);

      if (allReady && active.length >= 2) {
        this.performMatchStart();
      }
    }
  }

  startMatch(playerId: string): void {
    this.requirePhase("lobby");
    if (playerId !== this.hostId) {
      throw new Error("Only the host can start the match");
    }

    const active = [...this.players.values()].filter((p) => p.connected);
    if (this.mode === "series") {
      if (active.length < 3) {
        throw new Error("Tournament requires at least 3 connected players to start");
      }
      this.startSeriesMode(playerId);
      return;
    }

    if (active.length < 2) {
      throw new Error("Match requires at least 2 connected players to start");
    }

    this.performMatchStart();
  }

  private performMatchStart(): void {
    this.phase = "toss-choice";

    if (this.mode === "quick") {
      const allPlayers = [...this.players.values()];
      allPlayers.forEach((p, idx) => {
        if (idx < 2) {
          p.team = idx === 0 ? "A" : "B";
          p.isCaptain = true;
        } else {
          p.team = "spectator";
          p.isCaptain = false;
        }
      });
      this.rebuildTeams();
      const capA = allPlayers.find(p => p.team === "A" && p.isCaptain);
      this.toss.chooserId = capA?.id ?? this.hostId;
      console.log(`[LOBBY ACTION] Match Started: Quick Match started by host`);
    } else if (this.mode === "team") {
      const activePlayers = [...this.players.values()].filter(p => p.connected);
      if (activePlayers.length % 2 !== 0) {
        if (!this.jokerPlayerId || !this.players.has(this.jokerPlayerId) || !this.players.get(this.jokerPlayerId)?.connected) {
          const candidates = activePlayers.filter(p => p.id !== this.hostId);
          const chosen = candidates.length > 0 ? candidates[candidates.length - 1] : activePlayers[0];
          this.jokerPlayerId = chosen.id;
        }
      } else {
        this.jokerPlayerId = null;
      }

      const jokerPlayer = this.jokerPlayerId ? this.players.get(this.jokerPlayerId) : null;
      const playersToShuffle = [...this.players.values()].filter(p => p.id !== this.jokerPlayerId);

      for (let i = playersToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playersToShuffle[i], playersToShuffle[j]] = [playersToShuffle[j], playersToShuffle[i]];
      }

      let teamACount = 0;
      let teamBCount = 0;
      for (const player of playersToShuffle) {
        player.isCaptain = false;
        if (teamACount < 5 && (teamACount <= teamBCount || teamBCount >= 5)) {
          player.team = "A";
          teamACount++;
        } else if (teamBCount < 5) {
          player.team = "B";
          teamBCount++;
        } else {
          player.team = "spectator";
        }
      }

      if (jokerPlayer) {
        jokerPlayer.team = "spectator";
        jokerPlayer.isCaptain = false;
      }

      // Appoint exactly one captain per team automatically
      const teamAPlayers = playersToShuffle.filter(p => p.team === "A");
      const teamBPlayers = playersToShuffle.filter(p => p.team === "B");

      const capA = teamAPlayers.find(p => p.connected) ?? teamAPlayers[0];
      if (capA) capA.isCaptain = true;

      const capB = teamBPlayers.find(p => p.connected) ?? teamBPlayers[0];
      if (capB) capB.isCaptain = true;

      this.rebuildTeams();
      this.toss.chooserId = capA?.id ?? this.hostId;
      console.log(`[LOBBY ACTION] Match Started: Team Battle started with shuffled teams`);
    }

    this.addSystemMessage(this.mode === "quick" ? "Quick Match Started!" : "Team Battle Started!");
    this.validateState("Perform Match Start");
    console.log("[DEBUG] Match initialized - Room Code:", this.code, "Phase:", this.phase);
  }

  startSeriesMode(playerId: string): void {
    this.requirePhase("lobby");
    if (playerId !== this.hostId) {
      throw new Error("Only the host can start the tournament");
    }

    const activePlayers = [...this.players.values()].filter((p) => p.connected);
    if (activePlayers.length < 3) {
      throw new Error("Tournament requires at least 3 players to start");
    }

    // Initialize Tournament Engine
    this.tournament = new TournamentEngine(this.teamsList);
    this.phase = "tournament-dashboard";
    this.addSystemMessage("Series Mode Tournament Started!");
    this.startCurrentRoundFixtures();
    console.log("[DEBUG] Match initialized - Room Code:", this.code, "Phase:", this.phase);
  }

  private startCurrentRoundFixtures(): void {
    if (!this.tournament) return;

    const t = this.tournament.tournament;
    this.fixtureReadyIds.clear();

    // 1. Determine active fixtures for the current phase
    let activeFixtures: TournamentFixture[] = [];
    if (t.phase === "round-robin") {
      activeFixtures = t.fixtures.filter(f => f.round === t.currentRound && f.status === "pending");
    } else if (t.phase === "semifinals") {
      activeFixtures = t.playoffs.semis.filter(f => f.status === "pending");
    } else if (t.phase === "finals") {
      activeFixtures = t.playoffs.final && t.playoffs.final.status === "pending" ? [t.playoffs.final] : [];
    }

    if (activeFixtures.length === 0) {
      if (t.phase === "completed") {
        this.phase = "tournament-dashboard";
        for (const player of this.players.values()) {
          this.playerPhases.set(player.id, "tournament-dashboard");
        }
      }
      return;
    }

    const activePlayerIds = new Set<string>();
    for (const f of activeFixtures) {
      const teamA = this.teamsList.find(tm => tm.id === f.teamAId);
      const teamB = this.teamsList.find(tm => tm.id === f.teamBId);
      const capA = teamA?.captainId ?? "";
      const capB = teamB?.captainId ?? "";
      if (capA) activePlayerIds.add(capA);
      if (capB) activePlayerIds.add(capB);

      this.fixtureReadyIds.set(f.id, new Set<string>());
    }

    for (const player of this.players.values()) {
      if (activePlayerIds.has(player.id)) {
        this.playerPhases.set(player.id, "match-center");
        player.ready = false; // Reset lobby ready
      } else {
        this.playerPhases.set(player.id, "tournament-dashboard");
      }
    }

    this.phase = "tournament-dashboard"; // Global room phase is dashboard
  }

  getFixtureForPlayer(playerId: string): TournamentFixture | undefined {
    if (!this.tournament || this.mode !== "series") return undefined;

    const t = this.tournament.tournament;
    const teamId = `team-${playerId}`; // Team ID in series mode

    if (t.phase === "round-robin") {
      return t.fixtures.find(
        (f) =>
          f.round === t.currentRound &&
          (f.teamAId === teamId || f.teamBId === teamId)
      );
    }

    if (t.phase === "semifinals") {
      return t.playoffs.semis.find(
        (f) => f.teamAId === teamId || f.teamBId === teamId
      );
    }

    if (t.phase === "finals") {
      if (
        t.playoffs.final &&
        (t.playoffs.final.teamAId === teamId || t.playoffs.final.teamBId === teamId)
      ) {
        return t.playoffs.final;
      }
    }

    return undefined;
  }

  setMatchReady(playerId: string): void {
    if (this.mode !== "series") {
      this.requirePhase("match-center");
      this.matchReadyIds.add(playerId);

      const activeFixture = this.getActiveFixture();
      if (!activeFixture) return;

      const teamA = this.teamsList.find((t) => t.id === activeFixture.teamAId);
      const teamB = this.teamsList.find((t) => t.id === activeFixture.teamBId);

      if (teamA && teamB) {
        const capA = teamA.captainId;
        const capB = teamB.captainId;

        if (this.matchReadyIds.has(capA) && this.matchReadyIds.has(capB)) {
          this.phase = "toss-choice";
          this.toss = {
            chooserId: capA
          };
        }
      }
      return;
    }

    const fixture = this.getFixtureForPlayer(playerId);
    if (!fixture) throw new Error("No active match found for player in this round");

    let readySet = this.fixtureReadyIds.get(fixture.id);
    if (!readySet) {
      readySet = new Set<string>();
      this.fixtureReadyIds.set(fixture.id, readySet);
    }
    readySet.add(playerId);

    const teamA = this.teamsList.find((t) => t.id === fixture.teamAId);
    const teamB = this.teamsList.find((t) => t.id === fixture.teamBId);
    if (teamA && teamB) {
      const capA = teamA.captainId;
      const capB = teamB.captainId;

      if (readySet.has(capA) && readySet.has(capB)) {
        fixture.status = "playing";
        this.playerPhases.set(capA, "toss-choice");
        this.playerPhases.set(capB, "toss-choice");
        this.tosses.set(fixture.id, {
          chooserId: capA
        });
      }
    }
  }

  private getActiveFixture() {
    if (!this.tournament) return undefined;
    const t = this.tournament.tournament;
    if (t.phase === "round-robin") {
      return t.fixtures.find((f) => f.status === "pending" || f.status === "playing");
    } else if (t.phase === "semifinals") {
      return t.playoffs.semis.find((f) => f.status === "pending" || f.status === "playing");
    } else if (t.phase === "finals") {
      return t.playoffs.final?.status === "pending" || t.playoffs.final?.status === "playing"
        ? t.playoffs.final
        : undefined;
    }
    return undefined;
  }

  chooseToss(playerId: string, choice: TossSide): void {
    if (this.mode !== "series") {
      this.requirePhase("toss-choice");
      if (this.toss.chooserId !== playerId) {
        throw new Error("Only toss chooser can call odd or even");
      }
      this.toss.side = choice;
      this.phase = "toss-number";
      return;
    }

    const fixture = this.getFixtureForPlayer(playerId);
    if (!fixture) throw new Error("No active match found for player");
    const toss = this.tosses.get(fixture.id);
    if (!toss) throw new Error("Toss has not been initialized for this fixture");

    if (toss.chooserId !== playerId) {
      throw new Error("Only toss chooser can call odd or even");
    }

    toss.side = choice;
    const teamA = this.teamsList.find((t) => t.id === fixture.teamAId);
    const teamB = this.teamsList.find((t) => t.id === fixture.teamBId);
    if (teamA && teamB) {
      this.playerPhases.set(teamA.captainId, "toss-number");
      this.playerPhases.set(teamB.captainId, "toss-number");
    }
  }

  submitTossNumber(playerId: string, number: HandNumber): void {
    if (this.mode !== "series") {
      this.requirePhase("toss-number");
      const caps = [...this.players.values()].filter((p) => p.isCaptain);
      const capAId = caps.find((p) => p.team === "A")?.id ?? "";
      const capBId = caps.find((p) => p.team === "B")?.id ?? "";

      if (playerId !== capAId && playerId !== capBId) {
        throw new Error("Only team captains can submit toss numbers");
      }

      this.toss.numbers = { ...(this.toss.numbers ?? {}), [playerId]: number };

      const needed = [capAId, capBId].filter(Boolean);
      const submitted = Object.keys(this.toss.numbers);

      if (needed.every((id) => submitted.includes(id))) {
        const total = Object.values(this.toss.numbers).reduce<number>((sum, val) => sum + (val as number), 0);
        const result: TossSide = total % 2 === 0 ? "even" : "odd";

        const chooserId = this.toss.chooserId ?? capAId;
        const chooserWon = result === this.toss.side;

        this.toss.winnerId = chooserWon ? chooserId : (chooserId === capAId ? capBId : capAId);
        this.toss.reveal = { total, result, numbers: this.toss.numbers };
        this.phase = "bat-choice";
      }
      return;
    }

    const fixture = this.getFixtureForPlayer(playerId);
    if (!fixture) throw new Error("No active match found for player");
    const toss = this.tosses.get(fixture.id);
    if (!toss) throw new Error("Toss has not been initialized");

    const teamA = this.teamsList.find((t) => t.id === fixture.teamAId);
    const teamB = this.teamsList.find((t) => t.id === fixture.teamBId);
    const capAId = teamA?.captainId ?? "";
    const capBId = teamB?.captainId ?? "";

    if (playerId !== capAId && playerId !== capBId) {
      throw new Error("Only team captains can submit toss numbers");
    }

    toss.numbers = { ...(toss.numbers ?? {}), [playerId]: number };

    const needed = [capAId, capBId].filter(Boolean);
    const submitted = Object.keys(toss.numbers);

    if (needed.every((id) => submitted.includes(id))) {
      const total = Object.values(toss.numbers).reduce<number>((sum, val) => sum + (val as number), 0);
      const result: TossSide = total % 2 === 0 ? "even" : "odd";

      const chooserId = toss.chooserId ?? capAId;
      const chooserWon = result === toss.side;

      toss.winnerId = chooserWon ? chooserId : (chooserId === capAId ? capBId : capAId);
      toss.reveal = { total, result, numbers: toss.numbers };

      this.playerPhases.set(capAId, "bat-choice");
      this.playerPhases.set(capBId, "bat-choice");
    }
  }

  chooseBatOrBowl(playerId: string, choice: BatBowlChoice): void {
    if (this.mode !== "series") {
      this.requirePhase("bat-choice");
      if (this.toss.winnerId !== playerId) {
        throw new Error("Only toss winner can decide bat/bowl");
      }
      this.toss.winnerChoice = choice;

      const teamAPlayerIds = [...this.players.values()].filter((p) => p.team === "A" && p.connected).map((p) => p.id);
      const teamBPlayerIds = [...this.players.values()].filter((p) => p.team === "B" && p.connected).map((p) => p.id);

      if (this.jokerPlayerId && this.players.get(this.jokerPlayerId)?.connected) {
        teamAPlayerIds.push(this.jokerPlayerId);
        teamBPlayerIds.push(this.jokerPlayerId);
      }

      const winnerTeam: PlayerTeam = this.players.get(playerId)?.id === [...this.players.values()].find((p) => p.team === "A" && p.isCaptain)?.id ? "A" : "B";

      this.match = new MatchEngine(
        winnerTeam,
        choice,
        teamAPlayerIds,
        teamBPlayerIds,
        "team-A",
        "team-B",
        this.overs,
        this.matchType,
        this.jokerPlayerId,
        this.crazyRules,
        this.mode === "t10"
      );
      this.phase = "select-batsman";
      return;
    }

    const fixture = this.getFixtureForPlayer(playerId);
    if (!fixture) throw new Error("No active match found for player");
    const toss = this.tosses.get(fixture.id);
    if (!toss) throw new Error("Toss has not been initialized");

    if (toss.winnerId !== playerId) {
      throw new Error("Only toss winner can decide bat/bowl");
    }
    toss.winnerChoice = choice;

    const teamA = this.teamsList.find((t) => t.id === fixture.teamAId);
    const teamB = this.teamsList.find((t) => t.id === fixture.teamBId);
    const capAId = teamA?.captainId ?? "";
    const capBId = teamB?.captainId ?? "";

    const teamAPlayerIds = teamA?.playerIds ?? [];
    const teamBPlayerIds = teamB?.playerIds ?? [];

    const winnerTeam: PlayerTeam = playerId === capAId ? "A" : "B";

    const match = new MatchEngine(
      winnerTeam,
      choice,
      teamAPlayerIds,
      teamBPlayerIds,
      fixture.teamAId,
      fixture.teamBId,
      this.overs,
      "single", // Series mode is always single innings
      null,
      this.crazyRules,
      false
    );
    this.matches.set(fixture.id, match);

    this.playerPhases.set(capAId, "select-batsman");
    this.playerPhases.set(capBId, "select-batsman");
  }

  selectBatsman(playerId: string, selectedPlayerId: string): void {
    if (this.mode !== "series") {
      this.requirePhase("select-batsman");
      if (!this.match) throw new Error("Match has not started");

      const actor = this.requirePlayer(playerId);
      if (!actor.isCaptain) {
        throw new Error("Only team captains can select batsman");
      }

      this.match.selectBatsman(selectedPlayerId);

      if (this.match.getBowlingPlayerId()) {
        this.phase = "match";
      } else {
        this.phase = "select-bowler";
      }
      return;
    }

    const fixture = this.getFixtureForPlayer(playerId);
    if (!fixture) throw new Error("No active match found for player");
    const match = this.matches.get(fixture.id);
    if (!match) throw new Error("Match has not started for this fixture");

    const actor = this.requirePlayer(playerId);
    const matchView = match.toView();

    if (actor.id !== matchView.battingTeamId?.replace("team-", "")) {
      throw new Error("Only the batting team owner can select the batsman");
    }

    match.selectBatsman(selectedPlayerId);

    const teamA = this.teamsList.find((t) => t.id === fixture.teamAId);
    const teamB = this.teamsList.find((t) => t.id === fixture.teamBId);
    const capAId = teamA?.captainId ?? "";
    const capBId = teamB?.captainId ?? "";

    if (match.getBowlingPlayerId()) {
      this.playerPhases.set(capAId, "match");
      this.playerPhases.set(capBId, "match");
    } else {
      this.playerPhases.set(capAId, "select-bowler");
      this.playerPhases.set(capBId, "select-bowler");
    }
  }

  selectBowler(playerId: string, selectedPlayerId: string): void {
    if (this.mode !== "series") {
      this.requirePhase("select-bowler");
      if (!this.match) throw new Error("Match has not started");

      const actor = this.requirePlayer(playerId);
      if (!actor.isCaptain) {
        throw new Error("Only team captains can select bowler");
      }

      this.match.selectBowler(selectedPlayerId);

      if (this.match.getBattingPlayerId()) {
        this.phase = "match";
      } else {
        this.phase = "select-batsman";
      }
      return;
    }

    const fixture = this.getFixtureForPlayer(playerId);
    if (!fixture) throw new Error("No active match found for player");
    const match = this.matches.get(fixture.id);
    if (!match) throw new Error("Match has not started for this fixture");

    const actor = this.requirePlayer(playerId);
    const matchView = match.toView();

    if (actor.id !== matchView.bowlingTeamId?.replace("team-", "")) {
      throw new Error("Only the bowling team owner can select the bowler");
    }

    match.selectBowler(selectedPlayerId);

    const teamA = this.teamsList.find((t) => t.id === fixture.teamAId);
    const teamB = this.teamsList.find((t) => t.id === fixture.teamBId);
    const capAId = teamA?.captainId ?? "";
    const capBId = teamB?.captainId ?? "";

    if (match.getBattingPlayerId()) {
      this.playerPhases.set(capAId, "match");
      this.playerPhases.set(capBId, "match");
    } else {
      this.playerPhases.set(capAId, "select-batsman");
      this.playerPhases.set(capBId, "select-batsman");
    }
  }

  setJokerPlayer(playerId: string, jokerPlayerId: string | null): void {
    if (playerId !== this.hostId) {
      throw new Error("Only the lobby host can set the Joker");
    }
    if (jokerPlayerId && !this.players.has(jokerPlayerId)) {
      throw new Error("Joker player not found in the room");
    }
    this.jokerPlayerId = jokerPlayerId;
    this.rebuildTeams();
  }

  selectSubstitutionOption(
    playerId: string,
    targetPlayerId: string,
    option: "wait" | "captain" | "teammate",
    subPlayerId?: string
  ): void {
    const actor = this.requirePlayer(playerId);
    const target = this.requirePlayer(targetPlayerId);

    const teamLetter = target.team;
    if (teamLetter === "spectator") {
      throw new Error("Target player is a spectator and cannot have a substitute");
    }

    const team = this.teamsList.find(t => t.id === `team-${teamLetter}`);
    const isCaptain = team ? team.captainId === playerId : false;
    if (!isCaptain && playerId !== this.hostId) {
      throw new Error("Only the captain or host can choose substitution options");
    }

    if (option === "wait") {
      this.substituteStates.set(targetPlayerId, { type: "waiting" });
    } else if (option === "captain") {
      this.substituteStates.set(targetPlayerId, { type: "captain" });
    } else if (option === "teammate") {
      if (!subPlayerId) throw new Error("Teammate player ID is required");
      const subPlayer = this.requirePlayer(subPlayerId);
      if (subPlayer.team !== teamLetter || subPlayer.id === targetPlayerId) {
        throw new Error("Substitute player must be a connected member of the same team");
      }
      this.substituteStates.set(targetPlayerId, { type: "teammate", playerId: subPlayerId });
    }

    console.log(`[SUBSTITUTION] Option set for ${target.name}: ${option} (by ${actor.name})`);
    this.addSystemMessage(`Substitution updated for ${target.name}.`);
  }

  private resolveActivePlayerOrSubstitute(playerId: string, match: MatchEngine): string {
    const battingId = match.toView().battingPlayerId;
    const bowlingId = match.toView().bowlingPlayerId;

    if (playerId === battingId || playerId === bowlingId) {
      const p = this.players.get(playerId);
      if (p && p.connected) {
        return playerId;
      }
    }

    if (battingId) {
      const batPlayer = this.players.get(battingId);
      if (batPlayer && !batPlayer.connected) {
        const subState = this.substituteStates.get(battingId);
        if (subState) {
          if (subState.type === "captain") {
            const team = battingId === this.jokerPlayerId ? match.toView().battingTeam : (batPlayer.team as PlayerTeam);
            const caps = [...this.players.values()].filter((p) => p.isCaptain);
            const capId = team === "A" ? caps.find((p) => p.team === "A")?.id : caps.find((p) => p.team === "B")?.id;
            if (playerId === capId) {
              return battingId;
            }
          } else if (subState.type === "teammate" && subState.playerId === playerId) {
            return battingId;
          }
        } else {
          const team = battingId === this.jokerPlayerId ? match.toView().battingTeam : (batPlayer.team as PlayerTeam);
          const teammates = [...this.players.values()].filter(p => p.team === team && p.id !== battingId && p.connected);
          if (teammates.length > 0) {
            const caps = [...this.players.values()].filter((p) => p.isCaptain);
            const capId = team === "A" ? caps.find((p) => p.team === "A")?.id : caps.find((p) => p.team === "B")?.id;
            if (playerId === capId) {
              return battingId;
            }
          }
        }
      }
    }

    if (bowlingId) {
      const bowlPlayer = this.players.get(bowlingId);
      if (bowlPlayer && !bowlPlayer.connected) {
        const subState = this.substituteStates.get(bowlingId);
        if (subState) {
          if (subState.type === "captain") {
            const team = bowlingId === this.jokerPlayerId ? match.toView().bowlingTeam : (bowlPlayer.team as PlayerTeam);
            const caps = [...this.players.values()].filter((p) => p.isCaptain);
            const capId = team === "A" ? caps.find((p) => p.team === "A")?.id : caps.find((p) => p.team === "B")?.id;
            if (playerId === capId) {
              return bowlingId;
            }
          } else if (subState.type === "teammate" && subState.playerId === playerId) {
            return bowlingId;
          }
        } else {
          const team = bowlingId === this.jokerPlayerId ? match.toView().bowlingTeam : (bowlPlayer.team as PlayerTeam);
          const teammates = [...this.players.values()].filter(p => p.team === team && p.id !== bowlingId && p.connected);
          if (teammates.length > 0) {
            const caps = [...this.players.values()].filter((p) => p.isCaptain);
            const capId = team === "A" ? caps.find((p) => p.team === "A")?.id : caps.find((p) => p.team === "B")?.id;
            if (playerId === capId) {
              return bowlingId;
            }
          }
        }
      }
    }

    if (playerId === battingId || playerId === bowlingId) {
      return playerId;
    }

    throw new Error("You are not active or the authorized substitute in this ball");
  }

  submitBall(
    playerId: string,
    number: HandNumber
  ): "pending" | "score" | "wicket" | "over-completed" | "innings" | "over" {
    if (this.mode !== "series") {
      this.requirePhase("match");
      if (!this.match) throw new Error("Match has not started");

      const targetPlayerId = this.resolveActivePlayerOrSubstitute(playerId, this.match);
      const result = this.match.submitBall(targetPlayerId, number);

      if (result.event === "wicket") {
        this.phase = "select-batsman";
      } else if (result.event === "over-completed") {
        this.phase = "select-bowler";
      } else if (result.event === "innings") {
        this.phase = "innings-break";
      } else if (result.event === "over") {
        this.phase = "match-over";
        const m = this.match.toView();
        if (m.summary) {
          const winnerId = m.summary.winnerTeamId || m.summary.winnerTeam;
          const winnerTeamObj = this.teamsList.find(t => t.id === winnerId || t.id === `team-${winnerId}`);
          const sysText = m.summary.tie
            ? "Match Tied!"
            : `${winnerTeamObj ? winnerTeamObj.name : `Team ${winnerId}`} won the match!`;
          this.addSystemMessage(sysText);
          this.archiveMatch(this.match);
        }
      }
      return result.event;
    }

    const fixture = this.getFixtureForPlayer(playerId);
    if (!fixture) throw new Error("No active match found for player");
    const match = this.matches.get(fixture.id);
    if (!match) throw new Error("Match has not started for this fixture");

    const targetPlayerId = this.resolveActivePlayerOrSubstitute(playerId, match);
    const result = match.submitBall(targetPlayerId, number);

    const teamA = this.teamsList.find((t) => t.id === fixture.teamAId);
    const teamB = this.teamsList.find((t) => t.id === fixture.teamBId);
    const capAId = teamA?.captainId ?? "";
    const capBId = teamB?.captainId ?? "";

    // Sync live score to fixture for real-time tickers!
    const m = match.toView();
    if (m.innings === 1) {
      fixture.scoreA = { runs: m.current.runs, wickets: m.current.wickets, balls: m.current.balls };
      fixture.scoreB = { runs: 0, wickets: 0, balls: 0 };
    } else {
      fixture.scoreA = { runs: m.firstInnings?.runs ?? 0, wickets: m.firstInnings?.wickets ?? 0, balls: m.firstInnings?.balls ?? 0 };
      fixture.scoreB = { runs: m.current.runs, wickets: m.current.wickets, balls: m.current.balls };
    }

    if (result.event === "wicket") {
      this.playerPhases.set(capAId, "select-batsman");
      this.playerPhases.set(capBId, "select-batsman");
    } else if (result.event === "over-completed") {
      this.playerPhases.set(capAId, "select-bowler");
      this.playerPhases.set(capBId, "select-bowler");
    } else if (result.event === "innings") {
      this.playerPhases.set(capAId, "innings-break");
      this.playerPhases.set(capBId, "innings-break");
    } else if (result.event === "over") {
      this.playerPhases.set(capAId, "match-over");
      this.playerPhases.set(capBId, "match-over");

      const winnerId = m.summary?.winnerTeamId || m.summary?.winnerTeam;
      const winnerTeamObj = this.teamsList.find(t => t.id === winnerId);
      const sysText = m.summary?.tie
        ? `Fixture ${fixture.id} between ${teamA?.name} and ${teamB?.name} Tied!`
        : `Fixture ${fixture.id}: ${winnerTeamObj ? winnerTeamObj.name : `Team ${winnerId}`} won the match!`;
      this.addSystemMessage(sysText);

      if (this.tournament && m.summary) {
        const scoreA: FixtureScore = {
          runs: m.firstInnings?.runs ?? 0,
          wickets: m.firstInnings?.wickets ?? 0,
          balls: m.firstInnings?.balls ?? 0
        };
        const scoreB: FixtureScore = {
          runs: m.current.runs,
          wickets: m.current.wickets,
          balls: m.current.balls
        };

        const firstTeamId = m.bowlingTeamId ?? "";
        const finalScoreA = fixture.teamAId === firstTeamId ? scoreA : scoreB;
        const finalScoreB = fixture.teamAId === firstTeamId ? scoreB : scoreA;

        const playerStats = match.getPlayerStats();
        this.tournament.completeMatch(fixture.id, finalScoreA, finalScoreB, m.summary.winnerTeam, playerStats, this.overs);
        this.archiveMatch(match);
        this.checkAndAdvanceTournamentRound();
      }
    }

    return result.event;
  }

  private checkAndAdvanceTournamentRound(): void {
    if (!this.tournament) return;

    const t = this.tournament.tournament;
    const oldPhase = t.phase;
    const oldRound = t.currentRound;
    let roundFinished = false;

    if (t.phase === "round-robin") {
      const roundFixtures = t.fixtures.filter((f) => f.round === t.currentRound);
      roundFinished = roundFixtures.every((f) => f.status === "completed");

      if (roundFinished) {
        if (t.currentRound < t.totalRounds) {
          t.currentRound += 1;
          this.startCurrentRoundFixtures();
        } else {
          this.startCurrentRoundFixtures();
        }
      }
    } else if (t.phase === "semifinals") {
      roundFinished = t.playoffs.semis.every((f) => f.status === "completed");
      if (roundFinished) {
        this.startCurrentRoundFixtures();
      }
    } else if (t.phase === "finals") {
      roundFinished = t.playoffs.final?.status === "completed";
      if (roundFinished) {
        t.phase = "completed";
        this.phase = "tournament-dashboard";
        for (const player of this.players.values()) {
          this.playerPhases.set(player.id, "tournament-dashboard");
        }
      }
    }

    if (t.phase !== oldPhase) {
      if (t.phase === "semifinals") {
        this.addSystemMessage("Round Robin Finished! Playoff Semifinals Started!");
      } else if (t.phase === "finals") {
        this.addSystemMessage("Semifinals Finished! Grand Finale Started!");
      } else if (t.phase === "completed") {
        const standings = this.tournament.getSortedStandings();
        const champ = standings[0];
        const champName = champ ? champ.name : "Winner";
        this.addSystemMessage(`${champName} is the Tournament Champion! 🏆`);
      }
    } else if (t.currentRound !== oldRound) {
      this.addSystemMessage(`Round ${t.currentRound} Started!`);
    }
  }

  continueAfterInningsBreak(): void {
    if (this.phase === "innings-break") {
      this.phase = "select-batsman";
    }
  }

  continueAfterInningsBreakForFixture(fixtureId: string): void {
    const match = this.matches.get(fixtureId);
    if (!match) return;

    const fixture = this.tournament?.tournament.fixtures.find((f) => f.id === fixtureId)
      || this.tournament?.tournament.playoffs.semis.find((f) => f.id === fixtureId)
      || (this.tournament?.tournament.playoffs.final?.id === fixtureId ? this.tournament?.tournament.playoffs.final : undefined);

    if (!fixture) return;

    const teamA = this.teamsList.find((t) => t.id === fixture.teamAId);
    const teamB = this.teamsList.find((t) => t.id === fixture.teamBId);
    const capAId = teamA?.captainId ?? "";
    const capBId = teamB?.captainId ?? "";

    if (this.playerPhases.get(capAId) === "innings-break") {
      this.playerPhases.set(capAId, "select-batsman");
    }
    if (this.playerPhases.get(capBId) === "innings-break") {
      this.playerPhases.set(capBId, "select-batsman");
    }
  }

  spectateFixture(playerId: string, fixtureId: string | null): void {
    if (this.mode !== "series") return;

    if (fixtureId === null) {
      this.spectatingFixtureIds.delete(playerId);
      this.playerPhases.set(playerId, "tournament-dashboard");
    } else {
      this.spectatingFixtureIds.set(playerId, fixtureId);
      
      const specFixture = this.tournament?.tournament.fixtures.find(f => f.id === fixtureId)
        || this.tournament?.tournament.playoffs.semis.find(f => f.id === fixtureId)
        || (this.tournament?.tournament.playoffs.final?.id === fixtureId ? this.tournament?.tournament.playoffs.final : undefined);

      if (specFixture && specFixture.status === "playing") {
        const capAId = this.teamsList.find(t => t.id === specFixture.teamAId)?.captainId;
        const capBId = this.teamsList.find(t => t.id === specFixture.teamBId)?.captainId;
        const derivedPhase = (capAId && this.playerPhases.get(capAId)) || (capBId && this.playerPhases.get(capBId)) || "match";
        this.playerPhases.set(playerId, derivedPhase);
      } else {
        this.spectatingFixtureIds.delete(playerId);
        this.playerPhases.set(playerId, "tournament-dashboard");
      }
    }
  }

  continueToStandings(playerId: string): void {
    if (this.mode !== "series") return;

    this.spectatingFixtureIds.delete(playerId);
    const fixture = this.getFixtureForPlayer(playerId);
    if (fixture && fixture.status === "completed") {
      this.playerPhases.set(playerId, "tournament-dashboard");
    } else {
      this.playerPhases.set(playerId, "tournament-dashboard");
    }
  }

  voteRematch(playerId: string): void {
    this.requirePhase("match-over");
    if (this.mode === "series") return;

    this.requirePlayer(playerId);
    this.rematchVotes.add(playerId);

    const active = [...this.players.values()].filter((p) => (p.team === "A" || p.team === "B") && p.connected);
    if (this.rematchVotes.size >= active.length) {
      this.resetForRematch();
    }
  }

  isEmpty(): boolean {
    return [...this.players.values()].every((p) => !p.connected);
  }

  toView(playerId?: string): RoomView {
    let activeFixture = playerId ? this.getFixtureForPlayer(playerId) : this.getActiveFixture();
    let playerSpecificPhase = (this.mode === "series" && playerId)
      ? (this.playerPhases.get(playerId) ?? "tournament-dashboard")
      : this.phase;

    if (this.mode === "series" && playerId) {
      const specFixtureId = this.spectatingFixtureIds.get(playerId);
      if (specFixtureId) {
        const specFixture = this.tournament?.tournament.fixtures.find(f => f.id === specFixtureId)
          || this.tournament?.tournament.playoffs.semis.find(f => f.id === specFixtureId)
          || (this.tournament?.tournament.playoffs.final?.id === specFixtureId ? this.tournament?.tournament.playoffs.final : undefined);

        if (specFixture) {
          activeFixture = specFixture;
          if (specFixture.status === "playing") {
            const capAId = this.teamsList.find(t => t.id === specFixture.teamAId)?.captainId;
            const capBId = this.teamsList.find(t => t.id === specFixture.teamBId)?.captainId;
            const derivedPhase = (capAId && this.playerPhases.get(capAId)) || (capBId && this.playerPhases.get(capBId));
            if (derivedPhase) {
              playerSpecificPhase = derivedPhase;
            }
          } else if (specFixture.status === "completed") {
            playerSpecificPhase = "match-over";
          }
        }
      }
    }

    let capA = "";
    let capB = "";

    if (this.mode === "series" && activeFixture) {
      capA = this.teamsList.find((t) => t.id === activeFixture.teamAId)?.captainId ?? "";
      capB = this.teamsList.find((t) => t.id === activeFixture.teamBId)?.captainId ?? "";
    } else {
      const caps = [...this.players.values()].filter((p) => p.isCaptain);
      capA = caps.find((p) => p.team === "A")?.id ?? "";
      capB = caps.find((p) => p.team === "B")?.id ?? "";
    }

    let tossView: TossView = {};
    if (this.mode === "series") {
      if (activeFixture) {
        tossView = this.tosses.get(activeFixture.id) ?? {};
      }
    } else {
      tossView = this.toss;
    }

    let matchView = undefined;
    if (this.mode === "series") {
      if (activeFixture) {
        matchView = this.matches.get(activeFixture.id)?.toView();
      }
    } else {
      matchView = this.match?.toView();
    }

    const activeMatches: Record<string, MatchView> = {};
    if (this.mode === "series" && this.tournament) {
      for (const [fId, matchEng] of this.matches.entries()) {
        const f = this.tournament.tournament.fixtures.find((fx) => fx.id === fId)
          || this.tournament.tournament.playoffs.semis.find((fx) => fx.id === fId)
          || (this.tournament.tournament.playoffs.final?.id === fId ? this.tournament.tournament.playoffs.final : undefined);

        if (f && f.status === "playing") {
          activeMatches[fId] = matchEng.toView();
        }
      }
    }



    return {
      code: this.code,
      mode: this.mode,
      subMode: this.subMode,
      crazyRules: this.crazyRules,
      phase: playerSpecificPhase,
      players: [...this.players.values()].map(({ socketId: _socketId, ...player }) => ({
        ...player,
        isJoker: player.id === this.jokerPlayerId
      })),
      teams: this.teamsList,
      tournament: this.tournament?.tournament,
      hostId: this.hostId,
      toss: tossView,
      match: matchView,
      activeMatches,
      rematchVotes: [...this.rematchVotes],
      matchReadyIds: [...this.matchReadyIds],
      captainAId: capA,
      captainBId: capB,
      maxPlayers: this.maxPlayers,
      stadium: this.stadium,
      overs: this.overs,
      matchType: this.matchType,
      jokerPlayerId: this.jokerPlayerId,
      disconnectTimes: Object.fromEntries(this.disconnectTimes),
      substituteStates: Object.fromEntries(this.substituteStates),
      matchHistory: this.matchHistory
    };
  }

  private archiveMatch(match: MatchEngine): void {
    const m = match.toView();
    if (!m.summary) return;

    const teamAObj = this.teamsList.find(t => t.playerIds.includes(m.teamAPlayerIds?.[0] ?? ""));
    const teamBObj = this.teamsList.find(t => t.playerIds.includes(m.teamBPlayerIds?.[0] ?? ""));

    const teamAName = teamAObj ? teamAObj.name : "Team A";
    const teamALogo = teamAObj ? teamAObj.brand.logo : "🔵";
    const teamBName = teamBObj ? teamBObj.name : "Team B";
    const teamBLogo = teamBObj ? teamBObj.brand.logo : "🔴";

    const teamAPlayerIdsCount = teamAObj?.playerIds.length || 1;
    const teamBPlayerIdsCount = teamBObj?.playerIds.length || 1;

    const teamAId = teamAObj?.id || "team-A";
    const teamBId = teamBObj?.id || "team-B";

    const teamAScores = m.summary.scores[teamAId] || { runs: 0, wickets: 0, balls: 0 };
    const teamBScores = m.summary.scores[teamBId] || { runs: 0, wickets: 0, balls: 0 };

    const maxOversQuota = m.matchType === "double" ? this.overs * 2 : this.overs;

    const teamAAllOut = teamAScores.wickets >= teamAPlayerIdsCount * (m.matchType === "double" ? 2 : 1);
    const teamAAdjustedBalls = teamAAllOut ? maxOversQuota * 6 : teamAScores.balls;

    const teamBAllOut = teamBScores.wickets >= teamBPlayerIdsCount * (m.matchType === "double" ? 2 : 1);
    const teamBAdjustedBalls = teamBAllOut ? maxOversQuota * 6 : teamBScores.balls;

    const teamARR = teamAAdjustedBalls > 0 ? (teamAScores.runs / (teamAAdjustedBalls / 6)) : 0;
    const teamBRR = teamBAdjustedBalls > 0 ? (teamBScores.runs / (teamBAdjustedBalls / 6)) : 0;

    const teamANRR = (teamAAdjustedBalls > 0 ? teamAScores.runs / (teamAAdjustedBalls / 6) : 0) -
                     (teamBAdjustedBalls > 0 ? teamBScores.runs / (teamBAdjustedBalls / 6) : 0);
    const teamBNRR = -teamANRR;

    let marginOfVictory = "";
    const winnerId = m.summary.winnerTeamId || m.summary.winnerTeam;
    if (m.summary.tie || !winnerId) {
      marginOfVictory = "Match Tied";
    } else {
      const defendingTeamId = m.bowlingTeamId ?? "";
      const isWinnerChasing = winnerId !== defendingTeamId;
      
      if (isWinnerChasing) {
        const chasingScores = winnerId === teamAId ? teamAScores : teamBScores;
        const chasingMaxWickets = (winnerId === teamAId ? teamAPlayerIdsCount : teamBPlayerIdsCount) * (m.matchType === "double" ? 2 : 1);
        const wicketsLeft = chasingMaxWickets - chasingScores.wickets;
        marginOfVictory = `Won by ${wicketsLeft} wicket${wicketsLeft > 1 ? "s" : ""}`;
      } else {
        const winnerScores = winnerId === teamAId ? teamAScores : teamBScores;
        const loserScores = winnerId === teamAId ? teamBScores : teamAScores;
        const runsDiff = winnerScores.runs - loserScores.runs;
        marginOfVictory = `Won by ${runsDiff} run${runsDiff > 1 ? "s" : ""}`;
      }
    }

    const statsMap: Record<string, any> = {};
    for (const p of this.players.values()) {
      statsMap[p.id] = {
        id: p.id,
        name: p.name,
        runsScored: 0,
        ballsFaced: 0,
        wicketsTaken: 0,
        runsConceded: 0,
        ballsBowled: 0,
        isOut: false
      };
    }

    for (const event of m.timeline) {
      if (event.batterId && statsMap[event.batterId]) {
        statsMap[event.batterId].runsScored += event.runsAdded;
        statsMap[event.batterId].ballsFaced += 1;
      }
      if (event.bowlerId && statsMap[event.bowlerId]) {
        statsMap[event.bowlerId].runsConceded += event.runsAdded;
        statsMap[event.bowlerId].ballsBowled += 1;
        if (event.wicket) {
          statsMap[event.bowlerId].wicketsTaken += 1;
        }
      }
    }

    for (const outId of m.dismissedPlayerIds) {
      if (statsMap[outId]) {
        statsMap[outId].isOut = true;
      }
    }

    const allStats = Object.values(statsMap);

    let bestPlayer = { name: "N/A", runs: 0, wickets: 0, impact: 0 };
    let bestImpact = -999;
    for (const s of allStats) {
      const impact = s.runsScored + s.wicketsTaken * 15 - s.runsConceded * 0.5;
      if (impact > bestImpact) {
        bestImpact = impact;
        bestPlayer = { name: s.name, runs: s.runsScored, wickets: s.wicketsTaken, impact };
      }
    }

    let highestScorerObj = { name: "N/A", runs: 0 };
    let maxRuns = -1;
    for (const s of allStats) {
      if (s.runsScored > maxRuns) {
        maxRuns = s.runsScored;
        highestScorerObj = { name: s.name, runs: s.runsScored };
      }
    }

    let bestBowlerObj = { name: "N/A", wickets: 0, runsConceded: 0 };
    let bestBowlerRef: any = null;
    for (const s of allStats) {
      if (s.ballsBowled > 0) {
        if (!bestBowlerRef) {
          bestBowlerRef = s;
        } else {
          if (s.wicketsTaken > bestBowlerRef.wicketsTaken) {
            bestBowlerRef = s;
          } else if (s.wicketsTaken === bestBowlerRef.wicketsTaken) {
            if (s.runsConceded < bestBowlerRef.runsConceded) {
              bestBowlerRef = s;
            }
          }
        }
      }
    }
    if (bestBowlerRef) {
      bestBowlerObj = { name: bestBowlerRef.name, wickets: bestBowlerRef.wicketsTaken, runsConceded: bestBowlerRef.runsConceded };
    }

    const fowA: string[] = [];
    const fowB: string[] = [];
    let runsA = 0;
    let wicketsA = 0;
    let ballsA = 0;
    let runsB = 0;
    let wicketsB = 0;
    let ballsB = 0;
    
    const getBattingTeamForInnings = (inn: number, firstBowlId: string): "A" | "B" => {
      const isBowlA = firstBowlId === teamAId || firstBowlId === "A";
      if (inn % 2 === 1) {
        return isBowlA ? "B" : "A";
      } else {
        return isBowlA ? "A" : "B";
      }
    };

    const defendingTeamId = m.bowlingTeamId ?? "";
    for (const event of m.timeline) {
      const eventTeam = getBattingTeamForInnings(event.innings, defendingTeamId);
      const batterName = this.players.get(event.batterId)?.name || "Unknown";
      if (eventTeam === "A") {
        runsA += event.runsAdded;
        ballsA += 1;
        if (event.wicket) {
          wicketsA += 1;
          fowA.push(`${wicketsA}-${runsA} (${batterName}, ${Math.floor(ballsA / 6)}.${ballsA % 6} ov)`);
        }
      } else {
        runsB += event.runsAdded;
        ballsB += 1;
        if (event.wicket) {
          wicketsB += 1;
          fowB.push(`${wicketsB}-${runsB} (${batterName}, ${Math.floor(ballsB / 6)}.${ballsB % 6} ov)`);
        }
      }
    }

    const historyItem: MatchHistoryItem = {
      id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      stadium: this.stadium,
      overs: this.overs,
      matchType: this.matchType,
      mode: this.mode,
      teamA: {
        id: teamAId,
        name: teamAName,
        logo: teamALogo,
        runs: teamAScores.runs,
        wickets: teamAScores.wickets,
        balls: teamAScores.balls,
        runRate: Number(teamARR.toFixed(2)),
        netRunRate: Number(teamANRR.toFixed(3))
      },
      teamB: {
        id: teamBId,
        name: teamBName,
        logo: teamBLogo,
        runs: teamBScores.runs,
        wickets: teamBScores.wickets,
        balls: teamBScores.balls,
        runRate: Number(teamBRR.toFixed(2)),
        netRunRate: Number(teamBNRR.toFixed(3))
      },
      winnerId: winnerId || null,
      marginOfVictory,
      playerOfTheMatch: bestPlayer,
      highestScorer: highestScorerObj,
      bestBowler: bestBowlerObj,
      fallOfWickets: {
        teamA: fowA,
        teamB: fowB
      },
      duration: `${Math.floor(m.timeline.length * 0.4 + 2)} mins`
    };

    this.matchHistory.push(historyItem);
  }

  private resetForRematch(): void {
    for (const player of this.players.values()) {
      player.ready = false;
    }
    this.phase = "lobby";
    this.toss = {};
    this.match = undefined;
    this.matches.clear();
    this.tosses.clear();
    this.playerPhases.clear();
    this.fixtureReadyIds.clear();
    this.spectatingFixtureIds.clear();
    this.rematchVotes.clear();
    this.rebuildTeams();
  }

  private validateState(action: string): void {
    const allPlayers = [...this.players.values()];

    // 1. No duplicate players (checked by unique player IDs)
    const playerIds = allPlayers.map(p => p.id);
    const uniqueIds = new Set(playerIds);
    if (uniqueIds.size !== playerIds.length) {
      const errMsg = `Validation Failed [${action}]: Duplicate player IDs found in room!`;
      console.error(errMsg);
      throw new Error(errMsg);
    }

    // 2. Maximum one captain per team (post-lobby only)
    if (this.mode !== "series" && (this.phase !== "lobby" || this.mode !== "team")) {
      const teamACaptains = allPlayers.filter(p => p.team === "A" && p.isCaptain);
      const teamBCaptains = allPlayers.filter(p => p.team === "B" && p.isCaptain);
      if (teamACaptains.length > 1) {
        const errMsg = `Validation Failed [${action}]: Team A has multiple captains: ${teamACaptains.map(p => p.name).join(", ")}`;
        console.error(errMsg);
        throw new Error(errMsg);
      }
      if (teamBCaptains.length > 1) {
        const errMsg = `Validation Failed [${action}]: Team B has multiple captains: ${teamBCaptains.map(p => p.name).join(", ")}`;
        console.error(errMsg);
        throw new Error(errMsg);
      }
    }

    // 3. No player can belong to multiple teams
    for (const p of allPlayers) {
      if (!["A", "B", "spectator"].includes(p.team)) {
        const errMsg = `Validation Failed [${action}]: Player ${p.name} has invalid team: ${p.team}`;
        console.error(errMsg);
        throw new Error(errMsg);
      }
    }

    // 4. Team counts are correct
    if (this.mode === "team") {
      const teamACount = allPlayers.filter(p => p.team === "A").length;
      const teamBCount = allPlayers.filter(p => p.team === "B").length;
      if (teamACount > 5) {
        const errMsg = `Validation Failed [${action}]: Team A exceeds maximum 5 players (count: ${teamACount})`;
        console.error(errMsg);
        throw new Error(errMsg);
      }
      if (teamBCount > 5) {
        const errMsg = `Validation Failed [${action}]: Team B exceeds maximum 5 players (count: ${teamBCount})`;
        console.error(errMsg);
        throw new Error(errMsg);
      }
    }

    // 5. Spectators are separate
    const spectators = allPlayers.filter(p => p.team === "spectator");
    for (const spec of spectators) {
      if (spec.isCaptain) {
        const errMsg = `Validation Failed [${action}]: Spectator ${spec.name} cannot be a captain`;
        console.error(errMsg);
        throw new Error(errMsg);
      }
    }

    // 6. Total player count remains consistent
    if (allPlayers.length !== this.players.size) {
      const errMsg = `Validation Failed [${action}]: Total player count (${allPlayers.length}) does not match Map size (${this.players.size})`;
      console.error(errMsg);
      throw new Error(errMsg);
    }

    // 7. Verify teamsList consistency (post-lobby only)
    if (this.mode === "team" && this.phase !== "lobby") {
      const teamA = this.teamsList.find(t => t.id === "team-A");
      const teamB = this.teamsList.find(t => t.id === "team-B");
      if (teamA) {
        const expectedIds = allPlayers.filter(p => p.team === "A").map(p => p.id);
        const match = expectedIds.length === teamA.playerIds.length && expectedIds.every(id => teamA.playerIds.includes(id));
        if (!match) {
          const errMsg = `Validation Failed [${action}]: Team A playerIds list out of sync`;
          console.error(errMsg);
          throw new Error(errMsg);
        }
      }
      if (teamB) {
        const expectedIds = allPlayers.filter(p => p.team === "B").map(p => p.id);
        const match = expectedIds.length === teamB.playerIds.length && expectedIds.every(id => teamB.playerIds.includes(id));
        if (!match) {
          const errMsg = `Validation Failed [${action}]: Team B playerIds list out of sync`;
          console.error(errMsg);
          throw new Error(errMsg);
        }
      }
    }

    // 8. Series Mode validation
    if (this.mode === "series") {
      console.log(`[Debug] [Validate State] Series Mode Validation - Action: ${action}, Phase: ${this.phase}`);
      for (const p of allPlayers) {
        const owned = this.teamsList.filter(t => t.id === `team-${p.id}` || t.captainId === p.id);
        console.log(`[Debug] [Validate State] Player: ${p.name} (${p.id}) | Team: ${p.team} | isCaptain: ${p.isCaptain} | Owned Teams: ${owned.map(t => t.id).join(", ")}`);
        
        // Every player owns exactly one team in Series Mode
        if (owned.length !== 1) {
          const errMsg = `Validation Failed [${action}]: Player ${p.name} (${p.id}) does not own exactly one team (owned: ${owned.length})`;
          console.error(errMsg);
          throw new Error(errMsg);
        }
      }

      // No duplicate team IDs in teamsList
      const teamIds = this.teamsList.map(t => t.id);
      const uniqueTeamIds = new Set(teamIds);
      if (uniqueTeamIds.size !== teamIds.length) {
        const errMsg = `Validation Failed [${action}]: Duplicate team IDs found in series: ${teamIds.join(", ")}`;
        console.error(errMsg);
        throw new Error(errMsg);
      }
    }

    console.log(`[Validation Passed] Room state is fully consistent after: ${action}`);
  }

  private requirePlayer(playerId: string): ServerPlayer {
    const player = this.players.get(playerId);
    if (!player) throw new Error("Player is not in this room");
    return player;
  }

  private requirePhase(phase: RoomPhase): void {
    if (this.phase !== phase) {
      throw new Error(`Action is not allowed during ${this.phase}`);
    }
  }

  toJSON() {
    return {
      code: this.code,
      hostId: this.hostId,
      players: Array.from(this.players.entries()),
      phase: this.phase,
      mode: this.mode,
      subMode: this.subMode,
      crazyRules: this.crazyRules,
      toss: this.toss,
      match: this.match ? this.match.toJSON() : undefined,
      tournament: this.tournament ? this.tournament.toJSON() : undefined,
      rematchVotes: Array.from(this.rematchVotes),
      matchReadyIds: Array.from(this.matchReadyIds),
      teamsList: this.teamsList,
      matchHistory: this.matchHistory,
      maxPlayers: this.maxPlayers,
      stadium: this.stadium,
      overs: this.overs,
      matchType: this.matchType,
      jokerPlayerId: this.jokerPlayerId,
      disconnectTimes: Array.from(this.disconnectTimes.entries()),
      substituteStates: Array.from(this.substituteStates.entries()),
      matches: Array.from(this.matches.entries()).map(([k, v]) => [k, v.toJSON()]),
      tosses: Array.from(this.tosses.entries()),
      playerPhases: Array.from(this.playerPhases.entries()),
      fixtureReadyIds: Array.from(this.fixtureReadyIds.entries()).map(([k, v]) => [k, Array.from(v)]),
      spectatingFixtureIds: Array.from(this.spectatingFixtureIds.entries()),
      chatMessages: this.chatMessages,
      pendingSystemMessages: this.pendingSystemMessages
    };
  }

  static fromJSON(data: any): Room {
    const room = Object.create(Room.prototype);
    Object.assign(room, {
      ...data,
      players: new Map(data.players),
      rematchVotes: new Set(data.rematchVotes),
      matchReadyIds: new Set(data.matchReadyIds),
      match: data.match ? MatchEngine.fromJSON(data.match) : undefined,
      tournament: data.tournament ? TournamentEngine.fromJSON(data.tournament) : undefined,
      disconnectTimes: new Map(data.disconnectTimes),
      substituteStates: new Map(data.substituteStates),
      matches: new Map(data.matches.map(([k, v]: any) => [k, MatchEngine.fromJSON(v)])),
      tosses: new Map(data.tosses),
      playerPhases: new Map(data.playerPhases),
      fixtureReadyIds: new Map(data.fixtureReadyIds.map(([k, v]: any) => [k, new Set(v)])),
      spectatingFixtureIds: new Map(data.spectatingFixtureIds)
    });
    return room;
  }
}
