"use client";

import { Howl, Howler } from "howler";
import { create } from "zustand";

export type SoundName =
  | "click"
  | "spin"
  | "reelStop"
  | "win"
  | "bigWin"
  | "coin"
  | "roulette";

/**
 * Thin wrapper over Howler. Sounds are optional and everything is a no-op
 * until the user has interacted (browsers block autoplay).
 *
 * Registered sounds point at `public/audio/*.mp3`. Missing files degrade
 * silently rather than throwing.
 */
const SOURCES: Record<SoundName, string> = {
  click: "/audio/click.mp3",
  spin: "/audio/spin.mp3",
  reelStop: "/audio/reel-stop.mp3",
  win: "/audio/win.mp3",
  bigWin: "/audio/big-win.mp3",
  coin: "/audio/coin.mp3",
  roulette: "/audio/roulette.mp3",
};

class AudioManager {
  private sounds = new Map<SoundName, Howl>();
  private ready = false;

  init() {
    if (this.ready || typeof window === "undefined") return;
    this.ready = true;
    (Object.keys(SOURCES) as SoundName[]).forEach((name) => {
      this.sounds.set(
        name,
        new Howl({
          src: [SOURCES[name]],
          volume: name === "spin" ? 0.4 : 0.6,
          preload: true,
        }),
      );
    });
  }

  play(name: SoundName) {
    if (typeof window === "undefined") return;
    this.init();
    try {
      this.sounds.get(name)?.play();
    } catch {
      // Ignore — audio is a nice-to-have.
    }
  }

  setMuted(muted: boolean) {
    Howler.mute(muted);
  }
}

export const audio = new AudioManager();

interface AudioState {
  muted: boolean;
  toggleMute: () => void;
  play: (name: SoundName) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  muted: false,
  toggleMute: () => {
    const muted = !get().muted;
    audio.setMuted(muted);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("catsino:muted", String(muted));
    }
    set({ muted });
  },
  play: (name) => {
    if (get().muted) return;
    audio.play(name);
  },
}));
