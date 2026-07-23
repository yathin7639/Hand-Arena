import { useCallback, useState } from "react";

const tones = {
  click: [520, 0.05],
  coin: [987, 0.16],
  hit: [440, 0.08],
  wicket: [130, 0.18],
  cheer: [660, 0.12],
  victory: [880, 0.28]
} as const;

export function useAudio() {
  const [muted, setMuted] = useState(false);

  const play = useCallback(
    (kind: keyof typeof tones) => {
      if (muted) return;
      const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContextCtor) return;
      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const [frequency, duration] = tones[kind];
      oscillator.frequency.value = frequency;
      
      if (kind === "wicket") {
        oscillator.type = "sawtooth";
      } else if (kind === "coin") {
        oscillator.type = "sine";
      } else {
        oscillator.type = "triangle";
      }
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    },
    [muted]
  );

  return { muted, setMuted, play };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
