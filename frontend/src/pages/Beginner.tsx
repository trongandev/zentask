import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MountainSnow, Swords, Headphones, Mic, Edit3, BookOpen, ChevronRight, Play, Check, X, Save, Layers, Plus, Medal, Target } from "lucide-react";
import { cn } from "../lib/utils";
import { useFlashcardStore } from "../services/flashcardService";
import { useAuth } from "../contexts/AuthContext";
import { RANK_TOPIC_CONFIG } from "../config/rankTopicConfig";
import { RankCard } from "../components/shared/RankCard";
import toast from "react-hot-toast";

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

  // Save Word Modal state
  const [wordToSave, setWordToSave] = useState<any | null>(null);
  const [selectedUserSetId, setSelectedUserSetId] = useState<string>("");
  const [rememberSet, setRememberSet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { sets, fetchSets, createCard } = useFlashcardStore();

  useEffect(() => {
    fetchSets();
    const savedDefault = localStorage.getItem("defaultFlashcardSetId");
    if (savedDefault) {
      setSelectedUserSetId(savedDefault);
      setRememberSet(true);
    }
  }, [fetchSets]);

  const currentRankInfo = {
    rankId: user?.rankId || 1,
    name: RANK_CONFIG[user?.rankId || 1]?.name || "Bạc",
    tier: TIER_NAMES[user?.tier || 3] || "III",
    tierNum: user?.tier || 3,
    stars: user?.stars || 0,
    maxStars: RANK_CONFIG[user?.rankId || 1]?.starsPerTier || 3,
    position: 142,
  };

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

                <div className="flex bg-gray-100 p-1 rounded-xl w-fit mb-6">
                  <button
                    onClick={() => setActiveTab("now")}
                    className={cn("px-6 py-2 rounded-lg font-bold text-sm transition-all", activeTab === "now" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                  >
                    Theo rank hiện tại
                  </button>
                  <button
                    onClick={() => setActiveTab("topic")}
                    className={cn("px-6 py-2 rounded-lg font-bold text-sm transition-all", activeTab === "topic" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                  >
                    Theo chủ đề
                  </button>
                  <button
                    onClick={() => setActiveTab("difficulty")}
                    className={cn("px-6 py-2 rounded-lg font-bold text-sm transition-all", activeTab === "difficulty" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                  >
                    Theo trình độ
                  </button>
                </div>
              </div>
              {/* Right Column: Arena CTA & Rank */}
              {activeTab === "now" && (
                <div className="flex gap-6 ">
                  <div className="flex-1">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 relative overflow-hidden h-full flex flex-col justify-center">
                      <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
                        <Swords className="w-40 h-40 text-blue-600" />
                      </div>
                      <div className="flex items-start gap-5 relative z-10">
                        <div className="w-14 h-14 bg-white shadow-sm border border-blue-100 rounded-2xl flex items-center justify-center shrink-0 text-blue-600">
                          <BookOpen className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-blue-950 mb-3">Cơ chế thăng hạng</h3>
                          <p className="text-[15px] text-blue-900/80 leading-relaxed font-medium">
                            Để tham gia đấu hạng, bạn cần học các chủ đề bên dưới. Mỗi Rank sẽ có những bộ chủ đề riêng biệt. Nhiệm vụ của bạn là phải học thuộc từ vựng, thi đấu và cố gắng đánh bại những người chơi khác để thăng hạng. 
                            <br/><br/>
                            Lưu ý: Rank càng cao thì chủ đề sẽ càng khó và lượng từ vựng cũng tăng lên.
                            <br/>
                            <span className="font-bold text-blue-700 mt-2 inline-block">Chúc bạn may mắn và đạt thứ hạng cao! 🏆</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6 w-1/4">
                    <RankCard showButton={true} buttonText="Bắt đầu đấu hạng" />
                  </div>
                </div>
              )}
            </div>

            {activeTab !== "difficulty" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  let renderedSets: any[] = [];
                  if (activeTab === "now") {
                    const rankData = RANK_TOPIC_CONFIG[currentRankInfo.rankId as keyof typeof RANK_TOPIC_CONFIG];
                    if (rankData && rankData.tiers[currentRankInfo.tierNum]) {
                      renderedSets = rankData.tiers[currentRankInfo.tierNum].data || [];
                    }
                  } else if (activeTab === "topic") {
                    renderedSets = Object.values(RANK_TOPIC_CONFIG)
                      .flatMap((rank) => Object.values(rank.tiers).flatMap((t: any) => t.data))
                      .filter((s) => s.category === "topic");
                  }

                  return renderedSets.map((set) => (
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
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 bg-gray-200 px-2 py-1 rounded-md">{set.words.length} từ vựng</span>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {activeTab === "difficulty" && (
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                {Object.entries(RANK_TOPIC_CONFIG).map(([rankId, rankData]: [string, any]) => {
                  const rankSets = Object.values(rankData.tiers).flatMap((t: any) => t.data);
                  if (rankSets.length === 0) return null;
                  return (
                    <div key={rankId} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <span className="font-bold text-sm">{rankId}</span>
                      </div>

                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-gray-100 bg-white shadow-sm transition-all">
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <img src={`/rank/${rankId}.png`} alt={rankData.name} className="w-6 h-6 object-contain" />
                          Rank {rankData.name}
                        </h4>
                        <div className="space-y-3">
                          {rankSets.map((set: any) => (
                            <div
                              key={set.id}
                              onClick={() => navigate(`/beginner/flashcard/${set.id}`)}
                              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0", set.color)}>
                                  <Layers className="w-4 h-4" />
                                </div>
                                <p className="font-semibold text-gray-800 text-sm truncate">{set.title}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                            </div>
                          ))}
                        </div>
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
