import { Map, Zap, BookOpen, Star, Sparkles } from "lucide-react";
import { Button } from "../components/ui/Button";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:items-center">
      <div className="w-full max-w-md bg-white min-h-screen md:border-x border-slate-100 flex flex-col relative">
        
        {/* Header */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-10 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-blue-600 w-6 h-6" />
            <h1 className="font-black text-xl text-slate-900 tracking-tight">Lộ trình AI</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center text-orange-500 font-bold bg-orange-50 px-3 py-1.5 rounded-xl">
              <Zap className="w-4 h-4 mr-1 fill-orange-500" /> 12
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
              <img src="https://i.pravatar.cc/100" alt="Avatar" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-8">
          
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-600/20">
            <h2 className="text-2xl font-black mb-2">Chặng 1: Nền tảng vững chắc</h2>
            <p className="text-blue-100 font-medium text-sm mb-5">Được AI thiết kế riêng dựa trên sở thích: Du lịch, Phim ảnh.</p>
            <Button className="bg-white text-blue-600 hover:bg-blue-50 w-full rounded-2xl py-4 font-bold shadow-sm">
              Tiếp tục bài học
            </Button>
          </div>

          <div className="relative pl-6">
            <div className="absolute left-[15px] top-4 bottom-0 w-1 bg-slate-200 rounded-full"></div>
            
            <div className="relative z-10 flex gap-4 mb-8">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 border-4 border-white shadow-sm">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex-1 bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-sm hover:border-blue-300 transition-all cursor-pointer active:scale-95">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-900">1. Từ vựng sân bay</h3>
                  <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-lg">100%</span>
                </div>
                <p className="text-sm text-slate-500 font-medium">15 từ mới • Hoàn thành</p>
              </div>
            </div>

            <div className="relative z-10 flex gap-4 mb-8">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 border-4 border-white shadow-sm ring-4 ring-blue-50">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <div className="flex-1 bg-white border-2 border-blue-600 rounded-2xl p-4 shadow-md cursor-pointer active:scale-95 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-10"></div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-900">2. Đặt phòng khách sạn</h3>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Đang học</span>
                </div>
                <p className="text-sm text-slate-500 font-medium">Ngữ pháp cơ bản</p>
              </div>
            </div>

            <div className="relative z-10 flex gap-4 mb-8 opacity-60">
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 border-4 border-white">
                <Star className="w-4 h-4" />
              </div>
              <div className="flex-1 bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-1">3. Xem phim không phụ đề</h3>
                <p className="text-sm text-slate-500 font-medium">Khóa (Cần hoàn thành bài 2)</p>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Nav */}
        <nav className="fixed md:absolute bottom-0 w-full max-w-md bg-white border-t border-slate-100 p-2 px-6 flex justify-between items-center z-20 pb-safe">
          <button className="p-3 text-blue-600 flex flex-col items-center gap-1">
            <Map className="w-6 h-6" />
            <span className="text-[10px] font-bold">Lộ trình</span>
          </button>
          <button className="p-3 text-slate-400 hover:text-slate-600 transition flex flex-col items-center gap-1">
            <BookOpen className="w-6 h-6" />
            <span className="text-[10px] font-bold">Thư viện</span>
          </button>
          <button className="p-3 text-slate-400 hover:text-slate-600 transition flex flex-col items-center gap-1">
            <Star className="w-6 h-6" />
            <span className="text-[10px] font-bold">Thành tích</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
