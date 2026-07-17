import React, { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useTTSAudio } from "../../../hooks/useTTSAudio";
import { getBeginnerSetById } from "../../../config/rankTopicConfig";

interface Round5FillBlankProps {
  topicId: string | undefined;
  currentWord: any;
  isCorrect: boolean | null;
  onCheckAnswer: (selectedText: string, isCorrect: boolean) => void;
}

export function Round5FillBlank({ topicId, currentWord, isCorrect, onCheckAnswer }: Round5FillBlankProps) {
  const { playAudio } = useTTSAudio();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  // Generate blank sentence
  const sentenceWithBlank = useMemo(() => {
    if (!currentWord) return { parts: ["", ""], hasExample: false };
    const example = currentWord.examples?.[0]?.en;
    if (!example) return { parts: [currentWord.term, ""], hasExample: false };
    
    // Simple case-insensitive replacement
    const regex = new RegExp(`(${currentWord.term})`, 'i');
    const parts = example.split(regex);
    
    // If the term wasn't found perfectly in the example (e.g. conjugation diff), 
    // just put a blank at the end or fallback safely.
    if (parts.length === 1) {
      return { parts: [example + " ", ""], hasExample: true };
    }
    
    return { parts: [parts[0], parts.slice(2).join("")], hasExample: true };
  }, [currentWord]);

  const options = useMemo(() => {
    if (!currentWord) return [];
    const allTopicWords = getBeginnerSetById(topicId || "")?.words || [];
    const incorrect = allTopicWords.filter((w) => w.id !== currentWord.id).sort(() => Math.random() - 0.5);
    const chosen = incorrect.slice(0, 3);
    const combined = [...chosen, currentWord];
    return combined.sort(() => Math.random() - 0.5);
  }, [currentWord, topicId]);

  const handleSelect = (term: string) => {
    setSelectedAnswer(term);
    const correct = term === currentWord.term;
    onCheckAnswer(term, correct);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right text-center flex flex-col items-center">
      <h2 className="text-2xl font-bold text-slate-800 mb-8">Hoàn thành câu</h2>
      
      <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm w-full max-w-lg mb-8">
        <button
          onClick={() => playAudio(currentWord?.examples?.[0]?.en || currentWord?.term)}
          className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 hover:bg-blue-200 hover:scale-110 transition-all"
        >
          <Volume2 className="w-8 h-8" />
        </button>

        {sentenceWithBlank.hasExample ? (
          <div className="text-2xl font-medium text-slate-700 leading-relaxed mb-4">
            {sentenceWithBlank.parts[0]}
            <span className={cn(
              "inline-block min-w-[100px] border-b-4 mx-2 px-2 pb-1 text-center font-bold",
              isCorrect === null ? "border-slate-300 text-transparent" : 
              isCorrect === true ? "border-green-500 text-green-600" : "border-red-500 text-red-600"
            )}>
              {isCorrect !== null ? selectedAnswer : "____"}
            </span>
            {sentenceWithBlank.parts[1]}
          </div>
        ) : (
          <p className="text-xl text-slate-500 italic mb-4">Không có câu ví dụ cho từ này.</p>
        )}

        <p className="text-lg text-slate-500 italic mt-4 border-t pt-4">"{currentWord?.examples?.[0]?.vi || currentWord?.translation}"</p>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full max-w-lg">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt.term)}
            disabled={isCorrect !== null}
            className={cn(
              "p-4 rounded-2xl border-2 font-bold text-lg transition-all",
              selectedAnswer === opt.term
                ? isCorrect
                  ? "bg-green-100 border-green-500 text-green-700"
                  : "bg-red-100 border-red-500 text-red-700"
                : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300",
            )}
          >
            {opt.term}
          </button>
        ))}
      </div>
    </div>
  );
}
