import { useState, useEffect } from "react";
import { Swords, Trophy, User, Users, Clock } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useAuth } from "../../../contexts/AuthContext";
import { UserLevelBadge } from "../../../components/UserLevelBadge";
import { UserAvatar } from "@/src/components/UserAvatar";

const API = import.meta.env.VITE_API_BACKEND || "http://localhost:3001";

const RANK_NAMES: Record<number, string> = {
  1: "Bạc",
  2: "Lục bảo",
  3: "Tinh Anh",
  4: "Kim Cương",
  5: "Cao Thủ",
};
const TIER_NAMES: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };

const getRankBadge = (rank: number) => {
  if (rank === 1) return <img src="/top/top1.png" alt="Top 1" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />;
  if (rank === 2) return <img src="/top/top2.png" alt="Top 2" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(203,213,225,0.8)]" />;
  if (rank === 3) return <img src="/top/top3.png" alt="Top 3" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(217,119,6,0.8)]" />;

  return <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-white/50 border border-white/10">{rank}</div>;
};

interface ArenaModeCardProps {
  mode: "solo" | "team2v2" | "tournament";
  onSelect: () => void;
}

function ArenaModeCard({ mode, onSelect }: ArenaModeCardProps) {
  if (mode === "solo") {
    return (
      <div
        onClick={onSelect}
        className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-2 border-blue-500/50 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] rounded-3xl p-8 md:p-10 cursor-pointer transition-all duration-300 group relative overflow-hidden flex flex-col md:flex-row items-center gap-8 shadow-2xl scale-100 hover:scale-[1.02]"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all"></div>
        <div className="absolute top-6 right-6 text-sm font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white px-5 py-2 rounded-full shadow-lg z-20 animate-pulse border border-red-400/50">
          HOT
        </div>

        <div className="w-24 h-24 bg-blue-500/20 rounded-3xl flex items-center justify-center border border-blue-500/30 relative z-10 flex-shrink-0 shadow-inner">
          <User className="w-12 h-12 text-blue-400" />
        </div>

        <div className="flex-1 relative z-10 text-center md:text-left">
          <h3 className="text-3xl font-black text-white mb-3">Solo (1vs1)</h3>
          <div className="text-gray-300 text-base space-y-2 mb-6">
            <p>
              <strong>Cách vận hành:</strong> 2 người vào phòng, cùng trả lời 10 câu hỏi.
            </p>
            <p>
              <strong>Tính điểm:</strong> Trả lời đúng và nhanh hơn sẽ được nhiều điểm hơn.
            </p>
            <p className="text-blue-300 font-bold">
              <strong>Phần thưởng:</strong> Người nhiều điểm hơn Thắng (Nhận +1 Sao).
            </p>
          </div>
          <button className="w-full md:w-auto px-10 py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] text-lg">Chơi ngay</button>
        </div>
      </div>
    );
  }

  if (mode === "team2v2") {
    return (
      <div
        onClick={onSelect}
        className="bg-white/5 border border-purple-500/30 hover:border-purple-400 rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col h-full cursor-pointer hover:bg-purple-950/20 transition-all"
      >
        <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/30 relative z-10">
          <Users className="w-7 h-7 text-purple-400" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3 relative z-10">Đồng đội</h3>
        <div className="text-gray-300 text-sm space-y-3 relative z-10 flex-1">
          <p>
            <strong>Thể thức:</strong> 2vs2. Đội Xanh vs Đỏ, tổng điểm đội để phân thắng bại.
          </p>
          <p>
            <strong>Phối hợp:</strong> Cả hai thành viên phải hoàn thành câu hỏi và có thể gửi gợi ý cho nhau.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className="bg-white/5 border border-yellow-500/30 hover:border-yellow-400 rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col h-full cursor-pointer hover:bg-yellow-950/20 transition-all"
    >
      <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center mb-6 border border-yellow-500/30 relative z-10">
        <Trophy className="w-7 h-7 text-yellow-400" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-3 relative z-10">Giải đấu (16 người)</h3>
      <div className="text-gray-300 text-sm space-y-3 relative z-10 flex-1">
        <p>
          <strong>Thể thức:</strong> Chuỗi các trận 1vs1 loại trực tiếp (Knock-out).
        </p>
        <p>
          <strong>Thưởng:</strong> Giải đấu chỉ cộng 10XP một lần, không tính rank.
        </p>
      </div>
    </div>
  );
}

interface ArenaModeMatch {
  _id?: string;
  target?: string;
  action?: string;
  createdAt?: string;
  xpEarned?: number;
}

interface ArenaModeSeelectorProps {
  matchHistory: ArenaModeMatch[];
  onSelectMode: (mode: "solo" | "team2v2") => void;
  onOpenTournament: () => void;
}

