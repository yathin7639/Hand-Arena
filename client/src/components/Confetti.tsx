import { useMemo } from "react";

export function Confetti({ active }: { active: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 54 }, (_, index) => ({
        id: index,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 0.55}s`,
        color: ["#2dd4bf", "#facc15", "#fb7185", "#ffffff"][index % 4]
      })),
    []
  );

  if (!active) return null;
  return (
    <>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={{ left: piece.left, animationDelay: piece.delay, background: piece.color }}
        />
      ))}
    </>
  );
}
