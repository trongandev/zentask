import React, { useState, useEffect, useMemo, useRef } from "react";
import { Word } from "../config/rankTopicConfig";
import { useTTSAudio } from "../hooks/useTTSAudio";
import { cn } from "../lib/utils";
import { Volume2, Send } from "lucide-react";

interface ArenaGameRendererProps {
  mode: string;
  card: Word;
  allCards: Word[];
  isX2: boolean;
  onAnswer: (isCorrect: boolean) => void;
  disabled: boolean; // if true, wait for next
}

export function ArenaGameRenderer({ mode, card, allCards, isX2, onAnswer, disabled }: ArenaGameRendererProps) {
  const { playAudio, isLoading, loadingText } = useTTSAudio();
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // For Quiz mode
  const options = useMemo(() => {
    if (mode !== "quiz") return [];
    const wrong = allCards.filter(c => c.id !== card.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    return [card, ...wrong].sort(() => 0.5 - Math.random());
  }, [card, allCards, mode]);

  useEffect(() => {
    setInputValue("");
    if (!disabled && inputRef.current && mode !== "quiz") {
      inputRef.current.focus();
    }
  }, [card, disabled, mode]);

  // Auto play audio for listening mode
  useEffect(() => {
    if (mode === "listening" && !disabled) {
      playAudio(card.term);
    }
  }, [card, disabled, mode]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (disabled || !inputValue.trim()) return;
    const isCorrect = inputValue.trim().toLowerCase() === card.term.toLowerCase();
    onAnswer(isCorrect);
  };

  const renderQuiz = () => (
    <div className="w-full flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl w-full text-center mb-8 shadow-2xl relative overflow-hidden">
        {isX2 && (
          <div className="absolute top-0 right-0 bg-yellow-500 text-black font-black px-6 py-2 rounded-bl-3xl">X2 ĐIỂM</div>
        )}
        <h2 className="text-5xl font-black text-white mb-4 tracking-wide">{card.term}</h2>
        <button 
          onClick={() => playAudio(card.term)}
          className="mx-auto p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <Volume2 className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        {options.map((opt, idx) => (
          <button 
            key={idx} 
            disabled={disabled}
            onClick={() => onAnswer(opt.id === card.id)} 
            className="p-6 rounded-2xl border-2 text-xl font-bold transition-all duration-300 bg-white/5 border-white/10 hover:bg-white/20 text-white disabled:opacity-50"
          >
            {opt.translation}
          </button>
        ))}
      </div>
    </div>
  );

  const renderTyping = (promptText: string, subText: string) => (
    <div className="w-full flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-12 rounded-3xl w-full text-center mb-8 shadow-2xl relative">
        {isX2 && (
          <div className="absolute top-0 right-0 bg-yellow-500 text-black font-black px-6 py-2 rounded-bl-3xl">X2 ĐIỂM</div>
        )}
        <p className="text-blue-200 text-lg mb-2 uppercase tracking-widest font-bold">{subText}</p>
        <h2 className="text-4xl font-black text-white">{promptText}</h2>
      </div>
      <form onSubmit={handleSubmit} className="w-full relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={disabled}
          placeholder="Gõ từ tiếng Anh vào đây..."
          className="w-full bg-white/10 border-2 border-white/30 rounded-2xl px-6 py-5 text-xl font-bold text-white outline-none focus:border-blue-500 focus:bg-white/20 transition-all placeholder:text-white/30"
        />
        <button 
          type="submit" 
          disabled={disabled || !inputValue.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );

  const renderListening = () => (
    <div className="w-full flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-12 rounded-3xl w-full text-center mb-8 shadow-2xl relative">
        {isX2 && (
          <div className="absolute top-0 right-0 bg-yellow-500 text-black font-black px-6 py-2 rounded-bl-3xl">X2 ĐIỂM</div>
        )}
        <button 
          onClick={() => playAudio(card.term)}
          className="mx-auto p-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-[0_0_30px_rgba(37,99,235,0.5)] animate-pulse"
        >
          <Volume2 className="w-12 h-12" />
        </button>
        <p className="text-blue-200 text-lg mt-6 uppercase tracking-widest font-bold">Nghe và gõ lại từ vựng</p>
      </div>
      <form onSubmit={handleSubmit} className="w-full relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={disabled}
          placeholder="Gõ từ bạn nghe được..."
          className="w-full bg-white/10 border-2 border-white/30 rounded-2xl px-6 py-5 text-xl font-bold text-white outline-none focus:border-blue-500 focus:bg-white/20 transition-all placeholder:text-white/30"
        />
      </form>
    </div>
  );

  const renderFillBlank = () => {
    let ex = card.translation;
    if (card.examples && card.examples[0]?.en) {
      ex = card.examples[0].en.replace(new RegExp(card.term, 'gi'), "___");
    }
    return renderTyping(ex, "Điền từ vào chỗ trống");
  };

  switch (mode) {
    case "quiz": return renderQuiz();
    case "fill_blank": return renderFillBlank();
    case "listening": return renderListening();
    case "guess": return renderTyping(card.translation, "Dịch sang tiếng Anh");
    case "typing": return renderTyping(card.translation, "Dịch sang tiếng Anh");
    default: return renderQuiz();
  }
}
