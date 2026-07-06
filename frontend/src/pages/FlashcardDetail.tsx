import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Play, Volume2, Trash2 } from "lucide-react";
import { useFlashcardStore } from "../services/flashcardService";
import { useConfigStore } from "../services/configService";
import { useAuth } from "../contexts/AuthContext";
import { useUserStore } from "../services/userService";
import { cn } from "../lib/utils";
import toast from "react-hot-toast";

export function FlashcardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchCards, createCard, deleteCard, currentSet, cards, loading } = useFlashcardStore();
  const { incrementTaskProgress } = useConfigStore();
  const { updateUser } = useAuth();
  const { triggerLevelUp } = useUserStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");

  // Form states
  const [term, setTerm] = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [translation, setTranslation] = useState("");
  const [notes, setNotes] = useState("");
  const [examples, setExamples] = useState([
    { en: "", vi: "" },
    { en: "", vi: "" },
    { en: "", vi: "" },
  ]);

  useEffect(() => {
    if (id) {
      fetchCards(id);
    }
  }, [id, fetchCards]);

  const handlePlayAudio = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("Trình duyệt không hỗ trợ phát âm.");
    }
  };

  const handleExampleChange = (index: number, field: "en" | "vi", value: string) => {
    const newExamples = [...examples];
    newExamples[index][field] = value;
    setExamples(newExamples);
  };

  const resetForm = () => {
    setTerm("");
    setPhonetic("");
    setTranslation("");
    setNotes("");
    setExamples([
      { en: "", vi: "" },
      { en: "", vi: "" },
      { en: "", vi: "" },
    ]);
  };

  const handleCreateManual = async () => {
    if (!term.trim() || !translation.trim()) {
      toast.error("Vui lòng điền tiêu đề và dịch nghĩa");
      return;
    }
    const filteredExamples = examples.filter((ex) => ex.en.trim() !== "");

    if (id) {
      const res = await createCard(id, {
        term,
        phonetic,
        translation,
        notes,
        examples: filteredExamples,
      });
      if (res) {
        if (res.xpResult) {
          updateUser({ xp: res.xpResult.xp, level: res.xpResult.level });
          if (res.xpResult.levelUp) {
            triggerLevelUp(res.xpResult.level);
          }
        }
        incrementTaskProgress("create_material", 1);
        setIsModalOpen(false);
        resetForm();
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa thẻ này?")) {
      await deleteCard(cardId);
    }
  };

  const handleCreateAI = () => {
    toast.error("Tính năng AI đang được phát triển...");
  };

  if (loading && !currentSet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentSet) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy bộ thẻ</p>
        <button onClick={() => navigate("/flashcards")} className="mt-4 text-blue-600 font-semibold">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/flashcards")} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{currentSet.title}</h1>
          <p className="text-gray-500">{currentSet.cardCount} thẻ</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <button onClick={() => navigate(`/flashcard/${id}/practice`)} className="bg-blue-50 text-blue-600 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors">
          <Play className="w-5 h-5 fill-current" />
          Học bộ thẻ này
        </button>
        <button
          onClick={() => {
            setIsModalOpen(true);
            resetForm();
          }}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Thêm từ mới
        </button>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {cards.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Chưa có từ vựng nào</h3>
            <p className="text-gray-500 mb-6">Hãy thêm những từ vựng đầu tiên vào bộ thẻ này.</p>
            <button
              onClick={() => {
                setIsModalOpen(true);
                resetForm();
              }}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 mx-auto hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Thêm từ mới
            </button>
          </div>
        ) : (
          cards.map((card) => (
            <div key={card.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 relative group">
              <button
                onClick={() => handleDeleteCard(card.id)}
                className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-bold text-gray-900">{card.term}</h3>
                  <button onClick={() => handlePlayAudio(card.term)} className="text-gray-400 hover:text-blue-500 transition-colors">
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
                {card.phonetic && <p className="text-gray-500 font-medium font-mono mb-3">{card.phonetic}</p>}
                <p className="text-blue-600 font-bold">{card.translation}</p>
                {card.notes && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800 border border-yellow-100">
                    <span className="font-bold block mb-1">Ghi chú:</span>
                    {card.notes}
                  </div>
                )}
              </div>
              <div className="md:w-2/3 space-y-4">
                <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-2">Ví dụ</h4>
                {card.examples && card.examples.length > 0 ? (
                  card.examples.map((ex, idx) => (
                    <div key={idx} className="group/ex">
                      <div className="flex items-start gap-3">
                        <button onClick={() => handlePlayAudio(ex.en)} className="mt-0.5 text-gray-400 hover:text-blue-500 transition-colors shrink-0 opacity-0 group-hover/ex:opacity-100">
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <div>
                          <p className="text-gray-800 font-medium">{ex.en}</p>
                          <p className="text-gray-500 text-sm">{ex.vi}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm italic">Không có ví dụ</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Thêm từ mới</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab("ai")}
                className={cn("flex-1 py-3 font-bold text-sm transition-colors", activeTab === "ai" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-500 hover:bg-gray-50")}
              >
                Tạo bằng AI
              </button>
              <button
                onClick={() => setActiveTab("manual")}
                className={cn("flex-1 py-3 font-bold text-sm transition-colors", activeTab === "manual" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-500 hover:bg-gray-50")}
              >
                Tạo thủ công
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {activeTab === "ai" ? (
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">Nhập từ vựng tiếng Anh, AI sẽ tự động điền phiên âm, nghĩa tiếng Việt và các ví dụ cụ thể.</p>
                  <input
                    type="text"
                    placeholder="Ví dụ: determine"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                  <button
                    onClick={handleCreateAI}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                  >
                    Tạo bằng AI ✨
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Tiêu đề (Tiếng Anh)</label>
                      <input
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        type="text"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500"
                        placeholder="Hello"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Phiên âm</label>
                      <input
                        value={phonetic}
                        onChange={(e) => setPhonetic(e.target.value)}
                        type="text"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500"
                        placeholder="/həˈləʊ/"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Dịch nghĩa (Tiếng Việt)</label>
                    <input
                      value={translation}
                      onChange={(e) => setTranslation(e.target.value)}
                      type="text"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500"
                      placeholder="Xin chào"
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-3">Ví dụ (3 ví dụ)</label>
                    <div className="space-y-3">
                      {[0, 1, 2].map((idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                          <input
                            value={examples[idx].en}
                            onChange={(e) => handleExampleChange(idx, "en", e.target.value)}
                            type="text"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                            placeholder="Tiếng Anh (ví dụ: Hello there!)"
                          />
                          <input
                            value={examples[idx].vi}
                            onChange={(e) => handleExampleChange(idx, "vi", e.target.value)}
                            type="text"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                            placeholder="Tiếng Việt (ví dụ: Xin chào nhé!)"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Ghi chú (Tùy chọn)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 resize-none"
                      placeholder="Ghi chú thêm về từ này..."
                    />
                  </div>

                  <button
                    disabled={loading}
                    onClick={handleCreateManual}
                    className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
                  >
                    {loading ? "Đang tạo..." : "Lưu thủ công"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
