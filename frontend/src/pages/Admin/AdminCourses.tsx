import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Save, ChevronRight, ChevronDown, Book, X, RefreshCw } from "lucide-react";
import axiosInstance from "../../services/axiosConfig";
import toastService from "../../services/toastService";

export function AdminCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({});

  // Selection
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Editor State
  const [lessonData, setLessonData] = useState<any>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    try {
      const res = await axiosInstance.get("/api/admin/courses/tree");
      setCourses(res.data);
    } catch (err) {
      toastService.error("Lỗi khi tải dữ liệu khóa học");
    } finally {
      setLoading(false);
    }
  };

  const toggleTier = (tierId: string) => {
    setExpandedTiers((prev) => ({ ...prev, [tierId]: !prev[tierId] }));
  };

  const loadLesson = async (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setLessonLoading(true);
    try {
      const res = await axiosInstance.get(`/api/admin/courses/lesson/${lessonId}`);
      setLessonData(res.data);
    } catch (err) {
      toastService.error("Lỗi khi tải chi tiết bài học");
    } finally {
      setLessonLoading(false);
    }
  };

  const handleSaveLesson = async () => {
    if (!lessonData) return;
    setIsSaving(true);
    try {
      await axiosInstance.put(`/api/admin/courses/lesson/${lessonData._id}`, lessonData);
      toastService.success("Đã lưu bài học!");
      fetchTree(); // Refresh word count in tree
    } catch (err) {
      toastService.error("Lỗi khi lưu bài học");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateLesson = async (tierId: string) => {
    const title = prompt("Nhập tên bài học mới:");
    if (!title) return;
    try {
      const res = await axiosInstance.post(`/api/admin/courses/tier/${tierId}/lesson`, {
        lessonId: `lesson_${Date.now()}`,
        title,
        category: "topic",
      });
      toastService.success("Tạo thành công");
      fetchTree();
      loadLesson(res.data.data._id);
    } catch (err) {
      toastService.error("Lỗi khi tạo bài học");
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xoá bài học này?")) return;
    try {
      await axiosInstance.delete(`/api/admin/courses/lesson/${id}`);
      toastService.success("Đã xoá");
      if (selectedLessonId === id) {
        setSelectedLessonId(null);
        setLessonData(null);
      }
      fetchTree();
    } catch (err) {
      toastService.error("Lỗi khi xoá bài học");
    }
  };

  // --- Word Management ---
  const addWord = () => {
    setLessonData((prev: any) => ({
      ...prev,
      words: [
        {
          id: `w_${Date.now()}`,
          term: "",
          phonetic: "",
          translation: "",
          examples: [],
          notes: "",
        },
        ...(prev.words || []),
      ],
    }));
  };

  const updateWord = (idx: number, field: string, val: string) => {
    setLessonData((prev: any) => {
      const newWords = [...prev.words];
      newWords[idx][field] = val;
      return { ...prev, words: newWords };
    });
  };

  const removeWord = (idx: number) => {
    setLessonData((prev: any) => {
      const newWords = [...prev.words];
      newWords.splice(idx, 1);
      return { ...prev, words: newWords };
    });
  };

  // --- Example Management ---
  const addExample = (wordIdx: number) => {
    setLessonData((prev: any) => {
      const newWords = [...prev.words];
      if (!newWords[wordIdx].examples) newWords[wordIdx].examples = [];
      newWords[wordIdx].examples.push({ text: "", translation: "" });
      return { ...prev, words: newWords };
    });
  };

  const updateExample = (wordIdx: number, exIdx: number, field: string, val: string) => {
    setLessonData((prev: any) => {
      const newWords = [...prev.words];
      newWords[wordIdx].examples[exIdx][field] = val;
      return { ...prev, words: newWords };
    });
  };

  const removeExample = (wordIdx: number, exIdx: number) => {
    setLessonData((prev: any) => {
      const newWords = [...prev.words];
      newWords[wordIdx].examples.splice(exIdx, 1);
      return { ...prev, words: newWords };
    });
  };

  const closeLesson = () => {
    setSelectedLessonId(null);
    setLessonData(null);
  };

  if (loading)
    return (
      <div className="p-8 text-center">
        <RefreshCw className="animate-spin w-8 h-8 mx-auto text-blue-500" />
      </div>
    );

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* LEFT PANE: Tree View */}
      <div className="w-1/3 min-w-[320px] border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Book className="w-5 h-5 text-blue-500" />
            Lộ trình học
          </h2>
          <button onClick={fetchTree} className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {courses.map((course) => (
            <div key={course.id} className="mb-6">
              <div className="font-black text-xl text-slate-800 mb-4 pb-2 border-b-2 border-blue-500 inline-block">
                {course.name} ({course.languageCode})
              </div>

              <div className="space-y-4">
                {course.ranks.map((rank: any) => (
                  <div key={rank.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-800 text-white p-3 font-bold flex justify-between items-center">
                      <span>{rank.name}</span>
                    </div>

                    <div className="p-2 space-y-2">
                      {rank.tiers.map((tier: any) => {
                        const isExpanded = expandedTiers[tier.id];
                        return (
                          <div key={tier.id} className="border border-slate-100 rounded-lg overflow-hidden">
                            <div className="p-3 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => toggleTier(tier.id)}>
                              <div className="flex items-center gap-2 font-bold text-slate-700">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                Tier {tier.tierNum} ({tier.cefr})
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreateLesson(tier.id);
                                }}
                                className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded hover:bg-blue-200"
                              >
                                + Bài học
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="p-2 space-y-1 bg-white">
                                {tier.lessons.length === 0 ? (
                                  <p className="text-xs text-slate-400 text-center py-2">Chưa có bài học</p>
                                ) : (
                                  tier.lessons.map((lesson: any) => (
                                    <div
                                      key={lesson.id}
                                      onClick={() => loadLesson(lesson.id)}
                                      className={`p-3 rounded-lg flex items-center justify-between cursor-pointer group transition-all ${
                                        selectedLessonId === lesson.id ? "bg-blue-500 text-white shadow-md" : "hover:bg-slate-50 text-slate-700"
                                      }`}
                                    >
                                      <div>
                                        <p className="font-bold text-sm truncate">{lesson.title}</p>
                                        <p className={`text-xs mt-0.5 ${selectedLessonId === lesson.id ? "text-blue-100" : "text-slate-400"}`}>
                                          ID: {lesson.lessonId} • {lesson.wordCount} từ
                                        </p>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteLesson(lesson.id);
                                        }}
                                        className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                                          selectedLessonId === lesson.id ? "hover:bg-blue-600 text-white" : "hover:bg-red-100 text-red-500"
                                        }`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANE: Editor */}
      <div className="flex-1 flex flex-col bg-white">
        {!selectedLessonId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Book className="w-16 h-16 mb-4 text-slate-200" />
            <p className="font-medium text-lg">Chọn một bài học để chỉnh sửa</p>
          </div>
        ) : lessonLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="animate-spin w-8 h-8 text-blue-500" />
          </div>
        ) : lessonData ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  value={lessonData.title}
                  onChange={(e) => setLessonData({ ...lessonData, title: e.target.value })}
                  className="font-black text-2xl text-slate-800 w-full outline-none border-b-2 border-transparent focus:border-blue-500 transition-colors bg-transparent"
                  placeholder="Tên bài học..."
                />
                <div className="flex gap-4 mt-2">
                  <input
                    type="text"
                    value={lessonData.lessonId}
                    onChange={(e) => setLessonData({ ...lessonData, lessonId: e.target.value })}
                    className="text-sm font-medium text-slate-500 outline-none border-b border-transparent focus:border-slate-300"
                    placeholder="ID bài học (vd: topic_family)"
                  />
                  <select
                    value={lessonData.category}
                    onChange={(e) => setLessonData({ ...lessonData, category: e.target.value })}
                    className="text-sm font-medium text-blue-600 bg-blue-50 outline-none rounded px-2"
                  >
                    <option value="topic">Từ vựng (Topic)</option>
                    <option value="grammar">Ngữ pháp (Grammar)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <button onClick={closeLesson} disabled={isSaving} className="bg-gray-500 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2  transition-all disabled:opacity-50">
                  <X className="w-5 h-5" />
                  Đóng
                </button>
                <button
                  onClick={handleSaveLesson}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Lưu Thay Đổi
                </button>
              </div>
            </div>

            {/* Word List Editor */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-slate-800">Từ vựng ({lessonData.words?.length || 0})</h3>
                <button onClick={addWord} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm shadow-md transition-colors">
                  <Plus className="w-4 h-4" /> Thêm từ mới
                </button>
              </div>

              <div className="space-y-6">
                {(lessonData.words || []).map((w: any, idx: number) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 relative group">
                    <button
                      onClick={() => removeWord(idx)}
                      className="absolute -right-3 -top-3 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white p-2 rounded-full shadow-md transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Từ vựng</label>
                        <input
                          type="text"
                          value={w.term}
                          onChange={(e) => updateWord(idx, "term", e.target.value)}
                          className="w-full font-bold text-lg p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                          placeholder="e.g. Apple"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Dịch nghĩa</label>
                        <input
                          type="text"
                          value={w.translation}
                          onChange={(e) => updateWord(idx, "translation", e.target.value)}
                          className="w-full font-bold text-lg p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                          placeholder="e.g. Quả táo"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Phiên âm</label>
                        <input
                          type="text"
                          value={w.phonetic}
                          onChange={(e) => updateWord(idx, "phonetic", e.target.value)}
                          className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all"
                          placeholder="e.g. /ˈæp.əl/"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Ghi chú</label>
                        <input
                          type="text"
                          value={w.notes || ""}
                          onChange={(e) => updateWord(idx, "notes", e.target.value)}
                          className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all"
                          placeholder="Tuỳ chọn..."
                        />
                      </div>
                    </div>

                    {/* Examples Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">Ví dụ ({w.examples?.length || 0})</label>
                        <button
                          onClick={() => addExample(idx)}
                          className="text-xs font-bold text-blue-600 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Thêm ví dụ
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(w.examples || []).map((ex: any, exIdx: number) => (
                          <div key={exIdx} className="flex gap-2 items-start relative group/ex">
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                value={ex.en}
                                onChange={(e) => updateExample(idx, exIdx, "en", e.target.value)}
                                className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                                placeholder="Câu tiếng Anh..."
                              />
                              <input
                                type="text"
                                value={ex.vi}
                                onChange={(e) => updateExample(idx, exIdx, "vi", e.target.value)}
                                className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none text-slate-600"
                                placeholder="Dịch nghĩa..."
                              />
                            </div>
                            <button
                              onClick={() => removeExample(idx, exIdx)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1 opacity-0 group-hover/ex:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {(!w.examples || w.examples.length === 0) && <p className="text-xs text-slate-400 italic text-center py-2">Chưa có ví dụ nào.</p>}
                      </div>
                    </div>
                  </div>
                ))}

                {lessonData.words?.length === 0 && (
                  <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                    <p>Chưa có từ vựng nào.</p>
                    <button onClick={addWord} className="text-blue-500 font-bold mt-2 hover:underline">
                      Tạo ngay
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
