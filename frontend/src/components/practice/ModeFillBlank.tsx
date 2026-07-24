import React, { useState, useEffect, useRef } from "react";
import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { CheckCircle, RotateCw, AlertTriangle, Send } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

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
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Thật xuất sắc!</h2>
        <p className="text-gray-500 mb-8">Bạn đã hoàn thành bài Điền từ.</p>
        <Button 
          onClick={() => { setCompleted(false); setCurrentIndex(0); setInputValue(""); setStatus("idle"); setWrongCardIds([]); wrongCardIdsRef.current = []; }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all active:scale-95"
        >
          <RotateCw className="w-5 h-5" />
          Luyện tập lại
        </Button>
        {completionActions}
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
            <span key={index} className={cn("inline-flex items-end justify-center border-b-2 border-blue-400", compact ? "h-7 w-3.5 sm:w-4" : "h-9 w-4 sm:w-5")} aria-hidden="true" />
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
        <span className="text-3xl font-medium leading-relaxed text-gray-800">
          {parts[0]}
          <span className="inline-flex max-w-full flex-wrap items-center justify-center rounded-t-lg bg-blue-50/70 px-2 py-1 text-center text-blue-600 font-bold align-middle [overflow-wrap:anywhere]">
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
        <span className="text-gray-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          Câu {currentIndex + 1} / {cards.length}
        </span>
      </div>

      <div className={cn(
        "w-full bg-white rounded-3xl p-12 shadow-lg border-2 mb-8 relative transition-colors duration-300",
        status === "idle" ? "border-transparent" : status === "correct" ? "border-green-500 bg-green-50/30" : "border-red-500 bg-red-50/30"
      )}>
        {blankedContent ? (
          <div className="text-center">
            <div className="mb-8">{blankedContent}</div>
            <div className="inline-block bg-gray-50 border border-gray-100 rounded-xl p-4 text-gray-600 shadow-inner">
              Ý nghĩa: <strong className="text-gray-900">{exampleTranslation}</strong>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-500 mb-2 font-medium uppercase tracking-wider">Viết từ có nghĩa sau:</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{exampleTranslation}</h2>
            <div className="mb-8 flex max-w-full justify-center text-blue-500">{status === "idle" ? renderBlankByWordLength(false) : ""}</div>
            
            {status === "correct" && <p className="text-2xl font-bold text-green-500 mb-4">{currentCard.term}</p>}
            {status === "wrong" && <p className="text-lg font-bold text-red-500 line-through mb-4">{inputValue}</p>}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xl relative group">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={status !== "idle"}
          placeholder="Gõ từ vựng tiếng Anh vào đây..."
          className={cn(
            "w-full bg-white border-2 rounded-2xl px-6 py-5 text-xl font-bold outline-none transition-all shadow-sm",
            status === "idle" 
              ? "border-gray-200 focus:border-blue-500 focus:shadow-md" 
              : status === "correct"
                ? "border-green-500 text-green-700 bg-green-50"
                : "border-red-500 text-red-700 bg-red-50"
          )}
        />
        <Button 
          type="submit" 
          disabled={status !== "idle" || !inputValue.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 transition-colors shadow-sm"
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}
