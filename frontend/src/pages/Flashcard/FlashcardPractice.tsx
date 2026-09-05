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
import { ModeArrange } from "@/src/components/practice/ModeArrange";
import { VoiceSelectorModal } from "@/src/components/practice/VoiceSelectorModal";
import { getVoiceForLanguage } from "@/src/lib/ttsVoiceStorage";
import toastService from "@/src/services/toastService";
import axiosInstance from "@/src/services/axiosConfig";
import { Button } from "@/src/components/ui/Button";

export type PracticeMode = "flashcard" | "quiz" | "fill_blank" | "listening" | "pronunciation" | "match" | "bubble" | "guess" | "typing" | "arrange";

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
  const calculatedCards = isReviewAll ? allCards : dueCards;
  const [cards, setCards] = useState<any[]>([]);

  useEffect(() => {
    setCards(calculatedCards);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode, practiceSessionKey, isReviewAll, allCards.length]);

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
        axiosInstance
          .get(`/api/beginner/lesson/${id}`)
          .then((res) => (res.data.success ? res.data : null))
          .then((set) => {
            if (set) {
              setBeginnerSet(set);
              setBeginnerAllCards(set.words || []);

              // Fetch learned words and filter them out
              if (user) {
                axiosInstance
                  .get(`/api/user/beginner-progress`, { withCredentials: true })
                  .then((res) => (res.data.success ? res.data : { learnedWords: [] }))
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
      <Button
        onClick={reviewBeginnerWrong}
        disabled={beginnerWrongIds.length === 0}
        className="flex-1 py-4 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold rounded-2xl border-2 border-orange-200 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <AlertTriangle className="h-5 w-5 mr-2" />
        Ôn tập câu sai ({beginnerWrongIds.length})
      </Button>
      <Button onClick={reviewBeginnerAll} className="flex-1 py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl border-2 border-blue-600 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex justify-center items-center gap-2">
        <RotateCw className="h-5 w-5 mr-2" />
        Ôn tập toàn bộ
      </Button>
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
        <Button onClick={() => navigate(-1)} className="mt-4 text-blue-600 font-semibold">
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  if (!isBeginner && !loading && !isReviewAll && dueCards.length === 0 && allCards.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-slate-50 px-4">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] border-2 border-slate-200/60 shadow-xl shadow-slate-200/50 flex flex-col items-center animate-in zoom-in duration-500 max-w-lg w-full">
          <div className="w-24 h-24 bg-green-100 rounded-[2rem] flex items-center justify-center mb-6 rotate-3 border-2 border-green-200">
            <Check className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight text-center">Tuyệt vời!</h2>
          <p className="text-slate-500 mb-8 text-center font-bold">Bạn đã hoàn thành mục tiêu ôn tập thẻ hôm nay.</p>
          <div className="flex w-full flex-col gap-3">
            <Button
              onClick={() => {
                setIsReviewAll(true);
                setPracticeSessionKey((k) => k + 1);
              }}
              className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl border-2 border-blue-600 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex justify-center items-center gap-2"
            >
              <RotateCw className="w-5 h-5" />
              Ôn tập lại tất cả
            </Button>
            <Button onClick={() => navigate(-1)} className="w-full py-4 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-2xl border-2 border-slate-200 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all">
              Quay lại danh sách
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isBeginner && beginnerCards.length === 0 && beginnerSet) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-slate-50 px-4">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] border-2 border-slate-200/60 shadow-xl shadow-slate-200/50 flex flex-col items-center animate-in zoom-in duration-500 max-w-lg w-full">
          <div className="w-24 h-24 bg-yellow-100 rounded-[2rem] flex items-center justify-center mb-6 -rotate-3 border-2 border-yellow-200">
            <Trophy className="w-12 h-12 text-yellow-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight text-center">Xin chúc mừng!</h2>
          <p className="text-slate-500 mb-6 text-center font-bold">Bạn đã học xong toàn bộ từ vựng trong chủ đề này.</p>
          
          <div className="flex w-full flex-col gap-3">
            <Button
              onClick={reviewBeginnerWrong}
              disabled={beginnerWrongIds.length === 0}
              className="w-full py-4 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold rounded-2xl border-2 border-orange-200 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ôn tập câu sai ({beginnerWrongIds.length})
            </Button>
            <Button onClick={reviewBeginnerAll} className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl border-2 border-blue-600 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex justify-center items-center gap-2">
              <RotateCw className="w-5 h-5 mr-2" />
              Ôn tập toàn bộ
            </Button>
            <Button onClick={() => navigate(-1)} className="w-full py-4 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-2xl border-2 border-slate-200 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all mt-2">
              Quay lại danh sách
            </Button>
          </div>
        </div>
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
      <div className="bg-white/90 backdrop-blur-md px-4 md:px-6 py-3 md:py-4 flex items-center justify-between z-10 border-b-2 border-slate-200/60 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
          <Button onClick={() => navigate(-1)} className="p-2.5 md:p-3 bg-white border-2 border-slate-200 border-b-4 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 active:border-b-2 active:translate-y-[2px] transition-all flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-tight truncate">{currentSet.title}</h1>
            <p className="text-xs md:text-sm font-bold text-slate-400">Đang luyện tập...</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 ml-2">
          {!isBeginner &&
            (isReviewAll ? (
              <span className="hidden sm:inline-flex px-4 py-2 bg-purple-100 text-purple-700 font-bold rounded-xl text-sm items-center gap-2 border-2 border-purple-200">Đang ôn tất cả</span>
            ) : allCards.length > dueCards.length ? (
              <Button
                onClick={() => {
                  setIsReviewAll(true);
                  setPracticeSessionKey((k) => k + 1);
                }}
                className="hidden sm:inline-flex px-4 py-2 bg-white border-2 border-purple-200 border-b-4 rounded-xl text-purple-600 font-bold hover:bg-purple-50 hover:border-purple-300 active:border-b-2 active:translate-y-[2px] transition-all text-sm items-center gap-2"
              >
                <RotateCw className="w-4 h-4" />
                Ôn tất cả ({allCards.length})
              </Button>
            ) : null)}
          <Button
            onClick={() => setIsVoiceModalOpen(true)}
            className="px-4 py-2 md:px-5 md:py-2.5 bg-white border-2 border-slate-200 border-b-4 rounded-xl text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-300 active:border-b-2 active:translate-y-[2px] transition-all text-sm whitespace-nowrap"
          >
            Giọng đọc
          </Button>
          <Button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-white border-2 border-slate-200 border-b-4 rounded-xl text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-300 active:border-b-2 active:translate-y-[2px] transition-all">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Play Area (75%) */}
        <div className="flex-1 bg-slate-50/50 p-4 md:p-6 overflow-y-auto relative h-full flex flex-col">
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
            {activeMode === "arrange" && (
              <ModeArrange key={`${activeMode}-${practiceSessionKey}`} cards={cards} setId={id!} onComplete={handleBeginnerComplete} completionActions={beginnerCompletionActions} />
            )}
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

        {/* Sidebar */}
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 bg-white border-l-2 border-slate-200/60 flex-shrink-0 flex flex-col w-[300px] xl:w-[350px] shadow-2xl lg:shadow-none overflow-y-auto",
            isSidebarOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between p-4 lg:hidden border-b-2 border-slate-100">
            <span className="font-black text-slate-800">Chế độ luyện tập</span>
            <Button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-white border-2 border-slate-200 border-b-4 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 active:border-b-2 active:translate-y-[2px] transition-all">
              <X className="w-5 h-5" />
            </Button>
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
