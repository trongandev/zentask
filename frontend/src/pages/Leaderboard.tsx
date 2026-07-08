import { Trophy, Flame, ChevronUp, ChevronDown, Minus, Medal, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import { UserAvatar } from "../components/UserAvatar";
import { UserLevelBadge } from "../components/UserLevelBadge";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";
import { useEtcStore } from "../services/etcService";

export function Leaderboard() {
  const { user } = useAuth();
  const { getLeaderboard, checkLeaderboardRewards, claimLeaderboardReward } = useEtcStore();
  const RANK_NAMES: Record<number, string> = {
    1: "Bạc",
    2: "Lục bảo",
    3: "Tinh Anh",
    4: "Kim Cương",
    5: "Cao Thủ",
  };
  const TIER_NAMES: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };

  const SYSTEM_RANKS = [
    { id: 1, name: "Bạc" },
    { id: 2, name: "Lục bảo" },
    { id: 3, name: "Tinh Anh" },
    { id: 4, name: "Kim Cương" },
    { id: 5, name: "Cao Thủ" },
  ];

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "all">("week");
  const [countdown, setCountdown] = useState("");
  const [rewards, setRewards] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      checkLeaderboardRewards().then(setRewards);
    }
  }, [user]);

  const handleClaimReward = async (reward: any) => {
    try {
      await claimLeaderboardReward(reward.type, reward.period);
      setRewards((prev) => prev.filter((r) => r.period !== reward.period));
      window.location.reload();
    } catch (e) {
      // toast error is already handled by store
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      let targetDate = new Date();

      if (timeframe === "week") {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 8 - dayNum);
        targetDate = d;
      } else if (timeframe === "month") {
        targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      } else {
        setCountdown("");
        return;
      }

      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown("Đã kết thúc");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(`${days} ngày ${hours}h ${mins}m ${secs}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeframe]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const data = await getLeaderboard(timeframe);
      const enrichedData = data.map((item: any) => ({
        ...item,
        isUser: user ? item.id === user.uid : false,
        xp: item.xp.toLocaleString(),
      }));
      setLeaderboard(enrichedData);
      setLoading(false);
    };
    fetchLeaderboard();
  }, [user, timeframe, getLeaderboard]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <img src="/top/top1.png" alt="Top 1" className="w-10 h-10 object-contain drop-shadow-md" />;
    if (rank === 2) return <img src="/top/top2.png" alt="Top 2" className="w-10 h-10 object-contain drop-shadow-md" />;
    if (rank === 3) return <img src="/top/top3.png" alt="Top 3" className="w-10 h-10 object-contain drop-shadow-md" />;

    return <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-600 border border-gray-200">{rank}</div>;
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
          <p className="text-yellow-100 font-medium text-sm md:text-base max-w-md">Cạnh tranh với bạn bè và cộng đồng. Học tập chăm chỉ để lọt vào top 3 và nhận những phần quà hấp dẫn!</p>
        </div>

        {/* Current user mini stats */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center gap-4 relative z-10 min-w-[200px]">
          <div className="flex-1">
            <p className="text-xs text-yellow-100 font-medium mb-1">Hạng hiện tại</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{loading ? "-" : leaderboard.find((u) => u.isUser)?.rank || "-"}</span>
              <span className="text-sm font-medium text-yellow-100">/ {loading ? "-" : leaderboard.length}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/10">
            <Flame className="w-6 h-6 text-yellow-100 fill-current" />
          </div>
        </div>
      </div>

      {/* Rewards Banner */}
      {rewards.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Bạn có phần thưởng chưa nhận!</h2>
              <p className="text-emerald-100 text-sm">Tổng kết bảng xếp hạng {rewards[0].type === "week" ? "tuần" : "tháng"} trước</p>
            </div>
          </div>
          <button onClick={() => handleClaimReward(rewards[0])} className="px-6 py-2 bg-white text-emerald-600 rounded-xl font-bold shadow-sm hover:bg-emerald-50 transition-colors flex-shrink-0">
            Nhận {rewards[0].xp} XP
          </button>
        </div>
      )}

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
                  isCurrentRank ? "bg-blue-50 border-blue-200 shadow-sm" : "bg-gray-50/50 border-dashed border-gray-200 opacity-60 grayscale hover:grayscale-0",
                )}
              >
                <img src={`/rank/${rank.id}.png`} alt={rank.name} className="w-16 h-16 object-contain mb-3 drop-shadow-sm" />
                <span className={cn("font-bold text-sm", isCurrentRank ? "text-blue-700" : "text-gray-600")}>{rank.name}</span>
                {isCurrentRank && <span className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">Hiện tại</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-gray-100 gap-4">
          <div>
            <h2 className="font-bold text-lg text-gray-900">{timeframe === "week" ? "Xếp hạng tuần này" : timeframe === "month" ? "Xếp hạng tháng này" : "Bảng xếp hạng tổng"}</h2>
            {countdown && (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                Kết thúc sau: <span className="font-semibold text-orange-500">{countdown}</span>
              </p>
            )}
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto">
            <button
              onClick={() => setTimeframe("week")}
              className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", timeframe === "week" ? "bg-white shadow-sm font-bold text-blue-600" : "text-gray-600 hover:text-gray-900")}
            >
              Tuần
            </button>
            <button
              onClick={() => setTimeframe("month")}
              className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", timeframe === "month" ? "bg-white shadow-sm font-bold text-blue-600" : "text-gray-600 hover:text-gray-900")}
            >
              Tháng
            </button>
            <button
              onClick={() => setTimeframe("all")}
              className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", timeframe === "all" ? "bg-white shadow-sm font-bold text-blue-600" : "text-gray-600 hover:text-gray-900")}
            >
              Tất cả
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Đang tải bảng xếp hạng...</div>
          ) : (
            leaderboard.map((userItem, idx) => (
              <Link
                to={userItem.isUser ? "/profile" : `/profile/${userItem.id}`}
                key={idx}
                className={cn(
                  "flex items-center gap-3 md:gap-6 p-3 md:p-4 rounded-2xl transition-all border group",
                  userItem.isUser ? "bg-blue-50/50 border-blue-200 shadow-sm" : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm",
                )}
              >
                {/* Rank */}
                <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                  <div className="w-10 flex justify-center">{getRankBadge(userItem.rank)}</div>
                </div>

                {/* Avatar & Info */}
                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                  <UserAvatar src={userItem.avatar} level={userItem.level} className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0" />
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <h3 className={cn("font-bold text-sm md:text-base truncate group-hover:text-blue-600 transition-colors mb-0.5", userItem.isUser ? "text-blue-700" : "text-gray-900")}>
                      {userItem.name} {userItem.isUser && "(Bạn)"}
                    </h3>
                    <div className="flex items-center">
                      <UserLevelBadge level={userItem.level} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1">
                        <span className={cn("font-extrabold text-sm md:text-base", userItem.isUser ? "text-blue-700" : "text-gray-900")}>{userItem.xp}</span>
                        <span className="text-[10px] md:text-xs font-bold text-yellow-500">XP</span>
                      </div>
                      <span className="text-gray-300">|</span>
                      <span className="text-[10px] uppercase font-bold text-gray-500">
                        {RANK_NAMES[userItem.rankId]} {TIER_NAMES[userItem.tier || 3]}
                      </span>
                    </div>
                  </div>
                  <img src={`/rank/${userItem.rankId}.png`} alt="Rank" className="w-10 object-contain drop-shadow-sm" />
                </div>
              </Link>
            ))
          )}

          {/* Separator for skipped ranks */}
          <div className="flex items-center justify-center py-4">
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
            </div>
          </div>

          {/* Current User at bottom if not in top list */}
          {!loading && user && !leaderboard.find((u) => u.isUser) && (
            <Link to="/profile" className="flex items-center gap-3 md:gap-6 p-3 md:p-4 rounded-2xl transition-all border bg-blue-50/50 border-blue-200 shadow-sm mt-4">
              {/* Rank */}
              <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                <div className="w-10 flex justify-center">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-blue-700 border border-blue-200">-</div>
                </div>
              </div>

              {/* Avatar & Info */}
              <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                <UserAvatar
                  src={user?.photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg"}
                  level={user?.level || 1}
                  className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0"
                />
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <h3 className="font-bold text-sm md:text-base truncate text-blue-700 mb-0.5">{user?.displayName || "Bạn"} (Bạn)</h3>
                  <div className="flex items-center">
                    <UserLevelBadge level={user?.level || 1} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-sm md:text-base text-blue-700">{user?.xp?.toLocaleString() || "0"}</span>
                      <span className="text-[10px] md:text-xs font-bold text-yellow-500">XP</span>
                    </div>
                    <span className="text-gray-300">|</span>
                    <span className="text-[10px] uppercase font-bold text-gray-500">
                      {RANK_NAMES[user?.rankId || 1]} {TIER_NAMES[user?.tier || 3]}
                    </span>
                  </div>
                </div>
                <img src={`/rank/${user?.rankId || 1}.png`} alt="Rank" className="w-10 object-contain drop-shadow-sm" />
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
