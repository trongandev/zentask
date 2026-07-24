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

  
  // We'll just loop through the cards for now. 
  // In a real Spaced Repetition System, we'd schedule them.
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
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Hoàn thành!</h2>
        <p className="text-gray-500 mb-8">Bạn đã ôn tập xong toàn bộ thẻ.</p>
        <Button 
          onClick={() => { setCompleted(false); setCurrentIndex(0); setWrongCardIds([]); wrongCardIdsRef.current = []; }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all active:scale-95"
        >
          <RotateCw className="w-5 h-5" />
          Ôn tập lại
        </Button>
        {completionActions}
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="w-full max-w-2xl flex flex-col items-center justify-center">
      <div className="w-full flex justify-between items-center mb-6 px-4 text-gray-500 font-bold">
        <span>Thẻ {currentIndex + 1} / {cards.length}</span>
      </div>

      <div className="relative w-full aspect-[4/3] perspective-1000 group cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        <div className={cn(
          "w-full h-full transition-transform duration-500 preserve-3d relative rounded-3xl shadow-lg border border-gray-100 bg-white",
          isFlipped ? "rotate-y-180" : ""
        )}>
          {/* Front (English) */}
          <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 rounded-3xl bg-white">
            <h2 className="text-5xl font-extrabold text-gray-900 mb-4 text-center">{currentCard.term}</h2>
            {currentCard.phonetic && (
              <p className="text-xl text-gray-400 font-mono mb-6">{currentCard.phonetic}</p>
            )}
            <Button 
              onClick={(e) => handlePlayAudio(e, currentCard.term)}
              disabled={isLoading && loadingText === currentCard.term}
              className="p-4 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {isLoading && loadingText === currentCard.term ? (
                <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
              ) : (
                <Volume2 className="w-8 h-8" />
              )}
            </Button>
            <p className="absolute bottom-6 text-sm text-gray-400 font-medium tracking-widest uppercase">Click để lật</p>
          </div>

          {/* Back (Vietnamese) */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-8 rounded-3xl bg-blue-600 text-white">
            <h2 className="text-4xl font-bold mb-6 text-center">{currentCard.translation}</h2>
            {currentCard.examples && currentCard.examples.length > 0 && currentCard.examples[0].en && (
              <div className="w-full max-w-md bg-white/10 rounded-xl p-4 text-center border border-white/20">
                <p className="font-medium text-lg mb-2">"{currentCard.examples[0].en}"</p>
                <p className="text-blue-100 text-sm">"{currentCard.examples[0].vi}"</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions (only visible when flipped) */}
      <div className={cn(
        "flex gap-4 mt-8 transition-all duration-300 w-full px-4",
        isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        <Button 
          onClick={(e) => { e.stopPropagation(); handleNext(false); }}
          className="flex-1 bg-white border-2 border-red-100 hover:border-red-500 hover:bg-red-50 text-red-600 font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group"
        >
          <XCircle className="w-8 h-8 text-red-400 group-hover:text-red-500" />
          Chưa thuộc
        </Button>
        <Button 
          onClick={(e) => { e.stopPropagation(); handleNext(true); }}
          className="flex-1 bg-white border-2 border-green-100 hover:border-green-500 hover:bg-green-50 text-green-600 font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group"
        >
          <CheckCircle className="w-8 h-8 text-green-400 group-hover:text-green-500" />
          Đã thuộc
        </Button>
      </div>
    </div>
  );
}
