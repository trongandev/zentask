import React, { useMemo, useState } from "react";
import { Volume2, CheckCircle } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useTTSAudio } from "../../../hooks/useTTSAudio";

interface Round2ChooseMeaningProps {
  topicId: string | undefined;
  currentWord: any;
  allLessonWords: any[];
  isCorrect: boolean | null;
  onCheckAnswer: (selectedText: string, isCorrect: boolean) => void;
}

export function Round2ChooseMeaning({ topicId, currentWord, allLessonWords, isCorrect, onCheckAnswer }: Round2ChooseMeaningProps) {
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

  const handleSelect = (translation: string) => {
    setSelectedAnswer(translation);
    const correct = translation === currentWord.translation;
    onCheckAnswer(translation, correct);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right">
      <h2 className="text-2xl font-bold text-slate-800">Nghĩa của từ này là gì?</h2>
      <div className="text-center mb-8">
        <p className="font-bold text-4xl text-blue-600 mb-4">{currentWord?.term}</p>
        <button onClick={() => playAudio(currentWord?.term)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full inline-flex">
          <Volume2 className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {options.map((opt) => {
          let stateClass = "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300";
          if (isCorrect !== null) {
            if (opt.translation === currentWord.translation) {
              stateClass = "bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/30 transform scale-[1.02] animate-shake";
            } else if (opt.translation === selectedAnswer) {
              stateClass = "bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/30 transform scale-95 animate-shake";
            } else {
              stateClass = "bg-white border-gray-200 text-gray-300 opacity-50";
            }
          }
          
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.translation)}
              disabled={isCorrect !== null}
              className={cn(
                "p-4 rounded-2xl border-2 text-left font-bold text-lg transition-all duration-300 shadow-sm relative overflow-hidden",
                stateClass
              )}
            >
              {opt.translation}
              {isCorrect !== null && opt.translation === currentWord.translation && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-in fade-in zoom-in">
                  <CheckCircle className="w-6 h-6 opacity-80" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
