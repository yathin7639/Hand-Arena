import type { HandNumber } from "@hand-cricket/shared";
import { getMirroredNumber } from "@hand-cricket/shared";
import { motion } from "framer-motion";
import { useAudio } from "../hooks/useAudio";

const DEFAULT_NUMBERS: HandNumber[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function NumberPad({
  disabled,
  onPick,
  selected,
  allowedNumbers,
  frozenNumber,
  hotNumber,
  luckyNumber,
  mirrorActive,
  shuffledKeyMap,
  blindPick
}: {
  disabled?: boolean;
  selected?: HandNumber;
  onPick: (number: HandNumber) => void;
  allowedNumbers?: HandNumber[];
  frozenNumber?: HandNumber | null;
  hotNumber?: HandNumber | null;
  luckyNumber?: HandNumber | null;
  mirrorActive?: boolean;
  shuffledKeyMap?: HandNumber[];
  blindPick?: boolean;
}) {
  const { play } = useAudio();

  const numList = shuffledKeyMap && shuffledKeyMap.length === 11 ? shuffledKeyMap : DEFAULT_NUMBERS;

  const handlePick = (num: HandNumber) => {
    if (disabled) return;
    if (allowedNumbers && !allowedNumbers.includes(num)) return;
    if (frozenNumber === num) return;
    play("click");
    onPick(num);
  };

  return (
    <div className="flex flex-wrap justify-center gap-3.5 max-w-xl mx-auto py-2">
      {numList.map((number) => {
        const isSelected = selected === number;
        const isAllowed = !allowedNumbers || allowedNumbers.includes(number);
        const isFrozen = frozenNumber === number;
        const isHot = hotNumber === number;
        const isLucky = luckyNumber === number;
        const isBtnDisabled = disabled || !isAllowed || isFrozen;

        const displayLabel = mirrorActive ? getMirroredNumber(number) : number;

        return (
          <motion.button
            key={number}
            whileHover={isBtnDisabled ? {} : { scale: 1.08, y: -2 }}
            whileTap={isBtnDisabled ? {} : { scale: 0.93 }}
            disabled={isBtnDisabled}
            onClick={() => handlePick(number)}
            className={`relative w-14 h-14 rounded-full border-2 font-black text-xl transition-all duration-150 flex items-center justify-center ${
              isSelected
                ? "bg-emerald-500 border-emerald-300 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.7)]"
                : isFrozen
                ? "bg-sky-950/80 border-sky-500/40 text-sky-300"
                : isHot
                ? "bg-amber-950/80 border-amber-500/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                : isLucky
                ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "bg-slate-950/70 border-white/10 text-white hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            } disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 disabled:hover:y-0 disabled:hover:shadow-none`}
          >
            {isFrozen ? (
              <span className="text-xs">❄️</span>
            ) : isSelected && blindPick ? (
              <span className="text-sm">🔒</span>
            ) : (
              displayLabel
            )}

            {/* Indicator Badges */}
            {!isFrozen && isHot && (
              <span className="absolute -top-1 -right-1 text-[9px]">🔥</span>
            )}
            {!isFrozen && isLucky && (
              <span className="absolute -top-1 -left-1 text-[9px]">🍀</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
