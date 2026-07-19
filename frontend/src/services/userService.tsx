import { create } from "zustand";
import { useConfigStore } from "./configService";
import axiosInstance from "./axiosConfig";
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
    stats: StudyStat[];
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
    stats: [],
    preloadedStatsSet: false,
    clearLevelUp: () => set({ levelUpData: null }),
    triggerLevelUp: (newLevel: number) => set({ levelUpData: { newLevel } }),

    setPreloadedStats: (stats: StudyStat[]) => {
        if (stats && stats.length > 0) {
            const todayStats = stats[stats.length - 1];
            set({ stats, todayMinutes: todayStats?.minutes || 0, preloadedStatsSet: true });
        }
    },

    initTodayMinutes: async () => {
        if (get().preloadedStatsSet) {
            set({ preloadedStatsSet: false });
            return;
        }
        try {
            const res = await axiosInstance.get(`/api/user/stats`);
            if (res.status === 200) {
                const data = res.data;
                const todayStats = data[data.length - 1];
                set({ todayMinutes: todayStats?.minutes || 0 });
            }
        } catch (err) {}
    },

    incrementLocalMinutes: (mins: number) => {
        set((state) => ({
            todayMinutes: state.todayMinutes + mins,
            unsyncedMinutes: state.unsyncedMinutes + mins,
        }));
    },

    syncStudyTime: () => {
        const mins = get().unsyncedMinutes;
        if (mins <= 0) return;
        set({ unsyncedMinutes: 0 });
        axiosInstance.post(`/api/user/study-time`, { minutes: mins }, { withCredentials: true }).catch(console.error);
    },

    checkIn: async () => {
        set({ loading: true });
        const res = await axiosInstance.post(`/api/user/checkin`);
        return res.data;
    },

    logStudyTime: async (minutes: number) => {
        if (minutes <= 0) return;
        try {
            const res = await axiosInstance.post(`/api/user/study-time`, { minutes });
            if (res.status !== 200) throw new Error("Lỗi khi lưu thời gian học");
        } catch (err) {
            console.error(err);
        }
    },

    getStats: async () => {
        set({ loading: true });
        try {
            const res = await axiosInstance.get(`/api/user/stats`);
            if (res.status !== 200) throw new Error("Lỗi khi lấy thống kê");
            const data = res.data;
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
            const res = await axiosInstance.post(`/api/user/gain-xp`, { amount, reason });
            if (res.status !== 200) throw new Error("Lỗi khi cộng XP");
            const data = res.data;

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
            const res = await axiosInstance.post(`/api/user/follow/${uid}`);
            if (res.status !== 200) throw new Error("Error toggling follow");
            const data = res.data;
            return data.isFollowing;
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    checkFollow: async (uid: string) => {
        try {
            const res = await axiosInstance.get(`/api/user/follow/${uid}`);
            if (res.status !== 200) throw new Error("Error checking follow");
            const data = res.data;
            return data.isFollowing;
        } catch (err) {
            console.error(err);
            return null;
        }
    },
}));
