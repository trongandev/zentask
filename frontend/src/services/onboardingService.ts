import axiosInstance from "./axiosConfig";
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
        const res = await axiosInstance.get(`/api/user/onboarding`);
        if (res.status !== 200) return null;
        const data = res.data;
        return data.onboarding || null;
    },

    async save(payload: Partial<OnboardingState>): Promise<OnboardingState | null> {
        const res = await axiosInstance.put(`/api/user/onboarding`, payload);
        if (res.status !== 200) return null;
        const data = res.data;
        return data.onboarding || null;
    },

    async reset(): Promise<OnboardingState | null> {
        const res = await axiosInstance.post(`/api/user/onboarding/reset`);
        if (res.status !== 200) return null;
        const data = res.data;
        return data.onboarding || null;
    },
};
