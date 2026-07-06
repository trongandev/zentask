import React from "react";
import { Layers, HelpCircle, FormInput, Headphones, Shuffle, Target, Lock, Keyboard } from "lucide-react";
import { cn } from "../../lib/utils";
import { PracticeMode } from "../../pages/FlashcardPractice";

interface PracticeSidebarProps {
  activeMode: PracticeMode;
  onChangeMode: (mode: PracticeMode) => void;
  cardCount: number;
}

export function PracticeSidebar({ activeMode, onChangeMode, cardCount }: PracticeSidebarProps) {
  const MODES = [
    { id: "flashcard", title: "Thẻ lật", icon: Layers, desc: "Ôn tập qua thẻ lật truyền thống", minCards: 1 },
    { id: "quiz", title: "Trắc nghiệm", icon: HelpCircle, desc: "Chọn 1 đáp án đúng trong 4", minCards: 4 },
    { id: "fill_blank", title: "Điền từ", icon: FormInput, desc: "Gõ lại từ vựng dựa vào ngữ cảnh", minCards: 1 },
    { id: "listening", title: "Luyện nghe", icon: Headphones, desc: "Nghe phát âm và gõ lại", minCards: 1 },
    { id: "match", title: "Nối từ", icon: Shuffle, desc: "Tìm các cặp từ vựng và nghĩa", minCards: 5 },
    { id: "bubble", title: "Bong bóng", icon: Target, desc: "Bắn bong bóng mang từ đúng", minCards: 5 },
    { id: "guess", title: "Đoán từ", icon: FormInput, desc: "Đoán các kí tự còn thiếu của từ", minCards: 1 },
    { id: "typing", title: "Gõ từ", icon: Keyboard, desc: "Bảo vệ căn cứ bằng cách gõ từ đúng", minCards: 1 },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 font-heading">Chế độ luyện tập</h2>
        <p className="text-sm text-gray-500 mt-1">Chọn một chế độ để bắt đầu học</p>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {MODES.map((mode) => {
          const isLocked = cardCount < mode.minCards;
          const isActive = activeMode === mode.id;
          const Icon = mode.icon;

          return (
            <div key={mode.id} title={isLocked ? `Cần ít nhất ${mode.minCards} từ để mở khóa` : undefined} className="w-full">
              <button
                disabled={isLocked}
                onClick={() => onChangeMode(mode.id as PracticeMode)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl transition-all border-2 relative overflow-hidden group",
                  isActive 
                    ? "bg-blue-50 border-blue-500 shadow-sm" 
                    : isLocked
                      ? "bg-gray-50 border-transparent opacity-60 cursor-not-allowed"
                      : "bg-white border-transparent hover:border-blue-200 hover:bg-gray-50 hover:shadow-sm"
                )}
              >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 transition-colors",
                  isActive ? "bg-blue-600 text-white" : isLocked ? "bg-gray-200 text-gray-400" : "bg-white text-gray-600 border border-gray-200 group-hover:border-blue-300 group-hover:text-blue-600"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn("font-bold text-sm", isActive ? "text-blue-900" : isLocked ? "text-gray-500" : "text-gray-900")}>
                    {mode.title}
                  </h3>
                  <p className={cn("text-xs mt-0.5 truncate", isActive ? "text-blue-600" : "text-gray-500")}>
                    {mode.desc}
                  </p>
                </div>
                
                {isLocked && (
                  <div className="shrink-0 text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
