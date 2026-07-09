const API_URL = import.meta.env.VITE_API_BACKEND;

async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}/api/utilities${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

export interface CalculatorHistoryItem {
  id: string;
  expression: string;
  result: string;
  mode: string;
  type: string;
  createdAt?: string;
}

export interface TranslationHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  source: string;
  target: string;
  createdAt?: string;
}

export interface StudyMethodItem {
  id: string;
  name: string;
  studyMinutes: number;
  breakMinutes: number;
  breakCount: number;
  isCustom?: boolean;
  createdAt?: string;
}

export const utilitiesService = {
  async getCalculatorHistory(): Promise<CalculatorHistoryItem[]> {
    const data = await apiFetch("/calculator-history");
    return data.items || [];
  },

  async saveCalculatorHistory(payload: { expression: string; result: string; mode: string; type?: string }): Promise<CalculatorHistoryItem> {
    const data = await apiFetch("/calculator-history", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data.item;
  },

  async deleteCalculatorHistory(id: string) {
    return apiFetch(`/calculator-history/${id}`, { method: "DELETE" });
  },

  async clearCalculatorHistory() {
    return apiFetch("/calculator-history", { method: "DELETE" });
  },

  async translate(payload: { text: string; source: string; target: string; save?: boolean }) {
    return apiFetch("/translate", {
      method: "POST",
      body: JSON.stringify(payload),
    }) as Promise<{ translatedText: string; item?: TranslationHistoryItem }>;
  },

  async getTranslationHistory(): Promise<TranslationHistoryItem[]> {
    const data = await apiFetch("/translation-history");
    return data.items || [];
  },

  async deleteTranslationHistory(id: string) {
    return apiFetch(`/translation-history/${id}`, { method: "DELETE" });
  },

  async clearTranslationHistory() {
    return apiFetch("/translation-history", { method: "DELETE" });
  },

  async getStudyMethods(): Promise<StudyMethodItem[]> {
    const data = await apiFetch("/study-methods");
    return data.items || [];
  },

  async createStudyMethod(payload: { name: string; studyMinutes: number; breakMinutes: number; breakCount: number }): Promise<StudyMethodItem> {
    const data = await apiFetch("/study-methods", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data.item;
  },

  async updateStudyMethod(id: string, payload: { name: string; studyMinutes: number; breakMinutes: number; breakCount: number }): Promise<StudyMethodItem> {
    const data = await apiFetch(`/study-methods/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return data.item;
  },

  async deleteStudyMethod(id: string) {
    return apiFetch(`/study-methods/${id}`, { method: "DELETE" });
  },
};
