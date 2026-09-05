import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Map, BookOpen, Headphones, Trophy, Swords } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "@/src/components/ui/Button";

export function BeginnerLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/beginner", label: "Lộ trình", icon: <Map className="w-6 h-6" /> },
    { path: "/beginner/grammar", label: "Ngữ pháp", icon: <BookOpen className="w-6 h-6" /> },
    { path: "/beginner/arena", label: "Đấu hạng", icon: <Swords className="w-6 h-6" /> },
    { path: "/beginner/skills", label: "Kỹ năng", icon: <Headphones className="w-6 h-6" /> },
    { path: "/beginner/rank", label: "BXH", icon: <Trophy className="w-6 h-6" /> },
  ];

  const isLessonPage =
    location.pathname.includes("/lesson/") ||
    (location.pathname.includes("/grammar/") && location.pathname !== "/beginner/grammar") ||
    (location.pathname.includes("/skills/") && location.pathname !== "/beginner/skills") ||
    (location.pathname.includes("/arena") && location.pathname !== "/beginner/arena") ||
    (location.pathname.includes("/rank/") && location.pathname !== "/beginner/rank");

  const isHideHeader =
    location.pathname.includes("/beginner/listening") ||
    location.pathname.includes("/beginner/speaking") ||
    location.pathname.includes("/beginner/reading");

  return (
    <div className="flex min-h-[100dvh] bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      
      {/* Desktop Sidebar */}
      {!isLessonPage && !isHideHeader && (
        <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 z-50 shadow-sm shrink-0">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <Button
              onClick={() => navigate("/dashboard")}
              className="p-2 -ml-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Beginner</h1>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "w-full flex items-center justify-start gap-4 px-4 py-4 rounded-2xl transition-all duration-200 group border-2",
                    isActive
                      ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm"
                      : "bg-transparent border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl transition-all",
                    isActive ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600"
                  )}>
                    {item.icon}
                  </div>
                  <span className="font-bold text-lg">{item.label}</span>
                </Button>
              );
            })}
          </nav>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative">
        {/* Mobile Header */}
        {!isHideHeader && (
          <header className={cn(
            "sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-3 flex items-center transition-all",
            !isLessonPage && "md:hidden" // Hide on desktop if not a lesson page (sidebar covers it)
          )}>
            <Button
              onClick={() => {
                if (isLessonPage) {
                  navigate("/beginner");
                } else {
                  navigate("/dashboard");
                }
              }}
              className="p-2 -ml-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="ml-3 text-lg font-black text-slate-800">{isLessonPage ? "Học bài mới" : "Lộ trình cho người mới"}</h1>
          </header>
        )}

        <main className="flex-1 overflow-y-auto pb-28 md:pb-8 scroll-smooth">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation (Floating Dock) */}
      {!isLessonPage && (
        <nav className="md:hidden fixed bottom-6 left-4 right-4 z-50">
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/50 shadow-2xl rounded-3xl flex justify-around items-center p-2 mx-auto max-w-sm">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all min-w-[64px]",
                    isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-xl transition-all duration-300",
                    isActive ? "bg-blue-100 -translate-y-1" : ""
                  )}>
                    {item.icon}
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-wider transition-all",
                    isActive ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                  )}>
                    {item.label}
                  </span>
                </Button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
