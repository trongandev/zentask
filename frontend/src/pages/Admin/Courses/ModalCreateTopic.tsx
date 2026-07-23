import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/shared/Modal";
import { ChevronDown, HelpCircle, Plus, RefreshCw, Save, Sparkles } from "lucide-react";
import axiosInstance from "../../../services/axiosConfig";
import toastService from "../../../services/toastService";

const SUPPORTED_LANGS = [
  { id: "en", name: "Tiếng Anh" },
  { id: "zh", name: "Tiếng Trung" },
  { id: "ko", name: "Tiếng Hàn" },
  { id: "ja", name: "Tiếng Nhật" },
  { id: "vi", name: "Tiếng Việt" },
  { id: "fr", name: "Tiếng Pháp" },
];
const LANGUAGE_LEVELS: Record<string, any[]> = {
  en: [
    { id: "A1", name: "A1 - Sơ cấp" },
    { id: "A2", name: "A2 - Cơ bản" },
  ],
  zh: [
    { id: "HSK1", name: "HSK 1" },
    { id: "HSK2", name: "HSK 2" },
  ],
};
const getDefaultLevels = () => [{ id: "Basic", name: "Cơ bản" }];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onSuccess: () => void;
}

export default function ModalCreateTopic({ isOpen, onClose, courseId, onSuccess }: Props) {
  const [mainTab, setMainTab] = useState<"course" | "topic" | "word">("course");

  // Course Tab State
  const [courseSubTab, setCourseSubTab] = useState<"ui" | "text" | "ai">("ui");
  const [courseTree, setCourseTree] = useState<any[]>([]);
  const [isTreeLoading, setIsTreeLoading] = useState(false);
  const [courseTextData, setCourseTextData] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [selectedAiCourseId, setSelectedAiCourseId] = useState(courseId);
  const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  // Topic Tab State
  const [newTopicTitles, setNewTopicTitles] = useState("");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const [selectedLevel, setSelectedLevel] = useState("A1");
  const [wordCountPerTopic, setWordCountPerTopic] = useState(10);
  const [exampleCountPerWord, setExampleCountPerWord] = useState(1);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [isGeneratingTextData, setIsGeneratingTextData] = useState(false);
  const levels = LANGUAGE_LEVELS[selectedLang] || getDefaultLevels();

  const handleGenerateTextData = async () => {
    if (!selectedAiCourseId) return toastService.error("Vui lòng chọn khóa học");
    setIsGeneratingTextData(true);
    try {
      await axiosInstance.post("/api/admin/courses/ai-generate-course-text-data", {
        courseId: selectedAiCourseId,
      });
      await fetchTree(); // Cập nhật lại UI sau khi lưu db
      setCourseSubTab("ui");
      toastService.success("Đã sinh và lưu gợi ý chủ đề thành công!");
    } catch (err) {
      toastService.error("Lỗi khi sinh lộ trình");
    } finally {
      setIsGeneratingTextData(false);
    }
  };

  // Word Tab State
  const [newWord, setNewWord] = useState({ term: "", translation: "", phonetic: "", notes: "" });
  const [isSavingWord, setIsSavingWord] = useState(false);

  const getSafeIndex = () => {
    const idx = courseTree.findIndex((c: any) => c.id === selectedAiCourseId);
    return idx >= 0 ? idx : 0;
  };

  useEffect(() => {
    if (!courseTree.length || !selectedAiCourseId) return;
    let text = "";
    const activeCourse = courseTree[getSafeIndex()];
    activeCourse?.ranks?.forEach((rank: any) => {
      text += `\nRANK ${rank.rankId}: ${rank.name}\n`;
      rank.tiers?.forEach((tier: any) => {
        text += `#TIER|${tier.tierNum}\n`;
        if (tier.topics?.length) text += tier.topics.join("; ") + "\n";
      });
    });
    setCourseTextData(text.trim());
  }, [selectedAiCourseId]);

  // Course Tab Logic
  const fetchTree = async () => {
    if (!courseId) return;
    setIsTreeLoading(true);
    try {
      const res = await axiosInstance.get(`/api/admin/courses/tree?courseId=${courseId}`);
      setCourseTree(res.data);
      // Generate text data
      let text = "";
      res.data[0]?.ranks?.forEach((rank: any) => {
        text += `\nRANK ${rank.rankId}: ${rank.name}\n`;
        rank.tiers?.forEach((tier: any) => {
          text += `#TIER|${rank.rankId}|${tier.tierNum}\n`;
          text += `${tier.topics?.join("; ") || ""}\n`;
        });
      });
      setCourseTextData(text.trim());
    } catch (err) {
      toastService.error("Lỗi khi tải cây thư mục");
    } finally {
      setIsTreeLoading(false);
    }
  };

  // Fetch tree automatically when opening modal
  useEffect(() => {
    if (isOpen) {
      fetchTree();
      setSelectedAiCourseId(courseId);
    }
  }, [isOpen, courseId]);

  const handleUpdateUITopic = (tierId: string, val: string) => {
    setCourseTree((prev) => {
      const newTree = [...prev];
      const idx = getSafeIndex();
      newTree[idx]?.ranks?.forEach((r: any) => {
        r.tiers?.forEach((t: any) => {
          if (t._id === tierId) {
            t.topics = val
              .split(";")
              .map((x) => x.trim())
              .filter((x) => x);
          }
        });
      });
      return newTree;
    });
  };

  const syncUIToText = () => {
    let text = "";
    const activeCourse = courseTree[getSafeIndex()];
    activeCourse?.ranks?.forEach((rank: any) => {
      text += `\nRANK ${rank.rankId}: ${rank.name}\n`;
      rank.tiers?.forEach((tier: any) => {
        text += `#TIER|${rank.rankId}|${tier.tierNum}\n`;
        if (tier.topics?.length) text += tier.topics.join("; ") + "\n";
      });
    });
    setCourseTextData(text.trim());
    setCourseSubTab("text");
    toastService.success("Đã đồng bộ sang Text");
  };

  const syncTextToUI = () => {
    if (!courseTextData.trim()) return;
    const newTree = [...courseTree];
    const idx = getSafeIndex();
    const lines = courseTextData.split("\n");
    let currentRankId: number | null = null;
    let currentTierNum: number | null = null;

    // reset topics first
    newTree[idx]?.ranks?.forEach((r: any) => {
      r.tiers?.forEach((t: any) => (t.topics = []));
    });

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith("RANK")) continue;

      if (line.startsWith("#TIER|")) {
        const parts = line.split("|");
        currentRankId = parseInt(parts[1]?.trim());
        currentTierNum = parseInt(parts[2]?.trim());
      } else if (currentRankId && currentTierNum) {
        // topics line
        const topics = line
          .split(";")
          .map((x) => x.trim())
          .filter((x) => x);
        newTree[idx]?.ranks?.forEach((r: any) => {
          if (r.rankId === currentRankId) {
            const t = r.tiers?.find((x: any) => x.tierNum === currentTierNum);
            if (t) {
              t.topics = [...(t.topics || []), ...topics];
            }
          }
        });
      }
    }
    setCourseTree(newTree);
    setCourseSubTab("ui");
    toastService.success("Đã cập nhật UI từ Text");
  };

  const handleSaveCourse = async () => {
    setIsSavingCourse(true);
    try {
      const payload: { tierId: string; topics: string[] }[] = [];
      const activeCourse = courseTree[getSafeIndex()];
      activeCourse?.ranks?.forEach((r: any) => {
        r.tiers?.forEach((t: any) => {
          payload.push({ tierId: t._id, topics: t.topics });
        });
      });
      await axiosInstance.put("/api/admin/courses/tiers/topics", { tiers: payload });
      toastService.success("Cập nhật lộ trình thành công!");
    } catch (err) {
      toastService.error("Lỗi cập nhật lộ trình");
    } finally {
      setIsSavingCourse(false);
    }
  };

  const handleAIGenerateCourse = async () => {
    if (!selectedAiCourseId) return toastService.error("Vui lòng chọn khóa học");
    setIsGeneratingCourse(true);
    try {
      await axiosInstance.post("/api/admin/courses/ai-generate-course-topics", {
        prompt: "Dựa vào các chủ đề đã cấu hình, hãy sinh danh sách từ vựng chi tiết.",
        courseId: selectedAiCourseId,
        wordCount: wordCountPerTopic,
        exampleCount: exampleCountPerWord,
      });
      toastService.success("Đã sinh và cập nhật lộ trình thành công!");
      fetchTree(); // Refresh the UI with the updated data
      onClose();
    } catch (err) {
      toastService.error("AI sinh lỗi");
    } finally {
      setIsGeneratingCourse(false);
    }
  };

  // Topic Logic
  const executeCreateTopic = async () => {
    if (!newTopicTitles.trim()) {
      toastService.error("Vui lòng nhập tiêu đề chủ đề");
      return;
    }
    const titles = newTopicTitles
      .split(";")
      .map((t) => t.trim())
      .filter((t) => t);
    setIsGeneratingTopic(true);
    try {
      const languageName = SUPPORTED_LANGS.find((l) => l.id === selectedLang)?.name || "Tiếng Anh";
      await axiosInstance.post(`/api/admin/courses/${courseId}/generate-topics`, {
        titles,
        language: languageName,
        level: levels.find((l) => l.id === selectedLevel)?.name || selectedLevel,
        wordCountConfig: wordCountPerTopic,
        exampleCountConfig: exampleCountPerWord,
      });
      toastService.success(`Tạo thành công ${titles.length} chủ đề!`);
      setNewTopicTitles("");
      onSuccess();
      onClose();
    } catch (err: any) {
      toastService.error(err.response?.data?.error || "Lỗi tạo chủ đề");
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  // Word Logic
  const executeCreateWord = async () => {
    if (!newWord.term || !newWord.translation) {
      toastService.error("Thiếu từ vựng hoặc nghĩa");
      return;
    }
    setIsSavingWord(true);
    try {
      await axiosInstance.post(`/api/admin/courses/${courseId}/words`, newWord);
      toastService.success("Tạo từ vựng thành công");
      setNewWord({ term: "", translation: "", phonetic: "", notes: "" });
      onSuccess();
    } catch (err) {
      toastService.error("Lỗi tạo từ vựng");
    } finally {
      setIsSavingWord(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo mới Dữ liệu">
      <div className="flex border-b bg-slate-50">
        <button
          onClick={() => setMainTab("course")}
          className={`flex-1 py-3 font-bold border-b-2 text-sm ${mainTab === "course" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}
        >
          Khóa học
        </button>
        <button
          onClick={() => setMainTab("topic")}
          className={`flex-1 py-3 font-bold border-b-2 text-sm ${mainTab === "topic" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}
        >
          Chủ đề
        </button>
        <button onClick={() => setMainTab("word")} className={`flex-1 py-3 font-bold border-b-2 text-sm ${mainTab === "word" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}>
          Từ vựng
        </button>
      </div>

      <div className="p-5 max-h-[70vh] overflow-y-auto">
        {mainTab === "course" && (
          <div className="space-y-4">
            <div className="relative">
              <label className="text-xs font-bold text-slate-500 block mb-1">Chọn Khóa Học</label>
              <select
                value={selectedAiCourseId}
                onChange={(e) => {
                  setSelectedAiCourseId(e.target.value);
                }}
                className="w-full p-2.5 border rounded-lg bg-white text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="">-- Chọn khóa học --</option>
                {courseTree.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-between items-center bg-slate-100 p-2 rounded-lg">
              <div className="flex gap-2">
                <button
                  onClick={() => setCourseSubTab("ui")}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md ${courseSubTab === "ui" ? "bg-white shadow text-blue-600" : "text-slate-500 hover:bg-slate-200"}`}
                >
                  UI
                </button>
                <button
                  onClick={() => setCourseSubTab("text")}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md ${courseSubTab === "text" ? "bg-white shadow text-blue-600" : "text-slate-500 hover:bg-slate-200"}`}
                >
                  Text
                </button>
              </div>
              <button
                onClick={fetchTree}
                disabled={isTreeLoading}
                className="text-sm font-bold flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-900 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isTreeLoading ? "animate-spin" : ""}`} /> Lấy cây dữ liệu
              </button>
            </div>

            {courseSubTab === "ui" && (
              <div className="space-y-4 mt-4">
                <p className="text-xs text-slate-500 italic">
                  * Các chủ đề cách nhau bằng dấu <span className="font-bold bg-slate-200 px-1 rounded">;</span>
                </p>
                {courseTree[getSafeIndex()]?.ranks?.map((rank: any) => (
                  <div key={rank._id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <h3 className="font-bold text-slate-700 mb-3 text-lg">{rank.name}</h3>
                    <div className="space-y-3">
                      {rank.tiers?.map((tier: any) => (
                        <div key={tier._id} className="grid grid-cols-[80px_1fr] gap-3 items-start">
                          <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1.5 rounded text-center">Tier {tier.tierNum}</div>
                          <textarea
                            value={tier.topics?.join("; ") || ""}
                            onChange={(e) => handleUpdateUITopic(tier._id, e.target.value)}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 resize-y min-h-[50px]"
                            placeholder="Nhập chủ đề..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {courseTree.length > 0 && !courseTree[getSafeIndex()]?.ranks?.some((r: any) => r.tiers?.some((t: any) => t.topics && t.topics.length > 0)) && (
                  <button
                    onClick={handleGenerateTextData}
                    disabled={isGeneratingTextData}
                    className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
                  >
                    {isGeneratingTextData ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Tạo gợi ý các chủ đề cho từng tier
                  </button>
                )}
                {courseTree.length > 0 && courseTree[getSafeIndex()]?.ranks?.some((r: any) => r.tiers?.some((t: any) => t.topics && t.topics.length > 0)) && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Số từ vựng/chủ đề</label>
                        <select
                          value={wordCountPerTopic}
                          onChange={(e) => setWordCountPerTopic(Number(e.target.value))}
                          className="w-full p-2.5 border rounded-lg bg-white text-sm font-semibold text-slate-700 outline-none"
                        >
                          {[5, 10, 15, 20].map((n) => (
                            <option key={n} value={n}>
                              {n} từ vựng
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Số câu ví dụ/từ</label>
                        <select
                          value={exampleCountPerWord}
                          onChange={(e) => setExampleCountPerWord(Number(e.target.value))}
                          className="w-full p-2.5 border rounded-lg bg-white text-sm font-semibold text-slate-700 outline-none"
                        >
                          {[1, 2, 3].map((n) => (
                            <option key={n} value={n}>
                              {n} ví dụ
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={handleAIGenerateCourse}
                      disabled={isGeneratingCourse}
                      className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isGeneratingCourse ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Sinh Lộ Trình Từ Vựng
                    </button>
                  </div>
                )}
                {courseTree.length > 0 && (
                  <div className="flex gap-2">
                    <button onClick={syncUIToText} className="flex-1 bg-slate-100 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-slate-200">
                      Đồng bộ sang Text
                    </button>
                    <button
                      onClick={handleSaveCourse}
                      disabled={isSavingCourse}
                      className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" /> Lưu Lộ trình
                    </button>
                  </div>
                )}
              </div>
            )}

            {courseSubTab === "text" && (
              <div className="space-y-4">
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800 text-xs">
                  <strong>Định dạng bắt buộc:</strong> <br />
                  #TIER|&lt;id&gt; <br />
                  Chủ đề 1; Chủ đề 2; Chủ đề 3
                </div>
                <textarea
                  value={courseTextData}
                  onChange={(e) => setCourseTextData(e.target.value)}
                  className="w-full h-[400px] border border-slate-200 rounded-xl p-4 outline-none focus:border-blue-500 text-sm font-mono whitespace-pre"
                />
                <button onClick={syncTextToUI} className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-xl hover:bg-slate-900">
                  Đồng bộ Text sang UI
                </button>
              </div>
            )}
          </div>
        )}

        {mainTab === "topic" && (
          <div className="space-y-4">
            <textarea
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 min-h-[100px] resize-y"
              placeholder="Ví dụ: Động vật; Màu sắc; Gia đình (ngăn cách bằng dấu ;)"
              value={newTopicTitles}
              onChange={(e) => setNewTopicTitles(e.target.value)}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-4">
              {/* Language Selector */}
              <div className="relative">
                <label className="text-xs font-bold text-slate-500 block mb-1">Ngôn ngữ</label>
                <div onClick={() => setLangDropdownOpen(!langDropdownOpen)} className="w-full p-2.5 border rounded-lg cursor-pointer flex justify-between bg-white">
                  {SUPPORTED_LANGS.find((l) => l.id === selectedLang)?.name || "Tiếng Anh"}
                  <ChevronDown className="w-4 h-4" />
                </div>
                {langDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow max-h-48 overflow-y-auto">
                    {SUPPORTED_LANGS.map((lang) => (
                      <div
                        key={lang.id}
                        onClick={() => {
                          setSelectedLang(lang.id);
                          setLangDropdownOpen(false);
                        }}
                        className="p-2.5 hover:bg-slate-50 cursor-pointer text-sm font-semibold text-slate-700"
                      >
                        {lang.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Cấp độ</label>
                <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className="w-full p-2.5 border rounded-lg bg-white text-sm font-semibold text-slate-700">
                  {levels.map((lvl: any) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Số từ vựng/chủ đề</label>
                <select
                  value={wordCountPerTopic}
                  onChange={(e) => setWordCountPerTopic(Number(e.target.value))}
                  className="w-full p-2.5 border rounded-lg bg-white text-sm font-semibold text-slate-700"
                >
                  {[5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>
                      {n} từ vựng
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Số ví dụ/từ</label>
                <select
                  value={exampleCountPerWord}
                  onChange={(e) => setExampleCountPerWord(Number(e.target.value))}
                  className="w-full p-2.5 border rounded-lg bg-white text-sm font-semibold text-slate-700"
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n} ví dụ
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={executeCreateTopic}
              disabled={isGeneratingTopic}
              className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
            >
              {isGeneratingTopic ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Tạo chủ đề
            </button>
          </div>
        )}

        {mainTab === "word" && (
          <div className="space-y-4">
            <input type="text" value={newWord.term} onChange={(e) => setNewWord({ ...newWord, term: e.target.value })} placeholder="Từ vựng (vd: Apple)" className="w-full p-3 border rounded-xl" />
            <input
              type="text"
              value={newWord.translation}
              onChange={(e) => setNewWord({ ...newWord, translation: e.target.value })}
              placeholder="Dịch nghĩa (vd: Quả táo)"
              className="w-full p-3 border rounded-xl"
            />
            <input type="text" value={newWord.phonetic} onChange={(e) => setNewWord({ ...newWord, phonetic: e.target.value })} placeholder="Phiên âm" className="w-full p-3 border rounded-xl" />
            <input type="text" value={newWord.notes} onChange={(e) => setNewWord({ ...newWord, notes: e.target.value })} placeholder="Ghi chú" className="w-full p-3 border rounded-xl" />

            <button onClick={executeCreateWord} disabled={isSavingWord} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              Tạo từ vựng mới
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
