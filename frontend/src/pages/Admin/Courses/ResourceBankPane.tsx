import React, { useState, useEffect } from "react";
import { Folder, HelpCircle, Plus, Trash2, GripVertical, Save, Edit2, X, ChevronDown } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import axiosInstance from "../../../services/axiosConfig";
import toastService from "../../../services/toastService";
import { Modal } from "../../../components/shared/Modal";
import { LANGUAGE_LEVELS, getDefaultLevels } from "../../../config/languageLevels";

interface Props {
  courseId: string;
  onOpenLesson?: (id: string) => void;
}

const SUPPORTED_LANGS = [
  { id: "en", name: "Tiếng Anh" },
  { id: "zh", name: "Tiếng Trung" },
  { id: "ja", name: "Tiếng Nhật" },
  { id: "ko", name: "Tiếng Hàn" },
  { id: "fr", name: "Tiếng Pháp" },
  { id: "de", name: "Tiếng Đức" },
  { id: "es", name: "Tây Ban Nha" },
  { id: "th", name: "Tiếng Thái" },
];

const DraggableWord = ({ word, onDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `word-${word.id}`,
    data: { type: "bank-word", word },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 999 : "auto",
      }
    : undefined;

  const handleDelete = () => {
    onDelete(word);
  };

  return (
    <div ref={setNodeRef} style={style} className={`p-3 bg-white border border-slate-200 rounded-lg shadow-sm flex items-start gap-2 group mb-2 ${isDragging ? "opacity-50" : ""}`}>
      <div {...listeners} {...attributes} className="cursor-grab text-slate-400 hover:text-slate-600 mt-1">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-sm text-blue-700 line-clamp-1">{word.term}</p>
        <p className="text-xs font-medium text-slate-600 mt-0.5">{word.translation}</p>
      </div>
      <button onClick={handleDelete} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

const DraggableUnassignedLesson = ({ lesson, onDelete, isSelected, onClick, onContextMenu, selectedTopicIds }: any) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `unassigned-${lesson.id}`,
    data: {
      type: "unassigned-lesson",
      lesson,
      selectedTopicIds: isSelected && selectedTopicIds?.includes(lesson.id) ? selectedTopicIds : [lesson.id],
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 999 : "auto",
      }
    : undefined;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(lesson);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`p-3 bg-white border rounded-lg shadow-sm flex items-center justify-between group mb-2 cursor-pointer transition-all select-none ${
        isDragging ? "opacity-50" : ""
      } ${isSelected ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200" : "border-slate-200 hover:border-blue-300"}`}
    >
      <div className="flex items-center gap-2">
        <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 hover:text-slate-600" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="w-4 h-4" />
        </div>
        <div>
          <p className={`font-bold text-sm ${isSelected ? "text-blue-700" : "text-slate-700"}`}>{lesson.title}</p>
          <p className={`text-xs ${isSelected ? "text-blue-500" : "text-slate-400"}`}>ID: {lesson.lessonId}</p>
        </div>
      </div>

      <button onClick={handleDelete} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

const DraggableQuestion = ({ question, onDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `question-${question.id}`,
    data: { type: "bank-question", question },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 999 : "auto",
      }
    : undefined;

  const handleDelete = () => {
    onDelete(question);
  };

  return (
    <div ref={setNodeRef} style={style} className={`p-3 bg-white border border-slate-200 rounded-lg shadow-sm flex items-start gap-2 group mb-2 ${isDragging ? "opacity-50" : ""}`}>
      <div {...listeners} {...attributes} className="cursor-grab text-slate-400 hover:text-slate-600 mt-1">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm text-slate-800 line-clamp-2">{question.question}</p>
        <p className="text-xs text-slate-400 mt-1">{question.options?.length} lựa chọn</p>
      </div>
      <button onClick={handleDelete} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

import { useContextMenu } from "../../../hooks/useContextMenu";
import ModalCreateTopic from "./ModalCreateTopic";

export function ResourceBankPane({ courseId, onOpenLesson }: Props) {
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();

  const { setNodeRef: setTopicsRef, isOver: isTopicsOver } = useDroppable({
    id: "unassigned-lessons-zone",
    data: { type: "unassigned-lessons-zone" },
  });

  const { setNodeRef: setWordsRef, isOver: isWordsOver } = useDroppable({
    id: "bank-word-zone",
    data: { type: "bank-word-zone" },
  });

  const [unassignedLessons, setUnassignedLessons] = useState<any[]>([]);
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [topicToDelete, setTopicToDelete] = useState<any>(null);
  const [wordToDelete, setWordToDelete] = useState<any>(null);

  const [createTopicModalOpen, setCreateTopicModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [createWordModalOpen, setCreateWordModalOpen] = useState(false);
  const [newWordTerm, setNewWordTerm] = useState("");
  const [newWordTranslation, setNewWordTranslation] = useState("");

  // Reset selection when tab or course changes
  useEffect(() => {
    setSelectedTopicIds([]);
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    fetchUnassignedLessons();
  }, [courseId]);

  const fetchUnassignedLessons = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/api/admin/courses/${courseId}/unassigned-lessons`);
      setUnassignedLessons(res.data);
    } catch (err) {
      toastService.error("Lỗi khi tải chủ đề tự do");
    } finally {
      setLoading(false);
    }
  };

  // Handle Multi-delete Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Delete" && selectedTopicIds.length > 0) {
        e.preventDefault();
        if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedTopicIds.length} chủ đề đang chọn?`)) {
          executeDeleteMultiTopic();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTopicIds]);

  const executeDeleteMultiTopic = async () => {
    if (selectedTopicIds.length === 0) return;
    try {
      await Promise.all(selectedTopicIds.map((id) => axiosInstance.delete(`/api/admin/courses/lesson/${id}`)));
      fetchUnassignedLessons();
      toastService.success(`Đã xóa ${selectedTopicIds.length} chủ đề`);
      setSelectedTopicIds([]);
      closeContextMenu();
    } catch (err) {
      toastService.error("Lỗi khi xóa chủ đề");
    }
  };

  const handleTopicClick = (e: React.MouseEvent, lessonId: string) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedTopicIds((prev) => (prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]));
    } else {
      setSelectedTopicIds([lessonId]);
      if (onOpenLesson) onOpenLesson(lessonId);
    }
  };

  const fetchWords = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/api/admin/courses/${courseId}/words`);
      setWords(res.data);
    } catch (err) {
      toastService.error("Lỗi khi tải ngân hàng từ vựng");
    } finally {
      setLoading(false);
    }
  };

  const executeDeleteTopic = async () => {
    if (!topicToDelete) return;
    try {
      await axiosInstance.delete(`/api/admin/courses/lesson/${topicToDelete.id}`);
      fetchUnassignedLessons();
      toastService.success("Đã xóa chủ đề");
      setTopicToDelete(null);
    } catch (err) {
      toastService.error("Lỗi khi xóa chủ đề");
    }
  };

  const executeCreateWord = async () => {
    if (!newWordTerm.trim() || !newWordTranslation.trim()) return;
    try {
      await axiosInstance.post(`/api/admin/courses/${courseId}/words`, {
        term: newWordTerm,
        translation: newWordTranslation,
      });
      toastService.success("Tạo thành công");
      setCreateWordModalOpen(false);
      setNewWordTerm("");
      setNewWordTranslation("");
      fetchWords();
    } catch (err) {
      toastService.error("Lỗi khi tạo từ vựng");
    }
  };

  const executeDeleteWord = async () => {
    if (!wordToDelete) return;
    try {
      await axiosInstance.delete(`/api/admin/courses/words/${wordToDelete.id}`);
      fetchWords();
      toastService.success("Đã xóa từ vựng");
      setWordToDelete(null);
    } catch (err) {
      toastService.error("Lỗi khi xóa từ vựng");
    }
  };

  if (!courseId) {
    return (
      <div className="flex flex-col h-full border-l border-slate-200 bg-slate-50 items-center justify-center p-6 text-center text-slate-400">
        <p>Vui lòng chọn một khóa học bên trái để xem Ngân hàng dữ liệu.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-l border-slate-200 bg-slate-50">
      <div className="p-4 border-b border-slate-200 bg-white">
        <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">Ngân hàng Dữ liệu</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div ref={setTopicsRef} className={`min-h-[200px] transition-colors rounded-xl p-2 ${isTopicsOver ? "bg-blue-50 border-2 border-dashed border-blue-300" : ""}`}>
          <button
            onClick={() => setCreateTopicModalOpen(true)}
            className="w-full mb-4 flex items-center justify-center gap-2 py-2 border-2 border-dashed border-blue-300 text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tạo thêm dữ li
          </button>
          {loading ? (
            <p className="text-center text-sm text-slate-400 mt-10">Đang tải...</p>
          ) : unassignedLessons.length === 0 ? (
            <p className="text-center text-sm text-slate-400 mt-10">Chưa có chủ đề nào.</p>
          ) : (
            unassignedLessons.map((l) => (
              <DraggableUnassignedLesson
                key={l.id}
                lesson={l}
                isSelected={selectedTopicIds.includes(l.id)}
                selectedTopicIds={selectedTopicIds}
                onClick={(e: React.MouseEvent) => handleTopicClick(e, l.id)}
                onContextMenu={(e: React.MouseEvent) => {
                  if (!selectedTopicIds.includes(l.id)) {
                    setSelectedTopicIds([l.id]);
                  }
                  handleContextMenu(e, { type: "multi-topics" });
                }}
                onDelete={(lesson: any) => setTopicToDelete(lesson)}
              />
            ))
          )}
          <p className="text-xs text-center text-slate-400 mt-4 italic">* Kéo chủ đề vào một Tier bất kỳ bên cột Lộ trình để phân bổ.</p>
        </div>
      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-48 z-50 overflow-hidden" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className="px-3 py-2 text-xs font-bold text-slate-400 border-b border-slate-100 uppercase">Thao tác hàng loạt</div>
          {contextMenu.data.type === "multi-topics" && (
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
              onClick={() => {
                if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedTopicIds.length} chủ đề đang chọn?`)) {
                  executeDeleteMultiTopic();
                } else {
                  closeContextMenu();
                }
              }}
            >
              <Trash2 className="w-4 h-4" /> Xóa {selectedTopicIds.length} chủ đề
            </button>
          )}
        </div>
      )}

      {/* MODALS */}
      <Modal isOpen={!!topicToDelete} onClose={() => setTopicToDelete(null)} title="Xác nhận xoá">
        <div className="p-5 flex justify-end gap-2 border-t border-slate-100 mt-2">
          <button onClick={() => setTopicToDelete(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">
            Huỷ
          </button>
          <button onClick={executeDeleteTopic} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow">
            Xoá
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!wordToDelete} onClose={() => setWordToDelete(null)} title="Xác nhận xoá">
        <div className="p-5 flex justify-end gap-2 border-t border-slate-100 mt-2">
          <button onClick={() => setWordToDelete(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">
            Huỷ
          </button>
          <button onClick={executeDeleteWord} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow">
            Xoá
          </button>
        </div>
      </Modal>


      <ModalCreateTopic
        isOpen={createTopicModalOpen}
        onClose={() => setCreateTopicModalOpen(false)}
        courseId={courseId}
        onSuccess={() => fetchUnassignedLessons()}
      />
    </div>
  );
}
