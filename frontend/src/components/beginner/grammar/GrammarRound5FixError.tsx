import React, { useState } from "react";
import { cn } from "../../../lib/utils";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

interface GrammarRound5FixErrorProps {
  topicId: string;
  isCorrect: boolean | null;
  setIsCorrect: (val: boolean) => void;
  data: any;
}

export function GrammarRound5FixError({ topicId, isCorrect, setIsCorrect, data }: GrammarRound5FixErrorProps) {
  const [inputText, setInputText] = useState("");

  const { incorrect: incorrectSentence, correct: correctSentence, translation } = data.fixError;

  const handleCheck = () => {
    if (isCorrect !== null) return;
    setIsCorrect(inputText.toLowerCase().trim() === correctSentence.toLowerCase());
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right text-center flex flex-col items-center">
      <h2 className="text-2xl font-bold text-slate-800">Sửa lỗi sai</h2>
      <p className="text-slate-500 text-lg">Câu dưới đây bị dịch nguyên xi từ tiếng Việt sang nên bị sai ngữ pháp. Bạn hãy sửa lại cho đúng nhé.</p>
      
      <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-200 shadow-sm w-full max-w-lg mt-4 mb-4">
        <p className="text-2xl font-bold text-red-600 line-through decoration-red-400 decoration-4 mb-2">{incorrectSentence}</p>
        <p className="text-lg text-red-800 italic">"{translation}"</p>
      </div>

      <div className="w-full max-w-lg space-y-4 mt-8">
        <Input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isCorrect !== null}
          className={cn(
            "w-full text-center text-3xl font-bold p-6 rounded-2xl border-2 focus:outline-none transition-colors",
            isCorrect === true ? "border-green-500 text-green-600 bg-green-50" : isCorrect === false ? "border-red-500 text-red-600 bg-red-50" : "border-slate-300 focus:border-blue-500 text-slate-800",
          )}
          placeholder="Nhập câu đúng vào đây..."
          autoFocus
        />
        {isCorrect === null && (
          <Button onClick={handleCheck} className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-lg">
            Kiểm tra
          </Button>
        )}
      </div>
    </div>
  );
}
