import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useConfigStore } from "../services/configService";
import { useUserStore } from "../services/userService";
import { useFlashcardStore } from "../services/flashcardService";
import { useEtcStore } from "../services/etcService";
export type AppThemeMode = "light" | "dark" | "system";
export type AppAccentColor = "blue" | "purple" | "green" | "orange" | "pink" | "slate";

export interface AppSettings {
  theme?: AppThemeMode;
  accentColor?: AppAccentColor;
}

export interface OnboardingState {
  completed?: boolean;
  completedAt?: string | null;
  skipped?: boolean;
  skippedAt?: string | null;
  lastStep?: number;
  version?: string;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: "user" | "teacher" | "collab" | "admin";
  level: number;
  xp: number;
  streak: number;
  maxStreak?: number;
  lastCheckInDate?: string;
  rankId?: number;
  tier?: number;
  stars?: number;
  bio?: string;
  username?: string;
  achievedBadges?: number[];
  grammarProgress?: {
    maxStage: number;
    totalCorrect: number;
    totalWrong: number;
    totalTimeSpent: number;
    completedStages: number[];
  };
  customGrammarTests?: any[]; // Array of GrammarStage
  tensesProgress?: {
    maxStage: number;
    totalCorrect: number;
    totalWrong: number;
    totalTimeSpent: number;
    completedStages: number[];
  };
  customTensesTests?: any[]; // Array of TensesStage
  appSettings?: AppSettings;
  onboarding?: OnboardingState;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  initialNotifications: any[];
  logout: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, initialNotifications: [], logout: async () => {}, updateUser: () => {} });

export const useAuth = () => useContext(AuthContext);

const API_URL = import.meta.env.VITE_API_BACKEND;

const ACCENT_HEX: Record<AppAccentColor, string> = {
  blue: "#2563eb",
  purple: "#7c3aed",
  green: "#16a34a",
  orange: "#f97316",
  pink: "#db2777",
  slate: "#334155",
};

export function applyAppAppearance(settings?: AppSettings | null) {
  const stored = localStorage.getItem("zentaskAppearance");
  const localSettings = stored ? JSON.parse(stored) : {};
  const next = { ...localSettings, ...(settings || {}) } as AppSettings;
  const theme = next.theme || "light";
  const accentColor = next.accentColor || "blue";
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const useDark = theme === "dark" || (theme === "system" && prefersDark);

  document.documentElement.classList.toggle("theme-dark", useDark);
  document.documentElement.dataset.theme = useDark ? "dark" : "light";
  document.documentElement.dataset.accent = accentColor;
  document.documentElement.style.setProperty("--zt-accent", ACCENT_HEX[accentColor] || ACCENT_HEX.blue);
  localStorage.setItem("zentaskAppearance", JSON.stringify(next));
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [initialNotifications, setInitialNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      // Fetch session and unified payload from backend
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        setUser(null);
        applyAppAppearance(null);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setUser(data.user as UserProfile);
      applyAppAppearance(data.user?.appSettings);
      setInitialNotifications(data.notifications || []);

      // Đồng bộ sang Extension qua externally_connectable
      if (data.extensionToken && window.chrome && window.chrome.runtime) {
        const extensionId = import.meta.env.VITE_EXTENSION_ID;
        if (extensionId) {
          try {
            window.chrome.runtime.sendMessage(extensionId, {
              action: "SYNC_FIREBASE_AUTH",
              token: data.extensionToken,
              user: data.user,
            });
          } catch (e) {
            console.error("Extension sync error", e);
          }
        }
      }

      useConfigStore.getState().setConfigs({
        levels: data.config?.levels || [],
        dailyTasks: data.config?.dailyTasks || [],
        badges: data.config?.badges || [],
        taskProgress: data.userProgress?.taskProgress || {},
      });

      if (data.userProgress?.stats) {
        useUserStore.getState().setPreloadedStats(data.userProgress.stats);
      }
      if (data.userProgress?.dueCards) {
        useFlashcardStore.getState().setPreloadedDueCards(data.userProgress.dueCards);
      }
      if (data.userProgress?.weeklyLeaderboard) {
        useEtcStore.getState().setPreloadedWeeklyLeaderboard(data.userProgress.weeklyLeaderboard);
      }
    } catch (error) {
      console.error("Error setting up auth:", error);
      setUser(null);
      applyAppAppearance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => applyAppAppearance(user?.appSettings || null);
    media?.addEventListener?.("change", onChange);
    return () => media?.removeEventListener?.("change", onChange);
  }, [user?.appSettings]);

  useEffect(() => {
    const handleXpUpdate = (e: any) => {
      const xpResult = e.detail;
      if (xpResult && typeof xpResult.xp === "number") {
        setUser((prevUser) => {
          if (prevUser) {
            return { ...prevUser, xp: xpResult.xp, level: xpResult.level };
          }
          return prevUser;
        });
      }
    };
    window.addEventListener("xp_updated", handleXpUpdate);
    return () => window.removeEventListener("xp_updated", handleXpUpdate);
  }, []);

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      window.location.href = "/auth";
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser((prevUser) => {
      if (prevUser) {
        const merged = { ...prevUser, ...updates };
        applyAppAppearance(merged.appSettings);
        return merged;
      }
      return prevUser;
    });
  };

  return <AuthContext.Provider value={{ user, loading, initialNotifications, logout, updateUser }}>{children}</AuthContext.Provider>;
}