export function ArenaModeSelector({ matchHistory, onSelectMode, onOpenTournament }: ArenaModeSeelectorProps) {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API}/api/leaderboard?type=rank`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setLeaderboard(Array.isArray(d) ? d : []));
  }, []);

  const isCurrentUserInTop = user && leaderboard.some((lbUser) => lbUser.id === user.uid);

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-[1400px] mx-auto px-4 py-8 md:py-12 animate-in fade-in zoom-in duration-500 overflow-y-auto">
      {/* Left Column: Modes and History */}
      <div className="flex-1 flex flex-col items-center lg:items-start min-w-0">
        <h2 className="text-4xl md:text-5xl py-5 font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-2 md:mb-4 text-center lg:text-left uppercase tracking-wider drop-shadow-sm w-full">
          Chọn Thể Thức Thi Đấu
        </h2>
        <p className="text-blue-200/80 mb-8 md:mb-12 text-center lg:text-left max-w-2xl text-base md:text-lg w-full">
          Khẳng định bản lĩnh và leo rank bằng cách đánh bại đối thủ trong các chế độ chơi đa dạng.
        </p>

        <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto lg:mx-0">
          <ArenaModeCard mode="solo" onSelect={() => onSelectMode("solo")} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <ArenaModeCard mode="team2v2" onSelect={() => onSelectMode("team2v2")} />
            <ArenaModeCard mode="tournament" onSelect={onOpenTournament} />
          </div>
        </div>

        {/* Match History */}
        <div className="w-full mt-10 max-w-4xl mx-auto lg:mx-0">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Lịch sử thi đấu gần đây
          </h3>

          {matchHistory.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-white/50 font-medium">Bạn chưa tham gia trận đấu nào gần đây.</div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-lg">
              {matchHistory.slice(0, 20).map((match, i) => (
                <div
                  key={match._id || i}
                  className={cn("p-4 md:p-5 flex items-center justify-between hover:bg-white/10 transition-colors", i !== Math.min(matchHistory.length, 20) - 1 && "border-b border-white/5")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                      <Swords className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm md:text-base line-clamp-1">{match.target || "Trận đấu ngẫu nhiên"}</div>
                      <div className="text-xs text-white/50 mt-1">{match.createdAt ? new Date(match.createdAt).toLocaleString("vi-VN") : ""}</div>
                    </div>
                  </div>
                  <div className="text-right pl-4">
                    <div className="text-blue-400 font-bold text-sm md:text-base">{match.action}</div>
                    {(match.xpEarned || 0) > 0 && <div className="text-xs font-black text-yellow-400 mt-1">+{match.xpEarned} XP</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Leaderboard */}
      <div className="w-full lg:w-[350px] shrink-0 flex flex-col gap-6 lg:mt-6">
        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-5 flex flex-col overflow-hidden h-[750px]">
          <div className="flex flex-col items-center gap-2 mb-6">
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Top 20 Rank Đỉnh
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
            {leaderboard.length === 0 ? (
              <div className="text-center text-white/40 py-10 text-sm">Đang tải dữ liệu...</div>
            ) : (
              leaderboard.map((lbUser, index) => (
                <div
                  key={lbUser.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl border transition-all hover:bg-white/10",
                    lbUser.id === user?.uid ? "bg-blue-900/40 border-blue-500/50" : "bg-white/5 border-white/5",
                  )}
                >
                  <div className="w-10 flex justify-center shrink-0">{getRankBadge(index + 1)}</div>
                  <div className="relative shrink-0">
                    <UserAvatar src={lbUser.avatar} level={lbUser.level} className="w-12 h-12" />
                  </div>
                  <div className="flex-1 min-w-0 pl-1">
                    <div className="font-bold text-white text-sm truncate flex items-center gap-2" title={lbUser.name}>
                      {lbUser.name}
                      <UserLevelBadge level={lbUser.level} size="sm" showText={false} />
                    </div>
                    <div className="text-[11px] text-yellow-400 font-bold mt-1 flex gap-1.5 items-center">
                      <span className="text-white/70">
                        {RANK_NAMES[lbUser.rankId || 1] || "Không xác định"} {TIER_NAMES[lbUser.tier || 3] || "III"}
                      </span>
                      <span className="text-white/30">•</span>
                      <span>{lbUser.stars || 0} ⭐</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Current User Rank Summary */}
          {!isCurrentUserInTop && user && (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between bg-blue-500/10 -mx-5 -mb-5 px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 flex justify-center shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-white/50 border border-white/10">-</div>
                </div>
                <div className="relative shrink-0">
                  <UserAvatar src={user.photoURL} level={user.level} className="w-12 h-12" />
                </div>
                <div className="flex-1 min-w-0 pl-1">
                  <div className="font-bold text-white text-sm truncate flex items-center gap-2" title={user.displayName || "Bạn"}>
                    {user.displayName || "Bạn"} (Bạn)
                    <UserLevelBadge level={user.level || 1} size="sm" showText={false} />
                  </div>
                  <div className="text-[11px] text-blue-300 font-bold mt-1 flex gap-1.5 items-center">
                    <span>
                      {RANK_NAMES[(user as any)?.rankId || 1] || "Không xác định"} {TIER_NAMES[(user as any)?.tier || 3] || "III"}
                    </span>
                    <span className="text-blue-500/50">•</span>
                    <span>{(user as any)?.stars || 0} ⭐</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
