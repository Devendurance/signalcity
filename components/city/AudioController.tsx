"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface AudioControllerProps {
  isStormy: boolean;
  hasWeatherData: boolean;
}

const STORM_TRACK = "/audio/rain-thunderstorm.mp3";
const CLEAR_TRACK = "/audio/clear-city.mp3";

export function AudioController({ isStormy, hasWeatherData }: AudioControllerProps) {
  const [muted, setMuted] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("signalcity-audio-muted") === "true";
    }
    return false;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<string | null>(null);

  const targetTrack: string | null = !hasWeatherData
    ? null
    : isStormy ? STORM_TRACK : CLEAR_TRACK;

  // Switch track when weather changes
  useEffect(() => {
    if (!targetTrack) return;
    if (currentTrackRef.current === targetTrack) return;

    // Create/reuse audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.volume = muted ? 0 : 0.15;
    }

    const audio = audioRef.current;
    audio.src = targetTrack;
    audio.load();

    // Try autoplay — will fail silently if blocked by browser
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Autoplay blocked — wait for user interaction
        console.log("[Audio] Waiting for first interaction to start music");
        const startOnTap = () => {
          if (audioRef.current && currentTrackRef.current === targetTrack) {
            audioRef.current.play().catch(() => {});
          }
        };
        window.addEventListener("click", startOnTap, { once: true });
        window.addEventListener("keydown", startOnTap, { once: true });
      });
    }

    currentTrackRef.current = targetTrack;
  }, [targetTrack, muted]);

  // Update volume when muted changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : 0.15;
    }
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem("signalcity-audio-muted", String(next));
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : 0.15;
      }
      return next;
    });
  }, []);

  // Pause when tab hidden
  useEffect(() => {
    const onVis = () => {
      if (audioRef.current) {
        if (document.hidden) {
          audioRef.current.pause();
        } else if (!muted && currentTrackRef.current) {
          audioRef.current.play().catch(() => {});
        }
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
