import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Map, BookOpen, Headphones, Trophy } from "lucide-react";
import { cn } from "../lib/utils";

export function BeginnerLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/beginner", label: "Lộ trình", icon: <Map className="w-6 h-6" /> },
    { path: "/beginner/grammar", label: "Ngữ pháp", icon: <BookOpen className="w-6 h-6" /> },
    { path: "/beginner/skills", label: "Kỹ năng", icon: <Headphones className="w-6 h-6" /> },
    { path: "/beginner/rank", label: "Bảng xếp hạng", icon: <Trophy className="w-6 h-6" /> },
  ];

  const isLessonPage =
    location.pathname.includes("/lesson/") ||
    (location.pathname.includes("/grammar/") && location.pathname !== "/beginner/grammar") ||
    (location.pathname.includes("/skills/") && location.pathname !== "/beginner/skills") ||
    (location.pathname.includes("/rank/") && location.pathname !== "/beginner/rank");

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden relative">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex items-center">
        <button
          onClick={() => {
            if (isLessonPage) {
              navigate("/beginner");
            } else {
              navigate("/dashboard");
            }
          }}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="ml-2 text-lg font-bold">{isLessonPage ? "Học bài mới" : "Lộ trình cho người mới"}</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      {!isLessonPage && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
          <div className="max-w-md mx-auto flex justify-around items-center p-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[72px]", isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50")}
                >
                  <div className={cn("p-1.5 rounded-xl transition-all", isActive ? "bg-blue-100" : "")}>{item.icon}</div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
