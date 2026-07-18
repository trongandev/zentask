import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Menu, X, Check, RotateCw, AlertTriangle, Trophy } from "lucide-react";
import { useFlashcardStore } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { PracticeSidebar } from "../../components/practice/PracticeSidebar";
import { ModeFlashcard } from "../../components/practice/ModeFlashcard";
import { ModeQuiz } from "../../components/practice/ModeQuiz";
import { ModeFillBlank } from "../../components/practice/ModeFillBlank";
import { ModeListening } from "../../components/practice/ModeListening";
import { ModePronunciation } from "../../components/practice/ModePronunciation";

import { ModeMatch } from "../../components/practice/ModeMatch";
import { ModeBubble } from "../../components/practice/ModeBubble";
import { ModeGuess } from "../../components/practice/ModeGuess";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useAuth } from "../../contexts/AuthContext";
import { ModeTyping } from "@/src/components/practice/ModeTyping";
import { VoiceSelectorModal } from "@/src/components/practice/VoiceSelectorModal";
import { getVoiceForLanguage } from "@/src/lib/ttsVoiceStorage";
import toastService from "@/src/services/toastService";

const API_URL = import.meta.env.VITE_API_BACKEND;

export type PracticeMode = "flashcard" | "quiz" | "fill_blank" | "listening" | "pronunciation" | "match" | "bubble" | "guess" | "typing";

