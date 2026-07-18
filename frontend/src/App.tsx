/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation, Link } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./pages/Dashboard";
import { Flashcards } from "./pages/Flashcard/Flashcards";
import { FlashcardDetail } from "./pages/Flashcard/FlashcardDetail";
import { FlashcardPractice } from "./pages/Flashcard/FlashcardPractice";
import { Quiz } from "./pages/Quiz/Quiz";
import { QuizDetail } from "./pages/Quiz/QuizDetail";

import { Profile } from "./pages/Profile";
import { Leaderboard } from "./pages/Leaderboard";
import { Community } from "./pages/Community";
import { Settings } from "./pages/Settings";
import { Notifications } from "./pages/Notifications";
import { Auth } from "./pages/Auth";
import { Arena } from "./pages/Arena/Arena";
import { AdminLayout } from "./components/AdminLayout";
import { BeginnerLayout } from "./components/BeginnerLayout";
import { AdminDashboard } from "./pages/Admin/AdminDashboard";
import { AdminTasks } from "./pages/Admin/AdminTasks";
import { AdminUsers } from "./pages/Admin/AdminUsers";
import { AdminVocabSets } from "./pages/Admin/AdminVocabSets";
import { AdminVocab } from "./pages/Admin/AdminVocab";
import { AdminQuizzes } from "./pages/Admin/AdminQuizzes";
import { AdminQuizHistory } from "./pages/Admin/AdminQuizHistory";
import { AdminCommunityPosts } from "./pages/Admin/AdminCommunityPosts";
import { AdminBannedIPs } from "./pages/Admin/AdminBannedIPs";
import { Honeypot } from "./components/Honeypot";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";
import { useAuth } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import AIChat from "./pages/AIChat";
import Notebook from "./pages/Notebook";
import Utilities from "./pages/Utilities";

import { Posts } from "./pages/Posts";
import { PostDetail } from "./pages/PostDetail";
import { RightSidebar } from "./components/RightSidebar";
import { LevelUpModal } from "./components/LevelUpModal";
import { useUserStore } from "./services/userService";
import { Beginner } from "./pages/Beginner/Beginner";
import { BeginnerGrammar } from "./pages/Beginner/BeginnerGrammar";
import { BeginnerGrammarLesson } from "./pages/Beginner/BeginnerGrammarLesson";
import { BeginnerSkills } from "./pages/Beginner/BeginnerSkills";
import { BeginnerRank } from "./pages/Beginner/BeginnerRank";
import { BeginnerFlashcardDetail } from "./pages/Flashcard/BeginnerFlashcardDetail";
import { QuizCreate } from "./pages/Quiz/QuizCreate";
import { QuizRoom } from "./pages/Quiz/QuizRoom";
import { QuizPlay } from "./pages/Quiz/QuizPlay";
import { QuizResult } from "./pages/Quiz/QuizResult";

import Friends from "./pages/Friends";
import SkillPracticeRoom from "./pages/SkillPracticeRoom";
import BotConfigPage from "./pages/Admin/BotConfigPage";
import { SystemLogs } from "./pages/Admin/SystemLogs";
import { AdminAIUsage } from "./pages/Admin/AdminAIUsage";
import { AdminBotJobs } from "./pages/Admin/AdminBotJobs";
import { useScrollRestoration } from "./hooks/useScrollRestoration";
import { ZaloGo } from "./pages/ZaloAuth/ZaloGo";
import { ZaloAuthorize } from "./pages/ZaloAuth/ZaloAuthorize";

function ProtectedRouteLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 border border-blue-100 shadow-sm">
          <img src="/mascot/Lopy (10).png" alt="Mascot" className="w-16 h-16 object-contain" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Yêu cầu đăng nhập</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-8 text-sm">Bạn cần đăng nhập để sử dụng tính năng này. Hãy đăng nhập để lưu trữ tiến trình và kết nối với cộng đồng Zentask nhé!</p>
        <button
          onClick={() => {
            sessionStorage.setItem("redirect_url", location.pathname);
            window.location.href = "/auth";
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all active:scale-95"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  return <Outlet />;
}

function MainLayout() {
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("isLeftSidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("isRightSidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRightMobileMenuOpen, setIsRightMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isPracticePage = location.pathname.match(/\/flashcard\/[^\/]+\/practice/);

  useScrollRestoration("#main-scroll-container");

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY <= 10) {
      setIsHeaderVisible(true);
    } else if (currentScrollY > lastScrollY.current + 10) {
      setIsHeaderVisible(false); // Scroll down
    } else if (currentScrollY < lastScrollY.current - 10) {
      setIsHeaderVisible(true); // Scroll up
    }
    lastScrollY.current = currentScrollY;
  };

  useEffect(() => {
    localStorage.setItem("isLeftSidebarOpen", JSON.stringify(isLeftSidebarOpen));
  }, [isLeftSidebarOpen]);

  useEffect(() => {
    localStorage.setItem("isRightSidebarOpen", JSON.stringify(isRightSidebarOpen));
  }, [isRightSidebarOpen]);

  return (
    <div className="flex min-h-screen bg-[#F4F7FE] font-sans text-slate-900 overflow-hidden relative">
      {/* Mobile Left Sidebar Overlay */}
      {isMobileMenuOpen && <div className="fixed inset-0 bg-gray-900/50 z-[60] lg:hidden animate-in fade-in" onClick={() => setIsMobileMenuOpen(false)} />}

      {/* Mobile Right Sidebar Overlay */}
      {isRightMobileMenuOpen && <div className="fixed inset-0 bg-gray-900/50 z-[60] lg:hidden animate-in fade-in" onClick={() => setIsRightMobileMenuOpen(false)} />}

      {/* Left Sidebar */}
      <div
        className={`
        fixed lg:static inset-y-0 left-0 z-[70] lg:z-50
        transition-all duration-300 ease-in-out flex-shrink-0 bg-white border-r border-gray-100
        ${isMobileMenuOpen ? "translate-x-0 w-[80%] max-w-[300px]" : "-translate-x-full lg:translate-x-0"}
        ${isLeftSidebarOpen ? "lg:w-64" : "lg:w-[88px]"}
      `}
      >
        <div className={`h-full lg:h-screen lg:sticky top-0 ${isMobileMenuOpen ? "w-full" : isLeftSidebarOpen ? "lg:w-68" : "lg:w-[96px]"}`}>
          <Sidebar
            isOpen={isMobileMenuOpen ? true : isLeftSidebarOpen}
            onToggle={() => {
              if (window.innerWidth < 1024) {
                setIsMobileMenuOpen(false);
              } else {
                setIsLeftSidebarOpen(!isLeftSidebarOpen);
              }
            }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <main id="main-scroll-container" className="flex-1 overflow-y-auto flex flex-col" onScroll={handleScroll}>
          <div className={`sticky top-0 z-50 transition-transform duration-300 ease-in-out ${isHeaderVisible ? "translate-y-0" : "-translate-y-full"}`}>
            <Header isLeftSidebarOpen={isLeftSidebarOpen} onToggleLeftSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)} onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />
          </div>

          <div className="flex-1 p-4 md:p-8 flex flex-col">
            <Outlet />
          </div>
          <footer className="mt-8 text-center text-sm text-gray-500 pb-2 border-t border-gray-200 pt-5 ">
            <div className="flex items-center justify-center gap-4 mb-2">
              <Link to="/privacy-policy" className="hover:text-blue-600 transition-colors font-medium">
                Chính sách bảo mật
              </Link>
              <span className="text-gray-300">•</span>
              <Link to="/terms-of-service" className="hover:text-blue-600 transition-colors font-medium">
                Điều khoản dịch vụ
              </Link>
            </div>
            <p>&copy; {new Date().getFullYear()} Zentask. All rights reserved.</p>
          </footer>
        </main>
      </div>

      {/* Desktop Right Sidebar */}
      {!isPracticePage && (
        <div className={`transition-all duration-300 ease-in-out hidden lg:block flex-shrink-0 relative z-50 bg-white border-l border-gray-100 ${isRightSidebarOpen ? "w-[320px]" : "w-[88px]"}`}>
          <div className={`h-screen sticky top-0 ${isRightSidebarOpen ? "w-[320px]" : "w-[88px]"}`}>
            <RightSidebar isOpen={isRightSidebarOpen} onClose={() => setIsRightSidebarOpen(false)} onOpen={() => setIsRightSidebarOpen(true)} />
          </div>
        </div>
      )}

      {/* Mobile Right Sidebar */}
      {!isPracticePage && (
        <div
          className={`
          fixed inset-y-0 right-0 z-[70] lg:hidden
          transition-all duration-300 ease-in-out flex-shrink-0 bg-white border-l border-gray-100
          ${isRightMobileMenuOpen ? "translate-x-0 w-[80%] max-w-[320px]" : "translate-x-full w-[80%] max-w-[320px]"}
        `}
        >
          <div className="h-full w-full">
            <RightSidebar isOpen={true} onClose={() => setIsRightMobileMenuOpen(false)} onOpen={() => {}} />
          </div>
        </div>
      )}

      {/* Mobile Floating Button to open Right Sidebar */}
      {!isPracticePage && !isRightMobileMenuOpen && (
        <button
          onClick={() => setIsRightMobileMenuOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-[55] lg:hidden bg-white p-2.5 rounded-l-2xl shadow-lg border border-r-0 border-gray-200 text-blue-600 flex flex-col items-center gap-1 opacity-90 hover:opacity-100 transition-opacity"
        >
          <div className="w-1 h-8 bg-blue-100 rounded-full flex flex-col justify-center items-center overflow-hidden">
            <div className="w-full h-1/3 bg-blue-500 rounded-full"></div>
          </div>
        </button>
      )}
    </div>
  );
}

