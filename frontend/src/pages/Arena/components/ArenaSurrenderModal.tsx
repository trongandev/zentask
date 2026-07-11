import { X } from "lucide-react";

interface ArenaSurrenderModalProps {
  onCancel: () => void;
  onSurrender: () => void;
}

export function ArenaSurrenderModal({ onCancel, onSurrender }: ArenaSurrenderModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-black text-white mb-4">Bỏ cuộc?</h3>
        <p className="text-gray-400 mb-8">
          Nếu bạn bỏ cuộc ngay bây giờ, bạn sẽ bị xử thua và trừ sao ngay lập tức. Bạn có chắc chắn muốn thoát?
        </p>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
          >
            Tiếp tục chơi
          </button>
          <button
            onClick={onSurrender}
            className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
          >
            Chấp nhận thua
          </button>
        </div>
      </div>
    </div>
  );
}
