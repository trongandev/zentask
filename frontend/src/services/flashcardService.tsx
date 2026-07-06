import { create } from "zustand";
import toast from "react-hot-toast";
import { useConfigStore } from "./configService";
import { useUserStore } from "./userService";

const API_URL = import.meta.env.VITE_API_BACKEND;

export interface FlashcardSet {
  id: string;
  title: string;
  description: string;
  cardCount: number;
  learnedCount: number;
  lastStudied: string | null;
  color: string;
  isNew: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface Flashcard {
  id: string;
  setId: string;
  term: string;
  phonetic: string;
  translation: string;
  examples: { en: string; vi: string }[];
  notes: string;
  isLearned: boolean;
  xpResult: any;
  createdAt: any;
  updatedAt: any;
}

interface FlashcardState {
  loading: boolean;
  sets: FlashcardSet[];
  currentSet: FlashcardSet | null;
  cards: Flashcard[];

  fetchSets: () => Promise<void>;
  createSet: (title: string, description?: string, color?: string) => Promise<FlashcardSet | null>;
  deleteSet: (setId: string) => Promise<void>;

  fetchCards: (setId: string) => Promise<void>;
  createCard: (setId: string, data: Partial<Flashcard>) => Promise<Flashcard | null>;
  deleteCard: (cardId: string) => Promise<void>;
}

export const useFlashcardStore = create<FlashcardState>((set, get) => ({
  loading: false,
  sets: [],
  currentSet: null,
  cards: [],

  fetchSets: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/list`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch sets");
      const data = await res.json();
      set({ sets: data });
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tải danh sách bộ thẻ");
    } finally {
      set({ loading: false });
    }
  },

  createSet: async (title, description = "", color = "bg-blue-500") => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, description, color }),
      });
      if (!res.ok) throw new Error("Failed to create set");
      const data = await res.json();
      set((state) => ({ sets: [data, ...state.sets] }));
      toast.success("Tạo bộ thẻ thành công");
      return data;
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tạo bộ thẻ");
      return null;
    } finally {
      set({ loading: false });
    }
  },

  deleteSet: async (setId) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/set/${setId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete set");
      set((state) => ({ sets: state.sets.filter((s) => s.id !== setId) }));
      toast.success("Đã xóa bộ thẻ");
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi xóa bộ thẻ");
    } finally {
      set({ loading: false });
    }
  },

  fetchCards: async (setId) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/set/${setId}/cards`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch cards");
      const data = await res.json();
      set({ currentSet: data.set, cards: data.cards });
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tải danh sách thẻ");
    } finally {
      set({ loading: false });
    }
  },

  createCard: async (setId, cardData) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/set/${setId}/card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(cardData),
      });
      if (!res.ok) throw new Error("Failed to create card");
      const data = await res.json();

      set((state) => ({
        cards: [data, ...state.cards],
        currentSet: state.currentSet ? { ...state.currentSet, cardCount: state.currentSet.cardCount + 1 } : null,
      }));

      if (data.taskProgress) {
        useConfigStore.getState().setTaskProgress(data.taskProgress);
      }
      if (data.xpResult && data.xpResult.levelUp) {
        useUserStore.getState().triggerLevelUp(data.xpResult.level);
      }

      toast.success("Đã thêm từ mới");
      return data;
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tạo từ mới");
      return null;
    } finally {
      set({ loading: false });
    }
  },

  deleteCard: async (cardId) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/card/${cardId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete card");
      set((state) => ({
        cards: state.cards.filter((c) => c.id !== cardId),
        currentSet: state.currentSet ? { ...state.currentSet, cardCount: state.currentSet.cardCount - 1 } : null,
      }));
      toast.success("Đã xóa từ");
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi xóa từ");
    } finally {
      set({ loading: false });
    }
  },
}));
