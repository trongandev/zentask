import React, { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useTTSAudio } from "../../../hooks/useTTSAudio";
import { getBeginnerSetById } from "../../../config/rankTopicConfig";

interface Round6ReverseQuizProps {
  topicId: string | undefined;
  currentWord: any;
  isCorrect: boolean | null;
  onCheckAnswer: (selectedText: string, isCorrect: boolean) => void;
}

export function Round6ReverseQuiz({ topicId, currentWord, isCorrect, onCheckAnswer }: Round6ReverseQuizProps) {
  const { playAudio } = useTTSAudio();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const options = useMemo(() => {
    if (!currentWord) return [];
    // Select 3 random incorrect answers from the entire topic configuration
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
      <h2 className="text-2xl font-bold text-slate-800 mb-8">Từ vựng tiếng Anh là gì?</h2>
      
      <div className="text-center mb-12">
        <p className="font-bold text-4xl text-slate-700 mb-4 px-4">{currentWord?.translation}</p>
        <p className="text-lg text-slate-500 italic mt-4">"{currentWord?.examples?.[0]?.vi || 'Nghĩa của từ này trong tiếng Anh'}"</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt.term)}
            disabled={isCorrect !== null}
            className={cn(
              "p-6 rounded-2xl border-2 font-bold text-2xl transition-all shadow-sm active:scale-95 flex flex-col items-center justify-center gap-2",
              selectedAnswer === opt.term
                ? isCorrect
                  ? "bg-green-100 border-green-500 text-green-700"
                  : "bg-red-100 border-red-500 text-red-700"
                : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-blue-600",
            )}
          >
            {opt.term}
            {selectedAnswer === opt.term && isCorrect && (
               <button onClick={(e) => { e.stopPropagation(); playAudio(opt.term); }} className="text-green-600 hover:bg-green-200 p-1 rounded-full">
                 <Volume2 className="w-5 h-5" />
               </button>
            )}
            {isCorrect !== null && opt.term === currentWord.term && selectedAnswer !== opt.term && (
               <button onClick={(e) => { e.stopPropagation(); playAudio(opt.term); }} className="text-blue-500 hover:bg-blue-100 p-1 rounded-full absolute bottom-2 right-2">
                 <Volume2 className="w-4 h-4" />
               </button>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
