import React, { useState, useEffect, useMemo, useRef } from "react";

import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { CheckCircle, RotateCw, Volume2 } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";

interface ModeQuizProps {
  cards: Flashcard[];
  setId: string;
}


export function ModeQuiz({ cards, setId }: ModeQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const cardStartTime = useRef<number>(Date.now());
  
  const { playAudio, playSoundEffect, isLoading, loadingText } = useTTSAudio();
  const { reportCorrect, reportWrong, flushProgress } = useSM2(setId);

  
  const currentCard = cards[currentIndex];

  // Reset timer on card change
  useEffect(() => {
    cardStartTime.current = Date.now();
  }, [currentIndex]);

  // Generate options (1 correct, 3 random wrong)
  const options = useMemo(() => {
    if (!currentCard || cards.length < 4) return [];
    const wrongCards = [...cards].filter(c => c.id !== currentCard.id).sort(() => 0.5 - Math.random()).slice(0, 3);
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
      playAudio(currentCard.term, undefined, 'correct');
    } else {
      reportWrong(currentCard.id, "quiz");
      playSoundEffect('wrong');
    }
    
    setTimeout(() => {
      setSelectedOptionId(null);
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(curr => curr + 1);
      } else {
        flushProgress();
        setCompleted(true);
      }
    }, 1500); // Wait 1.5s to show result
  };


  const handlePlayAudio = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    playAudio(text);
  };

  if (cards.length < 4) {
    return <div className="text-gray-500">Bộ thẻ cần ít nhất 4 từ vựng để luyện tập Trắc nghiệm.</div>;
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Tuyệt vời!</h2>
        <p className="text-gray-500 mb-8">Bạn đã hoàn thành bài Trắc nghiệm.</p>
        <button 
          onClick={() => { setCompleted(false); setCurrentIndex(0); }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all active:scale-95"
        >
          <RotateCw className="w-5 h-5" />
          Làm lại
        </button>
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="w-full max-w-3xl flex flex-col items-center justify-center">
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <span className="text-gray-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          Câu {currentIndex + 1} / {cards.length}
        </span>
        <div className="flex-1 ml-6 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${(currentIndex / cards.length) * 100}%` }}></div>
        </div>
      </div>

      <div className="w-full bg-white rounded-3xl p-10 shadow-lg border border-gray-100 mb-8 relative flex flex-col items-center text-center">
        <h2 className="text-5xl font-extrabold text-gray-900 mb-4">{currentCard.term}</h2>
        <button 
          onClick={(e) => handlePlayAudio(e, currentCard.term)}
          disabled={isLoading && loadingText === currentCard.term}
          className="p-3 rounded-full bg-gray-50 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          {isLoading && loadingText === currentCard.term ? (
             <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
          ) : (
             <Volume2 className="w-6 h-6" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {options.map((opt, idx) => {
          let stateClass = "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700";
          
          if (selectedOptionId) {
            if (opt.id === currentCard.id) {
              stateClass = "bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/30 transform scale-[1.02]"; // Correct answer always highlights green
            } else if (opt.id === selectedOptionId) {
              stateClass = "bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/30 transform scale-95"; // Wrong answer selected highlights red
            } else {
              stateClass = "bg-white border-gray-200 text-gray-300 opacity-50"; // Others fade out
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(opt.id)}
              disabled={selectedOptionId !== null}
              className={cn(
                "p-5 rounded-2xl border-2 text-lg font-bold transition-all duration-300 shadow-sm text-left relative overflow-hidden",
                stateClass
              )}
            >
              {opt.translation}
              {selectedOptionId && opt.id === currentCard.id && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-in fade-in zoom-in">
                  <CheckCircle className="w-6 h-6 opacity-80" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
