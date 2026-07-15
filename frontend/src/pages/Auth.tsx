import React, { useCallback, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpenCheck, CheckCircle2, Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck, Sparkles, UserCheck, Trophy, UserPlus } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuthStore } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import toastService from "@/src/services/toastService";
import { hasRecaptchaSiteKey, RecaptchaBox, type RecaptchaBoxHandle } from "../components/security/RecaptchaBox";
import { Link, useNavigate } from "react-router-dom";

const MASCOT_SRC = "/mascot/Lopy%20(16).png";

const featureCards = [
  {
    icon: BookOpenCheck,
    title: "Học tập có lộ trình",
    description: "Flashcard, quiz, luyện 4 kỹ năng và nhắc nhở tiến độ trong cùng một nơi.",
  },
  {
    icon: Trophy,
    title: "Arena & xếp hạng",
    description: "Thi đấu nhanh, luyện phản xạ và giữ động lực bằng XP, rank, nhiệm vụ.",
  },
  {
    icon: ShieldCheck,
    title: "Dữ liệu cá nhân an toàn",
    description: "Tài khoản, bộ thẻ, quiz, sổ tay và lịch sử học được đồng bộ riêng cho bạn.",
  },
];

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [recaptchaReady, setRecaptchaReady] = useState(!hasRecaptchaSiteKey);
  const [recaptchaFormKey, setRecaptchaFormKey] = useState(() => `login-${Date.now()}`);
  const recaptchaRef = useRef<RecaptchaBoxHandle | null>(null);

  const { loading, login, register, loginWithGoogle } = useAuthStore();
  const { checkAuth } = useAuth();
  const navigate = useNavigate();

  const authTitle = useMemo(() => (isLogin ? "Chào mừng bạn quay lại" : "Tạo tài khoản ZenTask"), [isLogin]);

  const authDescription = useMemo(
    () => (isLogin ? "Đăng nhập để tiếp tục lộ trình học, flashcard, quiz và Arena của bạn." : "Bắt đầu miễn phí để lưu tiến độ học tập, tạo bộ thẻ và tham gia thử thách."),
    [isLogin],
  );

  const handleRecaptchaChange = useCallback((token: string) => {
    setRecaptchaToken(token);
  }, []);

  const switchMode = (nextIsLogin: boolean) => {
    if (nextIsLogin === isLogin) return;
    setIsLogin(nextIsLogin);
    setRecaptchaToken("");
    setRecaptchaReady(!hasRecaptchaSiteKey);
    setRecaptchaFormKey(`${nextIsLogin ? "login" : "register"}-${Date.now()}`);
    window.setTimeout(() => recaptchaRef.current?.reset(), 0);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim();
    if (hasRecaptchaSiteKey && !recaptchaToken) {
      toastService.error("Vui lòng xác minh reCAPTCHA trước khi tiếp tục.");
      return;
    }

    let redirectUrl: string | void;
    if (isLogin) {
      redirectUrl = await login(normalizedEmail, password, recaptchaToken);
    } else {
      redirectUrl = await register(normalizedEmail, password, recaptchaToken);
    }

    setRecaptchaToken("");
    recaptchaRef.current?.reset();

    if (redirectUrl) {
      await checkAuth(); // Đồng bộ auth và phát sự kiện sang extension
      navigate(redirectUrl);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.34),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.24),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_48%,#111827_100%)]" />
      <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute -right-24 bottom-16 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40" />

      <main className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="grid w-full max-w-[1100px] overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/15 bg-white/10 shadow-2xl shadow-black/40 backdrop-blur-2xl lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative hidden h-full flex-col justify-between overflow-hidden bg-slate-900/70 p-8 sm:p-10 lg:flex lg:p-12 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_20%,rgba(96,165,250,0.24),transparent_32%),radial-gradient(circle_at_70%_70%,rgba(34,197,94,0.14),transparent_28%)]" />
            <div className="relative z-10">
              <Link to="/" className={cn("p-6 gap-5 flex items-center")}>
                <img src="/logo.png" className={cn("flex-shrink-0 w-16")} alt="Logo" />
                <div className="min-w-0">
                  <h1 className="text-4xl font-extrabold  text-blue-600 tracking-tight font-heading">Zentask</h1>
                  <p className="text-[12px] text-gray-400 font-medium truncate">Học tập hiệu quả hơn mỗi ngày</p>
                </div>
              </Link>

              <div className="max-w-xl">
                <h2 className="text-2xl sm:text-4xl font-black leading-[1.15] tracking-tight">Tất cả công cụ học tiếng Anh trong một nền tảng.</h2>
                <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-300">
                  ZenTask kết hợp flashcard, quiz, AI, luyện phát âm, sổ tay và Arena để biến việc học thành một hành trình rõ ràng, có tiến độ và có động lực.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:gap-4">
                {featureCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="group flex gap-4 rounded-3xl border border-white/5 bg-white/[0.04] p-4 transition-all hover:bg-white/[0.08] hover:border-white/10 shadow-lg shadow-black/5"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-blue-200 transition-colors group-hover:bg-blue-500/20 group-hover:text-blue-100">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="relative flex flex-col justify-center bg-white px-5 py-8 sm:px-10 sm:py-12 lg:px-12">
            <div className="mx-auto flex w-full max-w-[420px] flex-col justify-center">
              <div className="mb-8 flex items-center justify-between lg:hidden">
                <Link to="/" className={cn("p-6 flex items-center")}>
                  <img src="/logo.png" className={cn("flex-shrink-0 w-10")} alt="Logo" />
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold text-blue-600 tracking-tight font-heading">Zentask</h1>
                    <p className="text-[10px] text-gray-500 font-medium truncate">Học tập hiệu quả hơn mỗi ngày</p>
                  </div>
                </Link>
                <img
                  src={MASCOT_SRC}
                  alt="Mascot ZenTask"
                  className="h-14 w-14 object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </div>

              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">{authTitle}</h2>
                <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-slate-500">{authDescription}</p>
              </div>
              <button
                type="button"
                onClick={loginWithGoogle}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 font-extrabold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.98]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Tiếp tục với Google
              </button>
              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">hoặc</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="mb-7 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={() => switchMode(true)}
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm font-extrabold transition-all",
                    isLogin ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => switchMode(false)}
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm font-extrabold transition-all",
                    !isLogin ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  Đăng ký
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="auth-email" className="text-sm font-extrabold text-slate-700">
                    Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                    <input
                      id="auth-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tenban@email.com"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="auth-password" className="text-sm font-extrabold text-slate-700">
                      Mật khẩu
                    </label>
                    {isLogin && <span className="text-xs font-bold text-slate-400">Tối thiểu 6 ký tự</span>}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isLogin ? "Nhập mật khẩu của bạn" : "Tạo mật khẩu an toàn"}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <RecaptchaBox key={recaptchaFormKey} ref={recaptchaRef} value={recaptchaToken} resetKey={recaptchaFormKey} onChange={handleRecaptchaChange} onReady={setRecaptchaReady} />

                <button
                  type="submit"
                  disabled={loading || (hasRecaptchaSiteKey && (!recaptchaReady || !recaptchaToken))}
                  className="group mt-2 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 sm:py-4 text-sm sm:text-base font-black text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <>
                      {isLogin ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                      <span>{isLogin ? "Đăng nhập" : "Tạo tài khoản"}</span>
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-7 text-center text-xs leading-6 text-slate-500">
                Bằng cách tiếp tục, bạn đồng ý sử dụng ZenTask như một không gian học tập cá nhân và đồng bộ dữ liệu theo tài khoản của mình.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
