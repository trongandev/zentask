import React, { useState, useEffect, useRef } from "react";
import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { CheckCircle, RotateCw, Volume2, VolumeX, Send } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";

interface ModeListeningProps {
  cards: Flashcard[];
  setId: string;
}


export function ModeListening({ cards, setId }: ModeListeningProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const cardStartTime = useRef<number>(Date.now());
  
  const { playAudio, playSoundEffect, isLoading, isPlaying } = useTTSAudio();
  const { reportCorrect, reportWrong, flushProgress } = useSM2(setId);

  
  const currentCard = cards[currentIndex];

  // Reset timer when card changes (after audio plays)
  useEffect(() => {
    cardStartTime.current = Date.now();
  }, [currentIndex]);


  // Play audio automatically when card changes
  useEffect(() => {
    if (currentCard && !completed) {
      const timer = setTimeout(() => playAudio(currentCard.term), 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentCard, completed]);

  useEffect(() => {
    if (status === "idle" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || status !== "idle") return;

    const responseMs = Date.now() - cardStartTime.current;
    const isCorrect = inputValue.trim().toLowerCase() === currentCard.term.toLowerCase();
    setStatus(isCorrect ? "correct" : "wrong");
    
    if (isCorrect) {
      reportCorrect(currentCard.id, "listening", currentCard.term, responseMs);
      playSoundEffect('correct');
    } else {
      reportWrong(currentCard.id, "listening");
      playSoundEffect('wrong');
    }

    setTimeout(() => {
      if (isCorrect) {
        if (currentIndex < cards.length - 1) {
          setCurrentIndex(c => c + 1);
          setInputValue("");
          setStatus("idle");
        } else {
          flushProgress();
          setCompleted(true);
        }
      } else {
        setStatus("idle");
      }
    }, isCorrect ? 1000 : 1500);
  };


  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Tuyệt vời!</h2>
        <p className="text-gray-500 mb-8">Bạn đã nghe và viết chính xác toàn bộ thẻ.</p>
        <button 
          onClick={() => { setCompleted(false); setCurrentIndex(0); setInputValue(""); setStatus("idle"); }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all active:scale-95"
        >
          <RotateCw className="w-5 h-5" />
          Luyện nghe lại
        </button>
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="w-full max-w-xl flex flex-col items-center justify-center">
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <span className="text-gray-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          Câu {currentIndex + 1} / {cards.length}
        </span>
      </div>

      <div className="w-full bg-white rounded-3xl p-12 shadow-lg border border-gray-100 mb-8 relative flex flex-col items-center">
        <button
          onClick={() => playAudio(currentCard.term)}
          disabled={isLoading}
          className={cn(
            "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 mb-6",
            isPlaying 
              ? "bg-blue-100 text-blue-600 shadow-inner scale-95" 
              : "bg-blue-600 text-white shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:scale-105"
          )}
        >
          {isLoading ? (
            <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
          ) : isPlaying ? (
            <div className="flex gap-1 items-center justify-center h-10">
               <div className="w-1.5 h-full bg-blue-600 rounded-full animate-[bounce_1s_infinite_100ms]"></div>
               <div className="w-1.5 h-1/2 bg-blue-600 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
               <div className="w-1.5 h-3/4 bg-blue-600 rounded-full animate-[bounce_1s_infinite_300ms]"></div>
               <div className="w-1.5 h-full bg-blue-600 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
            </div>
          ) : (
            <Volume2 className="w-14 h-14 ml-1" />
          )}
        </button>
        
        <p className="text-gray-500 font-medium">Nhấn vào loa để nghe lại</p>

        {status === "correct" && (
          <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2">
             <p className="text-3xl font-bold text-green-500">{currentCard.term}</p>
             <p className="text-gray-500 mt-1">{currentCard.translation}</p>
          </div>
        )}
        {status === "wrong" && (
          <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2">
             <p className="text-xl font-bold text-red-500 line-through mb-1">{inputValue}</p>
             <p className="text-gray-500">Sai rồi, thử nghe lại xem!</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="w-full relative group">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={status !== "idle"}
          placeholder="Gõ từ bạn nghe được..."
          className={cn(
            "w-full bg-white border-2 rounded-2xl px-6 py-5 text-xl font-bold text-center outline-none transition-all shadow-sm",
            status === "idle" 
              ? "border-gray-200 focus:border-blue-500 focus:shadow-md" 
              : status === "correct"
                ? "border-green-500 text-green-700 bg-green-50"
                : "border-red-500 text-red-700 bg-red-50"
          )}
        />
        <button 
          type="submit" 
          disabled={status !== "idle" || !inputValue.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 transition-colors shadow-sm"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
