import { create } from "zustand";
import toastService from "@/src/services/toastService";
import axiosInstance from "./axiosConfig";

interface AuthState {
    loading: boolean;
    login: (email: string, password: string, recaptchaToken?: string) => Promise<string | void>;
    register: (email: string, password: string, recaptchaToken?: string) => Promise<string | void>;
    loginWithGoogle: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    loading: false,

    login: async (email, password, recaptchaToken) => {
        set({ loading: true });
        try {
            await axiosInstance.post(`/api/auth/login`, { email, password, recaptchaToken });
            toastService.success("Đăng nhập thành công");
            const urlParams = new URLSearchParams(window.location.search);
            const paramRedirect = urlParams.get("redirect_url");
            const redirectUrl = paramRedirect || sessionStorage.getItem("redirect_url") || "/dashboard";
            sessionStorage.removeItem("redirect_url");
            return redirectUrl;
        } catch (err: any) {
            // Axios interceptor tự lo lỗi toast, ta chỉ cần return hoặc có thể bắt thêm nếu muốn
            console.error(err);
        } finally {
            set({ loading: false });
        }
    },

    register: async (email, password, recaptchaToken) => {
        set({ loading: true });
        try {
            await axiosInstance.post(`/api/auth/register`, { email, password, recaptchaToken });
            toastService.success("Đăng ký thành công");
            const urlParams = new URLSearchParams(window.location.search);
            const paramRedirect = urlParams.get("redirect_url");
            const redirectUrl = paramRedirect || sessionStorage.getItem("redirect_url") || "/dashboard";
            sessionStorage.removeItem("redirect_url");
            return redirectUrl;
        } catch (err: any) {
            console.error(err);
        } finally {
            set({ loading: false });
        }
    },

    loginWithGoogle: async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const paramRedirect = urlParams.get("redirect_url");
        const redirectUrl = paramRedirect || sessionStorage.getItem("redirect_url") || "/dashboard";

        window.location.href = `${import.meta.env.VITE_API_BACKEND}/api/auth/google?redirect_url=${encodeURIComponent(redirectUrl)}`;
    },
}));
