import { useState, useEffect } from "react";
import { useEtcStore } from "@/src/services/etcService";
import { getVoiceForLanguage } from "@/src/lib/ttsVoiceStorage";
import { useAuth } from "../contexts/AuthContext";
let globalAudio: HTMLAudioElement | null = null;
const audioCache = new Map<string, string>();
const preloadingSet = new Set<string>();
let currentPlayId = 0;

export const useTTSAudio = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string | null>(null);
  const [playingText, setPlayingText] = useState<string | null>(null);
  const { user } = useAuth();
  useEffect(() => {
    // Ensure default voice is set (migration handled by getVoiceForLanguage)
    getVoiceForLanguage();
  }, []);

  const stopAudio = () => {
    if (globalAudio) {
      globalAudio.pause();
      globalAudio.removeAttribute("src");
      globalAudio.load();
      globalAudio = null;
    }

    setIsPlaying(false);
    setIsLoading(false);
    setLoadingText(null);
    setPlayingText(null);
  };

  const preloadAudio = async (text: string, overrideVoice?: string) => {
    const voice = overrideVoice || getVoiceForLanguage();
    const cacheKey = `${text}_${voice}`;
    if (audioCache.has(cacheKey) || preloadingSet.has(cacheKey)) return;

    preloadingSet.add(cacheKey);
    try {
      const audioUrl = await useEtcStore.getState().textToSpeech(text, voice);
      audioCache.set(cacheKey, audioUrl);
    } catch (error) {
      console.error("Preload error:", error);
    } finally {
      preloadingSet.delete(cacheKey);
    }
  };

  const playSoundEffect = (type: "correct" | "wrong") => {
    currentPlayId++;
    const playId = currentPlayId;
    return new Promise<boolean>((resolve) => {
      stopAudio(); // stop anything playing
      const audio = new Audio(`/audio/${type}.mp3`);
      globalAudio = audio;
      audio.onended = () => {
        if (currentPlayId === playId) globalAudio = null;
        resolve(currentPlayId === playId);
      };
      audio.onerror = () => {
        if (currentPlayId === playId) globalAudio = null;
        resolve(currentPlayId === playId);
      };
      audio.play().catch((e) => {
        if (e.name !== "AbortError") {
          console.error("Sound effect error:", e);
        }
        if (currentPlayId === playId) globalAudio = null;
        resolve(currentPlayId === playId);
      });
    });
  };

  const playAudio = async (text: string, language?: string, playEffect?: "correct" | "wrong") => {
    let playId = currentPlayId;
    if (playEffect) {
      const notInterrupted = await playSoundEffect(playEffect);
      if (!notInterrupted) return; // aborted
      playId = currentPlayId; // still same logical chain, but ID might not have changed. Actually, playSoundEffect increments it, so we use the new ID if we want to check interruption during fetch. Wait, no, playSoundEffect returns true if not interrupted. So we just need to use its currentPlayId as our check.
      playId = currentPlayId;
    } else {
      currentPlayId++;
      playId = currentPlayId;
      stopAudio();
    }

    setIsLoading(true);
    setLoadingText(text);
    try {
      const voice = language || getVoiceForLanguage(user?.targetLanguage);
      const cacheKey = `${text}_${voice}`;

      let audioUrl = audioCache.get(cacheKey);
      if (!audioUrl) {
        audioUrl = await useEtcStore.getState().textToSpeech(text, voice);
        audioCache.set(cacheKey, audioUrl);
      }

      if (currentPlayId !== playId) return; // aborted during fetch

      const audio = new Audio(audioUrl);
      globalAudio = audio;

      audio.onplay = () => {
        setIsPlaying(true);
        setPlayingText(text);
        setIsLoading(false);
        setLoadingText(null);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setPlayingText(null);
      };

      audio.onerror = () => {
        setIsLoading(false);
        setLoadingText(null);
        setIsPlaying(false);
        setPlayingText(null);
      };

      await audio.play();
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("TTS playback error:", error);
      }
      setIsPlaying(false);
      setIsLoading(false);
      setLoadingText(null);
      setPlayingText(null);
    }
  };

  const pauseAudio = () => {
    if (globalAudio) {
      globalAudio.pause();
      setIsPlaying(false);
    }
  };

  return { playAudio, pauseAudio, stopAudio, preloadAudio, playSoundEffect, isPlaying, isLoading, loadingText, playingText };
};
