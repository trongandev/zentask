import React, { useMemo, useState } from "react";
import { Volume2, CheckCircle } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useTTSAudio } from "../../../hooks/useTTSAudio";
import { Button } from "@/src/components/ui/Button";

interface Round6ReverseQuizProps {
  topicId: string | undefined;
  currentWord: any;
  allLessonWords: any[];
  isCorrect: boolean | null;
  onCheckAnswer: (selectedText: string, isCorrect: boolean) => void;
}

export function Round6ReverseQuiz({ topicId, currentWord, allLessonWords, isCorrect, onCheckAnswer }: Round6ReverseQuizProps) {
  const { playAudio } = useTTSAudio();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const options = useMemo(() => {
    if (!currentWord) return [];
    // Select 3 random incorrect answers from the entire lesson
    const incorrect = allLessonWords.filter((w) => w.id !== currentWord.id).sort(() => Math.random() - 0.5);
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
        {options.map((opt) => {
          let stateClass = "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-blue-600";
          if (isCorrect !== null) {
            if (opt.term === currentWord.term) {
              stateClass = "bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/30 transform scale-[1.02] animate-shake";
            } else if (opt.term === selectedAnswer) {
              stateClass = "bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/30 transform scale-95 animate-shake";
            } else {
              stateClass = "bg-white border-gray-200 text-gray-300 opacity-50";
            }
          }
          return (
            <Button
              key={opt.id}
              onClick={() => handleSelect(opt.term)}
              disabled={isCorrect !== null}
              className={cn(
                "p-6 rounded-2xl border-2 font-bold text-2xl transition-all duration-300 shadow-sm flex flex-col items-center justify-center gap-2 relative overflow-hidden",
                stateClass
              )}
            >
              {opt.term}
              {isCorrect !== null && opt.term === currentWord.term && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-in fade-in zoom-in">
                  <CheckCircle className="w-6 h-6 opacity-80" />
                </div>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