import { LandingPage } from "./pages/LandingPage";
import { BeginnerLessonPractice } from "./pages/Beginner/BeginnerLessonPractice";
import { AdminCourses } from "./pages/Admin/AdminCourses";

function AppContent() {
  const { user, loading, isIpBanned } = useAuth();
  const { levelUpData, clearLevelUp } = useUserStore();

  if (isIpBanned) {
    return <Honeypot />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE]">
        <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="daily-task" element={<AdminTasks />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="vocab-sets" element={<AdminVocabSets />} />
          <Route path="vocab" element={<AdminVocab />} />
          <Route path="quizzes" element={<AdminQuizzes />} />
          <Route path="quiz-history" element={<AdminQuizHistory />} />
          <Route path="bot-config" element={<BotConfigPage />} />
          <Route path="system-logs" element={<SystemLogs />} />
          <Route path="ai-usage" element={<AdminAIUsage />} />
          <Route path="bot-jobs" element={<AdminBotJobs />} />
          <Route path="community-posts" element={<AdminCommunityPosts />} />
          <Route path="banned-ips" element={<AdminBannedIPs />} />
        </Route>
        <Route path="arena" element={<Arena />} />

        {/* Zalo Auth Flow */}
        <Route path="/go/:id" element={<ZaloGo />} />
        <Route path="/authorize/:id" element={<ZaloAuthorize />} />

        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        <Route element={<MainLayout />}>
          {/* Main App Routes */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="flashcards" element={<Flashcards />} />
          <Route path="flashcard/:id" element={<FlashcardDetail />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="quiz/:id" element={<QuizDetail />} />
          <Route path="profile/:id" element={<Profile />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="community" element={<Community />} />
          <Route path="utilities" element={<Utilities />} />
          <Route path="posts" element={<Posts />} />
          <Route path="posts/:id" element={<PostDetail />} />
          <Route path="post" element={<Posts />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="terms-of-service" element={<TermsOfService />} />

          {/* Protected routes */}
          <Route element={<ProtectedRouteLayout />}>
            <Route path="flashcard/:id/practice" element={<FlashcardPractice />} />
            <Route path="quiz/create" element={<QuizCreate />} />
            <Route path="quiz/room/:code" element={<QuizRoom />} />
            <Route path="quiz/play/:id" element={<QuizPlay />} />
            <Route path="quiz/result/:resultId" element={<QuizResult />} />
            <Route path="profile" element={<Profile />} />
            <Route path="ai-chat" element={<AIChat />} />
            <Route path="notebook" element={<Notebook />} />
            <Route path="friends" element={<Friends />} />
            <Route path="settings" element={<Settings />} />
            <Route path="setting" element={<Settings />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

        {/* Beginner Layout - No sidebars */}
        <Route element={<BeginnerLayout />}>
          <Route element={<ProtectedRouteLayout />}>
            <Route path="beginner" element={<Beginner />} />
            <Route path="beginner/grammar" element={<BeginnerGrammar />} />
            <Route path="beginner/grammar/:topicId" element={<BeginnerGrammarLesson />} />
            <Route path="beginner/skills" element={<BeginnerSkills />} />
            <Route path="beginner/rank" element={<BeginnerRank />} />
            <Route path="beginner/lesson/:topicId/:lessonIndex" element={<BeginnerLessonPractice />} />
            {/* Keeping old routes temporarily so it doesn't break */}
            <Route path="beginner/flashcard/:id" element={<BeginnerFlashcardDetail />} />
            <Route path="beginner/flashcard/:id/practice" element={<FlashcardPractice />} />
            <Route path="beginner/skills/:mode" element={<SkillPracticeRoom />} />
          </Route>
        </Route>
      </Routes>
      {levelUpData && <LevelUpModal newLevel={levelUpData.newLevel} onClose={clearLevelUp} />}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </Router>
  );
}
