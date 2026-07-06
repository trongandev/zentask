import { Trophy, Flame, ChevronUp, ChevronDown, Minus, Medal } from "lucide-react";
import { Link } from "react-router-dom";
import { UserAvatar } from "../components/UserAvatar";
import { UserLevelBadge } from "../components/UserLevelBadge";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";

export function Leaderboard() {
  const { user } = useAuth();
  const RANK_NAMES: Record<number, string> = {
    1: "Bạc",
    2: "Lục bảo",
    3: "Tinh Anh",
    4: "Kim Cương",
    5: "Cao Thủ"
  };

  const SYSTEM_RANKS = [
    { id: 1, name: "Bạc" },
    { id: 2, name: "Lục bảo" },
    { id: 3, name: "Tinh Anh" },
    { id: 4, name: "Kim Cương" },
    { id: 5, name: "Cao Thủ" }
  ];

  const leaderboard = [
    { rank: 1, name: "Minh Anh", username: "@minhanh_study", level: 15, xp: "12.540", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop", trend: "up", rankId: 5 },
    { rank: 2, name: "Quang Huy", username: "@huyquang", level: 14, xp: "11.230", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop", trend: "same", rankId: 5 },
    { rank: 3, name: "Bảo Trâm", username: "@trambao", level: 13, xp: "9.870", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop", trend: "down", rankId: 4 },
    { rank: 4, name: "Nguyễn Văn A", username: "@nva123", level: 10, xp: "8.500", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop", trend: "up", rankId: 3 },
    { rank: 5, name: "Trần Thị B", username: "@ttb456", level: 9, xp: "7.200", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop", trend: "same", rankId: 2 },
    { rank: 6, name: "Lê Văn C", username: "@levanc", level: 8, xp: "6.100", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop", trend: "up", rankId: 2 },
    { rank: 12, name: user?.displayName || "Bạn", username: "@" + (user?.email?.split('@')[0] || "user"), level: user?.level || 1, xp: user?.xp?.toLocaleString() || "0", avatar: user?.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop", trend: "up", isUser: true, rankId: user?.rankId || 1 },
  ];

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <img src="/top/top1.png" alt="Top 1" className="w-10 h-10 object-contain drop-shadow-md" />;
    if (rank === 2) return <img src="/top/top2.png" alt="Top 2" className="w-10 h-10 object-contain drop-shadow-md" />;
    if (rank === 3) return <img src="/top/top3.png" alt="Top 3" className="w-10 h-10 object-contain drop-shadow-md" />;
    
    return (
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-600 border border-gray-200">
        {rank}
      </div>
    );
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <ChevronUp className="w-4 h-4 text-green-500" />;
    if (trend === "down") return <ChevronDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl p-8 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 text-center md:text-left">
          <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
            <Trophy className="w-8 h-8 text-yellow-100" />
            <h1 className="text-3xl font-extrabold font-heading">Bảng Xếp Hạng</h1>
          </div>
          <p className="text-yellow-100 font-medium text-sm md:text-base max-w-md">
            Cạnh tranh với bạn bè và cộng đồng. Học tập chăm chỉ để lọt vào top 3 và nhận những phần quà hấp dẫn!
          </p>
        </div>
        
        {/* Current user mini stats */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center gap-4 relative z-10 min-w-[200px]">
          <div className="flex-1">
            <p className="text-xs text-yellow-100 font-medium mb-1">Hạng hiện tại</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">12</span>
              <span className="text-sm font-medium text-yellow-100">/ 10.5K</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/10">
            <Flame className="w-6 h-6 text-yellow-100 fill-current" />
          </div>
        </div>
      </div>

      {/* System Ranks Preview */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        <h2 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
          <Medal className="w-5 h-5 text-blue-600" />
          Hệ thống Rank
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {SYSTEM_RANKS.map((rank) => {
            const isCurrentRank = user?.rankId === rank.id || (!user?.rankId && rank.id === 1);
            return (
              <div 
                key={rank.id} 
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all",
                  isCurrentRank 
                    ? "bg-blue-50 border-blue-200 shadow-sm" 
                    : "bg-gray-50/50 border-dashed border-gray-200 opacity-60 grayscale hover:grayscale-0"
                )}
              >
                <img src={`/rank/${rank.id}.png`} alt={rank.name} className="w-16 h-16 object-contain mb-3 drop-shadow-sm" />
                <span className={cn("font-bold text-sm", isCurrentRank ? "text-blue-700" : "text-gray-600")}>{rank.name}</span>
                {isCurrentRank && (
                  <span className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">Hiện tại</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <h2 className="font-bold text-lg text-gray-900">Xếp hạng tuần này</h2>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button className="px-4 py-1.5 bg-white rounded-md shadow-sm text-sm font-bold text-blue-600">Tuần</button>
            <button className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900">Tháng</button>
            <button className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900">Tất cả</button>
          </div>
        </div>

        <div className="space-y-3">
          {leaderboard.map((user, idx) => (
            <Link 
              to={user.isUser ? "/profile" : `/profile/${user.rank}`} 
              key={idx} 
              className={cn(
                "flex items-center gap-3 md:gap-6 p-3 md:p-4 rounded-2xl transition-all border group",
                user.isUser 
                  ? "bg-blue-50/50 border-blue-200 shadow-sm" 
                  : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
              )}
            >
              {/* Rank */}
              <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                <div className="w-10 flex justify-center">{getRankBadge(user.rank)}</div>
              </div>

              {/* Avatar & Info */}
              <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                <UserAvatar 
                  src={user.avatar} 
                  level={user.level} 
                  className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0" 
                />
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <h3 className={cn(
                    "font-bold text-sm md:text-base truncate group-hover:text-blue-600 transition-colors mb-0.5",
                    user.isUser ? "text-blue-700" : "text-gray-900"
                  )}>
                    {user.name} {user.isUser && "(Bạn)"}
                  </h3>
                  <div className="flex items-center">
                    <UserLevelBadge level={user.level} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        "font-extrabold text-sm md:text-base",
                        user.isUser ? "text-blue-700" : "text-gray-900"
                      )}>{user.xp}</span>
                      <span className="text-[10px] md:text-xs font-bold text-yellow-500">XP</span>
                    </div>
                    <span className="text-gray-300">|</span>
                    <span className="text-[10px] uppercase font-bold text-gray-500">{RANK_NAMES[user.rankId]}</span>
                  </div>
                </div>
                <img src={`/rank/${user.rankId}.png`} alt="Rank" className="w-10 object-contain drop-shadow-sm" />
              </div>
            </Link>
          ))}
          
          {/* Separator for skipped ranks */}
          <div className="flex items-center justify-center py-4">
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
            </div>
          </div>

          {/* Current User at bottom if not in top list */}
          <Link 
            to="/profile" 
            className="flex items-center gap-3 md:gap-6 p-3 md:p-4 rounded-2xl transition-all border bg-blue-50/50 border-blue-200 shadow-sm"
          >
            {/* Rank */}
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              <div className="w-10 flex justify-center">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-blue-700 border border-blue-200">
                  12
                </div>
              </div>
            </div>

            {/* Avatar & Info */}
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              <UserAvatar 
                src={user?.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop"} 
                level={user?.level || 1} 
                className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0" 
              />
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <h3 className="font-bold text-sm md:text-base truncate text-blue-700 mb-0.5">
                  {user?.displayName || "Bạn"} (Bạn)
                </h3>
                <div className="flex items-center">
                  <UserLevelBadge level={user?.level || 1} size="sm" />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-sm md:text-base text-blue-700">{user?.xp?.toLocaleString() || "0"}</span>
                    <span className="text-[10px] md:text-xs font-bold text-yellow-500">XP</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <span className="text-[10px] uppercase font-bold text-gray-500">{RANK_NAMES[user?.rankId || 1]}</span>
                </div>
              </div>
              <img src={`/rank/${user?.rankId || 1}.png`} alt="Rank" className="w-10 object-contain drop-shadow-sm" />
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}
