import React, { useEffect, useState } from "react";
import { Swords, Trophy, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import axiosInstance from "@/src/services/axiosConfig";
import { UserLevelBadge } from "@/src/components/UserLevelBadge";
import { UserAvatar } from "@/src/components/UserAvatar";
import { RANK_NAMES } from "@/src/config/rankTopicConfig";

const TIER_NAMES: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };

interface BeginnerArenaLobbyProps {
  user: any;
  startMatch: () => void;
}

interface MatchHistoryItem {
  _id: string;
  action: string;
  target: string;
  xpEarned: number;
  createdAt: string;
}

export function BeginnerArenaLobby({ user, startMatch }: BeginnerArenaLobbyProps) {
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axiosInstance.get("/api/arena/history");
        setHistory(res.data);
      } catch (error) {
        console.error("Failed to fetch arena history", error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-24 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8 flex flex-col md:flex-row items-start justify-center gap-12">
      {/* Left Column: Player Info & Play Button */}
      <div className="w-full md:w-[400px] flex flex-col items-center gap-8 shrink-0">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center justify-center gap-3">
            <Swords className="w-10 h-10 text-indigo-500" />
            Đấu Hạng
          </h1>
          <p className="text-slate-500 text-sm md:text-base">Tham gia trận chiến từ vựng 1 vs 1 để leo hạng.</p>
        </div>

        <div className="flex flex-col items-center gap-6 w-full relative">
          <div className="relative mt-4 flex flex-col items-center justify-center">
            <UserAvatar src={user?.photoURL || ""} level={user?.level || 1} className="w-32 h-32 md:w-40 md:h-40 drop-shadow-2xl" />
            <div className="absolute -bottom-4 z-10 drop-shadow-lg">
              <UserLevelBadge level={user?.level || 1} size="lg" showText={false} />
            </div>
          </div>

          <div className="text-center mt-3 z-10 w-full flex flex-col items-center">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{user?.displayName}</h2>

            <div className="flex items-center justify-center gap-4 mt-6">
              <img src={`/rank/${user?.rankId || 1}.png`} alt="Rank" className="w-20 h-20 object-contain drop-shadow-xl" />
              <div className="text-left">
                <div className="text-slate-400 text-xs font-black uppercase tracking-widest mb-0.5">Hạng Hiện Tại</div>
                <div className="text-slate-800 font-black text-2xl">
                  {RANK_NAMES[(user?.rankId as keyof typeof RANK_NAMES) || 1]} {TIER_NAMES[user?.tier || 3] || "III"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-6">
              <div className="bg-yellow-100 text-yellow-700 px-6 py-2 rounded-2xl flex items-center justify-center gap-2 shadow-sm font-black text-xl">
                <span>{user?.stars || 0}</span>
                <span className="text-sm font-black uppercase tracking-wider text-yellow-600">Sao ⭐</span>
              </div>
            </div>
          </div>

          <button
            onClick={startMatch}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black py-4 px-8 rounded-2xl shadow-[0_8px_25px_-6px_rgba(99,102,241,0.5)] transition-all active:scale-95 hover:scale-[1.02] text-xl flex items-center justify-center gap-3 mt-4 group"
          >
            <Swords className="w-7 h-7 group-hover:rotate-12 transition-transform" />
            TÌM TRẬN NGAY
          </button>
        </div>
      </div>

      {/* Right Column: Match History */}
      <div className="w-full md:flex-1 max-w-lg mt-8 md:mt-0">
        <div className="flex items-center gap-3 mb-6 px-2">
          <History className="w-6 h-6 text-slate-400" />
          <h3 className="text-xl font-bold text-slate-700">Lịch Sử Đấu Hạng</h3>
        </div>

        <div className="space-y-3">
          {loadingHistory ? (
            <div className="text-center text-slate-400 py-8 animate-pulse">Đang tải lịch sử...</div>
          ) : history.length === 0 ? (
            <div className="text-center text-slate-400 py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">Chưa có trận đấu nào. Hãy bắt đầu chiến đấu!</div>
          ) : (
            history.map((item) => {
              const isWin = item.action.toLowerCase().includes("thắng");
              const isDraw = item.action.toLowerCase().includes("hòa");
              return (
                <div key={item._id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${isWin ? "bg-emerald-100 text-emerald-600" : isDraw ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"}`}
                    >
                      <Swords className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-base">{item.action}</div>
                      <div className="text-xs text-slate-400 font-medium">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {item.xpEarned > 0 ? <span className="font-black text-emerald-500">+{item.xpEarned} XP</span> : <span className="font-bold text-slate-400">+0 XP</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
