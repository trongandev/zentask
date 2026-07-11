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
import { Grammar } from "./pages/Grammar";
import { Tenses } from "./pages/Tenses";
import { Profile } from "./pages/Profile";
import { Leaderboard } from "./pages/Leaderboard";
import { Community } from "./pages/Community";
import { Settings } from "./pages/Settings";
import { Notifications } from "./pages/Notifications";
import { Auth } from "./pages/Auth";
import { Arena } from "./pages/Arena";
import { AdminLayout } from "./components/AdminLayout";
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
import { Beginner } from "./pages/Beginner";
import { BeginnerFlashcardDetail } from "./pages/Flashcard/BeginnerFlashcardDetail";
import { QuizCreate } from "./pages/Quiz/QuizCreate";
import { QuizRoom } from "./pages/Quiz/QuizRoom";
import { QuizPlay } from "./pages/Quiz/QuizPlay";
import { QuizResult } from "./pages/Quiz/QuizResult";
import { GrammarPractice } from "./pages/GrammarPractice";
import { TensesPractice } from "./pages/TensesPractice";
import Friends from "./pages/Friends";
import SkillPracticeRoom from "./pages/SkillPracticeRoom";
import FirstLoginOnboarding from "./components/onboarding/FirstLoginOnboarding";
import BotConfigPage from "./pages/Admin/BotConfigPage";
import { SystemLogs } from "./pages/Admin/SystemLogs";

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
        <div className={`transition-all duration-300 ease-in-out ${isHeaderVisible ? "mt-0" : "-mt-20"} relative z-10 shrink-0`}>
          <Header isLeftSidebarOpen={isLeftSidebarOpen} onToggleLeftSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)} onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col" onScroll={handleScroll}>
          <div className="flex-1">
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

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="daily-task" element={<AdminTasks />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="vocab-sets" element={<AdminVocabSets />} />
          <Route path="vocab" element={<AdminVocab />} />
          <Route path="quizzes" element={<AdminQuizzes />} />
          <Route path="quiz-history" element={<AdminQuizHistory />} />
          <Route path="bot-config" element={<BotConfigPage />} />
          <Route path="system-logs" element={<SystemLogs />} />
          <Route path="community-posts" element={<AdminCommunityPosts />} />
          <Route path="banned-ips" element={<AdminBannedIPs />} />
        </Route>
        <Route path="arena" element={<Arena />} />

        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="beginner" element={<Beginner />} />
          <Route path="beginner/flashcard/:id" element={<BeginnerFlashcardDetail />} />
          <Route path="beginner/flashcard/:id/practice" element={<FlashcardPractice />} />
          <Route path="beginner/skills/:mode" element={<SkillPracticeRoom />} />
          <Route path="flashcards" element={<Flashcards />} />
          <Route path="flashcard/:id" element={<FlashcardDetail />} />
          <Route path="flashcard/:id/practice" element={<FlashcardPractice />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="quiz/create" element={<QuizCreate />} />
          <Route path="quiz/:id" element={<QuizDetail />} />
          <Route path="quiz/room/:code" element={<QuizRoom />} />
          <Route path="quiz/play/:id" element={<QuizPlay />} />
          <Route path="quiz/result/:resultId" element={<QuizResult />} />
          <Route path="grammar" element={<Grammar />} />
          <Route path="grammar/practice" element={<GrammarPractice />} />
          <Route path="grammar/practice/:stageId" element={<GrammarPractice />} />
          <Route path="tenses" element={<Tenses />} />
          <Route path="tenses/practice" element={<TensesPractice />} />
          <Route path="tenses/practice/:stageId" element={<TensesPractice />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:id" element={<Profile />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="community" element={<Community />} />
          <Route path="ai-chat" element={<AIChat />} />
          <Route path="notebook" element={<Notebook />} />
          <Route path="utilities" element={<Utilities />} />
          <Route path="friends" element={<Friends />} />
          <Route path="settings" element={<Settings />} />
          <Route path="setting" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="posts" element={<Posts />} />
          <Route path="posts/:id" element={<PostDetail />} />
          <Route path="post" element={<Posts />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="terms-of-service" element={<TermsOfService />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      {levelUpData && <LevelUpModal newLevel={levelUpData.newLevel} onClose={clearLevelUp} />}
      <FirstLoginOnboarding />
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