export function FlashcardPractice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isBeginner = location.pathname.includes("/beginner/");
  const { user, updateUser } = useAuth();

  const { fetchCards, fetchProgress, currentSet: storeSet, cards: storeCards, loading: storeLoading, cardProgress, isReviewAll, setIsReviewAll } = useFlashcardStore();

  const [beginnerSet, setBeginnerSet] = useState<any>(null);
  const [beginnerCards, setBeginnerCards] = useState<any[]>([]);
  const [beginnerAllCards, setBeginnerAllCards] = useState<any[]>([]);
  const [beginnerWrongIds, setBeginnerWrongIds] = useState<string[]>([]);
  const [practiceSessionKey, setPracticeSessionKey] = useState(0);
  const [beginnerXpStatus, setBeginnerXpStatus] = useState<"idle" | "awarding" | "awarded" | "already">("idle");
  const awardedTopicRef = React.useRef<string | null>(null);

  const [activeMode, setActiveMode] = useState<PracticeMode>("flashcard");
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentVoiceId, setCurrentVoiceId] = useState(() => {
    return getVoiceForLanguage();
  });

  const { preloadAudio } = useTTSAudio();

  useEffect(() => {
    setIsReviewAll(false);
  }, [setIsReviewAll, id]);

  const currentSet = isBeginner ? beginnerSet : storeSet;
  const allCards = isBeginner ? beginnerCards : storeCards;
  const loading = isBeginner ? false : storeLoading;

  const getDueCards = (cardsList: any[]) => {
    if (isBeginner) return cardsList;
    const now = new Date().getTime();
    return cardsList.filter((card) => {
      const progress = cardProgress[card.id];
      if (!progress) return true; // new card is due
      if (!progress.dueDate) return true;
      return new Date(progress.dueDate).getTime() <= now;
    });
  };

  const dueCards = getDueCards(allCards);
  const cards = isReviewAll ? allCards : dueCards;

  // Update voice when set language is known
  useEffect(() => {
    if ((currentSet as any)?.language) {
      setCurrentVoiceId(getVoiceForLanguage((currentSet as any).language));
    }
  }, [(currentSet as any)?.language]);

  useEffect(() => {
    if (cards.length > 0) {
      cards.forEach((card) => preloadAudio(card.term, currentVoiceId));
    }
  }, [cards, currentVoiceId, preloadAudio]);

  useEffect(() => {
    if (id) {
      if (isBeginner) {
        fetch(`${API_URL}/api/beginner/lesson/${id}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((set) => {
            if (set) {
              setBeginnerSet(set);
              setBeginnerAllCards(set.words || []);

              // Fetch learned words and filter them out
              if (user) {
                fetch(`${API_URL}/api/user/beginner-progress`, { credentials: "include" })
                  .then((res) => (res.ok ? res.json() : { learnedWords: [] }))
                  .then((data) => {
                    const learnedWords = data.learnedWords || [];
                    const unlearnedCards = (set.words || []).filter((w: any) => !learnedWords.includes(w.id));
                    setBeginnerCards(unlearnedCards);
                    setPracticeSessionKey((key) => key + 1);
                  })
                  .catch((err) => {
                    console.error("Failed to fetch beginner progress", err);
                    setBeginnerCards(set.words || []);
                    setPracticeSessionKey((key) => key + 1);
                  });
              } else {
                setBeginnerCards(set.words || []);
                setPracticeSessionKey((key) => key + 1);
              }
            }
          })
          .catch((err) => console.error("Failed to fetch beginner set:", err));
      } else {
        fetchCards(id);
        fetchProgress(id);
      }
    }
  }, [id, isBeginner, fetchCards, fetchProgress, user]);
  const handleBeginnerComplete = React.useCallback((wrongIds: string[]) => {
    setBeginnerWrongIds(wrongIds);
  }, []);

  const reviewBeginnerWrong = React.useCallback(() => {
    const wrongCards = beginnerAllCards.filter((card) => beginnerWrongIds.includes(card.id));
    if (wrongCards.length === 0) {
      toastService.info("Bạn không có câu sai nào để ôn lại.");
      return;
    }
    setBeginnerCards(wrongCards);
    setBeginnerWrongIds([]);
    setPracticeSessionKey((key) => key + 1);
  }, [beginnerAllCards, beginnerWrongIds]);

  const reviewBeginnerAll = React.useCallback(() => {
    setBeginnerCards(beginnerAllCards);
    setBeginnerWrongIds([]);
    setPracticeSessionKey((key) => key + 1);
  }, [beginnerAllCards]);

  const beginnerCompletionActions = isBeginner ? (
    <div className="mt-5 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
      <button
        onClick={reviewBeginnerWrong}
        disabled={beginnerWrongIds.length === 0}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-50 px-5 py-3 font-bold text-orange-600 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <AlertTriangle className="h-5 w-5" />
        Ôn tập lại câu sai ({beginnerWrongIds.length})
      </button>
      <button onClick={reviewBeginnerAll} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-50 px-5 py-3 font-bold text-blue-600 transition-colors hover:bg-blue-100">
        <RotateCw className="h-5 w-5" />
        Ôn tập lại toàn bộ câu
      </button>
    </div>
  ) : null;

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

  if (!isBeginner && !loading && !isReviewAll && dueCards.length === 0 && allCards.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F4F7FE] px-4 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <Check className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Xin chúc mừng!</h2>
        <p className="text-gray-500 mb-3 text-center max-w-md">Bạn đã học hết các từ cần ôn tập hôm nay.</p>
        <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row mt-6">
          <button
            onClick={() => {
              setIsReviewAll(true);
              setPracticeSessionKey((k) => k + 1);
            }}
            className="flex-1 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-colors hover:bg-blue-700 flex justify-center items-center gap-2"
          >
            <RotateCw className="w-5 h-5" />
            Ôn tập lại tất cả
          </button>
        </div>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm font-bold text-gray-500 hover:text-gray-700">
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
        <p className="text-gray-500 mb-3 text-center max-w-md">Bạn đã học xong toàn bộ từ vựng trong chủ đề này.</p>
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-yellow-50 px-4 py-2 text-sm font-bold text-yellow-700">
          <Trophy className="h-4 w-4" />
          Chủ đề đã hoàn thành
        </div>
        <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
          <button
            onClick={reviewBeginnerWrong}
            disabled={beginnerWrongIds.length === 0}
            className="flex-1 rounded-xl bg-orange-50 px-6 py-3 font-bold text-orange-600 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ôn tập lại câu sai ({beginnerWrongIds.length})
          </button>
          <button onClick={reviewBeginnerAll} className="flex-1 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-colors hover:bg-blue-700">
            Ôn tập lại toàn bộ câu
          </button>
        </div>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm font-bold text-gray-500 hover:text-gray-700">
          Quay lại
        </button>
      </div>
    );
  }

  const hasEnoughCards = (mode: PracticeMode) => {
    const count = cards.length;
    if (mode === "quiz") return count >= 4;
    if (mode === "match" || mode === "bubble") return count >= 5;
    if (mode === "pronunciation") {
      const lang = (currentSet as any)?.language || "en";
      return lang === "en";
    }
    return true;
  };

  // If active mode becomes invalid due to card deletion or language restriction (edge case)
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
          {!isBeginner &&
            (isReviewAll ? (
              <span className="hidden sm:inline-flex px-3 py-2 bg-purple-50 text-purple-600 font-semibold rounded-xl text-sm items-center gap-1">Đang ôn tất cả (không lưu điểm)</span>
            ) : allCards.length > dueCards.length ? (
              <button
                onClick={() => {
                  setIsReviewAll(true);
                  setPracticeSessionKey((k) => k + 1);
                }}
                className="hidden sm:inline-flex px-3 py-2 bg-purple-50 text-purple-600 font-semibold rounded-xl hover:bg-purple-100 transition-colors text-sm items-center gap-1"
              >
                <RotateCw className="w-4 h-4" />
                Ôn tất cả ({allCards.length})
              </button>
            ) : null)}
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
            {activeMode === "flashcard" && (
              <ModeFlashcard key={`${activeMode}-${practiceSessionKey}`} cards={cards} setId={id!} onComplete={handleBeginnerComplete} completionActions={beginnerCompletionActions} />
            )}
            {activeMode === "quiz" && (
              <ModeQuiz key={`${activeMode}-${practiceSessionKey}`} cards={cards} setId={id!} onComplete={handleBeginnerComplete} completionActions={beginnerCompletionActions} />
            )}
            {activeMode === "fill_blank" && (
              <ModeFillBlank key={`${activeMode}-${practiceSessionKey}`} cards={cards} setId={id!} onComplete={handleBeginnerComplete} completionActions={beginnerCompletionActions} />
            )}
            {activeMode === "listening" && (
              <ModeListening key={`${activeMode}-${practiceSessionKey}`} cards={cards} setId={id!} onComplete={handleBeginnerComplete} completionActions={beginnerCompletionActions} />
            )}
            {activeMode === "pronunciation" && (
              <ModePronunciation key={`${activeMode}-${practiceSessionKey}`} cards={cards} setId={id!} onComplete={handleBeginnerComplete} completionActions={beginnerCompletionActions} />
            )}
            {activeMode === "match" && (
              <ModeMatch key={`${activeMode}-${practiceSessionKey}`} cards={cards} setId={id!} onComplete={handleBeginnerComplete} completionActions={beginnerCompletionActions} />
            )}
            {activeMode === "bubble" && (
              <ModeBubble key={`${activeMode}-${practiceSessionKey}`} cards={cards} setId={id!} onComplete={handleBeginnerComplete} completionActions={beginnerCompletionActions} />
            )}
            {activeMode === "guess" && (
              <ModeGuess key={`${activeMode}-${practiceSessionKey}`} cards={cards} setId={id!} onComplete={handleBeginnerComplete} completionActions={beginnerCompletionActions} />
            )}
            {activeMode === "typing" && (
              <ModeTyping key={`${activeMode}-${practiceSessionKey}`} cards={cards} setId={id!} onComplete={handleBeginnerComplete} completionActions={beginnerCompletionActions} />
            )}
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
            language={(currentSet as any)?.language || "en"}
          />
        </div>
      </div>

      <VoiceSelectorModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        currentVoiceId={currentVoiceId}
        onSelectVoice={setCurrentVoiceId}
        language={(currentSet as any)?.language}
      />
    </div>
  );
}
