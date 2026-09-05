import React, { useState, useEffect, useMemo, useRef } from "react";
import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { CheckCircle, RotateCw, Volume2, ArrowLeft } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";
import { getVoiceForLanguage } from "@/src/lib/ttsVoiceStorage";
import { useNavigate } from "react-router-dom";
import { Button } from "@/src/components/ui/Button";

interface ModeQuizProps {
  cards: Flashcard[];
  setId: string;
  onComplete?: (wrongCardIds: string[]) => void;
  completionActions?: React.ReactNode;
}

export function ModeQuiz({ cards, setId, onComplete, completionActions }: ModeQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);
  const wrongCardIdsRef = React.useRef<string[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const cardStartTime = useRef<number>(Date.now());
  const navigate = useNavigate();
  const { playAudio, playSoundEffect, isLoading, loadingText } = useTTSAudio();
  const { reportCorrect, reportWrong, flushProgress } = useSM2(setId);

  const [currentVoiceId] = useState(() => {
    return getVoiceForLanguage();
  });
  const currentCard = cards[currentIndex];

  // Reset timer on card change
  useEffect(() => {
    cardStartTime.current = Date.now();
  }, [currentIndex]);

  // Generate options (1 correct, 3 random wrong)
  const options = useMemo(() => {
    if (!currentCard || cards.length < 4) return [];
    const wrongCards = [...cards]
      .filter((c) => c.id !== currentCard.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    const allOptions = [currentCard, ...wrongCards].sort(() => 0.5 - Math.random());
    return allOptions;
  }, [currentCard, cards]);

  const handleSelect = (optionId: string) => {
    if (selectedOptionId) return; // Prevent double click
    setSelectedOptionId(optionId);
    const responseMs = Date.now() - cardStartTime.current;

    // Check if correct
    const isCorrect = optionId === currentCard.id;
    if (isCorrect) {
      reportCorrect(currentCard.id, "quiz", currentCard.term, responseMs);
      playAudio(currentCard.term, undefined, "correct");
    } else {
      reportWrong(currentCard.id, "quiz");
      setWrongCardIds((prev) => {
        const next = prev.includes(currentCard.id) ? prev : [...prev, currentCard.id];
        wrongCardIdsRef.current = next;
        return next;
      });
      playSoundEffect("wrong");
    }

    setTimeout(() => {
      setSelectedOptionId(null);
      if (currentIndex < cards.length - 1) {
        setCurrentIndex((curr) => curr + 1);
      } else {
        flushProgress();
        onComplete?.(wrongCardIdsRef.current);
        setCompleted(true);
      }
    }, 1500); // Wait 1.5s to show result
  };

  const handlePlayAudio = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    playAudio(text, currentVoiceId);
  };

  if (cards.length < 4) {
    return <div className="text-gray-500 font-bold bg-white p-6 rounded-2xl shadow-sm">Bộ thẻ cần ít nhất 4 từ vựng để luyện tập Trắc nghiệm.</div>;
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 w-full">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] border-2 border-slate-200/60 shadow-xl shadow-slate-200/50 flex flex-col items-center max-w-lg w-full">
          <div className="w-24 h-24 bg-green-100 rounded-[2rem] flex items-center justify-center mb-6 rotate-3 border-2 border-green-200">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Tuyệt vời!</h2>
          <p className="text-slate-500 mb-8 font-bold">Bạn đã hoàn thành bài Trắc nghiệm.</p>
          <Button
            onClick={() => {
              setCompleted(false);
              setCurrentIndex(0);
              setWrongCardIds([]);
              wrongCardIdsRef.current = [];
            }}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl border-2 border-blue-600 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2 mb-3"
          >
            <RotateCw className="w-5 h-5" />
            Làm lại
          </Button>
          <Button 
            onClick={() => navigate(-1)}
            className="w-full py-4 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-2xl border-2 border-slate-200 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay về
          </Button>
          {completionActions && <div className="mt-4 w-full">{completionActions}</div>}
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="w-full max-w-3xl flex flex-col items-center justify-center">
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <span className="text-slate-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border-2 border-slate-100">
          Câu {currentIndex + 1} / {cards.length}
        </span>
        <div className="flex-1 ml-6 h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-200/50">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}></div>
        </div>
      </div>

      <div className="w-full bg-white rounded-[2rem] p-10 shadow-xl shadow-slate-200/50 border-2 border-slate-200/60 mb-8 relative flex flex-col items-center text-center">
        <h2 className="text-5xl font-black text-slate-800 mb-6 tracking-tight">{currentCard.term}</h2>
        <Button
          onClick={(e) => handlePlayAudio(e, currentCard.term)}
          disabled={isLoading && loadingText === currentCard.term}
          className="p-4 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 border-2 border-blue-100 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all disabled:opacity-50"
        >
          {isLoading && loadingText === currentCard.term ? <div className="w-6 h-6 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div> : <Volume2 className="w-6 h-6" />}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {options.map((opt, idx) => {
          let stateClass = "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700 active:border-b-2 active:translate-y-[2px]";
          let borderBClass = "border-b-4";

          if (selectedOptionId) {
            if (opt.id === currentCard.id) {
              stateClass = "bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/30 scale-[1.02] active:border-b-4 active:translate-y-0"; // Correct answer
              borderBClass = "border-b-4";
            } else if (opt.id === selectedOptionId) {
              stateClass = "bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/30 active:border-b-2 active:translate-y-0"; // Wrong answer selected
              borderBClass = "border-b-2 translate-y-[2px]";
            } else {
              stateClass = "bg-slate-50 border-slate-200 text-slate-400 opacity-60 active:border-b-4 active:translate-y-0"; // Others fade out
            }
          }

          return (
            <Button
              key={idx}
              onClick={() => handleSelect(opt.id)}
              disabled={selectedOptionId !== null}
              className={cn("p-6 rounded-2xl border-2 text-lg font-bold transition-all duration-300 text-left relative overflow-hidden flex flex-row items-center", stateClass, borderBClass)}
            >
              {opt.translation}
              {selectedOptionId && opt.id === currentCard.id && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-in fade-in zoom-in">
                  <CheckCircle className="w-6 h-6 text-green-100 opacity-90" />
                </div>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
