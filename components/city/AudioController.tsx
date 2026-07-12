"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface AudioControllerProps {
  isStormy: boolean;
  hasWeatherData: boolean;
}

// Global AudioContext (shared across hot-reloads)
let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

type ActiveTrack = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  src: string;
};

export function AudioController({ isStormy, hasWeatherData }: AudioControllerProps) {
  const [muted, setMuted] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("signalcity-audio-muted") === "true";
    }
    return false;
  });

  const active = useRef<ActiveTrack | null>(null);
  const buffers = useRef<Map<string, AudioBuffer>>(new Map());

  const targetTrack: string | null = !hasWeatherData
    ? null
    : isStormy
      ? "/audio/rain-thunderstorm.mp3"
      : "/audio/clear-city.mp3";

  // ---- Load and switch tracks ----
  useEffect(() => {
    if (!targetTrack) return;
    if (active.current?.src === targetTrack) return;

    const ctx = getAudioCtx();
    let cancelled = false;

    async function loadAndPlay() {
      // Load buffer (cached)
      let buffer = buffers.current.get(targetTrack!);
      if (!buffer) {
        const resp = await fetch(targetTrack!);
        buffer = await ctx.decodeAudioData(await resp.arrayBuffer());
        buffers.current.set(targetTrack!, buffer);
      }

      if (cancelled) return;

      // Stop previous
      const prev = active.current;
      if (prev) {
        try { prev.source.stop(0); } catch { /* ok */ }
      }

      // Start new
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = ctx.createGain();
      gain.gain.value = muted ? 0 : 0.15;
      source.connect(gain);
      gain.connect(ctx.destination);

      source.start(0);
      active.current = { source, gain, src: targetTrack! };
    }

    loadAndPlay().catch((err) => console.warn("[Audio] load failed:", err));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetTrack]);

  // ---- Mute toggle (instant, no restart) ----
  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("signalcity-audio-muted", String(next));
      }
      return next;
    });

    // Apply instantly to the active gain node
    if (active.current) {
      active.current.gain.gain.value = !muted ? 0 : 0.15;
    }
  }, [muted]);

  // ---- Pause when tab hidden ----
  useEffect(() => {
    const onVis = () => {
      if (active.current) {
        active.current.gain.gain.value = document.hidden ? 0 : muted ? 0 : 0.15;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [muted]);

  return (
    <button
      type="button"
      onClick={toggleMute}
      className="audio-toggle"
      aria-label={muted ? "Unmute city audio" : "Mute city audio"}
      title={muted ? "Unmute city audio" : "Mute city audio"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
