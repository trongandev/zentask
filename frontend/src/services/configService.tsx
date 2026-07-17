import { create } from "zustand";
import axiosInstance from "./axiosConfig";

export interface SystemLevel {
  level: number;
  xp: number;
  title: string;
}

export interface DailyTaskConfig {
  id: string;
  title: string;
  total: number;
  icon: string;
  point: number;
  xpPerItem: number;
  desc: string;
}

interface ConfigState {
  levels: SystemLevel[];
  dailyTasks: DailyTaskConfig[];
  badges: any[];
  taskProgress: Record<string, number>;
  loading: boolean;
  setConfigs: (configs: Partial<ConfigState>) => void;
  incrementTaskProgress: (taskId: string, amount?: number) => void;
  setTaskProgress: (progress: Record<string, number>) => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  levels: [],
  dailyTasks: [],
  badges: [],
  taskProgress: {},
  loading: false,
  setConfigs: (configs: Partial<ConfigState>) => {
    set({ ...configs, loading: false });
  },
  incrementTaskProgress: (taskId: string, amount = 1) => {
    // Only update local state optimistic UI
    set((state) => {
      // Find max total for task
      const task = state.dailyTasks.find(t => t.id === taskId);
      const max = task ? task.total : Infinity;
      const current = state.taskProgress[taskId] || 0;
      const newProgress = Math.min(current + amount, max);
      
      return {
        taskProgress: {
          ...state.taskProgress,
          [taskId]: newProgress
        }
      };
    });
  },
  setTaskProgress: (progress: Record<string, number>) => {
    set((state) => ({
      taskProgress: { ...state.taskProgress, ...progress }
    }));
  }
}));
