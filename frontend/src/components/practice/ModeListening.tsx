import React, { useState, useEffect, useRef } from "react";
import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { CheckCircle, RotateCw, Volume2, VolumeX, Send, ArrowLeft } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { useNavigate } from "react-router-dom";

interface ModeListeningProps {
  cards: Flashcard[];
  setId: string;
  onComplete?: (wrongCardIds: string[]) => void;
  completionActions?: React.ReactNode;
}

export function ModeListening({ cards, setId, onComplete, completionActions }: ModeListeningProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);
  const wrongCardIdsRef = React.useRef<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const cardStartTime = useRef<number>(Date.now());
  const navigate = useNavigate();
  
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
      setWrongCardIds((prev) => { const next = prev.includes(currentCard.id) ? prev : [...prev, currentCard.id]; wrongCardIdsRef.current = next; return next; });
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
          onComplete?.(wrongCardIdsRef.current);
          setCompleted(true);
        }
      } else {
        setStatus("idle");
      }
    }, isCorrect ? 1000 : 1500);
  };

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 w-full">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] border-2 border-slate-200/60 shadow-xl shadow-slate-200/50 flex flex-col items-center max-w-lg w-full">
          <div className="w-24 h-24 bg-green-100 rounded-[2rem] flex items-center justify-center mb-6 rotate-3 border-2 border-green-200">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Tuyệt vời!</h2>
          <p className="text-slate-500 mb-8 font-bold">Bạn đã nghe và viết chính xác toàn bộ thẻ.</p>
          <Button 
            onClick={() => { setCompleted(false); setCurrentIndex(0); setWrongCardIds([]); wrongCardIdsRef.current = []; setInputValue(""); setStatus("idle"); }}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl border-2 border-blue-600 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2 mb-3"
          >
            <RotateCw className="w-5 h-5" />
            Luyện nghe lại
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
    <div className="w-full max-w-xl flex flex-col items-center justify-center">
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <span className="text-slate-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border-2 border-slate-100">
          Câu {currentIndex + 1} / {cards.length}
        </span>
        <div className="flex-1 ml-6 h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-200/50">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}></div>
        </div>
      </div>

      <div className={cn(
        "w-full bg-white rounded-[2rem] p-12 shadow-xl shadow-slate-200/50 border-2 mb-8 relative flex flex-col items-center transition-colors duration-300",
        status === "idle" ? "border-slate-200/60" : status === "correct" ? "border-green-500 bg-green-50/50" : "border-red-500 bg-red-50/50"
      )}>
        <Button
          onClick={() => playAudio(currentCard.term)}
          disabled={isLoading}
          className={cn(
            "w-36 h-36 rounded-full flex items-center justify-center transition-all duration-300 mb-6 border-4 active:scale-95",
            isPlaying 
              ? "bg-blue-100 border-blue-200 text-blue-600 scale-95" 
              : "bg-blue-500 border-blue-600 text-white shadow-xl shadow-blue-500/30 hover:bg-blue-600"
          )}
        >
          {isLoading ? (
            <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
          ) : isPlaying ? (
            <div className="flex gap-1 items-center justify-center h-12">
               <div className="w-2 h-full bg-blue-600 rounded-full animate-[bounce_1s_infinite_100ms]"></div>
               <div className="w-2 h-1/2 bg-blue-600 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
               <div className="w-2 h-3/4 bg-blue-600 rounded-full animate-[bounce_1s_infinite_300ms]"></div>
               <div className="w-2 h-full bg-blue-600 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
            </div>
          ) : (
            <Volume2 className="w-16 h-16 ml-2" />
          )}
        </Button>
        
        <p className="text-slate-400 font-bold uppercase tracking-wider text-sm">Nhấn vào loa để nghe lại</p>

        {status === "correct" && (
          <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2">
             <p className="text-4xl font-black tracking-tight text-green-500 drop-shadow-sm">{currentCard.term}</p>
             <p className="text-slate-500 mt-2 font-medium">{currentCard.translation}</p>
          </div>
        )}
        {status === "wrong" && (
          <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2">
             <p className="text-2xl font-black tracking-tight text-red-500 line-through mb-2 opacity-80">{inputValue}</p>
             <p className="text-slate-500 font-medium">Sai rồi, thử nghe lại xem!</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="w-full relative group px-4">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={status !== "idle"}
          placeholder="Gõ từ bạn nghe được..."
          className={cn(
            "w-full bg-white border-2 border-b-4 rounded-2xl px-6 py-6 md:py-8 text-2xl font-black text-center tracking-wide outline-none transition-all shadow-sm placeholder:text-slate-300 placeholder:font-bold",
            status === "idle" 
              ? "border-slate-200 focus:border-blue-500 focus:shadow-md" 
              : status === "correct"
                ? "border-green-500 text-green-700 bg-green-50"
                : "border-red-500 text-red-700 bg-red-50"
          )}
        />
        <Button 
          type="submit" 
          disabled={status !== "idle" || !inputValue.trim()}
          className="absolute right-7 md:right-8 top-1/2 -translate-y-1/2 p-3 bg-blue-600 border-2 border-blue-700 border-b-4 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 disabled:border-slate-500 transition-all shadow-sm active:border-b-2 active:translate-y-[calc(-50%+2px)]"
        >
          <Send className="w-6 h-6" />
        </Button>
      </form>
    </div>
  );
}
