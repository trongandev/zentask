import React, { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useTTSAudio } from "../../../hooks/useTTSAudio";
import { getBeginnerSetById } from "../../../config/rankTopicConfig";

interface Round2ChooseMeaningProps {
  topicId: string | undefined;
  currentWord: any;
  isCorrect: boolean | null;
  onCheckAnswer: (selectedText: string, isCorrect: boolean) => void;
}

export function Round2ChooseMeaning({ topicId, currentWord, isCorrect, onCheckAnswer }: Round2ChooseMeaningProps) {
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
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt.translation)}
            disabled={isCorrect !== null}
            className={cn(
              "p-4 rounded-2xl border-2 text-left font-bold text-lg transition-all",
              selectedAnswer === opt.translation
                ? isCorrect
                  ? "bg-green-100 border-green-500 text-green-700"
                  : "bg-red-100 border-red-500 text-red-700"
                : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300",
            )}
          >
            {opt.translation}
          </button>
        ))}
      </div>
    </div>
  );
}
