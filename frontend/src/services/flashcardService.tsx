import { create } from "zustand";
import toast from "react-hot-toast";
import { useConfigStore } from "./configService";
import { useUserStore } from "./userService";

const API_URL = import.meta.env.VITE_API_BACKEND;

export interface FlashcardFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: any;
  updatedAt: any;
}

export interface FlashcardSet {
  id: string;
  folderId?: string | null;
  order?: number;
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
  folders: FlashcardFolder[];
  sets: FlashcardSet[];
  currentSet: FlashcardSet | null;
  cards: Flashcard[];

  fetchFolders: () => Promise<void>;
  createFolder: (name: string, color?: string) => Promise<FlashcardFolder | null>;
  updateFolder: (folderId: string, data: Partial<FlashcardFolder>) => Promise<FlashcardFolder | null>;
  deleteFolder: (folderId: string, deleteSets?: boolean) => Promise<void>;

  fetchSets: () => Promise<void>;
  createSet: (title: string, description?: string, color?: string) => Promise<FlashcardSet | null>;
  updateSet: (setId: string, data: Partial<FlashcardSet>) => Promise<FlashcardSet | null>;
  deleteSet: (setId: string) => Promise<void>;

  fetchCards: (setId: string) => Promise<void>;
  createCard: (setId: string, data: Partial<Flashcard>) => Promise<Flashcard | null>;
  deleteCard: (cardId: string) => Promise<void>;

  generateAI: (term: string) => Promise<any>;
  cloneSet: (setId: string) => Promise<FlashcardSet | null>;
  updateSetPrivacy: (setId: string, isPublic: boolean) => Promise<void>;
}

export const useFlashcardStore = create<FlashcardState>((set, get) => ({
  loading: false,
  folders: [],
  sets: [],
  currentSet: null,
  cards: [],

  fetchFolders: async () => {
    try {
      const res = await fetch(`${API_URL}/api/flashcard/folders`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        set({ folders: data });
      }
    } catch (err) {
      console.error(err);
    }
  },

  createFolder: async (name, color = "bg-blue-500") => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      const data = await res.json();
      set((state) => ({ folders: [data, ...state.folders] }));
      toast.success("Đã tạo thư mục");
      return data;
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tạo thư mục");
      return null;
    } finally {
      set({ loading: false });
    }
  },

  updateFolder: async (folderId, data) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/folder/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update folder");
      const resData = await res.json();
      set((state) => ({
        folders: state.folders.map(f => f.id === folderId ? { ...f, ...resData.updates } : f)
      }));
      toast.success("Đã cập nhật thư mục");
      return resData;
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi cập nhật thư mục");
      return null;
    } finally {
      set({ loading: false });
    }
  },

  deleteFolder: async (folderId, deleteSets = false) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/folder/${folderId}?deleteSets=${deleteSets}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete folder");
      set((state) => ({ 
        folders: state.folders.filter((f) => f.id !== folderId),
        sets: deleteSets ? state.sets.filter(s => s.folderId !== folderId) : state.sets.map(s => s.folderId === folderId ? { ...s, folderId: null } : s)
      }));
      toast.success("Đã xóa thư mục");
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi xóa thư mục");
    } finally {
      set({ loading: false });
    }
  },

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

  updateSet: async (setId, data) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/set/${setId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update set");
      const resData = await res.json();
      
      set((state) => ({
        sets: state.sets.map(s => s.id === setId ? { ...s, ...resData.updates } : s),
        currentSet: state.currentSet?.id === setId ? { ...state.currentSet, ...resData.updates } : state.currentSet
      }));
      
      toast.success("Cập nhật bộ thẻ thành công");
      return resData;
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi cập nhật bộ thẻ");
      return null;
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

  generateAI: async (term) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/generate-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ term }),
      });
      if (!res.ok) throw new Error("Lỗi khi gọi AI");
      return await res.json();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tạo bằng AI");
      return null;
    } finally {
      set({ loading: false });
    }
  },

  cloneSet: async (setId) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/set/${setId}/clone`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to clone set");
      const data = await res.json();
      set((state) => ({ sets: [data, ...state.sets] }));
      toast.success("Đã sao chép bộ thẻ");
      return data;
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi sao chép bộ thẻ");
      return null;
    } finally {
      set({ loading: false });
    }
  },

  updateSetPrivacy: async (setId, isPublic) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/set/${setId}/privacy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublic }),
      });
      if (!res.ok) throw new Error("Failed to update privacy");
      
      set((state) => ({
        sets: state.sets.map(s => s.id === setId ? { ...s, isPublic } : s),
        currentSet: state.currentSet?.id === setId ? { ...state.currentSet, isPublic } : state.currentSet
      }));
      
      toast.success(isPublic ? "Đã chuyển thành Công khai" : "Đã chuyển thành Riêng tư");
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi cập nhật quyền riêng tư");
    } finally {
      set({ loading: false });
    }
  },
}));
