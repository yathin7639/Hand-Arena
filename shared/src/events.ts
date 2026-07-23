import type { BatBowlChoice, ClientSession, HandNumber, PlayerTeam, RoomView, TossSide, ChatMessage } from "./game.js";

export interface ServerAck<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

import type { CrazyRulesConfig } from "./models/crazyRules.js";

export interface CreateRoomPayload {
  playerId: string;
  name: string;
  mode: "quick" | "team" | "series" | "crazy" | "t10";
  subMode?: "quick" | "team" | "series" | "tournament";
  maxPlayers: number;
  stadium: string;
  overs: number;
  matchType: "single" | "double";
  crazyRules?: CrazyRulesConfig;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerId: string;
  name: string;
}

export interface RoomActionPayload {
  roomCode: string;
  playerId: string;
}

export interface TossChoicePayload extends RoomActionPayload {
  choice: TossSide;
}

export interface TossNumberPayload extends RoomActionPayload {
  number: HandNumber;
}

export interface BatOrBowlPayload extends RoomActionPayload {
  choice: BatBowlChoice;
}

export interface BallPlayedPayload extends RoomActionPayload {
  number: HandNumber;
}

export interface AssignTeamPayload extends RoomActionPayload {
  targetPlayerId: string;
  team: PlayerTeam;
}

export interface SelectBatsmanPayload extends RoomActionPayload {
  selectedPlayerId: string;
}

export interface SelectBowlerPayload extends RoomActionPayload {
  selectedPlayerId: string;
}

export interface RenameTeamPayload extends RoomActionPayload {
  teamId: string;
  name: string;
}

export interface UpdateBrandPayload extends RoomActionPayload {
  teamId: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  banner: string;
}

export interface TransferCaptainPayload extends RoomActionPayload {
  teamId: string;
  targetPlayerId: string;
}

export interface KickPlayerPayload extends RoomActionPayload {
  targetPlayerId: string;
}

export interface SetRoomModePayload extends RoomActionPayload {
  mode: "quick" | "team" | "series" | "crazy" | "t10";
  subMode?: "quick" | "team" | "series" | "tournament";
}

export interface SendChatPayload {
  roomCode: string;
  playerId: string;
  channel: "all" | "team";
  text: string;
}

export interface ChatReactionPayload {
  roomCode: string;
  playerId: string;
  messageId: string;
  emoji: string;
}

export interface SpectateFixturePayload extends RoomActionPayload {
  fixtureId: string | null;
}

export interface SetJokerPlayerPayload extends RoomActionPayload {
  jokerPlayerId: string;
}

export interface SelectSubstitutionOptionPayload extends RoomActionPayload {
  targetPlayerId: string;
  option: "wait" | "captain" | "teammate";
  subPlayerId?: string;
}

export interface ClientToServerEvents {
  createRoom: (payload: CreateRoomPayload, ack: (response: ServerAck<{ room: RoomView; session: ClientSession; chatHistory: ChatMessage[] }>) => void) => void;
  joinRoom: (payload: JoinRoomPayload, ack: (response: ServerAck<{ room: RoomView; session: ClientSession; chatHistory: ChatMessage[] }>) => void) => void;
  playerReady: (payload: RoomActionPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  tossChoice: (payload: TossChoicePayload, ack: (response: ServerAck<RoomView>) => void) => void;
  tossNumber: (payload: TossNumberPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  batOrBowl: (payload: BatOrBowlPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  ballPlayed: (payload: BallPlayedPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  rematchVote: (payload: RoomActionPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  recoverSession: (payload: RoomActionPayload, ack: (response: ServerAck<{ room: RoomView; chatHistory: ChatMessage[] }>) => void) => void;
  pingCheck: (sentAt: number, ack: (sentAt: number) => void) => void;
  // TEAM & MATCH EVENTS
  assignTeam: (payload: AssignTeamPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  randomizeTeams: (payload: RoomActionPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  selectBatsman: (payload: SelectBatsmanPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  selectBowler: (payload: SelectBowlerPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  renameTeam: (payload: RenameTeamPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  updateTeamBrand: (payload: UpdateBrandPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  transferCaptain: (payload: TransferCaptainPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  kickPlayer: (payload: KickPlayerPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  setRoomMode: (payload: SetRoomModePayload, ack: (response: ServerAck<RoomView>) => void) => void;
  startSeriesMode: (payload: RoomActionPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  startMatch: (payload: RoomActionPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  setMatchReady: (payload: RoomActionPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  continueToStandings: (payload: RoomActionPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  spectateFixture: (payload: SpectateFixturePayload, ack: (response: ServerAck<RoomView>) => void) => void;
  setJokerPlayer: (payload: SetJokerPlayerPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  selectSubstitutionOption: (payload: SelectSubstitutionOptionPayload, ack: (response: ServerAck<RoomView>) => void) => void;
  // CHAT & UTILS
  sendChatMessage: (payload: SendChatPayload, ack: (response: ServerAck<ChatMessage>) => void) => void;
  addChatReaction: (payload: ChatReactionPayload, ack: (response: ServerAck<{ messageId: string; emoji: string; playerId: string }>) => void) => void;
  returnToLobby: (payload: RoomActionPayload, ack: (response: ServerAck<RoomView>) => void) => void;
}

export interface ServerToClientEvents {
  roomUpdated: (room: RoomView) => void;
  startGame: (room: RoomView) => void;
  inningsChange: (room: RoomView) => void;
  scoreUpdate: (room: RoomView) => void;
  matchOver: (room: RoomView) => void;
  playerDisconnected: (room: RoomView) => void;
  errorMessage: (message: string) => void;
  chatMessageReceived: (message: ChatMessage) => void;
  chatReactionUpdated: (payload: { messageId: string; reactions: Record<string, string[]> }) => void;
}
