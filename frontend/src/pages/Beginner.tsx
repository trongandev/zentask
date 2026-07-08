import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MountainSnow, Swords, Headphones, Mic, Edit3, BookOpen, ChevronRight, Play, Check, X, Save, Layers, Plus, Medal, Target } from "lucide-react";
import { cn } from "../lib/utils";
import { useFlashcardStore } from "../services/flashcardService";
import { useAuth } from "../contexts/AuthContext";
import { RANK_TOPIC_CONFIG } from "../config/rankTopicConfig";
import { RankCard } from "../components/shared/RankCard";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_BACKEND;

const RANK_CONFIG: any = {
  1: { name: "Bạc", maxTiers: 3, starsPerTier: 3 },
  2: { name: "Lục bảo", maxTiers: 4, starsPerTier: 4 },
  3: { name: "Tinh Anh", maxTiers: 5, starsPerTier: 5 },
  4: { name: "Kim Cương", maxTiers: 5, starsPerTier: 5 },
  5: { name: "Cao Thủ", maxTiers: 1, starsPerTier: 99 },
};
const TIER_NAMES: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };

export function Beginner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"now" | "topic" | "difficulty">("now");
  const [learnedWords, setLearnedWords] = useState<string[]>([]);
  const [showPreviousRanks, setShowPreviousRanks] = useState(false);

  // Save Word Modal state
  const [wordToSave, setWordToSave] = useState<any | null>(null);
  const [selectedUserSetId, setSelectedUserSetId] = useState<string>("");
  const [rememberSet, setRememberSet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const rankContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const { sets, fetchSets, createCard } = useFlashcardStore();

  useEffect(() => {
    fetchSets();
    const savedDefault = localStorage.getItem("defaultFlashcardSetId");
    if (savedDefault) {
      setSelectedUserSetId(savedDefault);
      setRememberSet(true);
    }
    
    const fetchLearnedWords = async () => {
      try {
        const res = await fetch(`${API_URL}/api/user/beginner-progress`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setLearnedWords(data.learnedWords || []);
        }
      } catch (err) {
        console.error("Failed to fetch beginner progress", err);
      }
    };
    if (user) {
      fetchLearnedWords();
    }
  }, [fetchSets, user]);

  const currentRankInfo = {
    rankId: user?.rankId || 1,
    name: RANK_CONFIG[user?.rankId || 1]?.name || "Bạc",
    tier: TIER_NAMES[user?.tier || 3] || "III",
    tierNum: user?.tier || 3,
    stars: user?.stars || 0,
    maxStars: RANK_CONFIG[user?.rankId || 1]?.starsPerTier || 3,
    position: 142,
  };

  useEffect(() => {
    if (activeTab === "difficulty" && currentRankInfo.rankId) {
      // Small timeout to allow DOM to render before scrolling
      setTimeout(() => {
        const el = rankContainerRefs.current[currentRankInfo.rankId];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      }, 100);
    }
  }, [activeTab, currentRankInfo.rankId]);

  const handleSaveWord = async () => {
    if (!wordToSave || !selectedUserSetId) {
      return toast.error("Vui lòng chọn bộ thẻ để lưu!");
    }

    setIsSaving(true);
    if (rememberSet) {
      localStorage.setItem("defaultFlashcardSetId", selectedUserSetId);
    } else {
      localStorage.removeItem("defaultFlashcardSetId");
    }

    const res = await createCard(selectedUserSetId, {
      term: wordToSave.term,
      phonetic: wordToSave.phonetic,
      translation: wordToSave.translation,
      examples: [{ en: wordToSave.exampleEn, vi: wordToSave.exampleVi }],
      notes: "",
    });

    if (res) {
      setWordToSave(null);
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <MountainSnow className="w-8 h-8 text-blue-600" />
          Dành cho người mới
        </h1>
        <p className="text-gray-500 font-medium mt-2">Bắt đầu hành trình học tập của bạn với các bộ từ vựng căn bản và luyện tập 4 kỹ năng.</p>
      </div>

      {/* Main Grid */}
      <div className="">
        {/* Left Column: Flashcards */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="mb-5">
              <div className="">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Thư viện Flashcard</h2>

                <div className="flex flex-wrap md:flex-nowrap bg-gray-100 p-1 rounded-xl w-full md:w-fit mb-6 gap-1 md:gap-0">
                  <button
                    onClick={() => setActiveTab("now")}
                    className={cn("flex-1 md:flex-none px-3 md:px-6 py-2 rounded-lg font-bold text-xs md:text-sm transition-all whitespace-nowrap", activeTab === "now" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                  >
                    Theo rank
                  </button>
                  <button
                    onClick={() => setActiveTab("topic")}
                    className={cn("flex-1 md:flex-none px-3 md:px-6 py-2 rounded-lg font-bold text-xs md:text-sm transition-all whitespace-nowrap", activeTab === "topic" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                  >
                    Theo chủ đề
                  </button>
                  <button
                    onClick={() => setActiveTab("difficulty")}
                    className={cn("flex-1 md:flex-none px-3 md:px-6 py-2 rounded-lg font-bold text-xs md:text-sm transition-all whitespace-nowrap", activeTab === "difficulty" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                  >
                    Trình độ
                  </button>
                </div>
              </div>
              {/* Right Column: Arena CTA & Rank */}
              {activeTab === "now" && (
                <div className="flex flex-col lg:flex-row gap-6 ">
                  <div className="flex-1">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-5 md:p-6 relative overflow-hidden h-full flex flex-col justify-center">
                      <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
                        <Swords className="w-32 h-32 md:w-40 md:h-40 text-blue-600" />
                      </div>
                      <div className="flex flex-col md:flex-row items-start gap-4 md:gap-5 relative z-10">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-white shadow-sm border border-blue-100 rounded-2xl flex items-center justify-center shrink-0 text-blue-600">
                          <BookOpen className="w-6 h-6 md:w-7 md:h-7" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg md:text-xl font-bold text-blue-950 mb-2 md:mb-3">Cơ chế thăng hạng</h3>
                          <p className="text-sm md:text-[15px] text-blue-900/80 leading-relaxed font-medium">
                            Để tham gia đấu hạng, bạn cần học các chủ đề bên dưới. Mỗi Rank sẽ có những bộ chủ đề riêng biệt. Nhiệm vụ của bạn là phải học thuộc từ vựng, thi đấu và cố gắng đánh bại
                            những người chơi khác để thăng hạng.
                            <br />
                            <br />
                            Lưu ý: Rank càng cao thì chủ đề sẽ càng khó và lượng từ vựng cũng tăng lên.
                            <br />
                            <span className="font-bold text-blue-700 mt-2 inline-block">Chúc bạn may mắn và đạt thứ hạng cao! 🏆</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-1/4">
                    <RankCard showButton={true} buttonText="Bắt đầu đấu hạng" />
                  </div>
                </div>
              )}
            </div>

            {activeTab !== "difficulty" && (
              <div className="w-full">
                {(() => {
                  let renderedSets: any[] = [];
                  if (activeTab === "now") {
                    for (let r = 1; r <= currentRankInfo.rankId; r++) {
                      const rankData = RANK_TOPIC_CONFIG[r as keyof typeof RANK_TOPIC_CONFIG];
                      if (rankData) {
                        for (const tierData of Object.values(rankData.tiers) as any[]) {
                          if (tierData.data) {
                            renderedSets.push(...tierData.data.map((set: any) => ({ ...set, _rankId: r })));
                          }
                        }
                      }
                    }
                  } else if (activeTab === "topic") {
                    renderedSets = Object.entries(RANK_TOPIC_CONFIG)
                      .flatMap(([rId, rank]) => Object.values(rank.tiers).flatMap((t: any) => t.data.map((set: any) => ({ ...set, _rankId: Number(rId) }))))
                      .filter((s) => s.category === "topic");
                  }

                  const uncompletedSets: any[] = [];
                  const completedSets: any[] = [];

                  renderedSets.forEach(set => {
                    const total = set.words?.length || 0;
                    const learned = set.words?.filter((w: any) => learnedWords.includes(w.id)).length || 0;
                    const progress = total === 0 ? 0 : Math.round((learned / total) * 100);
                    
                    const setWithProgress = { ...set, progress, learned, total };
                    
                    if (progress >= 100 && total > 0) {
                      completedSets.push(setWithProgress);
                    } else {
                      uncompletedSets.push(setWithProgress);
                    }
                  });

                  let finalCompletedSets = completedSets;
                  if (activeTab === "now" && !showPreviousRanks) {
                    finalCompletedSets = completedSets.filter(s => s._rankId === currentRankInfo.rankId);
                  }

                  const renderSetCard = (set: any) => (
                    <div
                      key={set.id}
                      onClick={() => navigate(`/beginner/flashcard/${set.id}`)}
                      className="bg-gray-50 border border-gray-100 rounded-2xl p-5 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", set.color)}>
                          <Layers className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{set.title}</h3>
                      </div>
                      <p className="text-sm text-gray-500 font-medium">{set.description}</p>
                      
                      {set.progress < 100 && (
                        <div className="mt-4">
                          <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                            <span>Đã học: {set.learned}/{set.total}</span>
                            <span>{set.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${set.progress}%` }}></div>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between">
                        {set.progress === 100 ? (
                          <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Hoàn thành
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-gray-400 bg-gray-200 px-2 py-1 rounded-md">{set.total - set.learned} từ chưa học</span>
                        )}
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                      </div>
                    </div>
                  );

                  return (
                    <div className="space-y-8 w-full">
                      {activeTab === "now" && (
                        <div className="flex justify-end mb-2">
                          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                              checked={showPreviousRanks} 
                              onChange={(e) => setShowPreviousRanks(e.target.checked)} 
                            />
                            <span className="text-sm font-semibold text-gray-700">Hiện bộ đã học ở rank trước</span>
                          </label>
                        </div>
                      )}

                      {uncompletedSets.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-600" /> Chủ đề chưa học
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {uncompletedSets.map(renderSetCard)}
                          </div>
                        </div>
                      )}

                      {finalCompletedSets.length > 0 && (
                        <div className="pt-4 border-t border-gray-100">
                          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Medal className="w-5 h-5 text-yellow-500" /> Chủ đề đã hoàn thành
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-80 hover:opacity-100 transition-opacity">
                            {finalCompletedSets.map(renderSetCard)}
                          </div>
                        </div>
                      )}
                      
                      {uncompletedSets.length === 0 && finalCompletedSets.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          Không có chủ đề nào.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {activeTab === "difficulty" && (
              <div className="flex overflow-x-auto gap-6 pb-6 snap-x snap-mandatory custom-scrollbar">
                {Object.entries(RANK_TOPIC_CONFIG).map(([rankId, rankData]: [string, any]) => {
                  const hasAnyData = Object.values(rankData.tiers).some((t: any) => t.data.length > 0);
                  if (!hasAnyData) return null;
                  return (
                    <div
                      key={rankId}
                      ref={(el) => (rankContainerRefs.current[rankId] = el)}
                      className="w-[85vw] max-w-[320px] shrink-0 snap-center bg-gray-50 rounded-3xl p-4 md:p-5 border border-gray-100 flex flex-col h-[450px] md:h-[500px]"
                    >
                      {/* header */}
                      <div className="flex items-center gap-3 mb-5 sticky top-0 bg-gray-50 z-10 pb-2">
                        <img src={`/rank/${rankId}.png`} alt={rankData.name} className="w-12 object-contain" />
                        <h3 className="font-extrabold text-gray-900 text-lg">Rank {rankData.name}</h3>
                      </div>

                      {/* content with its own scroll if needed */}
                      <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                        {Object.entries(rankData.tiers)
                          .sort(([a], [b]) => Number(b) - Number(a))
                          .map(([tierNum, tierData]: [string, any]) => {
                            if (tierData.data.length === 0) return null;
                            return (
                              <div key={tierNum} className="space-y-3">
                                <div className="font-bold text-sm text-blue-800 bg-blue-100/50 px-3 py-1.5 rounded-lg inline-block">
                                  {rankData.name} {TIER_NAMES[Number(tierNum)]}
                                </div>
                                <div className="space-y-2">
                                  {tierData.data.map((set: any) => (
                                    <div
                                      key={set.id}
                                      onClick={() => navigate(`/beginner/flashcard/${set.id}`)}
                                      className="flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-gray-100 cursor-pointer transition-all shadow-sm border border-gray-100 group"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0", set.color)}>
                                          <Layers className="w-4.5 h-4.5" />
                                        </div>
                                        <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-blue-600 transition-colors">{set.title}</p>
                                      </div>
                                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4 Skills Practice Zone */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Phòng luyện tập 4 kỹ năng</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-5 border border-blue-100 flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-all group"
                onClick={() => toast("Tính năng Luyện nghe đang phát triển!")}
              >
                <div className="w-12 h-12 bg-blue-600 rounded-xl text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                  <Headphones className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">Luyện Nghe</h4>
                <p className="text-xs text-gray-500 font-medium">Dictation & Audio</p>
              </div>

              <div
                className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-5 border border-purple-100 flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-all group"
                onClick={() => toast("Tính năng Nói đang phát triển!")}
              >
                <div className="w-12 h-12 bg-purple-600 rounded-xl text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                  <Mic className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">Luyện Nói</h4>
                <p className="text-xs text-gray-500 font-medium">Shadowing</p>
              </div>

              <div
                className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-5 border border-green-100 flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-all group"
                onClick={() => toast("Tính năng Đọc/Điền từ đang phát triển!")}
              >
                <div className="w-12 h-12 bg-green-600 rounded-xl text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                  <Edit3 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">Điền Từ</h4>
                <p className="text-xs text-gray-500 font-medium">Reading & Fill</p>
              </div>

              <div
                className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl p-5 border border-orange-100 flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-all group"
                onClick={() => toast("Tính năng Phản xạ đang phát triển!")}
              >
                <div className="w-12 h-12 bg-orange-600 rounded-xl text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">Phản Xạ</h4>
                <p className="text-xs text-gray-500 font-medium">Quick Response</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}

      {/* Save Word Modal (Unused here since detail page has words, but kept just in case) */}
      {wordToSave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Lưu vào bộ thẻ</h3>
              <button onClick={() => setWordToSave(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <p className="font-bold text-blue-900 text-lg">{wordToSave.term}</p>
              <p className="text-blue-700">{wordToSave.translation}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Chọn bộ thẻ đích</label>
                <select
                  value={selectedUserSetId}
                  onChange={(e) => setSelectedUserSetId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-gray-700"
                >
                  <option value="" disabled>
                    -- Chọn bộ thẻ --
                  </option>
                  {sets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer sr-only" checked={rememberSet} onChange={(e) => setRememberSet(e.target.checked)} />
                  <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors"></div>
                  <Check className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none" />
                </div>
                <span className="text-sm font-medium text-gray-700">Ghi nhớ bộ thẻ này cho lần sau</span>
              </label>
              <p className="text-xs text-gray-500 ml-8">Bạn có thể thay đổi thiết lập này tại mục Cài đặt.</p>
            </div>

            <button
              onClick={handleSaveWord}
              disabled={!selectedUserSetId || isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {isSaving ? "Đang lưu..." : "Lưu từ vựng"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
