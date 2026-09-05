import React, { useState, useEffect, useRef } from "react";
import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { CheckCircle, RotateCw, ArrowLeft, Send } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { useNavigate } from "react-router-dom";

interface ModeFillBlankProps {
  cards: Flashcard[];
  setId: string;
  onComplete?: (wrongCardIds: string[]) => void;
  completionActions?: React.ReactNode;
}

export function ModeFillBlank({ cards, setId, onComplete, completionActions }: ModeFillBlankProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);
  const wrongCardIdsRef = React.useRef<string[]>([]);
  const cardStartTime = useRef<number>(Date.now());
  const navigate = useNavigate();
  
  const { playAudio, playSoundEffect } = useTTSAudio();
  const { reportCorrect, reportWrong, flushProgress } = useSM2(setId);

  const currentCard = cards[currentIndex];

  // Reset timer when card changes
  useEffect(() => {
    cardStartTime.current = Date.now();
  }, [currentIndex]);


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
      reportCorrect(currentCard.id, "fill_blank", currentCard.term, responseMs);
      playAudio(currentCard.term, undefined, 'correct');
    } else {
      reportWrong(currentCard.id, "fill_blank");
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
        // If wrong, stay on same word, let user try again
        setStatus("idle");
      }
    }, isCorrect ? 1000 : 1500); // Wait shorter if correct, longer if wrong
  };

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 w-full">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] border-2 border-slate-200/60 shadow-xl shadow-slate-200/50 flex flex-col items-center max-w-lg w-full">
          <div className="w-24 h-24 bg-green-100 rounded-[2rem] flex items-center justify-center mb-6 rotate-3 border-2 border-green-200">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Thật xuất sắc!</h2>
          <p className="text-slate-500 mb-8 font-bold">Bạn đã hoàn thành bài Điền từ.</p>
          <Button 
            onClick={() => { setCompleted(false); setCurrentIndex(0); setInputValue(""); setStatus("idle"); setWrongCardIds([]); wrongCardIdsRef.current = []; }}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl border-2 border-blue-600 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2 mb-3"
          >
            <RotateCw className="w-5 h-5" />
            Luyện tập lại
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

  // Find an example to use
  let exampleText = "";
  let exampleTranslation = currentCard.translation;
  
  if (currentCard.examples && currentCard.examples.length > 0 && currentCard.examples[0].en) {
    exampleText = currentCard.examples[0].en;
    exampleTranslation = currentCard.examples[0].vi;
  }

  const renderBlankByWordLength = (compact = false) => {
    const word = currentCard.term || "";
    return (
      <span className={cn("inline-flex max-w-full flex-wrap items-end justify-center gap-x-1 gap-y-1 align-middle", compact ? "mx-1" : "")}>
        {word.split("").map((char, index) =>
          char === " " ? (
            <span key={index} className="w-3 sm:w-4" aria-hidden="true" />
          ) : (
            <span key={index} className={cn("inline-flex items-end justify-center border-b-[3px] border-blue-400", compact ? "h-7 w-3.5 sm:w-4" : "h-9 w-4 sm:w-5")} aria-hidden="true" />
          ),
        )}
      </span>
    );
  };

  // Replace term with blank in example text
  const getBlankedExample = () => {
    if (!exampleText) return null;
    
    // Simple case-insensitive replacement
    const regex = new RegExp(currentCard.term, 'gi');
    if (regex.test(exampleText)) {
      const parts = exampleText.split(regex);
      return (
        <span className="text-2xl md:text-3xl font-black leading-relaxed tracking-tight text-slate-800">
          {parts[0]}
          <span className="inline-flex max-w-full flex-wrap items-center justify-center rounded-xl bg-blue-100/70 border-2 border-blue-200 border-b-4 px-3 py-1 text-center text-blue-700 font-black align-middle mx-2 shadow-sm [overflow-wrap:anywhere]">
            {status === "correct" ? currentCard.term : (status === "wrong" ? inputValue : renderBlankByWordLength(true))}
          </span>
          {parts[1]}
        </span>
      );
    }
    return null; // Fallback if term not found exactly in example
  };

  const blankedContent = getBlankedExample();

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

      <div className={cn(
        "w-full bg-white rounded-[2rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border-2 mb-8 relative transition-colors duration-300",
        status === "idle" ? "border-slate-200/60" : status === "correct" ? "border-green-500 bg-green-50/50" : "border-red-500 bg-red-50/50"
      )}>
        {blankedContent ? (
          <div className="text-center">
            <div className="mb-8">{blankedContent}</div>
            <div className="inline-block bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-slate-600 shadow-inner">
              Ý nghĩa: <strong className="text-slate-900">{exampleTranslation}</strong>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-slate-500 mb-2 font-bold uppercase tracking-wider">Viết từ có nghĩa sau:</p>
            <h2 className="text-4xl font-black tracking-tight text-slate-800 mb-4">{exampleTranslation}</h2>
            <div className="mb-8 flex max-w-full justify-center text-blue-500">{status === "idle" ? renderBlankByWordLength(false) : ""}</div>
            
            {status === "correct" && <p className="text-3xl font-black tracking-tight text-green-500 mb-4">{currentCard.term}</p>}
            {status === "wrong" && <p className="text-2xl font-black tracking-tight text-red-500 line-through mb-4 opacity-80">{inputValue}</p>}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xl relative group px-4">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={status !== "idle"}
          placeholder="Gõ từ vựng tiếng Anh vào đây..."
          className={cn(
            "w-full bg-white border-2 border-b-4 rounded-2xl px-6 py-6 md:py-8 text-xl font-bold outline-none transition-all shadow-sm",
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
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}
