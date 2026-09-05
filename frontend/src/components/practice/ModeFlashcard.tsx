import React, { useState, useEffect } from "react";
import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { Volume2, CheckCircle, XCircle, RotateCw } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";
import { Button } from "@/src/components/ui/Button";

interface ModeFlashcardProps {
  cards: Flashcard[];
  setId: string;
  onComplete?: (wrongCardIds: string[]) => void;
  completionActions?: React.ReactNode;
}

export function ModeFlashcard({ cards, setId, onComplete, completionActions }: ModeFlashcardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);
  const wrongCardIdsRef = React.useRef<string[]>([]);
  
  const { playAudio, playSoundEffect, isLoading, loadingText } = useTTSAudio();
  const { reportCorrect, reportWrong, flushProgress } = useSM2(setId);

  const currentCard = cards[currentIndex];

  const handleNext = (remembered: boolean) => {
    playSoundEffect(remembered ? 'correct' : 'wrong');
    const currentCard = cards[currentIndex];
    if (remembered) {
      reportCorrect(currentCard.id, "flashcard");
    } else {
      reportWrong(currentCard.id, "flashcard");
      setWrongCardIds((prev) => { const next = prev.includes(currentCard.id) ? prev : [...prev, currentCard.id]; wrongCardIdsRef.current = next; return next; });
    }
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(curr => curr + 1);
      } else {
        flushProgress();
        onComplete?.(wrongCardIdsRef.current);
        setCompleted(true);
      }
    }, 150);
  };

  const handlePlayAudio = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    playAudio(text);
  };

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 w-full">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] border-2 border-slate-200/60 shadow-xl shadow-slate-200/50 flex flex-col items-center max-w-lg w-full">
          <div className="w-24 h-24 bg-green-100 rounded-[2rem] flex items-center justify-center mb-6 rotate-3 border-2 border-green-200">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Hoàn thành!</h2>
          <p className="text-slate-500 mb-8 font-bold">Bạn đã ôn tập xong toàn bộ thẻ.</p>
          <Button 
            onClick={() => { setCompleted(false); setCurrentIndex(0); setWrongCardIds([]); wrongCardIdsRef.current = []; }}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl border-2 border-blue-600 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
          >
            <RotateCw className="w-5 h-5" />
            Ôn tập lại
          </Button>
          {completionActions && <div className="mt-4 w-full">{completionActions}</div>}
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="w-full max-w-2xl flex flex-col items-center justify-center">
      <div className="w-full flex justify-between items-center mb-6 px-4">
        <span className="text-slate-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
          Thẻ {currentIndex + 1} / {cards.length}
        </span>
        <div className="flex-1 ml-6 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}></div>
        </div>
      </div>

      <div className="relative w-full aspect-[4/3] perspective-1000 group cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        <div className={cn(
          "w-full h-full transition-transform duration-500 preserve-3d relative rounded-[2rem] shadow-xl shadow-slate-200/50 border-2 border-slate-200/60 bg-white",
          isFlipped ? "rotate-y-180" : ""
        )}>
          {/* Front (English) */}
          <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 rounded-[2rem] bg-white">
            <h2 className="text-5xl font-black text-slate-800 mb-4 text-center tracking-tight">{currentCard.term}</h2>
            {currentCard.phonetic && (
              <p className="text-xl text-slate-400 font-mono mb-6 font-medium">{currentCard.phonetic}</p>
            )}
            <Button 
              onClick={(e) => handlePlayAudio(e, currentCard.term)}
              disabled={isLoading && loadingText === currentCard.term}
              className="p-5 rounded-2xl bg-blue-50 border-2 border-blue-100 border-b-4 text-blue-600 hover:bg-blue-100 hover:border-blue-200 active:border-b-2 active:translate-y-[2px] transition-all disabled:opacity-50"
            >
              {isLoading && loadingText === currentCard.term ? (
                <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
              ) : (
                <Volume2 className="w-8 h-8" />
              )}
            </Button>
            <p className="absolute bottom-6 text-sm text-slate-400 font-bold tracking-widest uppercase bg-slate-50 px-4 py-2 rounded-full">Click để lật</p>
          </div>

          {/* Back (Vietnamese) */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-8 rounded-[2rem] bg-blue-500 border-2 border-blue-600 text-white shadow-inner">
            <h2 className="text-4xl font-black mb-6 text-center tracking-tight drop-shadow-md">{currentCard.translation}</h2>
            {currentCard.examples && currentCard.examples.length > 0 && currentCard.examples[0].en && (
              <div className="w-full max-w-md bg-white/10 rounded-2xl p-5 text-center border-2 border-white/20 backdrop-blur-sm">
                <p className="font-bold text-lg mb-2">"{currentCard.examples[0].en}"</p>
                <p className="text-blue-100 text-sm font-medium">"{currentCard.examples[0].vi}"</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions (only visible when flipped) */}
      <div className={cn(
        "flex gap-4 mt-8 transition-all duration-300 w-full px-4 max-w-lg",
        isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        <Button 
          onClick={(e) => { e.stopPropagation(); handleNext(false); }}
          className="flex-1 bg-orange-100 border-2 border-orange-200 border-b-4 hover:bg-orange-200 hover:border-orange-300 text-orange-700 font-bold py-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:border-b-2 active:translate-y-[2px] group"
        >
          <XCircle className="w-8 h-8 text-orange-400 group-hover:text-orange-500 transition-colors" />
          Chưa thuộc
        </Button>
        <Button 
          onClick={(e) => { e.stopPropagation(); handleNext(true); }}
          className="flex-1 bg-green-500 border-2 border-green-600 border-b-4 hover:bg-green-600 hover:border-green-700 text-white font-bold py-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:border-b-2 active:translate-y-[2px] group"
        >
          <CheckCircle className="w-8 h-8 text-green-100 group-hover:text-white transition-colors" />
          Đã thuộc
        </Button>
      </div>
    </div>
  );
}
