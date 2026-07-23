import { useNavigate } from "react-router-dom";
import { cn } from "../../../lib/utils";
import { RankCard } from "../../../components/shared/RankCard";
import { UserAvatar } from "../../../components/UserAvatar";

interface ArenaResultProps {
  user: any;
  opponent: any;
  userScore: number;
  opponentScore: number;
  rankUpdateStatus: string | null;
  onReset: () => void;
}

export function ArenaResult({ user, opponent, userScore, opponentScore, rankUpdateStatus, onReset }: ArenaResultProps) {
  const navigate = useNavigate();
  const isWin = userScore > opponentScore;
  const isLose = userScore < opponentScore;

  return (
    <div className="flex flex-col items-center z-10 w-full max-w-4xl px-4 animate-in fade-in zoom-in duration-500">
      <div className="w-32 h-32 md:w-40 md:h-40 mb-2">
        {isWin ? (
          <img src="/mascot/Lopy (1).png" className="w-full h-full object-contain animate-bounce drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
        ) : isLose ? (
          <img src="/mascot/Lopy (15).png" className="w-full h-full object-contain opacity-80" />
        ) : (
          <img src="/mascot/Lopy (14).png" className="w-full h-full object-contain" />
        )}
      </div>

      <h2 className={cn("text-4xl md:text-5xl font-black mb-2 text-center", isWin ? "text-yellow-400" : isLose ? "text-gray-400" : "text-blue-400")}>
        {isWin ? "CHIẾN THẮNG!" : isLose ? "THẤT BẠI" : "HÒA NHAU"}
      </h2>

      {rankUpdateStatus === "win" && <p className="text-yellow-200 font-bold text-lg md:text-xl mb-6 md:mb-8">+1 Sao Hạng</p>}
      {rankUpdateStatus === "lose" && <p className="text-red-400 font-bold text-lg md:text-xl mb-6 md:mb-8">-1 Sao Hạng</p>}
      {rankUpdateStatus === "protected" && <p className="text-blue-300 font-bold text-lg md:text-xl mb-6 md:mb-8">Bảo hiểm: Không trừ sao</p>}
      {rankUpdateStatus === "tournament" && <p className="text-yellow-200 font-bold text-lg md:text-xl mb-6 md:mb-8">Giải đấu: +10XP, không tính rank</p>}
      {!rankUpdateStatus && <div className="h-8 md:h-14"></div>}

      <RankCard className="max-w-md w-full mb-6 md:mb-8 shadow-[0_0_40px_rgba(59,130,246,0.3)] border border-blue-500/30" />

      <div className="flex flex-row items-center gap-6 md:gap-12 bg-white/5 p-4 md:p-6 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
        <div className="flex flex-col items-center">
          <UserAvatar
            src={user?.photoURL || "/mascot/Lopy (1).png"}
            level={user?.level || 1}
            disableLink
            className="w-20 h-20 md:w-24 md:h-24 mb-2 shrink-0"
            avatarClassName="border-4 border-blue-500"
          />
          <div className="text-3xl md:text-5xl font-black text-white/80">{userScore}</div>
          <div className="text-xs md:text-sm text-blue-300 mt-1">Điểm của bạn</div>
        </div>
        <div className="text-xl md:text-3xl font-black text-white/30 italic">VS</div>
        <div className="flex flex-col items-center">
          <UserAvatar
            src={opponent?.avatar || "/mascot/Lopy (3).png"}
            level={opponent?.level || 1}
            disableLink
            className="w-20 h-20 md:w-24 md:h-24 mb-2 shrink-0"
            avatarClassName="border-4 border-red-500"
          />
          <div className="text-3xl md:text-5xl font-black text-white/80">{opponentScore}</div>
          <div className="text-xs md:text-sm text-red-300 mt-1">Điểm đối thủ</div>
        </div>
      </div>

      <div className="mt-8 md:mt-12 flex flex-col md:flex-row gap-4 w-full md:w-auto">
        <button onClick={() => navigate("/beginner")} className="w-full md:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all text-center">
          Về trang chủ
        </button>
        <button
          onClick={onReset}
          className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] text-center"
        >
          Chơi trận khác
        </button>
      </div>
    </div>
  );
}
