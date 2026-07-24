import React, { useState } from "react";
import { cn } from "../../../lib/utils";
import { Button } from "@/src/components/ui/Button";

interface GrammarRound2GuidedQuestionProps {
  topicId: string;
  isCorrect: boolean | null;
  setIsCorrect: (val: boolean) => void;
  data: any;
}

export function GrammarRound2GuidedQuestion({ topicId, isCorrect, setIsCorrect, data }: GrammarRound2GuidedQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const { question, options, correctId } = data.guidedQuestion;

  const handleSelect = (id: number) => {
    setSelectedAnswer(id);
    setIsCorrect(id === correctId);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right text-center">
      <h2 className="text-2xl font-bold text-slate-800">Cùng suy ngẫm nhé!</h2>
      <div className="bg-blue-50 p-6 rounded-3xl text-blue-900 font-medium text-xl shadow-sm border border-blue-100 mb-8">
        {question}
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {options.map((opt) => (
          <Button
            key={opt.id}
            onClick={() => handleSelect(opt.id)}
            disabled={isCorrect !== null}
            className={cn(
              "p-6 rounded-2xl border-2 text-left font-bold text-lg transition-all",
              selectedAnswer === opt.id
                ? isCorrect
                  ? "bg-green-100 border-green-500 text-green-700"
                  : "bg-red-100 border-red-500 text-red-700"
                : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300",
            )}
          >
            {opt.text}
          </Button>
        ))}
      </div>
    </div>
  );
}
