import { create } from "zustand";
import toastService from "@/src/services/toastService";
import axiosInstance from "./axiosConfig";

const API_URL = import.meta.env.VITE_API_BACKEND;

const fetchApi = async (endpoint: string, options: any = {}) => {
  const method = options.method || "GET";
  const data = options.body ? JSON.parse(options.body) : undefined;

  const response = await axiosInstance({
    url: `/api${endpoint}`,
    method,
    data,
  });

  return response.data;
};

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface QuizCategory {
  id: string;
  name: string;
  color?: string;
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration: number; // in minutes
  questions: QuizQuestion[];
  creatorId: string;
  categoryId?: string | null;
  categoryName?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  isBuiltIn?: boolean;
  source?: string;
  isMine?: boolean;
  creator?: { uid: string; displayName: string; photoURL?: string } | null;
  createdAt: any;
}

export interface QuizRoomSettings {
  allowRetry: boolean;
  showAnswers: boolean;
  phoenixRebirth: boolean;
  shuffleQuestions: boolean;
}

export interface QuizRoom {
  id: string;
  roomCode: string;
  quizId: string;
  creatorId: string;
  status: "waiting" | "playing" | "finished";
  settings: QuizRoomSettings;
  createdAt: any;
}

export interface QuizResult {
  id: string;
  quizId: string;
  uid: string;
  score: number;
  totalCorrect: number;
  totalQuestions: number;
  answers: Record<string, string>;
  evaluation: Record<string, { userAnswer: string; correctAnswer: string; isCorrect: boolean; explanation?: string }>;
  usedRebirth: boolean;
  roomId?: string;
  roomSettings?: any;
  createdAt: any;
  quizTitle?: string;
  quizDifficulty?: string;
}

interface QuizState {
  loading: boolean;
  quizzes: Quiz[];
  publicQuizzes: Quiz[];
  builtinQuizzes: Quiz[];
  quizHistory: QuizResult[];
  quizCategories: QuizCategory[];

  getQuizzes: () => Promise<Quiz[]>;
  getPublicQuizzes: () => Promise<Quiz[]>;
  getBuiltinQuizzes: () => Promise<Quiz[]>;
  fetchQuizCategories: () => Promise<QuizCategory[]>;
  createQuizCategory: (name: string, color?: string, description?: string) => Promise<QuizCategory | null>;
  updateQuizCategory: (categoryId: string, data: Partial<QuizCategory>) => Promise<QuizCategory | null>;
  deleteQuizCategory: (categoryId: string) => Promise<void>;
  getQuizHistory: () => Promise<QuizResult[]>;
  getQuizById: (id: string) => Promise<Quiz | null>;
  createQuiz: (data: Partial<Quiz>) => Promise<{ id: string; status: string } | null>;
  generateQuizByAI: (prompt: string, numQuestions?: number, difficulty?: string, isPublic?: boolean, categoryId?: string | null) => Promise<Quiz | null>;
  submitQuiz: (quizId: string, answers: Record<string, string>, usedRebirth?: boolean, roomId?: string) => Promise<any | null>;
  createRoom: (quizId: string, settings: QuizRoomSettings) => Promise<{ id: string; roomCode: string; status: string } | null>;
  getRoomByCode: (code: string) => Promise<QuizRoom | null>;
  getRoomById: (id: string) => Promise<QuizRoom | null>;
  useRebirth: (resultId: string, questionId: string, newAnswer: string) => Promise<{ success: boolean; isCorrect: boolean; newScore: number; correctAnswer: string } | null>;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  loading: false,
  quizzes: [],
  publicQuizzes: [],
  builtinQuizzes: [],
  quizHistory: [],
  quizCategories: [],

  getQuizzes: async () => {
    set({ loading: true });
    try {
      const data = await fetchApi("/quiz");
      set({ quizzes: data, loading: false });
      return data;
    } catch (error: any) {
      toastService.error(error.message);
      set({ loading: false });
      return [];
    }
  },

  getPublicQuizzes: async () => {
    set({ loading: true });
    try {
      const data = await fetchApi("/quiz/public");
      set({ publicQuizzes: data, loading: false });
      return data;
    } catch (error: any) {
      toastService.error(error.message);
      set({ loading: false });
      return [];
    }
  },

  getBuiltinQuizzes: async () => {
    set({ loading: true });
    try {
      const data = await fetchApi("/quiz/builtin");
      set({ builtinQuizzes: data, loading: false });
      return data;
    } catch (error: any) {
      toastService.error(error.message || "Không tải được quiz có sẵn");
      set({ loading: false });
      return [];
    }
  },

  fetchQuizCategories: async () => {
    try {
      const data = await fetchApi("/quiz/categories");
      set({ quizCategories: data });
      return data;
    } catch (error: any) {
      console.error(error);
      return [];
    }
  },

