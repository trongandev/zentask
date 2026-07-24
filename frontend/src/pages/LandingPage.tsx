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
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" className="w-10 flex-shrink-0" alt="Zentask Logo" />
            <span className="font-extrabold text-xl tracking-tight text-slate-800">
              Zen<span className="text-blue-600">Task</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Button
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all"
              >
                Vào Dashboard <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/auth")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 hover:shadow-lg transition-all"
              >
                Đăng nhập
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 font-bold text-sm mb-8 border border-blue-100">
            <Sparkles className="w-4 h-4 text-amber-500" /> Nền tảng học tập tiếng Anh thông minh
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
            Làm chủ tiếng Anh <br className="hidden md:block" />
            cùng <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Lopy Bot</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 font-medium mb-10 leading-relaxed">
            Hệ sinh thái học tập toàn diện kết hợp Flashcard thông minh, đấu trường Rank trực tuyến và gia sư AI Lopy. Giúp bạn chinh phục IELTS, TOEIC dễ dàng hơn bao giờ hết.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              Bắt đầu miễn phí <ChevronRight className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-700 border border-slate-200 font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              Khám phá tính năng
            </Button>
          </div>

          <div className="mt-20">
            <img src="/mascot/Lopy (12).png" alt="Mascot" className="w-48 h-48 md:w-64 md:h-64 object-contain mx-auto drop-shadow-2xl hover:scale-110 transition-transform duration-500" />
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-slate-100">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">Học vui hơn, nhớ lâu hơn</h2>
            <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
              Zentask cung cấp bộ công cụ tương tác thông minh được thiết kế để tối ưu hoá khả năng ghi nhớ và duy trì động lực học tập của bạn.
            </p>
          </div>

          <div className="flex flex-col gap-8 md:gap-16">
            <InteractiveFlashcard />
            <InteractiveArena />
            <InteractiveZaloBot />
            <InteractiveExtension />
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-10 md:p-16 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />

            <Target className="w-12 h-12 text-blue-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 relative z-10">Sẵn sàng nâng trình tiếng Anh?</h2>
            <p className="text-slate-300 font-medium text-lg mb-10 max-w-xl mx-auto relative z-10">
              Gia nhập cộng đồng người học trên Zentask ngay hôm nay để trải nghiệm phương pháp học tập tương lai.
            </p>
            <Button
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
              className="relative z-10 px-8 py-4 rounded-2xl bg-blue-500 text-white font-bold text-lg hover:bg-blue-400 hover:shadow-xl hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 mx-auto"
            >
              Tạo tài khoản ngay <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <img src="/logo.png" className="w-12 h-12 mb-6" alt="Zentask Logo" />
          <p className="text-slate-500 font-medium mb-6">Nền tảng học tiếng Anh thông minh thế hệ mới.</p>
          <div className="flex gap-6 mb-12">
            <Link to="/privacy-policy" className="text-slate-500 font-bold hover:text-slate-900 transition-colors">
              Chính sách bảo mật
            </Link>
            <Link to="/terms-of-service" className="text-slate-500 font-bold hover:text-slate-900 transition-colors">
              Điều khoản dịch vụ
            </Link>
          </div>
          <p className="text-slate-400 text-sm font-medium">&copy; {new Date().getFullYear()} Zentask. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
