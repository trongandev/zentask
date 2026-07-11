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
          className="w-full mb-3 p-4 rounded-2xl border-2 border-dashed border-blue-500/40 hover:border-blue-400 bg-blue-500/5 hover:bg-blue-500/10 transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-blue-300 group-hover:text-blue-200 transition-colors">Tự động (Mặc định)</div>
              <div className="text-xs text-gray-500">Hệ thống tự chọn bot phù hợp rank của bạn</div>
            </div>
          </div>
        </button>

        {/* Bot levels */}
        <div className="space-y-2">
          {BOT_LEVELS.map((bot) => (
            <button
              key={bot.rankId}
              onClick={() => onSelectBot(bot.rankId)}
              className={cn(
                "w-full p-3.5 rounded-2xl border transition-all text-left group hover:scale-[1.02]",
                bot.borderColor,
                "bg-white/5 hover:bg-white/10",
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-inner", bot.color)}>
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{bot.name}</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                      {bot.accuracy} đúng
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{bot.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
