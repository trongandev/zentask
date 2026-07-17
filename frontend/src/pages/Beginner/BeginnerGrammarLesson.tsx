import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { cn } from "../../lib/utils";
import toastService from "@/src/services/toastService";
import axiosInstance from "../../services/axiosConfig";
import { BEGINNER_GRAMMAR_DATA } from "../../data/beginner/grammarData";

import { GrammarRound1Discovery } from "../../components/beginner/grammar/GrammarRound1Discovery";
import { GrammarRound2GuidedQuestion } from "../../components/beginner/grammar/GrammarRound2GuidedQuestion";
import { GrammarRound3RuleSummary } from "../../components/beginner/grammar/GrammarRound3RuleSummary";
import { GrammarRound4TrueFalse } from "../../components/beginner/grammar/GrammarRound4TrueFalse";
import { GrammarRound5FixError } from "../../components/beginner/grammar/GrammarRound5FixError";
import { GrammarRound6FreeOutput } from "../../components/beginner/grammar/GrammarRound6FreeOutput";

type GrammarRoundType = 1 | 2 | 3 | 4 | 5 | 6;

export function BeginnerGrammarLesson() {
  const { topicId } = useParams();
  const navigate = useNavigate();

  // Load progress from localStorage
  const storageKey = `grammar_lesson_${topicId}`;
  const initialRound = parseInt(localStorage.getItem(storageKey) || "1") as GrammarRoundType;

  const [currentRound, setCurrentRound] = useState<GrammarRoundType>(initialRound);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const data = topicId ? BEGINNER_GRAMMAR_DATA[topicId] : null;

  if (!data) {
    return <div className="p-8 text-center">Không tìm thấy dữ liệu bài học này.</div>;
  }

  // Helper to move to next round
  const nextStep = () => {
    if (currentRound === 1 || currentRound === 3) {
      // Nhận diện và Tóm tắt không có chấm điểm, chuyển thẳng
      setCurrentRound((prev) => (prev + 1) as GrammarRoundType);
      return;
    }

    if (isCorrect === false) {
      // Nếu làm sai (trong demo này) bắt làm lại đến khi đúng thì thôi,
      // hoặc trong hệ thống thực tế sẽ lưu vào mistakes array.
      toastService.error("Vui lòng thử lại!");
      setIsCorrect(null);
      return;
    }

    setIsCorrect(null);

    if (currentRound < 6) {
      const nextR = (currentRound + 1) as GrammarRoundType;
      setCurrentRound(nextR);
      localStorage.setItem(storageKey, nextR.toString());
    } else {
      finishLesson();
    }
  };

  const finishLesson = async () => {
    try {
      await axiosInstance.post("/beginner/grammar/complete", { topicId });
      toastService.success("Chúc mừng bạn đã nắm vững điểm ngữ pháp này!");
      localStorage.removeItem(storageKey);
      navigate("/beginner/grammar");
    } catch (error) {
      console.error(error);
      toastService.error("Có lỗi xảy ra khi lưu tiến độ");
    }
  };

  // For informational rounds (no input needed)
  const isInformationalRound = currentRound === 1 || currentRound === 3;

  return (
    <div className="max-w-xl mx-auto w-full pt-8 px-4 flex flex-col min-h-[80vh]">
      {/* Progress Bar */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate("/beginner/grammar")} className="text-slate-400 hover:text-slate-700">
          <X className="w-6 h-6" />
        </button>
        <div className="flex-1 bg-slate-200 h-4 rounded-full overflow-hidden">
          <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${(currentRound / 6) * 100}%` }} />
        </div>
        <div className="text-sm font-bold text-slate-500">Bước {currentRound}/6</div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center pb-24">
        {currentRound === 1 && <GrammarRound1Discovery topicId={topicId || ""} data={data} />}
        {currentRound === 2 && <GrammarRound2GuidedQuestion topicId={topicId || ""} isCorrect={isCorrect} setIsCorrect={setIsCorrect} data={data} />}
        {currentRound === 3 && <GrammarRound3RuleSummary topicId={topicId || ""} data={data} />}
        {currentRound === 4 && <GrammarRound4TrueFalse topicId={topicId || ""} isCorrect={isCorrect} setIsCorrect={setIsCorrect} data={data} />}
        {currentRound === 5 && <GrammarRound5FixError topicId={topicId || ""} isCorrect={isCorrect} setIsCorrect={setIsCorrect} data={data} />}
        {currentRound === 6 && <GrammarRound6FreeOutput topicId={topicId || ""} isCorrect={isCorrect} setIsCorrect={setIsCorrect} data={data} />}
      </div>

      {/* Footer Controls */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-xl mx-auto flex items-center justify-end">
          {isInformationalRound ? (
            <button onClick={nextStep} className="font-bold text-white bg-blue-500 hover:bg-blue-600 px-8 py-3 rounded-2xl flex items-center gap-2 w-full justify-center">
              Đã hiểu, Tiếp tục <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all",
                isCorrect === true ? "bg-green-100 text-green-800" : isCorrect === false ? "bg-red-100 text-red-800" : "bg-transparent",
              )}
            >
              <div className="flex flex-col">
                {isCorrect === true && (
                  <span className="font-bold flex items-center gap-2">
                    <Check className="w-6 h-6" /> Xuất sắc!
                  </span>
                )}
                {isCorrect === false && (
                  <span className="font-bold flex items-center gap-2">
                    <X className="w-6 h-6" /> Chưa đúng rồi
                  </span>
                )}
              </div>

              {isCorrect !== null && (
                <button
                  onClick={nextStep}
                  className={cn("font-bold px-8 py-3 rounded-2xl flex items-center gap-2 text-white", isCorrect === true ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600")}
                >
                  Tiếp tục
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
