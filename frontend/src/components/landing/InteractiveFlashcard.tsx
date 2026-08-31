import React, { useState } from "react";
import { Brain, Sparkles, Volume2, ArrowRight } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

export function InteractiveFlashcard() {
  const [step, setStep] = useState<"initial" | "generating" | "done">("initial");
  const { playAudio, isPlaying } = useTTSAudio();

  const handleGenerate = () => {
    setStep("generating");
    setTimeout(() => {
      setStep("done");
    }, 2500); // simulate 2.5s generation
  };

  const handleReset = () => {
    setStep("initial");
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col md:flex-row group transition-all hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
      {/* Lời giới thiệu */}
      <div className="p-10 md:p-16 md:w-1/2 flex flex-col justify-center relative overflow-hidden bg-[#fafcff]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/50 rounded-full blur-[80px] pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm transition-transform group-hover:scale-110 duration-500">
          <Brain className="w-7 h-7" />
        </div>
        <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-5 tracking-tight">Tạo Flashcard siêu tốc bằng AI</h3>
        <p className="text-slate-600 font-medium text-lg leading-relaxed">
          Không cần tốn hàng giờ tra từ điển. Chỉ cần gõ từ hoặc cụm từ bạn muốn học, ZenBot AI sẽ tự động phân tích ngữ cảnh, lấy phiên âm, ví dụ và tạo flashcard cho bạn chỉ trong{" "}
          <strong className="text-blue-600">2~5 giây</strong>!
        </p>
      </div>

      {/* Interactive UI */}
      <div className="p-10 md:p-16 md:w-1/2 flex items-center justify-center bg-slate-50/50 border-t md:border-t-0 md:border-l border-slate-100 relative min-h-[450px]">
        {step === "initial" && (
          <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <label className="block text-sm font-bold text-slate-700 mb-3">Nhập từ vựng tiếng Anh hoặc tiếng Việt:</label>
            <div className="relative group mb-5">
              <Input type="text" value="siêng học" readOnly className="w-full bg-white border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 rounded-xl px-5 py-4 text-lg font-semibold text-slate-900 shadow-sm outline-none transition-all cursor-default" />
            </div>
            <Button
              onClick={handleGenerate}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" /> Tạo bằng AI
            </Button>
          </div>
        )}

        {step === "generating" && (
          <div className="text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-6 shadow-sm"></div>
            <p className="font-bold text-slate-900 text-lg mb-2">Hệ thống đang phân tích...</p>
            <p className="text-slate-500 text-sm font-medium">Tốc độ siêu tốc, chỉ từ 2~5 giây!</p>
          </div>
        )}

        {step === "done" && (
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-8 animate-in zoom-in-95 duration-500 relative">
            <div className="absolute -top-3 -right-3 bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex justify-between items-start mb-8">
              <div>
                <h4 className="text-3xl font-black text-slate-900">diligent</h4>
                <p className="text-blue-600 font-medium font-mono text-lg mt-1">/ˈdɪlɪdʒənt/</p>
              </div>
              <Button
                onClick={() => playAudio("diligent", "en")}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isPlaying ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
              >
                <Volume2 className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Định nghĩa</span>
                <p className="text-lg font-bold text-slate-800 mt-1">siêng năng, cần cù</p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ví dụ</span>
                <p className="text-slate-600 italic mt-1 leading-relaxed">"He is a very diligent student who always does his homework."</p>
              </div>
            </div>

            <Button onClick={handleReset} className="mt-8 text-sm font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto transition-colors">
              Thử lại <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
