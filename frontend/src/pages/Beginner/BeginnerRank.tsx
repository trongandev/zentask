import React, { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { UserLevelBadge } from "@/src/components/ui/UserLevelBadge";
import { UserAvatar } from "../../components/ui/UserAvatar";
import axiosInstance from "../../services/axiosConfig";

const RANK_NAMES: Record<number, string> = {
  1: "Bạc",
  2: "Lục bảo",
  3: "Tinh Anh",
  4: "Kim Cương",
  5: "Cao Thủ",
};
const TIER_NAMES: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };

export function BeginnerRank() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axiosInstance.get("/api/leaderboard?type=rank");
        setLeaderboard(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Failed to fetch leaderboard", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-24 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
      {/* Header */}
      <div className="text-center space-y-2 mb-12">
        <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center justify-center gap-3">
          <Trophy className="w-10 h-10 text-yellow-500 hidden md:block" />
          Bảng Vàng Thành Tích
        </h1>
        <p className="text-slate-500 text-sm md:text-lg">Top những học viên chăm chỉ và xuất sắc nhất</p>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-10">Đang tải dữ liệu...</div>
      ) : (
        <div className="space-y-8">
          {/* Top 3 Podium Without Pillars */}
          {top3.length > 0 && (
            <div className="flex justify-center items-end gap-4 md:gap-12 pt-10 mb-8">
              {podiumOrder.map((lbUser, idx) => {
                const isRank1 = podiumOrder.length === 3 ? idx === 1 : top3.indexOf(lbUser) === 0;
                const isRank2 = podiumOrder.length === 3 ? idx === 0 : top3.indexOf(lbUser) === 1;
                const isRank3 = podiumOrder.length === 3 ? idx === 2 : top3.indexOf(lbUser) === 2;

                const rank = top3.indexOf(lbUser) + 1;

                const imgRank = rank === 1 ? "/top/top1.png" : rank === 2 ? "/top/top2.png" : "/top/top3.png";

                return (
                  <div key={lbUser.id} className={cn("flex flex-col items-center relative w-[100px] md:w-[140px]", isRank1 ? "mb-8 md:mb-12" : "mb-0")}>
                    <div className="relative flex flex-col items-center group">
                      <img
                        src={imgRank}
                        alt={`Top ${rank}`}
                        className="w-12 h-12 md:w-16 md:h-16 object-contain absolute -top-10 md:-top-14 drop-shadow-xl z-20 group-hover:scale-110 transition-transform"
                      />
                      <div
                        className={cn(
                          "relative z-10 rounded-full p-1.5 shadow-xl bg-gradient-to-br",
                          isRank1 ? "from-yellow-300 to-yellow-500" : isRank2 ? "from-slate-200 to-slate-400" : "from-amber-400 to-amber-600",
                        )}
                      >
                        <UserAvatar src={lbUser.avatar} level={lbUser.level} className={cn(isRank1 ? "w-20 h-20 md:w-28 md:h-28" : "w-16 h-16 md:w-20 md:h-20")} />
                      </div>

                      <div className="mt-4 text-center w-full px-1 bg-white/50 backdrop-blur-sm rounded-2xl py-2 shadow-sm border border-slate-100 flex flex-col items-center">
                        <p className="font-black text-slate-800 truncate text-sm md:text-base w-full" title={lbUser.name}>
                          {lbUser.name}
                        </p>
                        <div className="flex items-center justify-center gap-1 mt-1 text-[10px] md:text-xs text-slate-600 font-medium whitespace-nowrap">
                          <UserLevelBadge level={lbUser.level} size="sm" showText={false} />
                          <img src={`/rank/${lbUser.rankId || 1}.png`} alt="Rank" className="w-4 h-4 object-contain ml-0.5" />
                          <span>
                            {RANK_NAMES[lbUser.rankId || 1] || "Bạc"} {TIER_NAMES[lbUser.tier || 3] || "III"}
                          </span>
                        </div>
                        <p className="text-yellow-600 font-black text-xs md:text-sm flex items-center justify-center gap-1 mt-0.5">{lbUser.stars || 0} ⭐</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List for Rank 4+ */}
          {rest.length > 0 && (
            <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm p-4 md:p-6 flex flex-col gap-3">
              {rest.map((lbUser, index) => {
                const rank = index + 4;
                const isMe = lbUser.id === user?.uid;
                return (
                  <div
                    key={lbUser.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:-translate-y-0.5",
                      isMe ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-transparent hover:border-slate-200 hover:bg-white hover:shadow-md",
                    )}
                  >
                    <div className="w-10 text-center font-black text-slate-400 text-xl">{rank}</div>
                    <div className="relative shrink-0">
                      <UserAvatar src={lbUser.avatar} level={lbUser.level} className="w-12 h-12 md:w-14 md:h-14" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-base md:text-lg truncate flex items-center gap-2">
                        {lbUser.name}
                        {isMe && <span className="bg-blue-100 text-blue-600 text-[10px] uppercase font-black px-2 py-0.5 rounded-full">Bạn</span>}
                      </div>
                      <div className="text-xs md:text-sm text-slate-500 mt-1 flex gap-2 items-center">
                        <UserLevelBadge level={lbUser.level} size="sm" showText={true} />
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center gap-1 text-slate-600 font-medium truncate">
                          <img src={`/rank/${lbUser.rankId || 1}.png`} alt="Rank" className="w-5 h-5 md:w-6 md:h-6 object-contain" />
                          <span>
                            {RANK_NAMES[lbUser.rankId || 1] || "Không xác định"} {TIER_NAMES[lbUser.tier || 3] || "III"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="font-black text-yellow-500 text-base md:text-xl flex items-center gap-1 shrink-0">{lbUser.stars || 0} ⭐</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
