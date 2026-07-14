import React from "react";
import { Medal, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { RANK_TOPIC_CONFIG } from "../../config/rankTopicConfig";
import { cn } from "../../lib/utils";

interface RankCardProps {
  showButton?: boolean;
  buttonText?: string;
  className?: string;
  user?: any;
}

export function RankCard({ showButton = false, buttonText = "Bắt đầu đấu hạng", className, user: propUser }: RankCardProps) {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const rankUser = propUser || authUser;

  const rankId = rankUser?.rankId || 1;
  const tier = rankUser?.tier || 3;
  const stars = rankUser?.stars || 0;

  const rankConfig = RANK_TOPIC_CONFIG[rankId as keyof typeof RANK_TOPIC_CONFIG];

  // Fake config to match existing code logic for maxStars.
  // In reality, it should be fetched from the backend or shared config.
  // We'll use 3 for Bac, 4 for Luc Bao, 5 for Tinh Anh, 5 for Kim Cuong, 99 for Cao Thu
  const maxStars = rankId === 1 ? 3 : rankId === 2 ? 4 : rankId === 3 || rankId === 4 ? 5 : 99;

  const rankName = rankConfig?.name || "Bạc";
  const tierText = rankId === 5 ? "" : ` ${["I", "II", "III", "IV", "V"][tier - 1] || tier}`;

  if (!authUser && !propUser) {
    return (
      <div
        className={cn("bg-gradient-to-b from-blue-900 to-indigo-950 rounded-3xl p-6 text-white shadow-sm relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]", className)}
      >
        <div className="relative z-10 flex flex-col items-center text-center">
          <Medal className="w-12 h-12 text-blue-300 mb-4 opacity-80" />
          <h2 className="text-xl font-bold text-white mb-2">Đấu Hạng Zentask</h2>
          <p className="text-blue-200 text-sm mb-6 max-w-[200px]">Hãy đăng nhập để tham gia đấu hạng, so tài và leo lên đỉnh vinh quang!</p>
          <button
            onClick={() => (window.location.href = "/auth")}
            className="w-full max-w-[200px] bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-bold py-3 px-4 rounded-xl transition-colors shadow-lg"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-gradient-to-b from-blue-900 to-indigo-950 rounded-3xl p-6 text-white shadow-sm relative overflow-hidden transition-all hover:shadow-md h-full", className)}>
      <div className="absolute top-1/2 -translate-y-1/2 right-0 opacity-20 pointer-events-none scale-150">
        <img src={`/rank/${rankId}.png`} alt="Rank Background" className="w-48 h-48 object-contain drop-shadow-2xl" />
      </div>

      <div className="relative z-10">
        <h2 className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Medal className="w-4 h-4" />
          Rank Hiện Tại
        </h2>

        <div className="flex items-center gap-4 mb-5">
          <img src={`/rank/${rankId}.png`} alt="Rank Icon" className="w-16 h-16 object-contain drop-shadow-md" />
          <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-white">
            {rankName}
            {tierText}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-blue-200">
            <span>Số sao</span>
            <span>
              {stars} / {maxStars === 99 ? "∞" : maxStars}
            </span>
          </div>
          <div className="flex gap-1">
            {maxStars === 99 ? (
              <div className="flex-1 h-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
            ) : (
              Array.from({ length: maxStars }).map((_, i) => (
                <div key={i} className={cn("flex-1 h-3 rounded-full transition-all", i < stars ? "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" : "bg-slate-700")} />
              ))
            )}
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-blue-800/50">
          <div className="flex justify-between items-center text-xs font-medium mb-5">
            <span className="text-blue-300">Thứ hạng hiện tại</span>
            <span className="text-white font-bold bg-white/10 px-3 py-1.5 rounded-lg">#???</span>
          </div>

          {showButton && (
            <button
              onClick={() => navigate("/arena")}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <Target className="w-5 h-5" />
              {buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
