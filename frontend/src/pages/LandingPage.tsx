import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Sparkles, Brain, Swords, Bot, Target, BookOpen, Crown, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { InteractiveFlashcard } from "../components/landing/InteractiveFlashcard";
import { InteractiveArena } from "../components/landing/InteractiveArena";
import { InteractiveZaloBot } from "../components/landing/InteractiveZaloBot";
import { InteractiveExtension } from "../components/landing/InteractiveExtension";
import { Button } from "@/src/components/ui/Button";

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafcff] font-sans selection:bg-blue-200">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" className="w-9 h-9 flex-shrink-0 drop-shadow-md" alt="Zentask Logo" />
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              Zen<span className="text-blue-600">Task</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Button
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all"
              >
                Vào Dashboard <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/auth")}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                Bắt đầu ngay
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 overflow-hidden">
        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left side: Content */}
            <div className="text-left order-2 lg:order-1 z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50/80 backdrop-blur-sm text-blue-700 font-bold text-[13px] uppercase tracking-wider mb-8 border border-blue-100 shadow-sm">
                <Sparkles className="w-4 h-4 text-amber-500" /> Nền tảng học tập thông minh
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-black text-slate-900 tracking-tight leading-[1.05] mb-6">
                Làm chủ tiếng Anh <br />
                cùng <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Lopy Bot</span>
              </h1>

              <p className="text-lg md:text-xl text-slate-600 font-medium mb-10 leading-relaxed max-w-[500px]">
                Hệ sinh thái toàn diện kết hợp Flashcard thông minh, đấu trường trực tuyến và gia sư AI. Giúp bạn chinh phục IELTS và TOEIC thật dễ dàng.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button
                  onClick={() => navigate(user ? "/dashboard" : "/auth")}
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  Bắt đầu miễn phí <ChevronRight className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => {
                    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-slate-700 border border-slate-200 font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap hover:-translate-y-1"
                >
                  Khám phá tính năng
                </Button>
              </div>
            </div>

            {/* Right side: Image / Asset */}
            <div className="relative order-1 lg:order-2 flex justify-center lg:justify-end items-center">
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 lg:w-96 lg:h-96 bg-blue-500/20 rounded-full blur-[80px] -z-10 animate-pulse" />
              <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-400/20 rounded-full blur-[60px] -z-10" />

              <img src="/mascot/Lopy (12).png" alt="ZenTask AI Mascot" className="w-64 h-64 sm:w-80 sm:h-80 lg:w-[450px] lg:h-[450px] object-contain drop-shadow-2xl animate-float" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Học vui hơn, nhớ lâu hơn</h2>
            <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed">
              Zentask cung cấp bộ công cụ tương tác thông minh được thiết kế để tối ưu hoá khả năng ghi nhớ và duy trì động lực học tập của bạn.
            </p>
          </div>

          <div className="flex flex-col gap-12 md:gap-24 relative">
            {/* Subtle connecting line for desktop */}
            <div className="hidden lg:block absolute top-10 bottom-10 left-1/2 -translate-x-1/2 w-[1px] bg-gradient-to-b from-transparent via-slate-200 to-transparent -z-10" />

            <InteractiveFlashcard />
            <InteractiveArena />
            <InteractiveZaloBot />
            <InteractiveExtension />
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="bg-slate-900 rounded-[2.5rem] p-10 md:p-20 text-center relative overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-slate-800">
            {/* Premium background effects */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-8 border border-blue-400/30">
                <Target className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight">Sẵn sàng nâng trình tiếng Anh?</h2>
              <p className="text-slate-300 font-medium text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
                Gia nhập cộng đồng người học trên Zentask ngay hôm nay để trải nghiệm phương pháp học tập của tương lai.
              </p>
              <Button
                onClick={() => navigate(user ? "/dashboard" : "/auth")}
                className="px-8 py-4 rounded-full bg-white text-slate-900 font-bold text-lg hover:bg-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                Tạo tài khoản ngay <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-6 hover:opacity-80 transition-opacity">
            <img src="/logo.png" className="w-10 h-10 drop-shadow-sm" alt="Zentask Logo" />
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              Zen<span className="text-blue-600">Task</span>
            </span>
          </Link>
          <p className="text-slate-500 font-medium mb-8 max-w-sm">Nền tảng học tiếng Anh thông minh thế hệ mới, tối ưu hóa quá trình học tập bằng công nghệ.</p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-12">
            <Link to="/privacy-policy" className="text-sm text-slate-500 font-bold hover:text-slate-900 transition-colors">
              Chính sách bảo mật
            </Link>
            <Link to="/terms-of-service" className="text-sm text-slate-500 font-bold hover:text-slate-900 transition-colors">
              Điều khoản dịch vụ
            </Link>
            <Link to="/contact" className="text-sm text-slate-500 font-bold hover:text-slate-900 transition-colors">
              Liên hệ
            </Link>
          </div>
          <div className="w-full h-px bg-slate-100 mb-8" />
          <p className="text-slate-400 text-sm font-medium">&copy; {new Date().getFullYear()} Zentask. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
