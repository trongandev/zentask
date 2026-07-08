import { create } from "zustand";
import toast from "react-hot-toast";
import { useConfigStore } from "./configService";

const API_URL = import.meta.env.VITE_API_BACKEND;

interface StudyStat {
  date: string;
  name: string; // T2, T3, etc.
  minutes: number;
  isCheckedIn: boolean;
}

interface UserState {
  loading: boolean;
  checkIn: () => Promise<{ streak: number; lastCheckInDate: string } | null>;
  logStudyTime: (minutes: number) => Promise<void>;
  getStats: () => Promise<StudyStat[]>;
  gainXp: (amount: number, reason: string) => Promise<{ xp: number; level: number; levelUp: boolean } | null>;
  levelUpData: { newLevel: number } | null;
  clearLevelUp: () => void;
  triggerLevelUp: (newLevel: number) => void;
  todayMinutes: number;
  unsyncedMinutes: number;
  preloadedStatsSet: boolean;
  setPreloadedStats: (stats: StudyStat[]) => void;
  initTodayMinutes: () => Promise<void>;
  incrementLocalMinutes: (mins: number) => void;
  syncStudyTime: () => void;
  toggleFollow: (uid: string) => Promise<boolean | null>;
  checkFollow: (uid: string) => Promise<boolean | null>;
}

export const useUserStore = create<UserState>((set, get) => ({
  loading: false,
  levelUpData: null,
  todayMinutes: 0,
  unsyncedMinutes: 0,
  preloadedStatsSet: false,
  clearLevelUp: () => set({ levelUpData: null }),
  triggerLevelUp: (newLevel: number) => set({ levelUpData: { newLevel } }),

  setPreloadedStats: (stats: StudyStat[]) => {
    if (stats && stats.length > 0) {
      const todayStats = stats[stats.length - 1];
      set({ todayMinutes: todayStats?.minutes || 0, preloadedStatsSet: true });
    }
  },

  initTodayMinutes: async () => {
    if (get().preloadedStatsSet) {
      set({ preloadedStatsSet: false });
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/user/stats`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const todayStats = data[data.length - 1];
        set({ todayMinutes: todayStats?.minutes || 0 });
      }
    } catch (err) {}
  },

  incrementLocalMinutes: (mins: number) => {
    set((state) => ({ 
      todayMinutes: state.todayMinutes + mins,
      unsyncedMinutes: state.unsyncedMinutes + mins
    }));
  },

  syncStudyTime: () => {
    const mins = get().unsyncedMinutes;
    if (mins <= 0) return;
    set({ unsyncedMinutes: 0 });
    fetch(`${API_URL}/api/user/study-time`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ minutes: mins }),
      keepalive: true
    }).catch(console.error);
  },

  checkIn: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/user/checkin`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Lỗi khi điểm danh");
      const data = await res.json();
      
      if (data.status === "already_checked_in") {
        toast.success("Bạn đã điểm danh hôm nay rồi!");
      } else {
        toast.success(`Điểm danh thành công! Chuỗi: ${data.streak} ngày`);
        if (data.levelUp) {
          set({ levelUpData: { newLevel: data.level } });
        }
      }
      
      if (data.taskProgress) {
        useConfigStore.getState().setTaskProgress(data.taskProgress);
      }
      
      return data;
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi điểm danh");
      return null;
    } finally {
      set({ loading: false });
    }
  },

  logStudyTime: async (minutes: number) => {
    if (minutes <= 0) return;
    try {
      const res = await fetch(`${API_URL}/api/user/study-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ minutes }),
      });
      if (!res.ok) throw new Error("Lỗi khi lưu thời gian học");
    } catch (err) {
      console.error(err);
    }
  },

  getStats: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/user/stats`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Lỗi khi lấy thống kê");
      const data = await res.json();
      return data;
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      set({ loading: false });
    }
  },

  gainXp: async (amount: number, reason: string) => {
    try {
      const res = await fetch(`${API_URL}/api/user/gain-xp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount, reason }),
      });
      if (!res.ok) throw new Error("Lỗi khi cộng XP");
      const data = await res.json();
      
      if (data.levelUp) {
        set({ levelUpData: { newLevel: data.level } });
      }
      
      return data; // { xp, level, levelUp }
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  toggleFollow: async (uid: string) => {
    try {
      const res = await fetch(`${API_URL}/api/user/follow/${uid}`, {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Error toggling follow");
      const data = await res.json();
      return data.isFollowing;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  checkFollow: async (uid: string) => {
    try {
      const res = await fetch(`${API_URL}/api/user/follow/${uid}`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Error checking follow");
      const data = await res.json();
      return data.isFollowing;
    } catch (err) {
      console.error(err);
      return null;
    }
  }
}));
