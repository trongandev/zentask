import { create } from "zustand";
import toast from "react-hot-toast";

interface AuthState {
    loading: boolean;
    login: (email: string, password: string, recaptchaToken?: string) => Promise<void>;
    register: (email: string, password: string, recaptchaToken?: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_BACKEND;

export const useAuthStore = create<AuthState>((set) => ({
    loading: false,

    login: async (email, password, recaptchaToken) => {
        set({ loading: true });
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password, recaptchaToken }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to login");
            }
            toast.success("Đăng nhập thành công");
            window.location.href = "/";
        } catch (err: any) {
            toast.error(err.message || "Có lỗi xảy ra khi đăng nhập.");
        } finally {
            set({ loading: false });
        }
    },

    register: async (email, password, recaptchaToken) => {
        set({ loading: true });
        try {
            const res = await fetch(`${API_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password, recaptchaToken }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to register");
            }
            toast.success("Đăng ký thành công");
            window.location.href = "/";
        } catch (err: any) {
            toast.error(err.message || "Có lỗi xảy ra khi đăng ký.");
        } finally {
            set({ loading: false });
        }
    },

    loginWithGoogle: async () => {
        // set({ loading: true });
        window.location.href = `${API_URL}/api/auth/google`;
    },
}));
