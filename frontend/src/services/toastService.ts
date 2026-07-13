import toast, { ToastOptions } from "react-hot-toast";
import React from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, Bell } from "lucide-react";

const defaultOptions: ToastOptions = {
  duration: 4000,
  position: "top-center",
  style: {
    padding: "12px 16px",
    borderRadius: "8px",
    background: "#fff",
    color: "#334155",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    fontWeight: 500,
  },
};

/**
 * Service Wrapper for react-hot-toast
 * Provides standardized toast notifications (Success, Error, Info, Warning, Default, Loading)
 */
export const toastService = {
  success: (message: string, options?: ToastOptions) =>
    toast.success(message, {
      ...defaultOptions,
      ...options,
      iconTheme: {
        primary: "#22c55e",
        secondary: "#fff",
      },
    }),

  error: (message: string, options?: ToastOptions) =>
    toast.error(message, {
      ...defaultOptions,
      ...options,
      iconTheme: {
        primary: "#ef4444",
        secondary: "#fff",
      },
    }),

  info: (message: string, options?: ToastOptions) =>
    toast(message, {
      ...defaultOptions,
      ...options,
      // @ts-ignore
      icon: React.createElement(Info, { className: "text-blue-500 w-5 h-5 flex-shrink-0" }),
      style: {
        ...defaultOptions.style,
        borderLeft: "4px solid #3b82f6",
        ...options?.style,
      },
    }),

  warning: (message: string, options?: ToastOptions) =>
    toast(message, {
      ...defaultOptions,
      ...options,
      // @ts-ignore
      icon: React.createElement(AlertTriangle, { className: "text-yellow-500 w-5 h-5 flex-shrink-0" }),
      style: {
        ...defaultOptions.style,
        borderLeft: "4px solid #eab308",
        ...options?.style,
      },
    }),

  default: (message: string, options?: ToastOptions) =>
    toast(message, {
      ...defaultOptions,
      ...options,
      // @ts-ignore
      icon: React.createElement(Bell, { className: "text-slate-400 w-5 h-5 flex-shrink-0" }),
    }),

  loading: (message: string, options?: ToastOptions) =>
    toast.loading(message, {
      ...defaultOptions,
      ...options,
    }),

  dismiss: (id?: string) => toast.dismiss(id),

  remove: (id?: string) => toast.remove(id),

  // Xoá toàn bộ toast
  clear: () => toast.dismiss(),
};

export default toastService;
