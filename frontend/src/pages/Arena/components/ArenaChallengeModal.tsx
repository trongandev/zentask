import { useEffect, useState } from "react";
import { X, Swords } from "lucide-react";
import { UserAvatar } from "../../../components/UserAvatar";

interface ArenaChallengeModalProps {
  challenger: {
    uid: string;
    name: string;
    avatar: string;
    rankInfo?: string;
    level?: number;
  };
  onAccept: () => void;
  onDecline: () => void;
}

export function ArenaChallengeModal({ challenger, onAccept, onDecline }: ArenaChallengeModalProps) {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onDecline]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm rounded-3xl border border-yellow-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-white shadow-[0_0_60px_rgba(234,179,8,0.15)] animate-in zoom-in-95 duration-400">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Swords className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-black text-yellow-400">Lời thách đấu!</h3>
          <p className="text-sm text-gray-400 mt-1">Có người muốn thách đấu với bạn</p>
        </div>

        {/* Challenger info */}
        <div className="flex flex-col items-center gap-3 mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
          <UserAvatar
            src={challenger.avatar || "/mascot/Lopy (1).png"}
            level={challenger.level || 1}
            className="w-20 h-20"
            disableLink
          />
          <div className="text-center">
            <div className="text-lg font-bold text-white">{challenger.name}</div>
            {challenger.rankInfo && (
              <div className="text-sm text-yellow-400/80 font-medium mt-0.5">{challenger.rankInfo}</div>
            )}
          </div>
        </div>

        {/* Timer */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: timeLeft > 10 ? "#22c55e" : timeLeft > 5 ? "#eab308" : "#ef4444" }}
            />
            <span className="text-sm font-bold text-gray-300">Tự động từ chối sau {timeLeft}s</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
          >
            Từ chối
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black rounded-xl transition-all shadow-lg"
          >
            Chấp nhận
          </button>
        </div>
      </div>
    </div>
  );
}
