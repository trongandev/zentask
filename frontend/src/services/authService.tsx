import { create } from "zustand";
import toast from "react-hot-toast";
import { signInWithPopup } from "firebase/auth";
import { getFirebaseInstances, googleProvider } from "../lib/firebase";

interface AuthState {
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_BACKEND;

export const useAuthStore = create<AuthState>((set) => ({
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
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

  register: async (email, password) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
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
    set({ loading: true });
    try {
      const { auth } = await getFirebaseInstances();
      const userCred = await signInWithPopup(auth, googleProvider);
      const idToken = await userCred.user.getIdToken();

      const res = await fetch(`${API_URL}/api/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("Failed to create session");

      toast.success("Đăng nhập Google thành công");
      window.location.href = "/";
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/popup-closed-by-user") {
        toast.error("Bạn đã đóng cửa sổ đăng nhập.");
      } else if (err.code === "auth/unauthorized-domain") {
        toast.error("Domain này chưa được cấp phép trong Firebase.");
      } else if (err.code === "auth/internal-error") {
        toast.error("Lỗi máy chủ Firebase. Vui lòng kiểm tra lại cấu hình.");
      } else {
        toast.error(err.message || "Có lỗi xảy ra khi đăng nhập bằng Google.");
      }
    } finally {
      set({ loading: false });
    }
  },
}));
