import { useEffect } from "react";
import { Confetti } from "./components/Confetti";
import { useAudio } from "./hooks/useAudio";
import { useSocketGame } from "./hooks/useSocketGame";
import { GameRoom } from "./pages/GameRoom";
import { HomeScreen } from "./pages/HomeScreen";

import { Button } from "./components/Button";
import { WifiOff } from "lucide-react";
import { motion } from "framer-motion";

export function App() {
  const { actions, connected, connectionStatus, error, latency, room, session, chatHistory } = useSocketGame();
  const { muted, play, setMuted } = useAudio();
  const myTeam = room?.players.find((p) => p.id === session.playerId)?.team;
  const summary = room?.match?.summary;
  const didWin = Boolean(summary?.winnerTeam && summary.winnerTeam === myTeam);

  useEffect(() => {
    const reveal = room?.match?.lastReveal;
    if (!reveal) return;
    play(reveal.wicket ? "wicket" : "hit");
  }, [room?.match?.lastReveal, play]);

  useEffect(() => {
    if (didWin) play("victory");
  }, [didWin, play]);

  return (
    <>
      <Confetti active={didWin} />
      {connectionStatus === "disconnected" && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-6 bg-slate-900 border border-red-500/20 rounded-2xl shadow-2xl text-center flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-2">
              <WifiOff size={32} />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-wide">
              Connection Lost
            </h3>
            <p className="text-slate-300 font-medium">
              Unable to connect to the server.
            </p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Status: 🔴 Disconnected
            </p>
            <Button
              variant="primary"
              onClick={() => {
                actions.reconnect();
              }}
              className="w-full py-3 mt-2 font-black shadow-[0_4px_15px_rgba(239,68,68,0.3)] bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 border-red-500/30"
            >
              RETRY CONNECTION
            </Button>
          </motion.div>
        </div>
      )}
      {!room ? (
        <HomeScreen
          defaultName={session.name}
          error={error}
          onCreate={actions.createRoom}
          onJoin={actions.joinRoom}
          muted={muted}
          onMute={() => setMuted(!muted)}
          connectionStatus={connectionStatus}
        />
      ) : (
        <GameRoom
          actions={actions}
          connected={connected}
          connectionStatus={connectionStatus}
          latency={latency}
          muted={muted}
          onMute={() => setMuted(!muted)}
          playerId={session.playerId}
          room={room}
          chatHistory={chatHistory}
        />
      )}
    </>
  );
}
