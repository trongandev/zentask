const API_URL = import.meta.env.VITE_API_BACKEND;

export type OnboardingState = {
  completed?: boolean;
  completedAt?: string | null;
  skipped?: boolean;
  skippedAt?: string | null;
  lastStep?: number;
  version?: string;
};

export const onboardingService = {
  async get(): Promise<OnboardingState | null> {
    const res = await fetch(`${API_URL}/api/user/onboarding`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.onboarding || null;
  },

  async save(payload: Partial<OnboardingState>): Promise<OnboardingState | null> {
    const res = await fetch(`${API_URL}/api/user/onboarding`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.onboarding || null;
  },

  async reset(): Promise<OnboardingState | null> {
    const res = await fetch(`${API_URL}/api/user/onboarding/reset`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.onboarding || null;
  },
};
