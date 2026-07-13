import { create } from "zustand";
import toastService from "@/src/services/toastService";
import { useConfigStore } from "./configService";
import { useUserStore } from "./userService";

const API_URL = import.meta.env.VITE_API_BACKEND;

const readApiError = async (res: Response, fallback: string) => {
  const data = await res.json().catch(() => null);
  return data?.error || data?.message || fallback;
};

export interface FlashcardFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: any;
  updatedAt: any;
}

export interface FlashcardCategory {
  id: string;
  name: string;
  color?: string;
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface FlashcardSet {
  id: string;
  folderId?: string | null;
  categoryId?: string | null;
  categoryName?: string;
  order?: number;
  title: string;
  description: string;
  language?: string; // en, zh, ko, ja, de, fr, es, th
  cardCount: number;
  learnedCount: number;
  lastStudied: string | null;
  color: string;
  isNew: boolean;
  isPublic?: boolean;
  isBuiltIn?: boolean;
  isSystem?: boolean;
  source?: string;
  creator?: { uid: string; displayName: string; photoURL?: string } | null;
  knownCount?: number;
  almostCount?: number;
  unknownCount?: number;
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

export interface CardProgress {
  cardId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string | null;
  quality: number;
  lastReviewedAt: string | null;
}

export type MemoryLevel = "known" | "almost" | "unknown";

export function getMemoryLevel(progress: CardProgress | undefined): MemoryLevel {
  if (!progress) return "unknown";
  if (progress.easeFactor >= 2.5 && progress.repetitions >= 2) return "known";
  if (progress.repetitions >= 1 || progress.easeFactor >= 1.8) return "almost";
  return "unknown";
}

interface PendingUpdate {
  cardId: string;
  setId: string;
  quality: number;
  mode: string;
}

interface FlashcardState {
  loading: boolean;
  folders: FlashcardFolder[];
  categories: FlashcardCategory[];
  sets: FlashcardSet[];
  publicSets: FlashcardSet[];
  builtinSets: FlashcardSet[];
  currentSet: FlashcardSet | null;
  cards: Flashcard[];
  cardProgress: Record<string, CardProgress>;
  pendingUpdates: PendingUpdate[];
  pendingBeginnerUpdates: string[];

  fetchFolders: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  createCategory: (name: string, color?: string, description?: string) => Promise<FlashcardCategory | null>;
  updateCategory: (categoryId: string, data: Partial<FlashcardCategory>) => Promise<FlashcardCategory | null>;
  deleteCategory: (categoryId: string) => Promise<void>;
  createFolder: (name: string, color?: string) => Promise<FlashcardFolder | null>;
  updateFolder: (folderId: string, data: Partial<FlashcardFolder>) => Promise<FlashcardFolder | null>;
  deleteFolder: (folderId: string, deleteSets?: boolean) => Promise<void>;

  fetchSets: () => Promise<void>;
  fetchPublicSets: () => Promise<void>;
  fetchBuiltinSets: () => Promise<void>;
  cloneBuiltinSet: (setId: string) => Promise<FlashcardSet | null>;
  createSet: (title: string, description?: string, color?: string, isPublic?: boolean, categoryId?: string | null, language?: string) => Promise<FlashcardSet | null>;
  updateSet: (setId: string, data: Partial<FlashcardSet>) => Promise<FlashcardSet | null>;
  deleteSet: (setId: string) => Promise<void>;

  fetchCards: (setId: string) => Promise<void>;
  createCard: (setId: string, data: Partial<Flashcard>) => Promise<Flashcard | null>;
  deleteCard: (cardId: string) => Promise<void>;

  // SM-2 methods
  fetchProgress: (setId: string) => Promise<void>;
  recordAnswer: (cardId: string, setId: string, quality: number, mode: string) => void;
  flushProgress: () => Promise<void>;

  recordBeginnerAnswer: (wordId: string) => void;
  flushBeginnerProgress: () => Promise<void>;

  setManualProgress: (cardId: string, setId: string, level: MemoryLevel) => Promise<void>;

  generateAI: (term: string, setId?: string) => Promise<any>;
  cloneSet: (setId: string) => Promise<FlashcardSet | null>;
  updateSetPrivacy: (setId: string, isPublic: boolean) => Promise<void>;
  getDueCards: () => Promise<any[]>;
  preloadedDueCards: any[] | null;
  setPreloadedDueCards: (cards: any[]) => void;
  isReviewAll: boolean;
  setIsReviewAll: (v: boolean) => void;
}

export const useFlashcardStore = create<FlashcardState>((set, get) => ({
  loading: false,
  folders: [],
  categories: [],
  sets: [],
  publicSets: [],
  builtinSets: [],
  currentSet: null,
  cards: [],
  cardProgress: {},
  pendingUpdates: [],
  pendingBeginnerUpdates: [],
  preloadedDueCards: null,
  isReviewAll: false,

  setIsReviewAll: (v) => set({ isReviewAll: v }),
  setPreloadedDueCards: (cards) => set({ preloadedDueCards: cards }),

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

  fetchCategories: async () => {
    try {
      const res = await fetch(`${API_URL}/api/flashcard/categories`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        set({ categories: data });
      }
    } catch (err) {
      console.error(err);
    }
  },

  createCategory: async (name, color = "bg-slate-500", description = "") => {
    try {
      const res = await fetch(`${API_URL}/api/flashcard/category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, color, description }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Không tạo được đề mục"));
      const data = await res.json();
      set((state) => ({ categories: [data, ...state.categories.filter((c) => c.id !== data.id)] }));
      toastService.success("Đã tạo đề mục");
      return data;
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi tạo đề mục");
      return null;
    }
  },

  updateCategory: async (categoryId, data) => {
    try {
      const res = await fetch(`${API_URL}/api/flashcard/category/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Không cập nhật được đề mục"));
      const updated = await res.json();
      set((state) => ({ categories: state.categories.map((c) => (c.id === categoryId ? updated : c)) }));
      toastService.success("Đã cập nhật đề mục");
      return updated;
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi cập nhật đề mục");
      return null;
    }
  },

  deleteCategory: async (categoryId) => {
    try {
      const res = await fetch(`${API_URL}/api/flashcard/category/${categoryId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await readApiError(res, "Không xóa được đề mục"));
      set((state) => ({
        categories: state.categories.filter((c) => c.id !== categoryId),
        sets: state.sets.map((set) => (set.categoryId === categoryId ? { ...set, categoryId: null, categoryName: "" } : set)),
      }));
      toastService.success("Đã xóa đề mục");
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi xóa đề mục");
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
      toastService.success("Đã tạo thư mục");
      return data;
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi tạo thư mục");
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
        folders: state.folders.map((f) => (f.id === folderId ? { ...f, ...resData.updates } : f)),
      }));
      toastService.success("Đã cập nhật thư mục");
      return resData;
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi cập nhật thư mục");
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
        sets: deleteSets ? state.sets.filter((s) => s.folderId !== folderId) : state.sets.map((s) => (s.folderId === folderId ? { ...s, folderId: null } : s)),
      }));
      toastService.success("Đã xóa thư mục");
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi xóa thư mục");
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
      toastService.error(err.message || "Lỗi khi tải danh sách bộ thẻ");
    } finally {
      set({ loading: false });
    }
  },

  fetchPublicSets: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/public`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch public sets");
      const data = await res.json();
      set({ publicSets: data });
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi tải bộ thẻ công khai");
    } finally {
      set({ loading: false });
    }
  },

  fetchBuiltinSets: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/builtin`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch built-in sets");
      const data = await res.json();
      set({ builtinSets: data });
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi tải bộ thẻ có sẵn");
    } finally {
      set({ loading: false });
    }
  },

  cloneBuiltinSet: async (setId) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/builtin/${setId}/clone`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(await readApiError(res, "Không lưu được bộ thẻ có sẵn"));
      const data = await res.json();
      set((state) => ({ sets: [data, ...state.sets] }));
      toastService.success("Đã lưu vào bộ thẻ của tôi");
      return data;
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi lưu bộ thẻ có sẵn");
      return null;
    } finally {
      set({ loading: false });
    }
  },

  createSet: async (title, description = "", color = "bg-blue-500", isPublic = true, categoryId = null, language = "en") => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, description, color, isPublic, categoryId, language }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to create set"));
      const data = await res.json();
      set((state) => ({ sets: [data, ...state.sets] }));
      toastService.success("Tạo bộ thẻ thành công");
      return data;
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi tạo bộ thẻ");
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
      toastService.success("Đã xóa bộ thẻ");
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi xóa bộ thẻ");
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
      if (!res.ok) throw new Error(await readApiError(res, "Failed to update set"));
      const resData = await res.json();

      set((state) => ({
        sets: state.sets.map((s) => (s.id === setId ? { ...s, ...resData.updates } : s)),
        currentSet: state.currentSet?.id === setId ? { ...state.currentSet, ...resData.updates } : state.currentSet,
      }));

      toastService.success("Cập nhật bộ thẻ thành công");
      return resData;
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi cập nhật bộ thẻ");
      return null;
    } finally {
      set({ loading: false });
    }
  },

  fetchCards: async (setId) => {
    set({ loading: true });
    try {
      const endpoint = String(setId).startsWith("builtin_") ? `${API_URL}/api/flashcard/builtin/${setId}/cards` : `${API_URL}/api/flashcard/set/${setId}/cards`;
      const res = await fetch(endpoint, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch cards");
      const data = await res.json();
      set({ currentSet: data.set, cards: data.cards });
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi tải danh sách thẻ");
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
      if (data.xpResult) {
        window.dispatchEvent(new CustomEvent("xp_updated", { detail: data.xpResult }));
        if (data.xpResult.levelUp) {
          useUserStore.getState().triggerLevelUp(data.xpResult.level);
        }
      }

      toastService.success("Đã thêm từ mới");
      return data;
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi tạo từ mới");
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
      toastService.success("Đã xóa từ");
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi xóa từ");
    } finally {
      set({ loading: false });
    }
  },

  generateAI: async (term, setId) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/flashcard/generate-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ term, setId }),
      });
      if (!res.ok) throw new Error("Lỗi khi gọi AI");
      return await res.json();
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi tạo bằng AI");
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
      toastService.success("Đã sao chép bộ thẻ");
      return data;
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi sao chép bộ thẻ");
      return null;
    } finally {
      set({ loading: false });
    }
  },

  // ==================== SM-2 METHODS ====================

  fetchProgress: async (setId) => {
    if (String(setId).startsWith("builtin_")) {
      set({ cardProgress: {} });
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/flashcard/set/${setId}/progress`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      set({ cardProgress: data });
    } catch (err) {
      console.error("fetchProgress error:", err);
    }
  },

  recordAnswer: (cardId, setId, quality, mode) => {
    if (get().isReviewAll) return;
    if (String(setId).startsWith("builtin_") || String(cardId).startsWith("builtin_")) return;
    const newUpdate: PendingUpdate = { cardId, setId, quality, mode };
    set((state) => {
      const newPending = [...state.pendingUpdates, newUpdate];
      // Auto-flush when 5 updates accumulated
      if (newPending.length >= 5) {
        // Trigger flush asynchronously
        setTimeout(() => {
          useFlashcardStore.getState().flushProgress();
        }, 0);
      }
      return { pendingUpdates: newPending };
    });
  },

  flushProgress: async () => {
    const { pendingUpdates } = get();
    if (pendingUpdates.length === 0) return;

    // Optimistically clear pending list
    set({ pendingUpdates: [] });

    try {
      const res = await fetch(`${API_URL}/api/flashcard/progress/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ updates: pendingUpdates }),
      });
      if (!res.ok) throw new Error("Failed to flush progress");
      const data = await res.json();

      // Update local cardProgress state
      if (data.results) {
        set((state) => {
          const updated = { ...state.cardProgress };
          data.results.forEach((r: any) => {
            updated[r.cardId] = {
              cardId: r.cardId,
              easeFactor: r.easeFactor,
              interval: r.interval,
              repetitions: r.repetitions,
              dueDate: r.dueDate ?? null,
              quality: r.quality,
              lastReviewedAt: new Date().toISOString(),
            };
          });
          return { cardProgress: updated };
        });
      }

      if (data.taskProgress) {
        useConfigStore.getState().setTaskProgress(data.taskProgress);
      }
      if (data.xpResult) {
        window.dispatchEvent(new CustomEvent("xp_updated", { detail: data.xpResult }));
        if (data.xpResult.levelUp) {
          useUserStore.getState().triggerLevelUp(data.xpResult.level);
        }
      }
    } catch (err) {
      console.error("flushProgress error:", err);
      // Restore pending updates on failure
      set((state) => ({ pendingUpdates: [...state.pendingUpdates, ...pendingUpdates] }));
    }
  },

  recordBeginnerAnswer: (wordId: string) => {
    set((state) => {
      const newPending = [...state.pendingBeginnerUpdates, wordId];
      if (newPending.length >= 5) {
        setTimeout(() => {
          useFlashcardStore.getState().flushBeginnerProgress();
        }, 0);
      }
      return { pendingBeginnerUpdates: newPending };
    });
  },

  flushBeginnerProgress: async () => {
    const { pendingBeginnerUpdates } = get();
    if (pendingBeginnerUpdates.length === 0) return;

    set({ pendingBeginnerUpdates: [] });

    try {
      const res = await fetch(`${API_URL}/api/user/beginner-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ wordIds: pendingBeginnerUpdates }),
      });
      if (!res.ok) throw new Error("Failed to flush beginner progress");
    } catch (err) {
      console.error("flushBeginnerProgress error:", err);
      // Restore on failure
      set((state) => ({ pendingBeginnerUpdates: [...state.pendingBeginnerUpdates, ...pendingBeginnerUpdates] }));
    }
  },

  setManualProgress: async (cardId, setId, level) => {
    if (String(setId).startsWith("builtin_") || String(cardId).startsWith("builtin_")) {
      toastService.info("Bộ thẻ có sẵn không lưu tiến độ thủ công.");
      return;
    }
    // Optimistic update
    const qualityMap: Record<string, number> = { known: 5, almost: 3, unknown: 1 };
    const quality = qualityMap[level];

    try {
      const res = await fetch(`${API_URL}/api/flashcard/progress/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cardId, setId, level }),
      });
      if (!res.ok) throw new Error("Failed to set manual progress");
      const data = await res.json();

      set((state) => ({
        cardProgress: {
          ...state.cardProgress,
          [cardId]: {
            cardId,
            easeFactor: data.easeFactor,
            interval: data.interval,
            repetitions: data.repetitions,
            dueDate: data.dueDate ?? null,
            quality: data.quality,
            lastReviewedAt: new Date().toISOString(),
          },
        },
      }));

      if (data.taskProgress) {
        useConfigStore.getState().setTaskProgress(data.taskProgress);
      }
      if (data.xpResult) {
        window.dispatchEvent(new CustomEvent("xp_updated", { detail: data.xpResult }));
        if (data.xpResult.levelUp) {
          useUserStore.getState().triggerLevelUp(data.xpResult.level);
        }
      }
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi cập nhật tiến trình");
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
      if (!res.ok) throw new Error(await readApiError(res, "Failed to update privacy"));

      set((state) => ({
        sets: state.sets.map((s) => (s.id === setId ? { ...s, isPublic } : s)),
        currentSet: state.currentSet?.id === setId ? { ...state.currentSet, isPublic } : state.currentSet,
      }));

      toastService.success(isPublic ? "Đã chuyển thành Công khai" : "Đã chuyển thành Riêng tư");
    } catch (err: any) {
      toastService.error(err.message || "Lỗi khi cập nhật quyền riêng tư");
    } finally {
      set({ loading: false });
    }
  },

  getDueCards: async () => {
    const { preloadedDueCards } = get();
    if (preloadedDueCards) {
      set({ preloadedDueCards: null });
      return preloadedDueCards;
    }
    try {
      const res = await fetch(`${API_URL}/api/flashcard/due`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch due cards");
      return await res.json();
    } catch (err: any) {
      console.error("Lỗi khi tải từ vựng cần học:", err);
      return [];
    }
  },
}));
