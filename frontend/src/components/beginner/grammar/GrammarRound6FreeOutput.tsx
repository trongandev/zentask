import React, { useState } from "react";
import { PenTool, Loader2 } from "lucide-react";
import { cn } from "../../../lib/utils";

interface GrammarRound6FreeOutputProps {
  topicId: string;
  isCorrect: boolean | null;
  setIsCorrect: (val: boolean) => void;
  data: any;
}

export function GrammarRound6FreeOutput({ topicId, isCorrect, setIsCorrect, data }: GrammarRound6FreeOutputProps) {
  const [inputText, setInputText] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { prompt } = data.freeOutput;

  const handleCheck = () => {
    if (isCorrect !== null || !inputText.trim()) return;
    
    setIsChecking(true);
    // Mock API call to check grammar
    setTimeout(() => {
      setIsChecking(false);
      // Giả lập logic chấm: nếu câu dài hơn 5 ký tự và có chữ "am/is/are"
      const lower = inputText.toLowerCase();
      if (lower.length > 5 && (lower.includes("am") || lower.includes("is") || lower.includes("are"))) {
        setIsCorrect(true);
        setFeedback("Câu của bạn rất tự nhiên và chính xác! 👍");
      } else {
        setIsCorrect(false);
        setFeedback("Câu này có vẻ thiếu động từ to-be (am/is/are) hoặc chưa đúng nghĩa. Bạn thử viết lại nhé!");
      }
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right text-center flex flex-col items-center">
      <h2 className="text-2xl font-bold text-slate-800">Thực hành viết</h2>
      
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-3xl border-2 border-indigo-100 shadow-sm w-full max-w-lg mb-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <PenTool className="w-6 h-6 text-indigo-600" />
        </div>
        <p className="text-xl font-medium text-indigo-900 leading-relaxed">{prompt}</p>
      </div>

      <div className="w-full max-w-lg space-y-4">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isCorrect !== null || isChecking}
          className={cn(
            "w-full text-xl p-6 rounded-2xl border-2 focus:outline-none transition-colors min-h-[120px] resize-none",
            isCorrect === true ? "border-green-500 bg-green-50 text-green-900" : isCorrect === false ? "border-red-500 bg-red-50 text-red-900" : "border-slate-300 focus:border-indigo-500 text-slate-800",
          )}
          placeholder="Ví dụ: I am very happy today..."
          autoFocus
        />
        
        {feedback && (
          <div className={cn("p-4 rounded-xl text-left font-medium", isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
            {feedback}
          </div>
        )}

        {isCorrect === null && (
          <button 
            onClick={handleCheck} 
            disabled={isChecking || !inputText.trim()}
            className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
          >
            {isChecking ? <Loader2 className="w-6 h-6 animate-spin" /> : "Nhờ AI chấm điểm"}
          </button>
        )}
      </div>
    </div>
  );
}
