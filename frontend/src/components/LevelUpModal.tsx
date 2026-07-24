import React from "react";
import { X, Star } from "lucide-react";
import { useConfigStore } from "../services/configService";
import { UserLevelBadge } from "@/src/components/ui/UserLevelBadge";
import { Button } from "@/src/components/ui/Button";

interface LevelUpModalProps {
  newLevel: number;
  onClose: () => void;
}

export function LevelUpModal({ newLevel, onClose }: LevelUpModalProps) {
  const { levels } = useConfigStore();
  const levelData = levels.find((l) => l.level === newLevel) || { title: `Level ${newLevel}` };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-500 spring-bounce">
        <Button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors">
          <X className="w-5 h-5" />
        </Button>

        <div className="w-24 h-24 rounded-full flex items-center justify-center  mb-6 relative">
          <UserLevelBadge level={newLevel} size="2xl" showText={false} className="z-10 relative drop-shadow-md" />
          <div className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>
          <div className="absolute -bottom-1 -left-2 text-xl animate-bounce" style={{ animationDelay: "100ms" }}>
            🌟
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-gray-900 mb-2 font-heading">Lên Cấp!</h2>
        <p className="text-gray-500 mb-6">Tuyệt vời! Bạn vừa đạt được cấp độ mới.</p>

        <div className="bg-orange-50 border border-orange-100 rounded-2xl w-full p-4 mb-8 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-orange-200 opacity-50">
            <Star className="w-24 h-24" fill="currentColor" />
          </div>
          <p className="text-orange-800 font-bold text-sm mb-1 uppercase tracking-wider relative z-10">Cấp {newLevel}</p>
          <p className="text-2xl font-extrabold text-orange-600 font-heading relative z-10">{levelData.title}</p>
        </div>

        <Button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/25 transition-all active:scale-95"
        >
          Tiếp tục học tập
        </Button>
      </div>
    </div>
  );
}
