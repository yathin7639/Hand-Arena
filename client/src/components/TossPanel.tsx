import type { BatBowlChoice, HandNumber, RoomView, TossSide } from "@hand-cricket/shared";
import { Card } from "./Card";
import { NumberPad } from "./NumberPad";
import { motion } from "framer-motion";
import { useAudio } from "../hooks/useAudio";

const playerName = (room: RoomView, id?: string) =>
  room.players.find((player) => player.id === id)?.name ?? "Player";

export function TossPanel({
  playerId,
  room,
  onBatOrBowl,
  onNumber,
  onTossChoice
}: {
  playerId: string;
  room: RoomView;
  onBatOrBowl: (choice: BatBowlChoice) => void;
  onNumber: (number: HandNumber) => void;
  onTossChoice: (choice: TossSide) => void;
}) {
  const { play } = useAudio();

  const isCaptainA = room.captainAId === playerId;
  const isCaptainB = room.captainBId === playerId;
  const isAnyCaptain = isCaptainA || isCaptainB;

  const isChooser = room.toss.chooserId === playerId;
  const isWinner = room.toss.winnerId === playerId;
  const submitted = Boolean(room.toss.numbers?.[playerId]);

  const handleTossChoice = (choice: TossSide) => {
    play("coin");
    onTossChoice(choice);
  };

  const handleBatOrBowl = (choice: BatBowlChoice) => {
    play("click");
    onBatOrBowl(choice);
  };

  return (
    <Card variant="gold" className="flex flex-col gap-6 max-w-2xl mx-auto w-full py-8 px-6">
      <div className="text-center">
        <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-1 rounded-full">
          🪙 Toss Arena
        </span>
      </div>

      {/* Phase 1: Toss Choice (Chooser calls Odd or Even) */}
      {room.phase === "toss-choice" && (
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center justify-center my-4">
            {/* Spinning Coin */}
            <motion.div
              animate={{ rotateY: 360 }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
              className="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 border-4 border-yellow-300 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(245,158,11,0.6)]"
            >
              🪙
            </motion.div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white text-center">
            {isChooser ? "Call the Toss!" : `${playerName(room, room.toss.chooserId)} (Captain A) is calling the coin`}
          </h2>

          <div className="grid grid-cols-2 gap-4 w-full mt-2">
            <motion.button
              whileHover={isChooser ? { scale: 1.03 } : {}}
              whileTap={isChooser ? { scale: 0.97 } : {}}
              disabled={!isChooser}
              onClick={() => handleTossChoice("odd")}
              className={`flex flex-col items-center justify-center py-6 px-4 rounded-2xl font-black uppercase text-xl transition-all ${
                isChooser
                  ? "bg-slate-900/60 hover:bg-slate-900 border-2 border-cyan-500/40 hover:border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  : "bg-slate-950/40 border border-white/5 text-slate-500"
              }`}
            >
              <span className="text-3xl mb-1">🔢</span>
              Odd
            </motion.button>

            <motion.button
              whileHover={isChooser ? { scale: 1.03 } : {}}
              whileTap={isChooser ? { scale: 0.97 } : {}}
              disabled={!isChooser}
              onClick={() => handleTossChoice("even")}
              className={`flex flex-col items-center justify-center py-6 px-4 rounded-2xl font-black uppercase text-xl transition-all ${
                isChooser
                  ? "bg-slate-900/60 hover:bg-slate-900 border-2 border-emerald-500/40 hover:border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  : "bg-slate-950/40 border border-white/5 text-slate-500"
              }`}
            >
              <span className="text-3xl mb-1">⚖️</span>
              Even
            </motion.button>
          </div>
        </div>
      )}

      {/* Phase 2: Toss Number Submission */}
      {room.phase === "toss-number" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center justify-center">
            {/* Rapidly Spinning Coin */}
            <motion.div
              animate={{ rotateY: 360, rotateX: 180 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 border-4 border-yellow-300 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(245,158,11,0.8)]"
            >
              🪙
            </motion.div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-black text-white">
              {!isAnyCaptain
                ? "Captains are choosing secret values"
                : submitted
                ? "Secret Value Locked!"
                : "Choose your secret toss value"}
            </h2>
            <p className="text-sm text-slate-400 mt-1 uppercase font-bold tracking-wider">
              {room.toss.side ? `Call is: ${room.toss.side}` : ""}
            </p>
          </div>

          {isAnyCaptain ? (
            <div className="mt-2">
              <NumberPad disabled={submitted} selected={room.toss.numbers?.[playerId]} onPick={onNumber} />
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-sm mx-auto w-full my-4">
              <div className="flex justify-between items-center bg-slate-950/40 border border-white/5 p-3 rounded-xl">
                <span className="text-slate-300 font-bold text-sm">Captain A: {playerName(room, room.captainAId)}</span>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                  room.toss.numbers?.[room.captainAId ?? ""] ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/10 text-cyan-400 animate-pulse"
                }`}>
                  {room.toss.numbers?.[room.captainAId ?? ""] ? "LOCKED" : "SELECTING..."}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/40 border border-white/5 p-3 rounded-xl">
                <span className="text-slate-300 font-bold text-sm">Captain B: {playerName(room, room.captainBId)}</span>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                  room.toss.numbers?.[room.captainBId ?? ""] ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/10 text-cyan-400 animate-pulse"
                }`}>
                  {room.toss.numbers?.[room.captainBId ?? ""] ? "LOCKED" : "SELECTING..."}
                </span>
              </div>
            </div>
          )}

          <div className="text-center pt-2">
            <span className="inline-block bg-slate-900/80 px-5 py-2 rounded-full border border-white/10 text-xs font-black uppercase tracking-widest text-slate-300 animate-pulse">
              Waiting for Captains
            </span>
          </div>
        </div>
      )}

      {/* Phase 3: Bat or Bowl Selection */}
      {room.phase === "bat-choice" && (
        <div className="flex flex-col gap-6">
          {room.toss.reveal && (
            <div className="flex flex-col items-center gap-4 text-center">
              {/* Revealed result banner */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/10 w-full">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Total sum: {room.toss.reveal.total} ({room.toss.reveal.result})
                </p>
                <h3 className="text-2xl font-black text-yellow-400 mt-1 uppercase">
                  {playerName(room, room.toss.winnerId)} won the toss
                </h3>
              </div>

              {!isWinner && (
                <div className="py-6 flex flex-col items-center">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-cyan-400 font-extrabold uppercase tracking-wider"
                  >
                    Toss winner Captain is deciding to Bat or Bowl...
                  </motion.div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-2">
            <motion.button
              whileHover={isWinner ? { scale: 1.03 } : {}}
              whileTap={isWinner ? { scale: 0.97 } : {}}
              disabled={!isWinner}
              onClick={() => handleBatOrBowl("bat")}
              className={`flex flex-col items-center justify-center py-6 px-4 rounded-2xl font-black uppercase text-xl transition-all ${
                isWinner
                  ? "bg-slate-900/60 hover:bg-slate-900 border-2 border-emerald-500/40 hover:border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  : "bg-slate-950/40 border border-white/5 text-slate-500"
              }`}
            >
              <span className="text-3xl mb-1">🏏</span>
              Bat First
            </motion.button>

            <motion.button
              whileHover={isWinner ? { scale: 1.03 } : {}}
              whileTap={isWinner ? { scale: 0.97 } : {}}
              disabled={!isWinner}
              onClick={() => handleBatOrBowl("bowl")}
              className={`flex flex-col items-center justify-center py-6 px-4 rounded-2xl font-black uppercase text-xl transition-all ${
                isWinner
                  ? "bg-slate-900/60 hover:bg-slate-900 border-2 border-red-500/40 hover:border-red-400 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                  : "bg-slate-950/40 border border-white/5 text-slate-500"
              }`}
            >
              <span className="text-3xl mb-1">🛡️</span>
              Bowl First
            </motion.button>
          </div>
        </div>
      )}
    </Card>
  );
}
