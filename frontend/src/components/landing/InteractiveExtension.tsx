import React, { useState } from "react";
import { Puzzle, Volume2, Plus, Check, Youtube } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { cn } from "../../lib/utils";

export function InteractiveExtension() {
  const [showPopover, setShowPopover] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { playAudio, isPlaying } = useTTSAudio();

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(true);
    setTimeout(() => {
      setShowPopover(false);
      setTimeout(() => setIsSaved(false), 300);
    }, 1500);
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col md:flex-row-reverse mt-12 mb-24">
      {/* Lời giới thiệu */}
      <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-center bg-purple-50/50">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-purple-100 text-purple-600">
          <Puzzle className="w-7 h-7" />
        </div>
        <h3 className="text-3xl font-black text-slate-900 mb-4">Extension Dịch Thuật Đa Năng</h3>
        <p className="text-slate-600 font-medium text-lg mb-6 leading-relaxed">
          Đọc báo, xem tài liệu tiếng Anh giờ đây dễ dàng hơn bao giờ hết. Bôi đen hoặc click đúp vào từ vựng bất kỳ trên trình duyệt để tra cứu và lưu ngay vào Flashcard.
        </p>
        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm flex items-start gap-4">
          <div className="bg-red-100 p-2 rounded-lg text-red-600 mt-1">
            <Youtube className="w-6 h-6" />
          </div>
          <div>
            <h5 className="font-bold text-slate-900">Tính năng Phụ đề kép YouTube</h5>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">Hiển thị song song 2 ngôn ngữ và hỗ trợ click vào từng từ ngay trên video YouTube để học từ vựng trực quan.</p>
          </div>
        </div>
      </div>

      {/* Interactive UI */}
      <div className="p-8 md:p-12 md:w-1/2 flex flex-col items-center justify-center bg-slate-50 relative min-h-[400px]" onClick={() => setShowPopover(false)}>
        <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative">
          <h4 className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-4">Bài báo mẫu</h4>
          <p className="text-xl md:text-2xl text-slate-800 font-serif leading-relaxed">
            "Success is not final, failure is not fatal: it is the{" "}
            <span
              onClick={(e) => {
                e.stopPropagation();
                setShowPopover(!showPopover);
              }}
              className="relative inline-block text-blue-600 font-bold border-b-2 border-dashed border-blue-400 cursor-pointer hover:bg-blue-50 transition-colors"
            >
              courage
              {/* Popover */}
              {showPopover && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[260px] bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-slate-100 p-4 font-sans text-left z-50 cursor-default animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-slate-100 rotate-45"></div>

                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="text-lg font-black text-slate-900">courage</h5>
                      <p className="text-blue-600 font-mono text-sm">/ˈkɜːrɪdʒ/</p>
                    </div>
                    <button
                      onClick={() => playAudio("courage", "en")}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isPlaying ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-slate-700 font-medium mb-4 pb-4 border-b border-slate-100">sự can đảm, dũng khí</p>

                  <button
                    onClick={handleSave}
                    disabled={isSaved}
                    className={cn(
                      "w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all",
                      isSaved ? "bg-green-100 text-green-700" : "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg",
                    )}
                  >
                    {isSaved ? (
                      <>
                        <Check className="w-4 h-4" /> Đã lưu thành công
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Thêm vào Flashcard
                      </>
                    )}
                  </button>
                </div>
              )}
            </span>{" "}
            to continue that counts."
          </p>

          <div className="mt-8 flex gap-2">
            <span className="animate-pulse w-2 h-2 rounded-full bg-slate-300"></span>
            <span className="animate-pulse w-2 h-2 rounded-full bg-slate-300 delay-75"></span>
            <span className="animate-pulse w-2 h-2 rounded-full bg-slate-300 delay-150"></span>
          </div>
        </div>
        <a
          href="https://chromewebstore.google.com/detail/lkhjgkjabnfbfblflgkcapamidmfkjnc?utm_source=item-share-cb"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
        >
          <Puzzle className="w-5 h-5" /> Tìm hiểu thêm
        </a>
      </div>
    </div>
  );
}
