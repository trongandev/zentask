import { Bot, X, Zap } from "lucide-react";
import { cn } from "../../../lib/utils";

const BOT_LEVELS = [
  { rankId: 1, name: "Bạc", accuracy: "40%", color: "from-gray-400 to-gray-500", borderColor: "border-gray-400/50", description: "Bot cơ bản, phù hợp người mới" },
  { rankId: 2, name: "Lục Bảo", accuracy: "50%", color: "from-emerald-400 to-emerald-600", borderColor: "border-emerald-400/50", description: "Khá hơn một chút, phản xạ trung bình" },
  { rankId: 3, name: "Tinh Anh", accuracy: "60%", color: "from-blue-400 to-blue-600", borderColor: "border-blue-400/50", description: "Bot trung cấp, biết chọn đáp án nhanh" },
  { rankId: 4, name: "Kim Cương", accuracy: "70%", color: "from-purple-400 to-purple-600", borderColor: "border-purple-400/50", description: "Bot khó, phản xạ nhanh và chính xác" },
  { rankId: 5, name: "Cao Thủ", accuracy: "85%", color: "from-yellow-400 to-red-500", borderColor: "border-yellow-400/50", description: "Bot mạnh nhất, cực kỳ khó thắng" },
];

interface ArenaBotSelectorProps {
  onSelectBot: (rankId: number | null) => void;
  onClose: () => void;
}

export function ArenaBotSelector({ onSelectBot, onClose }: ArenaBotSelectorProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-black flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            Chọn Level Bot
          </h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-5">Chọn level máy bạn muốn đấu, hoặc để hệ thống tự chọn phù hợp với rank hiện tại.</p>

        {/* Auto option */}
        <button
          onClick={() => onSelectBot(null)}
          className="w-full mb-4 p-6 rounded-3xl border-2 border-blue-500 hover:border-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all text-left group shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] scale-100 hover:scale-[1.02]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-7 h-7 text-white fill-white" />
            </div>
            <div>
              <div className="text-xl font-black text-blue-200 group-hover:text-white transition-colors tracking-wide">Tự động (Mặc định)</div>
              <div className="text-sm text-blue-200/70 mt-1">Hệ thống sẽ chọn bot có trình độ phù hợp với Rank hiện tại của bạn</div>
            </div>
          </div>
        </button>

        {/* Bot levels */}
        <div className="grid grid-cols-2 gap-2">
          {BOT_LEVELS.map((bot) => (
            <button
              key={bot.rankId}
              onClick={() => onSelectBot(bot.rankId)}
              className={cn(
                "w-full p-2.5 rounded-xl border transition-all text-left group hover:scale-[1.02]",
                bot.borderColor,
                "bg-white/5 hover:bg-white/10",
              )}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-inner", bot.color)}>
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-bold text-sm text-white truncate">{bot.name}</span>
                </div>
                <div className="text-[10px] text-gray-400 leading-tight line-clamp-2">{bot.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
