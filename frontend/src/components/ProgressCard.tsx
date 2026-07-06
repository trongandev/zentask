import { TrendingUp, BookOpen, Clock, Star, ChevronRight } from "lucide-react";

export function ProgressCard() {
  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 flex flex-col h-full shadow-sm">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg">Tiến độ học tập</h3>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-end mb-3">
          <div>
            <p className="text-gray-500 font-medium mb-1">Bạn đã hoàn thành</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-gray-900 tracking-tight">12</span>
              <span className="text-gray-500 font-medium">/ 30 bài học</span>
            </div>
          </div>
          <span className="text-sm font-bold text-gray-700">40%</span>
        </div>
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full" style={{ width: '40%' }}></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-gray-100">
          <BookOpen className="w-5 h-5 text-blue-500 mb-2" />
          <span className="text-lg font-bold text-gray-900 mb-1">12</span>
          <span className="text-[11px] font-medium text-gray-500">Bài học đã hoàn<br/>thành</span>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-gray-100">
          <Clock className="w-5 h-5 text-blue-500 mb-2" />
          <span className="text-lg font-bold text-gray-900 mb-1">8h 45m</span>
          <span className="text-[11px] font-medium text-gray-500">Tổng thời gian học</span>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-gray-100">
          <Star className="w-5 h-5 text-yellow-500 mb-2" />
          <span className="text-lg font-bold text-gray-900 mb-1">2.450</span>
          <span className="text-[11px] font-medium text-gray-500">Điểm XP tích lũy</span>
        </div>
      </div>

      <div className="mt-auto">
        <button className="w-full py-3.5 flex items-center justify-center gap-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-gray-100 hover:border-blue-100">
          Xem chi tiết tiến độ
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
