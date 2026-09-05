import React from "react";
import { Layers, HelpCircle, FormInput, Headphones, Shuffle, Target, Lock, Keyboard, Mic, LayoutGrid } from "lucide-react";
import { cn } from "../../lib/utils";
import { PracticeMode } from "../../pages/Flashcard/FlashcardPractice";
import { Button } from "@/src/components/ui/Button";

interface PracticeSidebarProps {
  activeMode: PracticeMode;
  onChangeMode: (mode: PracticeMode) => void;
  cardCount: number;
  language?: string;
}

export function PracticeSidebar({ activeMode, onChangeMode, cardCount, language = "en" }: PracticeSidebarProps) {
  const MODES = [
    { id: "flashcard", title: "Thẻ lật", icon: Layers, desc: "Ôn tập qua thẻ lật truyền thống", minCards: 1 },
    { id: "quiz", title: "Trắc nghiệm", icon: HelpCircle, desc: "Chọn 1 đáp án đúng trong 4", minCards: 4 },
    { id: "fill_blank", title: "Điền từ", icon: FormInput, desc: "Gõ lại từ vựng dựa vào ngữ cảnh", minCards: 1 },
    { id: "listening", title: "Luyện nghe", icon: Headphones, desc: "Nghe phát âm và gõ lại", minCards: 1 },
    { id: "pronunciation", title: "Phát âm", icon: Mic, desc: "Ghi âm và chấm độ chính xác", minCards: 1 },
    { id: "match", title: "Nối từ", icon: Shuffle, desc: "Tìm các cặp từ vựng và nghĩa", minCards: 5 },
    { id: "bubble", title: "Bong bóng", icon: Target, desc: "Bắn bong bóng mang từ đúng", minCards: 5 },
    { id: "guess", title: "Đoán từ", icon: FormInput, desc: "Đoán các kí tự còn thiếu của từ", minCards: 1 },
    { id: "typing", title: "Gõ từ", icon: Keyboard, desc: "Bảo vệ căn cứ bằng cách gõ từ đúng", minCards: 1 },
    { id: "arrange", title: "Sắp xếp", icon: LayoutGrid, desc: "Sắp xếp các chữ cái để tạo thành từ đúng", minCards: 1 },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b-2 border-slate-200/60 bg-slate-50/50">
        <h2 className="text-lg font-black text-slate-800 tracking-tight">Chế độ luyện tập</h2>
        <p className="text-sm font-bold text-slate-400 mt-1">Chọn một chế độ để bắt đầu học</p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {MODES.map((mode) => {
          let isLocked = cardCount < mode.minCards;
          let lockReason = `Cần ít nhất ${mode.minCards} từ để mở khóa`;

          if (mode.id === "pronunciation" && language !== "en") {
            isLocked = true;
            lockReason = "Tính năng Phát âm hiện tại chỉ hỗ trợ bộ thẻ Tiếng Anh";
          }

          const isActive = activeMode === mode.id;
          const Icon = mode.icon;

          return (
            <div key={mode.id} title={isLocked ? lockReason : undefined} className="w-full">
              <Button
                disabled={isLocked}
                onClick={() => onChangeMode(mode.id as PracticeMode)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl transition-all border-2 border-b-4 relative overflow-hidden group",
                  !isLocked && "active:border-b-2 active:translate-y-[2px]",
                  isActive
                    ? "bg-blue-50 border-blue-500"
                    : isLocked
                      ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                      : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50",
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border-2 shrink-0 transition-colors",
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : isLocked
                          ? "bg-slate-200 text-slate-400 border-slate-200"
                          : "bg-white text-slate-500 border-slate-200 group-hover:border-blue-300 group-hover:text-blue-600",
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn("font-black text-sm tracking-tight", isActive ? "text-blue-900" : isLocked ? "text-slate-500" : "text-slate-800")}>{mode.title}</h3>
                    <p className={cn("text-xs mt-0.5 truncate font-medium", isActive ? "text-blue-600" : "text-slate-400")}>{mode.desc}</p>
                  </div>

                  {isLocked && (
                    <div className="shrink-0 text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
