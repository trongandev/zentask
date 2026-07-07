import { create } from "zustand";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_BACKEND;

const fetchApi = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

interface EtcState {
  loading: boolean;
  
  getLeaderboard: (type: "week" | "month" | "all") => Promise<any[]>;
  checkLeaderboardRewards: () => Promise<any[]>;
  claimLeaderboardReward: (type: "week" | "month", period: string) => Promise<any>;
  getUserProfile: (uid: string) => Promise<any>;
  textToSpeech: (text: string, voice: string) => Promise<string>;
}

export const useEtcStore = create<EtcState>((set) => ({
  loading: false,

  getLeaderboard: async (type = "all") => {
    set({ loading: true });
    try {
      const data = await fetchApi(`/leaderboard?type=${type}`);
      set({ loading: false });
      return data;
    } catch (error: any) {
      toast.error(error.message);
      set({ loading: false });
      return [];
    }
  },

  checkLeaderboardRewards: async () => {
    try {
      return await fetchApi("/leaderboard/rewards");
    } catch (error: any) {
      return [];
    }
  },

  claimLeaderboardReward: async (type, period) => {
    set({ loading: true });
    try {
      const res = await fetchApi("/leaderboard/claim", {
        method: "POST",
        body: JSON.stringify({ type, period }),
      });
      set({ loading: false });
      return res;
    } catch (error: any) {
      toast.error(error.message);
      set({ loading: false });
      throw error;
    }
  },

  getUserProfile: async (uid) => {
    set({ loading: true });
    try {
      const data = await fetchApi(`/user/profile/${uid}`);
      set({ loading: false });
      return data;
    } catch (error: any) {
      toast.error(error.message);
      set({ loading: false });
      return null;
    }
  },

  textToSpeech: async (text, voice) => {
    try {
      const response = await fetch(`https://python.quizzet.id.vn/edge-tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  }
}));

