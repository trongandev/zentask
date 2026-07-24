import React, { useState } from "react";
import { Swords, Trophy, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "@/src/components/ui/Button";

export function InteractiveArena() {
  const [step, setStep] = useState<"intro" | "quiz" | "win">("intro");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const handleStart = () => {
    setStep("quiz");
  };

  const handleAnswer = (idx: number) => {
    setSelectedAnswer(idx);
    if (idx === 1) { // 1 is Hardworking (correct)
      setTimeout(() => {
        setStep("win");
        setSelectedAnswer(null);
      }, 1000);
    } else {
      setTimeout(() => {
        setSelectedAnswer(null);
      }, 800);
    }
  };

  const handleReset = () => {
    setStep("intro");
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col md:flex-row-reverse mt-12">
      {/* Lời giới thiệu */}
      <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-center bg-orange-50/50">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-orange-100 text-orange-600">
          <Swords className="w-7 h-7" />
        </div>
        <h3 className="text-3xl font-black text-slate-900 mb-4">Đấu Trường Xếp Hạng</h3>
        <p className="text-slate-600 font-medium text-lg mb-6 leading-relaxed">
          Thách đấu với những người chơi khác trong các trận chiến trắc nghiệm nảy lửa. Mỗi câu trả lời đúng sẽ giúp bạn tích lũy điểm số, thăng hạng từ <strong>Đồng</strong> lên <strong>Thách Đấu</strong>. Rank càng cao, thử thách càng khó!
        </p>
      </div>

      {/* Interactive UI */}
      <div className="p-8 md:p-12 md:w-1/2 flex flex-col items-center justify-center bg-slate-900 text-white relative min-h-[450px]">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.15),transparent_60%)] pointer-events-none" />

        {step === "intro" && (
          <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500 z-10 w-full max-w-sm">
            <div className="mb-6 relative inline-block">
              <img src="/rank/1.png" alt="Rank Bạc" className="w-28 h-28 object-contain drop-shadow-xl" />
              <div className="absolute -bottom-2 -right-2 bg-slate-800 text-xs font-bold px-2 py-1 rounded border border-slate-700 shadow">Rank Hiện Tại</div>
            </div>
            <h4 className="text-2xl font-black mb-2">Sẵn sàng thi đấu?</h4>
            <p className="text-slate-400 mb-8 text-sm">Cố gắng trả lời thật nhanh và chính xác để nhận thêm điểm XP và thăng hạng nhé!</p>
            <Button 
              onClick={handleStart}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold text-lg py-3.5 rounded-xl shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <Swords className="w-5 h-5" /> Bắt Đầu Ngay
            </Button>
          </div>
        )}

        {step === "quiz" && (
          <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-300 z-10">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-bold text-slate-400">Câu 1/1</span>
              <span className="text-orange-400 font-mono font-bold">00:15</span>
            </div>
            
            <h4 className="text-xl font-bold mb-8 leading-relaxed">What is the synonym of <span className="text-orange-400">"diligent"</span>?</h4>
            
            <div className="space-y-3">
              {["Lazy", "Hardworking", "Careless", "Slow"].map((ans, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = idx === 1;
                
                let stateClass = "bg-slate-800 border-slate-700 hover:border-slate-500";
                if (isSelected) {
                  stateClass = isCorrect 
                    ? "bg-green-500/20 border-green-500 text-green-400" 
                    : "bg-red-500/20 border-red-500 text-red-400 animate-shake";
                }

                return (
                  <Button 
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    disabled={selectedAnswer !== null}
                    className={cn(
                      "w-full text-left px-5 py-4 rounded-xl border transition-all font-semibold flex justify-between items-center",
                      stateClass
                    )}
                  >
                    {ans}
                    {isSelected && isCorrect && <CheckCircle2 className="w-5 h-5" />}
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {step === "win" && (
          <div className="text-center animate-in fade-in slide-in-from-bottom-8 duration-700 z-10 w-full max-w-sm relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-500/20 rounded-full blur-[50px] -z-10 animate-pulse" />
            
            <h4 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 mb-2">Chiến Thắng!</h4>
            <p className="text-slate-400 font-medium mb-8">+25 XP</p>
            
            <div className="flex items-center justify-center gap-4 mb-8">
              <img src="/rank/1.png" alt="Rank Bạc" className="w-20 h-20 object-contain opacity-50 grayscale scale-90" />
              <ArrowRight className="w-6 h-6 text-slate-500" />
              <img src="/rank/3.png" alt="Rank Lục Bảo" className="w-32 h-32 object-contain drop-shadow-[0_0_20px_rgba(52,211,153,0.5)] animate-in zoom-in spin-in-12 duration-700" />
            </div>

            <p className="text-emerald-400 font-bold mb-8">Bạn đã thăng hạng lên Lục Bảo!</p>

            <Button onClick={handleReset} className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 mx-auto">
              Chơi lại <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
