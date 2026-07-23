import React, { useState } from "react";
import { Save, X, RefreshCw, Sparkles, Book, FileQuestion, ChevronLeft } from "lucide-react";
import { WordListEditor } from "./WordListEditor";
import { AIGeneratorModal } from "./AIGeneratorModal";

interface Props {
  lessonData: any;
  setLessonData: (data: any) => void;
  onBack: () => void;
  handleSaveLesson: () => void;
  isSaving: boolean;
}

export function LessonEditor({ lessonData, setLessonData, onBack, handleSaveLesson, isSaving }: Props) {
  const [showAIGen, setShowAIGen] = useState(false);
  const addWord = () => {
    setLessonData({
      ...lessonData,
      words: [
        {
          id: `w_${Date.now()}`,
          term: "",
          phonetic: "",
          translation: "",
          examples: [],
          notes: "",
        },
        ...(lessonData.words || []),
      ],
    });
  };

  const handleAIGenerated = (newWords: any[]) => {
    setLessonData({
      ...lessonData,
      words: [...newWords, ...(lessonData.words || [])],
    });
  };

  return (
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
          <button onClick={() => onBack()} disabled={isSaving} className="bg-gray-500 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50">
            <ChevronLeft className="w-5 h-5" />
            Quay về
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

      {/* Tabs */}

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
        <WordListEditor words={lessonData.words || []} setWords={(w) => setLessonData({ ...lessonData, words: w })} onAddWord={addWord} />
      </div>

      {showAIGen && <AIGeneratorModal onClose={() => setShowAIGen(false)} onSuccess={handleAIGenerated} />}
    </>
  );
}
