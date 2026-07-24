import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "@/src/components/ui/Button";

interface GrammarRound4TrueFalseProps {
  topicId: string;
  isCorrect: boolean | null;
  setIsCorrect: (val: boolean) => void;
  data: any;
}

export function GrammarRound4TrueFalse({ topicId, isCorrect, setIsCorrect, data }: GrammarRound4TrueFalseProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);

  const { sentence, translation, isActuallyCorrect } = data.trueFalse;

  const handleSelect = (answer: boolean) => {
    setSelectedAnswer(answer);
    setIsCorrect(answer === isActuallyCorrect);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right text-center flex flex-col items-center">
      <h2 className="text-2xl font-bold text-slate-800">Câu này đúng hay sai?</h2>
      
      <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm w-full max-w-lg mb-8 mt-8">
        <p className="text-3xl font-bold text-slate-800 mb-4">{sentence}</p>
        <p className="text-lg text-slate-500 italic">"{translation}"</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        <Button
          onClick={() => handleSelect(true)}
          disabled={isCorrect !== null}
          className={cn(
            "p-6 rounded-2xl border-2 font-bold text-2xl transition-all shadow-sm flex flex-col items-center gap-3",
            selectedAnswer === true
              ? isCorrect
                ? "bg-green-100 border-green-500 text-green-700"
                : "bg-red-100 border-red-500 text-red-700"
              : "bg-white border-slate-200 hover:bg-green-50 hover:border-green-300 text-green-600",
          )}
        >
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-6 h-6" />
          </div>
          Đúng
        </Button>
        <Button
          onClick={() => handleSelect(false)}
          disabled={isCorrect !== null}
          className={cn(
            "p-6 rounded-2xl border-2 font-bold text-2xl transition-all shadow-sm flex flex-col items-center gap-3",
            selectedAnswer === false
              ? isCorrect
                ? "bg-green-100 border-green-500 text-green-700"
                : "bg-red-100 border-red-500 text-red-700"
              : "bg-white border-slate-200 hover:bg-red-50 hover:border-red-300 text-red-600",
          )}
        >
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <X className="w-6 h-6" />
          </div>
          Sai
        </Button>
      </div>
    </div>
  );
}
