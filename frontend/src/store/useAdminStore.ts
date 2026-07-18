import { create } from "zustand";
import { adminService } from "../services/adminService";

interface CacheState<T> {
  pages: Record<number, { items: T[]; totalPages: number }>;
  currentPage: number;
  loading: boolean;
  totalItems?: number;
}

interface AdminState {
  users: CacheState<any>;
  tasks: { items: any[]; loading: boolean }; // Tasks is not paginated
  vocabSets: CacheState<any>;
  vocab: CacheState<any>;
  quizzes: CacheState<any>;
  quizHistory: CacheState<any>;

  fetchUsers: (page: number, forceRefresh?: boolean) => Promise<void>;
  fetchTasks: (forceRefresh?: boolean) => Promise<void>;
  fetchVocabSets: (page: number, forceRefresh?: boolean) => Promise<void>;
  fetchVocab: (page: number, forceRefresh?: boolean) => Promise<void>;
  fetchQuizzes: (page: number, forceRefresh?: boolean) => Promise<void>;
  fetchQuizHistory: (page: number, forceRefresh?: boolean) => Promise<void>;

  clearAllCache: () => void;
}

const initialCacheState = { pages: {}, currentPage: 1, loading: false };

export const useAdminStore = create<AdminState>((set, get) => ({
  users: { ...initialCacheState },
  tasks: { items: [], loading: false },
  vocabSets: { ...initialCacheState },
  vocab: { ...initialCacheState },
  quizzes: { ...initialCacheState },
  quizHistory: { ...initialCacheState },

  fetchUsers: async (page, forceRefresh = false) => {
    const { users } = get();
    if (!forceRefresh && users.pages[page] && users.currentPage === page) return; // Cached

    set((state) => ({ users: { ...state.users, loading: true, currentPage: page } }));
    const data = await adminService.getUsers(page, 10);
    set((state) => ({
      users: {
        ...state.users,
        loading: false,
        totalItems: data.total || 0,
        pages: { ...state.users.pages, [page]: { items: data.users || [], totalPages: data.totalPages || 1 } },
      },
    }));
  },

  fetchTasks: async (forceRefresh = false) => {
    const { tasks } = get();
    if (!forceRefresh && tasks.items.length > 0) return;

    set({ tasks: { items: tasks.items, loading: true } });
    const data = await adminService.getTasks();
    const itemsArray = Array.isArray(data) ? data : data.items || data.data || [];
    set({ tasks: { items: itemsArray, loading: false } });
  },

  fetchVocabSets: async (page, forceRefresh = false) => {
    const { vocabSets } = get();
    if (!forceRefresh && vocabSets.pages[page] && vocabSets.currentPage === page) return;

    set((state) => ({ vocabSets: { ...state.vocabSets, loading: true, currentPage: page } }));
    const data = await adminService.getVocabSets(page, 10);
    set((state) => ({
      vocabSets: {
        ...state.vocabSets,
        loading: false,
        totalItems: data.total || 0,
        pages: { ...state.vocabSets.pages, [page]: { items: data.items || [], totalPages: data.totalPages || 1 } },
      },
    }));
  },

  fetchVocab: async (page, forceRefresh = false) => {
    const { vocab } = get();
    if (!forceRefresh && vocab.pages[page] && vocab.currentPage === page) return;

    set((state) => ({ vocab: { ...state.vocab, loading: true, currentPage: page } }));
    const data = await adminService.getVocab(page, 10);
    set((state) => ({
      vocab: {
        ...state.vocab,
        loading: false,
        totalItems: data.total || 0,
        pages: { ...state.vocab.pages, [page]: { items: data.items || [], totalPages: data.totalPages || 1 } },
      },
    }));
  },

  fetchQuizzes: async (page, forceRefresh = false) => {
    const { quizzes } = get();
    if (!forceRefresh && quizzes.pages[page] && quizzes.currentPage === page) return;

    set((state) => ({ quizzes: { ...state.quizzes, loading: true, currentPage: page } }));
    const data = await adminService.getQuizzes(page, 10);
    set((state) => ({
      quizzes: {
        ...state.quizzes,
        loading: false,
        totalItems: data.total || 0,
        pages: { ...state.quizzes.pages, [page]: { items: data.items || [], totalPages: data.totalPages || 1 } },
      },
    }));
  },

  fetchQuizHistory: async (page, forceRefresh = false) => {
    const { quizHistory } = get();
    if (!forceRefresh && quizHistory.pages[page] && quizHistory.currentPage === page) return;

    set((state) => ({ quizHistory: { ...state.quizHistory, loading: true, currentPage: page } }));
    const data = await adminService.getQuizHistory(page, 10);
    set((state) => ({
      quizHistory: {
        ...state.quizHistory,
        loading: false,
        totalItems: data.total || 0,
        pages: { ...state.quizHistory.pages, [page]: { items: data.items || [], totalPages: data.totalPages || 1 } },
      },
    }));
  },

  clearAllCache: () => {
    set({
      users: { ...initialCacheState },
      tasks: { items: [], loading: false },
      vocabSets: { ...initialCacheState },
      vocab: { ...initialCacheState },
      quizzes: { ...initialCacheState },
      quizHistory: { ...initialCacheState },
    });
  },
}));
