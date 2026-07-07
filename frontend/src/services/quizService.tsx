import { create } from "zustand";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_BACKEND;

const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_URL}/api${endpoint}`;
  const response = await fetch(url, {
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

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration: number; // in minutes
  questions: QuizQuestion[];
  creatorId: string;
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
  quizHistory: QuizResult[];
  
  getQuizzes: () => Promise<Quiz[]>;
  getQuizHistory: () => Promise<QuizResult[]>;
  getQuizById: (id: string) => Promise<Quiz | null>;
  createQuiz: (data: Partial<Quiz>) => Promise<{ id: string; status: string } | null>;
  generateQuizByAI: (prompt: string, numQuestions?: number, difficulty?: string) => Promise<Quiz | null>;
  submitQuiz: (quizId: string, answers: Record<string, string>, usedRebirth?: boolean, roomId?: string) => Promise<any | null>;
  createRoom: (quizId: string, settings: QuizRoomSettings) => Promise<{ id: string; roomCode: string; status: string } | null>;
  getRoomByCode: (code: string) => Promise<QuizRoom | null>;
  getRoomById: (id: string) => Promise<QuizRoom | null>;
  useRebirth: (resultId: string, questionId: string, newAnswer: string) => Promise<{ success: boolean; isCorrect: boolean; newScore: number; correctAnswer: string } | null>;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  loading: false,
  quizzes: [],
  quizHistory: [],

  getQuizzes: async () => {
    set({ loading: true });
    try {
      const data = await fetchApi("/quiz");
      set({ quizzes: data, loading: false });
      return data;
    } catch (error: any) {
      toast.error(error.message);
      set({ loading: false });
      return [];
    }
  },

  getQuizHistory: async () => {
    set({ loading: true });
    try {
      const data = await fetchApi("/quiz/history");
      set({ quizHistory: data, loading: false });
      return data;
    } catch (error: any) {
      toast.error(error.message);
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
      toast.error(error.message);
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
      toast.success("Tạo quiz thành công!");
      set({ loading: false });
      return result;
    } catch (error: any) {
      toast.error(error.message);
      set({ loading: false });
      return null;
    }
  },

  generateQuizByAI: async (prompt: string, numQuestions: number = 5, difficulty: string = "Trung bình") => {
    set({ loading: true });
    try {
      const data = await fetchApi("/quiz/generate", {
        method: "POST",
        body: JSON.stringify({ prompt, numQuestions, difficulty }),
      });
      set({ loading: false });
      return data;
    } catch (error: any) {
      toast.error(error.message);
      set({ loading: false });
      return null;
    }
  },

  submitQuiz: async (quizId: string, answers: Record<string, string>, usedRebirth: boolean = false, roomId?: string) => {
    set({ loading: true });
    try {
      const data = await fetchApi(`/quiz/${quizId}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers, usedRebirth, roomId }),
      });
      set({ loading: false });
      return data;
    } catch (error: any) {
      toast.error(error.message);
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
      toast.success("Tạo phòng chơi thành công!");
      set({ loading: false });
      return data;
    } catch (error: any) {
      toast.error(error.message);
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
      toast.error(error.message);
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
      toast.error(error.message);
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
      toast.error(error.message);
      set({ loading: false });
      return null;
    }
  }
}));
