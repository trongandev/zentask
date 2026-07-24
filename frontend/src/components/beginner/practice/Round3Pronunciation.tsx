import React, { useEffect } from "react";
import { Volume2, Mic, Loader2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useTTSAudio } from "../../../hooks/useTTSAudio";
import { usePronunciationAssessment, pickWords } from "../../../hooks/usePronunciationAssessment";
import { Button } from "@/src/components/ui/Button";

interface Round3PronunciationProps {
  currentWord: any;
  isCorrect: boolean | null;
  setIsCorrect: (val: boolean | null) => void;
}

export function Round3Pronunciation({ currentWord, isCorrect, setIsCorrect }: Round3PronunciationProps) {
  const { playAudio } = useTTSAudio();

  const { status, result, mainScore, startRecording, stopRecording, resetState } = usePronunciationAssessment({
    targetText: currentWord?.term || "",
    onSuccess: (score) => {
      setIsCorrect(true); // Always let them pass
    },
    onError: () => {
      setIsCorrect(false);
    },
  });

  // Reset state when word changes
  useEffect(() => {
    resetState();
  }, [currentWord?.id, resetState]);

  return (
    <div className="space-y-6 animate-in slide-in-from-right">
      <h2 className="text-2xl font-bold text-slate-800 text-center">Nghe và phát âm lại</h2>
      <div className="flex flex-col items-center gap-8 mt-12">
        <Button
          onClick={() => playAudio(currentWord.term, currentWord.langCode)}
          className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:scale-105 transition-all"
        >
          <Volume2 className="w-12 h-12" />
        </Button>
        <p className="font-bold text-3xl">{currentWord.term}</p>

        <Button
          onClick={status === "recording" ? stopRecording : startRecording}
          disabled={status === "checking" || isCorrect === true}
          className={cn(
            "w-20 h-20 mt-8 rounded-full flex items-center justify-center transition-all border-4 shadow-xl text-white",
            status === "recording" ? "bg-red-500 animate-pulse border-red-200" : "bg-blue-500 hover:bg-blue-600 border-blue-200",
            (status === "checking" || isCorrect === true) && "opacity-50 cursor-not-allowed",
          )}
        >
          {status === "checking" ? <Loader2 className="w-8 h-8 animate-spin" /> : <Mic className="w-8 h-8" />}
        </Button>
        <p className="text-sm text-slate-400">{status === "recording" ? "Đang ghi âm... Bấm lần nữa để dừng" : status === "checking" ? "Đang chấm điểm..." : "Bấm vào micro để đọc từ"}</p>

        {mainScore !== null && (
          <div className="text-center mt-2">
            <p className={cn("text-2xl font-black", mainScore >= 50 ? "text-green-500" : "text-yellow-500")}>{mainScore}/100</p>
            {mainScore < 50 && <p className="text-yellow-500 font-medium mt-1">Cần cố gắng thêm nhé!</p>}

            <div className="flex gap-2 justify-center mt-4 text-xl font-bold">
              {pickWords(result).map((wResult: any, i: number) => {
                if (wResult.chars) {
                  return (
                    <span key={i} className="inline-flex flex-col items-center gap-0.5 mx-1">
                      <span className="text-2xl font-black tracking-wide">
                        {wResult.chars.map((c: any, j: number) => (
                          <span key={j} className={c.correct === true ? "text-green-500" : c.correct === false ? "text-red-500" : "text-gray-700"}>
                            {c.char}
                          </span>
                        ))}
                      </span>
                      <span className={cn("h-0.5 w-full rounded-full", wResult.correct !== false ? "bg-green-400" : "bg-red-400")} />
                    </span>
                  );
                }
                const correct = (wResult?.PronunciationAssessment?.AccuracyScore || 0) >= 70;
                return (
                  <span key={i} className={correct ? "text-green-500" : "text-red-500"}>
                    {wResult?.Word || ""}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
