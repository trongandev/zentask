import React, { useEffect, useState } from "react";
import { Plus, MoreVertical, BookOpen, Clock, Play, Trophy, Star, Medal } from "lucide-react";
import { cn } from "../lib/utils";
import { useFlashcardStore } from "../services/flashcardService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const RANK_CONFIG: any = {
  1: { name: "Bạc", maxTiers: 3, starsPerTier: 3 },
  2: { name: "Lục bảo", maxTiers: 4, starsPerTier: 4 },
  3: { name: "Tinh Anh", maxTiers: 5, starsPerTier: 5 },
  4: { name: "Kim Cương", maxTiers: 5, starsPerTier: 5 },
  5: { name: "Cao Thủ", maxTiers: 1, starsPerTier: 99 },
};

export function Flashcards() {
  const { sets, fetchSets, createSet, loading } = useFlashcardStore();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Vui lòng nhập tên bộ thẻ");
      return;
    }
    const colors = ["bg-blue-500", "bg-purple-500", "bg-teal-500", "bg-orange-500", "bg-pink-500"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const res = await createSet(newTitle, newDesc, randomColor);
    if (res) {
      setIsModalOpen(false);
      setNewTitle("");
      setNewDesc("");
    }
  };

  const currentRank = {
    rankId: user?.rankId || 1,
    name: RANK_CONFIG[user?.rankId || 1]?.name || "Bạc",
    tier: user?.tier || 3,
    stars: user?.stars || 0,
    maxStars: RANK_CONFIG[user?.rankId || 1]?.starsPerTier || 3,
    position: 142 // Hardcoded for now
  };

  const romanTier = (tier: number) => {
    const map: any = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };
    return map[tier] || "";
  };

  const timeAgo = (date: any) => {
    if (!date) return "Chưa học";
    // date could be firestore timestamp or iso string depending on how it's returned
    return "Gần đây";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src="/mascot/Lopy (11).png" className="w-16 h-16 object-contain drop-shadow-md" alt="Mascot" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Thẻ lật (Flashcard)</h1>
            <p className="text-gray-500">Ôn tập và ghi nhớ từ vựng hiệu quả qua các bộ thẻ.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Tạo bộ thẻ mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Flashcards Section */}
        <div className="lg:col-span-3 space-y-6">
          {loading && sets.length === 0 ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : sets.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Chưa có bộ thẻ nào</h3>
              <p className="text-gray-500 mb-6">Hãy tạo bộ thẻ đầu tiên để bắt đầu học nhé.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 mx-auto hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Tạo bộ thẻ
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {sets.map(set => {
                const progress = set.cardCount > 0 ? (set.learnedCount / set.cardCount) * 100 : 0;
                return (
                  <div 
                    key={set.id} 
                    onClick={() => navigate(`/flashcard/${set.id}`)}
                    className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full group cursor-pointer relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl ${set.color || 'bg-blue-500'} flex items-center justify-center text-white shadow-sm`}>
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); /* TODO: Options like edit/delete */ }}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {set.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 font-medium">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4" />
                        {set.cardCount} thẻ
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {timeAgo(set.lastStudied)}
                      </span>
                    </div>

                    <div className="mt-auto">
                      <div className="flex justify-between text-xs font-bold text-gray-700 mb-2">
                        <span>Tiến độ</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
                        <div className={`h-full rounded-full transition-all ${progress === 100 && set.cardCount > 0 ? 'bg-teal-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                      </div>
                      
                      <button className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
                        <Play className="w-4 h-4 fill-current" />
                        {set.cardCount === 0 ? "Thêm thẻ" : progress === 0 ? "Bắt đầu học" : progress === 100 ? "Ôn tập lại" : "Tiếp tục học"}
                      </button>
                    </div>
                    
                    {set.isNew && (
                      <div className="absolute top-4 right-4 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-md">
                        MỚI
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Rank Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current Rank Card */}
          <div className="bg-gradient-to-b from-blue-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden cursor-pointer hover:shadow-2xl transition-all">
            <div className="absolute top-1/2 -translate-y-1/2 right-0 opacity-20 pointer-events-none scale-150">
              <img src={`/rank/${currentRank.rankId}.png`} alt="Rank Background" className="w-40 h-40 object-contain drop-shadow-2xl" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-sm font-bold text-blue-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Medal className="w-4 h-4" />
                Rank Hiện Tại
              </h2>
              
              <div className="flex items-center gap-4 mb-6">
                <img src={`/rank/${currentRank.rankId}.png`} alt="Rank Icon" className="w-16 h-16 object-contain drop-shadow-md" />
                <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-white">
                  {currentRank.name} {romanTier(currentRank.tier)}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-bold text-blue-200">
                  <span>Số sao</span>
                  <span>{currentRank.stars} / {currentRank.maxStars}</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: currentRank.maxStars }).map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex-1 h-3 rounded-full transition-all",
                        i < currentRank.stars ? "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" : "bg-slate-700"
                      )}
                    />
                  ))}
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-blue-800/50">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-blue-300">Thứ hạng hiện tại</span>
                  <span className="text-white font-bold bg-white/10 px-3 py-1 rounded-lg">#{currentRank.position}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Create Set Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Tạo bộ thẻ mới</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên bộ thẻ</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Từ vựng IELTS..." 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả (Tùy chọn)</label>
                <textarea 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Mô tả về bộ thẻ này..." 
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
              <button 
                onClick={handleCreate}
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Đang tạo..." : "Hoàn tất"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