  createQuizCategory: async (name, color = "bg-blue-500", description = "") => {
    try {
      const data = await fetchApi("/quiz/category", {
        method: "POST",
        body: JSON.stringify({ name, color, description }),
      });
      set((state) => ({ quizCategories: [data, ...state.quizCategories.filter((c) => c.id !== data.id)] }));
      toastService.success("Đã tạo đề mục quiz");
      return data;
    } catch (error: any) {
      toastService.error(error.message || "Không tạo được đề mục quiz");
      return null;
    }
  },

  updateQuizCategory: async (categoryId, data) => {
    try {
      const updated = await fetchApi(`/quiz/category/${categoryId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      set((state) => ({ quizCategories: state.quizCategories.map((c) => (c.id === categoryId ? updated : c)) }));
      toastService.success("Đã cập nhật đề mục quiz");
      return updated;
    } catch (error: any) {
      toastService.error(error.message || "Không cập nhật được đề mục quiz");
      return null;
    }
  },

  deleteQuizCategory: async (categoryId) => {
    try {
      await fetchApi(`/quiz/category/${categoryId}`, { method: "DELETE" });
      set((state) => ({
        quizCategories: state.quizCategories.filter((c) => c.id !== categoryId),
        quizzes: state.quizzes.map((quiz) => (quiz.categoryId === categoryId ? { ...quiz, categoryId: null, categoryName: "" } : quiz)),
      }));
      toastService.success("Đã xóa đề mục quiz");
    } catch (error: any) {
      toastService.error(error.message || "Không xóa được đề mục quiz");
    }
  },

  getQuizHistory: async () => {
    set({ loading: true });
    try {
      const data = await fetchApi("/quiz/history");
      set({ quizHistory: data, loading: false });
      return data;
    } catch (error: any) {
      toastService.error(error.message);
      set({ loading: false });
      return [];
    }
  },

  getQuizById: async (id: string) => {
    set({ loading: true });
    try {
      const data = await fetchApi(`/quiz/${id}`);
      set({ loading: false });
      return data;
    } catch (error: any) {
      toastService.error(error.message);
      set({ loading: false });
      return null;
    }
  },

  createQuiz: async (data: Partial<Quiz>) => {
    set({ loading: true });
    try {
      const result = await fetchApi("/quiz", {
        method: "POST",
        body: JSON.stringify(data),
      });
      // Optionally refresh quizzes
      get().getQuizzes();
      toastService.success("Tạo quiz thành công!");
      set({ loading: false });
      return result;
    } catch (error: any) {
      toastService.error(error.message);
      set({ loading: false });
      return null;
    }
  },

  generateQuizByAI: async (prompt: string, numQuestions: number = 5, difficulty: string = "Trung bình", isPublic: boolean = true, categoryId: string | null = null) => {
    set({ loading: true });
    try {
      const data = await fetchApi("/quiz/generate", {
        method: "POST",
        body: JSON.stringify({ prompt, numQuestions, difficulty, isPublic, categoryId }),
      });
      set({ loading: false });
      return data;
    } catch (error: any) {
      toastService.error(error.message);
      set({ loading: false });
      return null;
    }
  },

  submitQuiz: async (quizId: string, answers: Record<string, string>, usedRebirth: boolean = false, roomId?: string) => {
    set({ loading: true });
    try {
      const endpoint = String(quizId).startsWith("builtin_quiz_") ? `/quiz/builtin/${quizId}/submit` : `/quiz/${quizId}/submit`;
      const data = await fetchApi(endpoint, {
        method: "POST",
        body: JSON.stringify({ answers, usedRebirth, roomId }),
      });
      set({ loading: false });
      return data;
    } catch (error: any) {
      toastService.error(error.message);
      set({ loading: false });
      return null;
    }
  },

  createRoom: async (quizId: string, settings: QuizRoomSettings) => {
    set({ loading: true });
    try {
      const data = await fetchApi(`/quiz/${quizId}/rooms`, {
        method: "POST",
        body: JSON.stringify({ settings }),
      });
      toastService.success("Tạo phòng chơi thành công!");
      set({ loading: false });
      return data;
    } catch (error: any) {
      toastService.error(error.message);
      set({ loading: false });
      return null;
    }
  },

  getRoomByCode: async (code: string) => {
    set({ loading: true });
    try {
      const data = await fetchApi(`/quiz/rooms/${code}`);
      set({ loading: false });
      return data;
    } catch (error: any) {
      toastService.error(error.message);
      set({ loading: false });
      return null;
    }
  },

  getRoomById: async (id: string) => {
    set({ loading: true });
    try {
      const data = await fetchApi(`/quiz/rooms/id/${id}`);
      set({ loading: false });
      return data;
    } catch (error: any) {
      toastService.error(error.message);
      set({ loading: false });
      return null;
    }
  },

  useRebirth: async (resultId: string, questionId: string, newAnswer: string) => {
    set({ loading: true });
    try {
      const data = await fetchApi(`/quiz/rebirth/${resultId}`, {
        method: "POST",
        body: JSON.stringify({ questionId, newAnswer }),
      });
      set({ loading: false });
      return data;
    } catch (error: any) {
      toastService.error(error.message);
      set({ loading: false });
      return null;
    }
  },
}));
