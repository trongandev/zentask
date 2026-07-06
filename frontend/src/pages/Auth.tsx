import React, { useState } from "react";
import { LogIn, UserPlus, Mail, Lock } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuthStore } from "../services/authService";

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const { loading, login, register, loginWithGoogle } = useAuthStore();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      await login(email, password);
    } else {
      await register(email, password);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center transform rotate-3">
              <span className="text-white font-extrabold text-2xl">Z</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Zentask
            </h1>
          </div>

          <div className="flex gap-2 mb-8 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
            <button
              onClick={() => setIsLogin(true)}
              className={cn(
                "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all",
                isLogin ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={cn(
                "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all",
                !isLogin ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {isLogin ? "Đăng nhập vào hệ thống" : "Tạo tài khoản mới"}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-sm font-medium text-gray-400">hoặc tiếp tục với</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-xl transition-all"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </button>
        </div>
      </div>
    </div>
  );
}
