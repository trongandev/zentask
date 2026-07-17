import React, { useState } from "react";
import { Brain, Sparkles, Volume2, ArrowRight } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";

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
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col md:flex-row">
      {/* Lời giới thiệu */}
      <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-center bg-blue-50/50">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-blue-100 text-blue-600">
          <Brain className="w-7 h-7" />
        </div>
        <h3 className="text-3xl font-black text-slate-900 mb-4">Tạo Flashcard siêu tốc bằng AI</h3>
        <p className="text-slate-600 font-medium text-lg mb-6 leading-relaxed">
          Không cần tốn hàng giờ tra từ điển. Chỉ cần gõ từ hoặc cụm từ bạn muốn học, ZenBot AI sẽ tự động phân tích ngữ cảnh, lấy phiên âm, ví dụ và tạo flashcard cho bạn chỉ trong{" "}
          <strong>2~5 giây</strong>!
        </p>
      </div>

      {/* Interactive UI */}
      <div className="p-8 md:p-12 md:w-1/2 flex items-center justify-center bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 relative min-h-[400px]">
        {step === "initial" && (
          <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <label className="block text-sm font-bold text-slate-700 mb-2">Nhập từ vựng tiếng Anh hoặc tiếng Việt:</label>
            <div className="relative group mb-4">
              <input type="text" value="siêng học" readOnly className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold text-slate-900 shadow-sm outline-none" />
            </div>
            <button
              onClick={handleGenerate}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-bold text-lg py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" /> Tạo bằng AI
            </button>
          </div>
        )}

        {step === "generating" && (
          <div className="text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <p className="font-bold text-slate-900 text-lg mb-2">Hệ thống đang phân tích...</p>
            <p className="text-slate-500 text-sm font-medium">Tốc độ siêu tốc, chỉ từ 2~5 giây!</p>
          </div>
        )}

        {step === "done" && (
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-lg p-6 animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-3xl font-black text-slate-900">diligent</h4>
                <p className="text-blue-600 font-medium font-mono text-lg mt-1">/ˈdɪlɪdʒənt/</p>
              </div>
              <button
                onClick={() => playAudio("diligent", "en-US-RogerNeural")}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isPlaying ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
              >
                <Volume2 className="w-5 h-5" />
              </button>
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

            <button onClick={handleReset} className="mt-8 text-sm font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto transition-colors">
              Thử lại <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
