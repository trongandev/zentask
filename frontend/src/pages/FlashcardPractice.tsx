import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useFlashcardStore } from "../services/flashcardService";
import { cn } from "../lib/utils";
import { PracticeSidebar } from "../components/practice/PracticeSidebar";
import { ModeFlashcard } from "../components/practice/ModeFlashcard";
import { ModeQuiz } from "../components/practice/ModeQuiz";
import { ModeFillBlank } from "../components/practice/ModeFillBlank";
import { ModeListening } from "../components/practice/ModeListening";
import { ModeMatch } from "../components/practice/ModeMatch";
import { ModeBubble } from "../components/practice/ModeBubble";
import { ModeGuess } from "../components/practice/ModeGuess";
import { ModeTyping } from "../components/practice/ModeTyping";

export type PracticeMode = "flashcard" | "quiz" | "fill_blank" | "listening" | "match" | "bubble" | "guess" | "typing";

export function FlashcardPractice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchCards, currentSet, cards, loading } = useFlashcardStore();
  const [activeMode, setActiveMode] = useState<PracticeMode>("flashcard");

  useEffect(() => {
    if (id) {
      fetchCards(id);
    }
  }, [id, fetchCards]);

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
        <button onClick={() => navigate("/flashcards")} className="mt-4 text-blue-600 font-semibold">
          Quay lại danh sách
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
    <div className="h-screen w-full flex flex-col bg-[#F4F7FE] absolute inset-0 z-50">
      {/* Top Navigation */}
      <div className="bg-white px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/flashcard/${id}`)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{currentSet.title}</h1>
            <p className="text-sm text-gray-500">Đang luyện tập...</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Play Area (75%) */}
        <div className="flex-1 bg-gray-50/50 p-6 flex items-center justify-center relative overflow-hidden h-full">
          {activeMode === "flashcard" && <ModeFlashcard cards={cards} />}
          {activeMode === "quiz" && <ModeQuiz cards={cards} />}
          {activeMode === "fill_blank" && <ModeFillBlank cards={cards} />}
          {activeMode === "listening" && <ModeListening cards={cards} />}
          {activeMode === "match" && <ModeMatch cards={cards} />}
          {activeMode === "bubble" && <ModeBubble cards={cards} />}
          {activeMode === "guess" && <ModeGuess cards={cards} />}
          {activeMode === "typing" && <ModeTyping cards={cards} />}
        </div>

        {/* Sidebar (25%) */}
        <div className="w-[300px] xl:w-[350px] bg-white border-l border-gray-100 flex-shrink-0 flex flex-col">
          <PracticeSidebar 
            activeMode={activeMode} 
            onChangeMode={setActiveMode} 
            cardCount={cards.length}
          />
        </div>
      </div>
    </div>
  );
}
