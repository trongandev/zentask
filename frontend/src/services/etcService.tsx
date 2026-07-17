import { create } from "zustand";
import axiosInstance from "./axiosConfig";

interface EtcState {
  loading: boolean;
  getLeaderboard: (type: "week" | "month" | "all", force?: boolean) => Promise<any[]>;
  preloadedWeeklyLeaderboard: any[] | null;
  setPreloadedWeeklyLeaderboard: (leaderboard: any[]) => void;
  checkLeaderboardRewards: () => Promise<any[]>;
  claimLeaderboardReward: (type: "week" | "month", period: string) => Promise<any>;
  getUserProfile: (uid: string) => Promise<any>;
  textToSpeech: (text: string, voice: string) => Promise<string>;
}

export const useEtcStore = create<EtcState>((set, get) => ({
  loading: false,
  preloadedWeeklyLeaderboard: null,

  setPreloadedWeeklyLeaderboard: (leaderboard) => set({ preloadedWeeklyLeaderboard: leaderboard }),

  getLeaderboard: async (type = "all", force = false) => {
    if (type === "week") {
      const { preloadedWeeklyLeaderboard } = get();
      if (preloadedWeeklyLeaderboard && !force) {
        set({ preloadedWeeklyLeaderboard: null });
        return preloadedWeeklyLeaderboard;
      }
    }

    set({ loading: true });
    try {
      const res = await axiosInstance.get(`/api/leaderboard?type=${type}${force ? "&force=true" : ""}`);
      return res.data;
    } catch (error: any) {
      return [];
    } finally {
      set({ loading: false });
    }
  },

  checkLeaderboardRewards: async () => {
    try {
      const res = await axiosInstance.get("/api/leaderboard/rewards");
      return res.data;
    } catch (error: any) {
      return [];
    }
  },

  claimLeaderboardReward: async (type, period) => {
    set({ loading: true });
    try {
      const res = await axiosInstance.post("/api/leaderboard/claim", { type, period });
      return res.data;
    } catch (error: any) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getUserProfile: async (uid) => {
    set({ loading: true });
    try {
      const res = await axiosInstance.get(`/api/user/profile/${uid}`);
      return res.data;
    } catch (error: any) {
      return null;
    } finally {
      set({ loading: false });
    }
  },

  textToSpeech: async (text, voice) => {
    try {
      const response = await fetch(`https://python.quizzet.id.vn/edge-tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error: any) {
      throw error;
    }
  },
}));
