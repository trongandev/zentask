import React, { useState } from "react";
import { Book, RefreshCw, ChevronDown, ChevronRight, Trash2, Sparkles, GripVertical, Folder, FolderOpen, FileText, CopyMinus, FolderPen, Undo2, Redo2, MoreVertical, Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import axiosInstance from "../../../services/axiosConfig";
import toastService from "../../../services/toastService";
import { Modal } from "../../../components/ui/Modal";
import { useContextMenu } from "../../../hooks/useContextMenu";
import { Button } from "@/src/components/ui/Button";

interface Props {
  localCourses: any[];
  fetchTree: () => void;
  selectedLessonId: string | null;
  loadLesson: (id: string) => void;
  handleCreateLesson: (tierId: string) => void;
  handleDeleteLesson: (id: string) => void;
  setActiveCourseId: (id: string) => void;
  activeCourseId: string;
  openCreateCourseModal: () => void;
  onDeleteCourse: (courseId: string) => void;
  onSelectNode: (type: "course" | "rank" | "tier" | "lesson", data: any) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const SortableLesson = ({ lesson, selectedLessonId, loadLesson, handleDeleteLesson, onSelectNode, handleContextMenu }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
    data: { type: "lesson", lesson },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => {
        loadLesson(lesson.id);
        onSelectNode("lesson", lesson);
      }}
      onContextMenu={(e) => handleContextMenu(e, { type: "lesson", data: lesson })}
      className={`group flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer transition-colors relative ${
        isDragging ? "opacity-50 bg-blue-50" : selectedLessonId === lesson.id ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-700"
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        {/* Drag handle */}
        <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-0.5" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <FileText className={`w-4 h-4 shrink-0 ${selectedLessonId === lesson.id ? "text-blue-500" : "text-slate-400"}`} />
        <span className="truncate flex-1" title={lesson.title}>
          {lesson.title}
        </span>
        <span className="text-[10px] text-slate-400 ml-1 shrink-0 bg-white px-1.5 rounded-full border border-slate-200">{lesson.wordCount} từ</span>
      </div>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteLesson(lesson.id);
        }}
        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-100 text-red-500 shrink-0`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

const DroppableTier = ({ tier, expanded, toggleTier, handleCreateLesson, children }: any) => {
  // Make tier droppable to accept unassigned lessons
  const { isOver, setNodeRef } = useDroppable({
    id: `tier-${tier.id}`,
    data: { type: "tier", tier },
  });

  return (
    <div ref={setNodeRef}>
      <div
        className={`group flex items-center justify-between py-1.5 px-1 rounded-md cursor-pointer transition-colors hover:bg-slate-100 ${isOver ? "bg-blue-50 ring-1 ring-blue-300" : ""}`}
        onClick={() => toggleTier(tier.id)}
      >
        <div className="flex items-center gap-1.5 text-slate-700">
          <div className="w-4 h-4 flex items-center justify-center">{expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}</div>
          {expanded ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-amber-400" />}
          <span className="text-sm font-semibold">
            Tier {tier.tierNum} <span className="text-xs text-slate-400 font-normal">({tier.cefr})</span>
          </span>
        </div>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleCreateLesson(tier.id);
          }}
          className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          + Add
        </Button>
      </div>

      {expanded && <div className={`ml-3 pl-3 border-l ${isOver ? "border-blue-300" : "border-slate-200"} py-1 space-y-0.5 min-h-[24px]`}>{children}</div>}
    </div>
  );
};

export function CourseTree({
  localCourses,
  fetchTree,
  selectedLessonId,
  loadLesson,
  handleCreateLesson,
  handleDeleteLesson,
  setActiveCourseId,
  activeCourseId,
  openCreateCourseModal,
  onDeleteCourse,
  onSelectNode,
  undo,
  redo,
  canUndo,
  canRedo,
}: Props) {
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({});
  const [expandedRanks, setExpandedRanks] = useState<Record<string, boolean>>({});
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiEvaluationResult, setAiEvaluationResult] = useState<string | null>(null);

  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();

  // Initialize course expansions once
  React.useEffect(() => {
    if (localCourses.length > 0 && Object.keys(expandedCourses).length === 0) {
      const initial: Record<string, boolean> = {};
      localCourses.forEach((c) => (initial[c.id] = true));
      setExpandedCourses(initial);
    }
  }, [localCourses]);

  const toggleTier = (tierId: string) => setExpandedTiers((prev) => ({ ...prev, [tierId]: !prev[tierId] }));
  const toggleRank = (rankId: string) => setExpandedRanks((prev) => ({ ...prev, [rankId]: !prev[rankId] }));
  const toggleCourse = (courseId: string) => setExpandedCourses((prev) => ({ ...prev, [courseId]: !prev[courseId] }));

  const evaluateCourse = async (courseData: any) => {
    setIsEvaluating(true);
    try {
      const res = await axiosInstance.post("/api/admin/courses/ai-evaluate", { courseData });
      toastService.success("Đánh giá thành công!");
      setAiEvaluationResult(res.data.data);
    } catch (err: any) {
      toastService.error(err.response?.data?.error || "Lỗi khi đánh giá");
    } finally {
      setIsEvaluating(false);
    }
  };

  const exportCourse = async (courseId: string, languageCode: string) => {
    try {
      const response = await axiosInstance.get(`/api/admin/courses/${courseId}/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${languageCode}_course_export.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toastService.success("Đã xuất file text!");
    } catch (err) {
      toastService.error("Lỗi khi xuất file");
    }
  };

  const collapseAll = () => {
    const newCourses: Record<string, boolean> = {};
    const newRanks: Record<string, boolean> = {};
    localCourses.forEach((c) => {
      newCourses[c.id] = false;
      c.ranks.forEach((r: any) => {
        newRanks[r.id] = false;
      });
    });
    setExpandedCourses(newCourses);
    setExpandedRanks(newRanks);
    setExpandedTiers({});
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative group border-r border-slate-200">
      <div className="p-3 border-b border-slate-200 bg-white shadow-sm z-10 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Book className="w-5 h-5 text-blue-500" />
            Lộ trình
          </h2>
          <div className="flex items-center gap-1">
            <Button onClick={undo} disabled={!canUndo} className="p-1.5 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors disabled:opacity-30" title="Hoàn tác">
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button onClick={redo} disabled={!canRedo} className="p-1.5 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors disabled:opacity-30" title="Làm lại">
              <Redo2 className="w-4 h-4" />
            </Button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <Button onClick={collapseAll} className="p-1.5 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Thu gọn tất cả">
              <CopyMinus className="w-4 h-4" />
            </Button>
            <Button onClick={openCreateCourseModal} className="p-1.5 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Thêm khoá học">
              <FolderPen className="w-4 h-4" />
            </Button>
            <Button onClick={fetchTree} className="p-1.5 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Làm mới">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar select-none">
        {localCourses.map((course) => {
          const isCourseExpanded = expandedCourses[course.id] !== false; // Default to true

          return (
            <div
              key={course.id}
              className={`mb-2 rounded-lg transition-colors ${activeCourseId === course.id ? "bg-white shadow-sm ring-1 ring-blue-200" : "hover:bg-slate-100/50"}`}
              onClick={() => setActiveCourseId(course.id)}
            >
              <div
                className="group flex justify-between items-center p-2 cursor-pointer hover:bg-slate-100/80 rounded"
                onContextMenu={(e) => handleContextMenu(e, { type: "course", data: course })}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCourse(course.id);
                  setActiveCourseId(course.id);
                  onSelectNode("course", course);
                }}
              >
                <div className="flex items-center gap-2 text-slate-800">
                  <div className="w-4 h-4 flex items-center justify-center">
                    {isCourseExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                  {/* {isCourseExpanded ? <FolderOpen className="w-5 h-5 text-indigo-500" /> : <Folder className="w-5 h-5 text-indigo-400" />} */}
                  <img src={`/flag/${course.languageCode}.svg`} alt={course.languageCode} className="w-6 object-cover rounded-[2px]" />
                  <span className="font-bold text-sm">{course.name.replace("Tiếng", "")}</span>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    evaluateCourse(course);
                  }}
                  disabled={isEvaluating}
                  className="text-[10px] flex items-center gap-1 font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" /> Đánh giá
                </Button>
              </div>

              {isCourseExpanded && (
                <div className="ml-4 pl-4 border-l border-slate-200 pb-2 pt-1 space-y-1">
                  {course.ranks.map((rank: any) => {
                    const isRankExpanded = expandedRanks[rank.id] !== false;

                    return (
                      <div key={rank.id}>
                        <div
                          className="group flex items-center py-1.5 px-1 rounded-md cursor-pointer transition-colors hover:bg-slate-100"
                          onContextMenu={(e) => handleContextMenu(e, { type: "rank", data: rank })}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRank(rank.id);
                            setActiveCourseId(course.id);
                            onSelectNode("rank", rank);
                          }}
                        >
                          <div className="w-4 h-4 flex items-center justify-center mr-1.5">
                            {isRankExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          </div>
                          {/* {isRankExpanded ? <FolderOpen className="w-4 h-4 text-blue-500" /> : <Folder className="w-4 h-4 text-blue-400" />} */}
                          <img src={`/rank/${rank.rankId}.png`} alt={rank.rankId} className="w-5 object-cover rounded-[2px]" />

                          <span className="text-sm font-bold text-slate-700 ml-1.5">{rank.name}</span>
                        </div>

                        {isRankExpanded && (
                          <div className="ml-3 pl-3 border-l border-slate-200 py-1 space-y-1" onClick={(e) => e.stopPropagation()}>
                            {rank.tiers.map((tier: any) => {
                              const isTierExpanded = expandedTiers[tier.id] === true;
                              const lessonIds = tier.lessons.map((l: any) => l.id);

                              return (
                                <div onContextMenu={(e) => handleContextMenu(e, { type: "tier", data: tier })} onClick={() => onSelectNode("tier", tier)}>
                                  <DroppableTier key={tier.id} tier={tier} expanded={isTierExpanded} toggleTier={toggleTier} handleCreateLesson={handleCreateLesson}>
                                    {tier.lessons.length === 0 ? (
                                      <div className="flex items-center gap-2 py-1 px-2 opacity-50">
                                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                        <p className="text-xs text-slate-400 italic">Trống. Kéo thả vào đây!</p>
                                      </div>
                                    ) : (
                                      <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
                                        {tier.lessons.map((lesson: any) => (
                                          <div key={lesson.id} onContextMenu={(e) => handleContextMenu(e, { type: "lesson", data: lesson })}>
                                            <SortableLesson
                                              lesson={{ ...lesson, tierId: tier.id }}
                                              selectedLessonId={selectedLessonId}
                                              loadLesson={(id: string) => {
                                                loadLesson(id);
                                                onSelectNode("lesson", lesson);
                                              }}
                                              handleDeleteLesson={handleDeleteLesson}
                                              onSelectNode={onSelectNode}
                                              handleContextMenu={handleContextMenu}
                                            />
                                          </div>
                                        ))}
                                      </SortableContext>
                                    )}
                                  </DroppableTier>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal isOpen={!!aiEvaluationResult} onClose={() => setAiEvaluationResult(null)} title="Đánh Giá Từ AI">
        <div className="p-5 max-h-[70vh] overflow-y-auto whitespace-pre-wrap text-sm text-slate-700">{aiEvaluationResult}</div>
        <div className="p-4 border-t border-slate-100 flex justify-end">
          <Button onClick={() => setAiEvaluationResult(null)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow">
            Đóng
          </Button>
        </div>
      </Modal>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-48 z-50 overflow-hidden" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className="px-3 py-2 text-xs font-bold text-slate-400 border-b border-slate-100 uppercase">
            {contextMenu.data.type === "course" && "Thao tác Khóa Học"}
            {contextMenu.data.type === "rank" && "Thao tác Rank"}
            {contextMenu.data.type === "tier" && "Thao tác Tier"}
            {contextMenu.data.type === "lesson" && "Thao tác Bài học"}
          </div>

          <Button
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            onClick={() => {
              onSelectNode(contextMenu.data.type, contextMenu.data.data);
              closeContextMenu();
            }}
          >
            <FolderOpen className="w-4 h-4" /> Mở xem
          </Button>

          {contextMenu.data.type === "course" && (
            <>
              <Button
                className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center gap-2 text-blue-600"
                onClick={() => {
                  evaluateCourse(contextMenu.data.data);
                  closeContextMenu();
                }}
              >
                <Sparkles className="w-4 h-4" /> AI Đánh giá
              </Button>
              <Button
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700 border-t border-slate-100"
                onClick={() => {
                  exportCourse(contextMenu.data.data.id, contextMenu.data.data.languageCode);
                  closeContextMenu();
                }}
              >
                <FileText className="w-4 h-4" /> Xuất file .txt
              </Button>
              <Button
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600 border-t border-slate-100"
                onClick={() => {
                  onDeleteCourse(contextMenu.data.data.id);
                  closeContextMenu();
                }}
              >
                <Trash2 className="w-4 h-4" /> Xóa Khóa Học
              </Button>
            </>
          )}

          {contextMenu.data.type === "tier" && (
            <Button
              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
              onClick={() => {
                handleCreateLesson(contextMenu.data.data.id);
                closeContextMenu();
              }}
            >
              <Plus className="w-4 h-4" /> Thêm Bài học
            </Button>
          )}

          {contextMenu.data.type === "lesson" && (
            <Button
              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
              onClick={() => {
                handleDeleteLesson(contextMenu.data.data.id);
                closeContextMenu();
              }}
            >
              <Trash2 className="w-4 h-4" /> Xóa Bài học
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
