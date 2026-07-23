import type { PropsWithChildren, CSSProperties } from "react";

type CardVariant = "default" | "grass" | "cyan" | "red" | "gold";

const variantStyles: Record<CardVariant, string> = {
  default: "border-white/10",
  grass: "neon-border-grass",
  cyan: "neon-border-cyan",
  red: "neon-border-red",
  gold: "neon-border-gold"
};

export function Card({
  children,
  className = "",
  variant = "default",
  style
}: PropsWithChildren<{ className?: string; variant?: CardVariant; style?: CSSProperties }>) {
  return (
    <section style={style} className={`glass rounded-2xl p-6 ${variantStyles[variant]} ${className}`}>
      {children}
    </section>
  );
}
