import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { motion } from "framer-motion";
import { useAudio } from "../hooks/useAudio";

type Variant = "primary" | "secondary" | "danger" | "gold";

const variantStyles: Record<Variant, string> = {
  primary: "bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]",
  secondary: "bg-cyan-500 hover:bg-cyan-400 border-cyan-700 text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]",
  danger: "bg-red-500 hover:bg-red-400 border-red-700 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]",
  gold: "bg-amber-500 hover:bg-amber-400 border-amber-700 text-white hover:shadow-[0_0_20px_rgba(245,158,11,0.5)]"
};

export function Button({
  children,
  className = "",
  variant = "primary",
  onClick,
  disabled,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>) {
  const { play } = useAudio();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    play("click");
    if (onClick) onClick(e);
  };

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.96 }}
      disabled={disabled}
      onClick={handleClick}
      className={`btn-3d inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-extrabold uppercase tracking-wide transition-shadow duration-150 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
