import React, { useState } from "react";
import { Plus, X, Trash2, LayoutGrid, List, Edit3, Volume2, GripVertical } from "lucide-react";
import { useDroppable, useDraggable } from "@dnd-kit/core";

interface Props {
  words: any[];
  setWords: (words: any[]) => void;
  onAddWord: () => void;
}

export function WordListEditor({ words, setWords, onAddWord }: Props) {
  const [viewMode, setViewMode] = useState<"edit" | "table" | "grid">("grid");

  const { setNodeRef, isOver } = useDroppable({
    id: "lesson-word-list",
    data: { type: "lesson-word-list" },
  });

  const DraggableWordItem = ({ w, idx, children }: any) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: w.id || `word_${idx}`,
      data: { type: "lesson-word", word: w, index: idx },
    });

    return (
      <div ref={setNodeRef} className={`relative group ${isDragging ? "opacity-50" : ""}`}>
        <div {...attributes} {...listeners} className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab text-slate-300 hover:text-slate-500 p-1 z-10">
          <GripVertical className="w-5 h-5" />
        </div>
        <div className="pl-8">{children}</div>
      </div>
    );
  };

  const updateWord = (idx: number, field: string, val: string) => {
    const newWords = [...words];
    newWords[idx][field] = val;
    setWords(newWords);
  };

  const removeWord = (idx: number) => {
    const newWords = [...words];
    newWords.splice(idx, 1);
    setWords(newWords);
  };

  const addExample = (wordIdx: number) => {
    const newWords = [...words];
    if (!newWords[wordIdx].examples) newWords[wordIdx].examples = [];
    newWords[wordIdx].examples.push({ en: "", vi: "" });
    setWords(newWords);
  };

  const updateExample = (wordIdx: number, exIdx: number, field: string, val: string) => {
    const newWords = [...words];
    newWords[wordIdx].examples[exIdx][field] = val;
    setWords(newWords);
  };

  const removeExample = (wordIdx: number, exIdx: number) => {
    const newWords = [...words];
    newWords[wordIdx].examples.splice(exIdx, 1);
    setWords(newWords);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-xl text-slate-800">Từ vựng ({words.length})</h3>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode("edit")}
              title="Chế độ sửa"
              className={`p-2 rounded-md flex items-center justify-center transition-colors ${viewMode === "edit" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"}`}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Dạng bảng"
              className={`p-2 rounded-md flex items-center justify-center transition-colors ${viewMode === "table" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              title="Dạng thẻ"
              className={`p-2 rounded-md flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button onClick={onAddWord} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm shadow-md transition-colors">
            <Plus className="w-4 h-4" /> Thêm từ mới
          </button>
        </div>
      </div>

      <div ref={setNodeRef} className={`space-y-6 min-h-[200px] p-4 rounded-xl transition-colors ${isOver ? "bg-blue-50 border-2 border-dashed border-blue-300" : ""}`}>
        {viewMode === "edit" &&
          words.map((w, idx) => (
            <DraggableWordItem key={w.id || idx} w={w} idx={idx}>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 relative group">
                <button
                  onClick={() => removeWord(idx)}
                  className="absolute -right-3 -top-3 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white p-2 rounded-full shadow-md transition-colors opacity-0 group-hover:opacity-100 z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Từ vựng</label>
                    <input
                      type="text"
                      value={w.term || ""}
                      onChange={(e) => updateWord(idx, "term", e.target.value)}
                      className="w-full font-bold text-lg p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      placeholder="e.g. Apple"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Dịch nghĩa</label>
                    <input
                      type="text"
                      value={w.translation || ""}
                      onChange={(e) => updateWord(idx, "translation", e.target.value)}
                      className="w-full font-bold text-lg p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      placeholder="e.g. Quả táo"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Phiên âm</label>
                    <input
                      type="text"
                      value={w.phonetic || ""}
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

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">Ví dụ ({w.examples?.length || 0})</label>
                    <button onClick={() => addExample(idx)} className="text-xs font-bold text-blue-600 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Thêm ví dụ
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(w.examples || []).map((ex: any, exIdx: number) => (
                      <div key={exIdx} className="flex gap-2 items-start relative group/ex">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={ex.en || ""}
                            onChange={(e) => updateExample(idx, exIdx, "en", e.target.value)}
                            className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none"
                            placeholder="Câu tiếng Anh..."
                          />
                          <input
                            type="text"
                            value={ex.vi || ""}
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
            </DraggableWordItem>
          ))}

        {viewMode === "table" && words.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 w-1/4">Từ vựng</th>
                  <th className="p-4 w-1/4">Phiên âm / Ghi chú</th>
                  <th className="p-4 w-2/4">Ví dụ</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {words.map((w, idx) => (
                  <tr key={w.id || idx} className="hover:bg-slate-50/50">
                    <td className="p-4 align-top">
                      <p className="font-bold text-lg text-blue-700">{w.term}</p>
                      <p className="text-sm font-medium text-slate-700">{w.translation}</p>
                    </td>
                    <td className="p-4 align-top">
                      {w.phonetic && <p className="text-sm text-slate-500 mb-1">{w.phonetic}</p>}
                      {w.notes && <p className="text-xs text-amber-600 bg-amber-50 inline-block px-2 py-1 rounded">{w.notes}</p>}
                    </td>
                    <td className="p-4 align-top text-sm">
                      {w.examples?.length > 0 ? (
                        <div className="space-y-3">
                          {w.examples.map((ex: any, i: number) => (
                            <div key={i} className="pl-3 border-l-2 border-slate-200">
                              <p className="font-medium text-slate-700">{ex.en}</p>
                              <p className="text-slate-500">{ex.vi}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa có ví dụ</span>
                      )}
                    </td>
                    <td className="p-4 align-top text-right">
                      <button onClick={() => removeWord(idx)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === "grid" && words.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {words.map((w, idx) => (
              <div key={w.id || idx} className="bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-2xl p-6 relative group transition-all">
                <button onClick={() => removeWord(idx)} className="absolute right-3 top-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="text-center mb-4">
                  <h4 className="text-2xl font-black text-slate-800 mb-1">{w.term}</h4>
                  {w.phonetic && <p className="text-sm text-blue-500 font-medium mb-1">{w.phonetic}</p>}
                  <p className="text-base font-bold text-slate-600">{w.translation}</p>
                </div>
                {w.notes && <div className="bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-lg mb-4 text-center">{w.notes}</div>}
                {w.examples && w.examples.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 text-sm space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">Ví dụ:</p>
                    <p className="text-slate-700 italic">"{w.examples[0].en}"</p>
                    <p className="text-slate-500">"{w.examples[0].vi}"</p>
                    {w.examples.length > 1 && <p className="text-xs text-blue-500 font-medium">+ {w.examples.length - 1} ví dụ khác</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {words.length === 0 && (
          <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
            <p>Chưa có từ vựng nào.</p>
            <button onClick={onAddWord} className="text-blue-500 font-bold mt-2 hover:underline">
              Tạo ngay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
