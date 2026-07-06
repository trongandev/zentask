import { create } from "zustand";

const API_URL = import.meta.env.VITE_API_BACKEND;

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
  taskProgress: Record<string, number>;
  loading: boolean;
  fetchConfigs: () => Promise<void>;
  incrementTaskProgress: (taskId: string, amount?: number) => void;
  setTaskProgress: (progress: Record<string, number>) => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  levels: [],
  dailyTasks: [],
  taskProgress: {},
  loading: false,
  fetchConfigs: async () => {
    if (get().levels.length > 0 && get().dailyTasks.length > 0) return; // Already fetched

    set({ loading: true });
    try {
      const [levelsRes, tasksRes, progressRes] = await Promise.all([
        fetch(`${API_URL}/api/config/levels`), 
        fetch(`${API_URL}/api/config/daily-tasks`),
        fetch(`${API_URL}/api/user/daily-tasks/progress`, {credentials: 'include'})
      ]);

      const levels = await levelsRes.json();
      const dailyTasks = await tasksRes.json();
      const taskProgress = progressRes.ok ? await progressRes.json() : {};

      set({ levels, dailyTasks, taskProgress, loading: false });
    } catch (error) {
      console.error("Error fetching configs:", error);
      set({ loading: false });
    }
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
