import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Menu, X, Check } from "lucide-react";
import { useFlashcardStore } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { PracticeSidebar } from "../../components/practice/PracticeSidebar";
import { ModeFlashcard } from "../../components/practice/ModeFlashcard";
import { ModeQuiz } from "../../components/practice/ModeQuiz";
import { ModeFillBlank } from "../../components/practice/ModeFillBlank";
import { ModeListening } from "../../components/practice/ModeListening";
import { getBeginnerSetById } from "../../config/rankTopicConfig";
import { ModeMatch } from "../../components/practice/ModeMatch";
import { ModeBubble } from "../../components/practice/ModeBubble";
import { ModeGuess } from "../../components/practice/ModeGuess";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useAuth } from "../../contexts/AuthContext";
import { ModeTyping } from "@/src/components/practice/ModeTyping";
import { VoiceSelectorModal } from "@/src/components/practice/VoiceSelectorModal";

const API_URL = import.meta.env.VITE_API_BACKEND;

export type PracticeMode = "flashcard" | "quiz" | "fill_blank" | "listening" | "match" | "bubble" | "guess" | "typing";

export function FlashcardPractice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isBeginner = location.pathname.includes("/beginner/");
  const { user } = useAuth();

  const { fetchCards, fetchProgress, currentSet: storeSet, cards: storeCards, loading: storeLoading } = useFlashcardStore();

  const [beginnerSet, setBeginnerSet] = useState<any>(null);
  const [beginnerCards, setBeginnerCards] = useState<any[]>([]);

  const [activeMode, setActiveMode] = useState<PracticeMode>("flashcard");
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentVoiceId, setCurrentVoiceId] = useState(() => {
    return localStorage.getItem("tts_voice") || "en-GB-SoniaNeural";
  });

  const { preloadAudio } = useTTSAudio();

  const currentSet = isBeginner ? beginnerSet : storeSet;
  const cards = isBeginner ? beginnerCards : storeCards;
  const loading = isBeginner ? false : storeLoading;

  useEffect(() => {
    if (cards.length > 0) {
      cards.forEach((card) => preloadAudio(card.term, currentVoiceId));
    }
  }, [cards, currentVoiceId, preloadAudio]);

  useEffect(() => {
    if (id) {
      if (isBeginner) {
        const set = getBeginnerSetById(id);
        if (set) {
          setBeginnerSet(set);

          // Fetch learned words and filter them out
          if (user) {
            fetch(`${API_URL}/api/user/beginner-progress`, { credentials: "include" })
              .then((res) => (res.ok ? res.json() : { learnedWords: [] }))
              .then((data) => {
                const learnedWords = data.learnedWords || [];
                const unlearnedCards = (set.words || []).filter((w: any) => !learnedWords.includes(w.id));
                setBeginnerCards(unlearnedCards);
              })
              .catch((err) => {
                console.error("Failed to fetch beginner progress", err);
                setBeginnerCards(set.words || []);
              });
          } else {
            setBeginnerCards(set.words || []);
          }
        }
      } else {
        fetchCards(id);
        fetchProgress(id);
      }
    }
  }, [id, isBeginner, fetchCards, fetchProgress, user]);
  if (loading && !currentSet) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F4F7FE]">
        <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentSet) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy bộ thẻ</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 font-semibold">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  if (isBeginner && beginnerCards.length === 0 && beginnerSet) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F4F7FE] px-4">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <Check className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Xin chúc mừng!</h2>
        <p className="text-gray-500 mb-8 text-center max-w-md">Bạn đã học xong toàn bộ từ vựng trong chủ đề này.</p>
        <button onClick={() => navigate(-1)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all">
          Quay lại
        </button>
      </div>
    );
  }

  const hasEnoughCards = (mode: PracticeMode) => {
    const count = cards.length;
    if (mode === "quiz") return count >= 4;
    if (mode === "match" || mode === "bubble") return count >= 5;
    return true;
  };

  // If active mode becomes invalid due to card deletion (edge case)
  if (!hasEnoughCards(activeMode)) {
    setActiveMode("flashcard");
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#F4F7FE] fixed inset-0 z-50 overflow-hidden">
      {/* Top Navigation */}
      <div className="bg-white px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{currentSet.title}</h1>
            <p className="text-sm text-gray-500">Đang luyện tập...</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsVoiceModalOpen(true)} className="px-3 py-2 md:px-4 md:py-2 bg-blue-50 text-blue-600 font-semibold rounded-xl hover:bg-blue-100 transition-colors text-sm">
            Thay đổi giọng nói
          </button>
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200">
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Play Area (75%) */}
        <div className="flex-1 bg-gray-50/50 p-4 md:p-6 overflow-y-auto relative h-full flex flex-col">
          <div className={cn("m-auto w-full flex flex-col items-center justify-center", activeMode === "bubble" ? "h-full py-0" : "min-h-full py-4")}>
            {activeMode === "flashcard" && <ModeFlashcard cards={cards} setId={id!} />}
            {activeMode === "quiz" && <ModeQuiz cards={cards} setId={id!} />}
            {activeMode === "fill_blank" && <ModeFillBlank cards={cards} setId={id!} />}
            {activeMode === "listening" && <ModeListening cards={cards} setId={id!} />}
            {activeMode === "match" && <ModeMatch cards={cards} setId={id!} />}
            {activeMode === "bubble" && <ModeBubble cards={cards} setId={id!} />}
            {activeMode === "guess" && <ModeGuess cards={cards} setId={id!} />}
            {activeMode === "typing" && <ModeTyping cards={cards} setId={id!} />}
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

        {/* Sidebar */}
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 bg-white border-l border-gray-100 flex-shrink-0 flex flex-col w-[300px] xl:w-[350px] shadow-2xl lg:shadow-none overflow-y-auto",
            isSidebarOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between p-4 lg:hidden border-b border-gray-100">
            <span className="font-bold text-gray-800">Chế độ luyện tập</span>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <PracticeSidebar
            activeMode={activeMode}
            onChangeMode={(mode) => {
              setActiveMode(mode);
              setIsSidebarOpen(false); // Auto close on mobile when selecting
            }}
            cardCount={cards.length}
          />
        </div>
      </div>

      <VoiceSelectorModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} currentVoiceId={currentVoiceId} onSelectVoice={setCurrentVoiceId} />
    </div>
  );
}
