import { useState, useEffect, useRef } from "react";
import type { BatBowlChoice, HandNumber, RoomView, TossSide, PlayerTeam, ChatMessage } from "@hand-cricket/shared";
import { STADIUMS } from "@hand-cricket/shared";
import { AnimatePresence, motion } from "framer-motion";
import { LobbyPanel } from "../components/LobbyPanel";
import { MatchPanel } from "../components/MatchPanel";
import { ShellHeader } from "../components/ShellHeader";
import { TossPanel } from "../components/TossPanel";
import { MatchCenter } from "../components/MatchCenter";
import { TournamentPanel } from "../components/TournamentPanel";
import { ChatWidget } from "../components/ChatWidget";
import { Button } from "../components/Button";

export function GameRoom({
  actions,
  connected,
  connectionStatus,
  latency,
  muted,
  onMute,
  playerId,
  room,
  chatHistory
}: {
  actions: {
    ready: () => void;
    tossChoice: (choice: TossSide) => void;
    tossNumber: (number: HandNumber) => void;
    batOrBowl: (choice: BatBowlChoice) => void;
    playBall: (number: HandNumber) => void;
    rematch: () => void;
    assignTeam: (targetPlayerId: string, team: PlayerTeam) => void;
    randomizeTeams: () => void;
    selectBatsman: (selectedPlayerId: string) => void;
    selectBowler: (selectedPlayerId: string) => void;
    leaveRoom: () => void;
    renameTeam: (teamId: string, name: string) => void;
    updateTeamBrand: (
      teamId: string,
      logo: string,
      primaryColor: string,
      secondaryColor: string,
      banner: string
    ) => void;
    transferCaptain: (teamId: string, targetPlayerId: string) => void;
    kickPlayer: (targetPlayerId: string) => void;
    setRoomMode: (mode: "quick" | "team" | "series") => void;
    startSeriesMode: () => void;
    startMatch: () => void;
    setMatchReady: () => void;
    continueToStandings: () => void;
    sendChatMessage: (channel: "all" | "team", text: string) => void;
    addChatReaction: (messageId: string, emoji: string) => void;
    returnToLobby: () => void;
    setJokerPlayer: (jokerPlayerId: string) => void;
    selectSubstitutionOption: (targetPlayerId: string, option: "wait" | "captain" | "teammate", subPlayerId?: string) => void;
    spectateFixture: (fixtureId: string | null) => void;
  };
  connected: boolean;
  connectionStatus?: "connected" | "connecting" | "disconnected";
  latency?: number;
  muted: boolean;
  onMute: () => void;
  playerId: string;
  room: RoomView;
  chatHistory: ChatMessage[];
}) {
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevPhaseRef = useRef<string>("lobby");
  const isTimerRunningRef = useRef(false);
  const [lastRoomCode, setLastRoomCode] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const roomRef = useRef(room);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    if (!room) return;

    // Check for room code change
    if (room.code !== lastRoomCode) {
      setLastRoomCode(room.code);
      prevPhaseRef.current = room.phase;
      isTimerRunningRef.current = false;
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      setShowLoadingScreen(false);
      return;
    }

    // Reset loading state immediately if the match is aborted/reset back to lobby
    if (room.phase === "lobby") {
      isTimerRunningRef.current = false;
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      setShowLoadingScreen(false);
      prevPhaseRef.current = "lobby";
      return;
    }

    // Trigger loading screen on leaving lobby phase
    if (prevPhaseRef.current === "lobby") {
      console.log("[DEBUG] Transitioning from lobby -> match. Showing loading screen.");
      setShowLoadingScreen(true);
      isTimerRunningRef.current = true;
      
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
      
      loadingTimerRef.current = setTimeout(() => {
        isTimerRunningRef.current = false;
        loadingTimerRef.current = null;
        
        // Only hide the loading screen if the client is currently in a gameplay phase
        const latestRoom = roomRef.current;
        if (latestRoom && latestRoom.phase !== "lobby") {
          setShowLoadingScreen(false);
          console.log("[DEBUG] Loading exited - Phase:", latestRoom.phase);
          console.log("[DEBUG] Gameplay entered - Phase:", latestRoom.phase);
        } else {
          console.log("[DEBUG] Loading exit deferred because room phase is still lobby or room is empty");
        }
      }, 2500); // 2.5 seconds minimum visual polish display time
    } else if (!isTimerRunningRef.current && showLoadingScreen) {
      // If the timer is not running, but loading screen is still shown and we receive a ready state
      setShowLoadingScreen(false);
      console.log("[DEBUG] Loading exited (deferred check) - Phase:", room.phase);
      console.log("[DEBUG] Gameplay entered (deferred check) - Phase:", room.phase);
    }

    prevPhaseRef.current = room.phase;
  }, [room?.phase, room?.code, lastRoomCode, showLoadingScreen]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, []);

  const selectedStadiumObj = STADIUMS.find((s) => s.id === room.stadium) || STADIUMS[0];
  const dustParticles = Array.from({ length: 15 });

  return (
    <main className="stadium-bg stadium-lights min-h-screen px-4 py-6 sm:px-8 relative overflow-hidden flex flex-col justify-start">
      {/* Stadium background overlay for match/toss screen */}
      {room && room.phase !== "lobby" && (
        <div 
          className="absolute inset-0 bg-cover bg-center pointer-events-none transition-all duration-1000 z-0 opacity-20 filter brightness-75 scale-100"
          style={{ 
            backgroundImage: `url(${selectedStadiumObj.image})`,
          }}
        />
      )}
      {/* Animated Dust Container */}
      <div className="dust-container">
        {dustParticles.map((_, i) => {
          const size = Math.random() * 4 + 2;
          const delay = Math.random() * 8;
          const left = Math.random() * 100;
          const duration = Math.random() * 7 + 7;
          return (
            <div
              key={i}
              className="dust-particle"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${left}%`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`
              }}
            />
          );
        })}
      </div>

      <div className={`mx-auto max-w-6xl gap-6 w-full relative z-10 ${isChatOpen ? "hidden md:grid grid-cols-1" : "grid grid-cols-1"}`}>
        <ShellHeader
          code={room.code}
          connected={connected}
          connectionStatus={connectionStatus}
          latency={latency}
          muted={muted}
          onMute={onMute}
          onLeave={actions.leaveRoom}
        />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6">
          {room.phase === "lobby" && (
            <LobbyPanel
              playerId={playerId}
              room={room}
              onReady={actions.ready}
              onAssignTeam={actions.assignTeam}
              onRandomizeTeams={actions.randomizeTeams}
              onRenameTeam={actions.renameTeam}
              onUpdateTeamBrand={actions.updateTeamBrand}
              onStartSeriesMode={actions.startSeriesMode}
              onStartMatch={actions.startMatch}
              onKickPlayer={actions.kickPlayer}
              onSetJokerPlayer={actions.setJokerPlayer}
            />
          )}
          {room.phase === "tournament-dashboard" && (
            <TournamentPanel
              playerId={playerId}
              room={room}
              onSetMatchReady={actions.setMatchReady}
              onSpectateFixture={actions.spectateFixture}
            />
          )}
          {room.phase === "match-center" && (
            <MatchCenter
              playerId={playerId}
              room={room}
              onReady={actions.setMatchReady}
              onLeaveSpectating={() => actions.spectateFixture(null)}
            />
          )}
          {["toss-choice", "toss-number", "bat-choice"].includes(room.phase) && (
            <div className="flex flex-col gap-4">
              <TossPanel
                playerId={playerId}
                room={room}
                onBatOrBowl={actions.batOrBowl}
                onNumber={actions.tossNumber}
                onTossChoice={actions.tossChoice}
              />
              {room.mode === "series" && !(playerId === room.captainAId || playerId === room.captainBId) && (
                <div className="text-center">
                  <Button
                    variant="secondary"
                    onClick={() => actions.spectateFixture(null)}
                    className="px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs bg-slate-900 border border-slate-800 text-slate-350 hover:text-white"
                  >
                    🔙 Return to Standings
                  </Button>
                </div>
              )}
            </div>
          )}
          {[
            "select-batsman",
            "select-bowler",
            "match",
            "innings-break",
            "match-over"
          ].includes(room.phase) && (
            <MatchPanel
              playerId={playerId}
              room={room}
              onPlay={actions.playBall}
              onRematch={actions.rematch}
              onSelectBatsman={actions.selectBatsman}
              onSelectBowler={actions.selectBowler}
              onContinueToStandings={actions.continueToStandings}
              onSelectSubstitutionOption={actions.selectSubstitutionOption}
              onLeaveSpectating={() => actions.spectateFixture(null)}
            />
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showLoadingScreen && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white"
          >
            {/* Background image of the selected stadium (blurred/darkened) */}
            <div 
              className="absolute inset-0 bg-cover bg-center filter blur-md brightness-50 opacity-40 scale-105"
              style={{ backgroundImage: `url(${selectedStadiumObj.image})` }}
            />
            
            {/* Content card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative z-10 flex flex-col items-center gap-6 px-6 text-center max-w-md"
            >
              <div className="text-emerald-400 font-extrabold text-xs tracking-[0.25em] uppercase bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Loading Stadium...
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="text-6xl filter drop-shadow-md">
                  {selectedStadiumObj.id === "hpca" ? "🏔" : "🏛"}
                </div>
                <h2 className="text-3xl font-black tracking-tight mt-2">
                  {selectedStadiumObj.name}
                </h2>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                  {selectedStadiumObj.location}
                </p>
              </div>

              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-2 relative">
                <motion.div 
                  initial={{ left: "-100%" }}
                  animate={{ left: "100%" }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                />
              </div>

              <p className="text-sm text-slate-300 italic max-w-xs mt-4">
                "{selectedStadiumObj.description}"
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatWidget
        playerId={playerId}
        room={room}
        chatHistory={chatHistory}
        onSendMessage={actions.sendChatMessage}
        onAddReaction={actions.addChatReaction}
        isOpen={isChatOpen}
        setIsOpen={setIsChatOpen}
      />
    </main>
  );
}
