import { create } from "zustand";
import toastService from "@/src/services/toastService";

interface AuthState {
  loading: boolean;
  login: (email: string, password: string, recaptchaToken?: string) => Promise<string | void>;
  register: (email: string, password: string, recaptchaToken?: string) => Promise<string | void>;
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
      toastService.success("Đăng nhập thành công");
      const urlParams = new URLSearchParams(window.location.search);
      const paramRedirect = urlParams.get("redirect_url");
      const redirectUrl = paramRedirect || sessionStorage.getItem("redirect_url") || "/";
      sessionStorage.removeItem("redirect_url");
      return redirectUrl;
    } catch (err: any) {
      toastService.error(err.message || "Có lỗi xảy ra khi đăng nhập.");
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
      toastService.success("Đăng ký thành công");
      const urlParams = new URLSearchParams(window.location.search);
      const paramRedirect = urlParams.get("redirect_url");
      const redirectUrl = paramRedirect || sessionStorage.getItem("redirect_url") || "/";
      sessionStorage.removeItem("redirect_url");
      return redirectUrl;
    } catch (err: any) {
      toastService.error(err.message || "Có lỗi xảy ra khi đăng ký.");
    } finally {
      set({ loading: false });
    }
  },

  loginWithGoogle: async () => {
    // set({ loading: true });
    window.location.href = `${API_URL}/api/auth/google`;
  },
}));
