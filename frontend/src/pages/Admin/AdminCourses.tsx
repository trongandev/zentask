import React, { useState, useEffect, useRef, useCallback } from "react";
import { Book, RefreshCw, ChevronLeft, ChevronRight, Save, GripVertical, FileText } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, useSensors, useSensor, PointerSensor, DragOverlay } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import axiosInstance from "../../services/axiosConfig";
import toastService from "../../services/toastService";

import { CourseTree } from "./Courses/CourseTree";
import { LessonEditor } from "./Courses/LessonEditor";
import { ResourceBankPane } from "./Courses/ResourceBankPane";
import { FolderExplorer } from "./Courses/FolderExplorer";
import { Modal } from "../../components/shared/Modal";
import { useHistory } from "../../hooks/useHistory";
import { useSearchParams } from "react-router-dom";

export function AdminCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const { state: localCourses, set: setLocalCourses, undo, redo, canUndo, canRedo, reset: resetLocalCourses } = useHistory<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection State
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCourseId, setActiveCourseId] = useState<string>(searchParams.get("courseId") || "");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ type: "course" | "rank" | "tier"; data: any } | null>(null);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    let changed = false;

    if (activeCourseId && params.get("courseId") !== activeCourseId) {
      params.set("courseId", activeCourseId);
      changed = true;
    }

    if (selectedLessonId) {
      if (params.get("lessonId") !== selectedLessonId) {
        params.set("lessonId", selectedLessonId);
        params.delete("nodeType");
        params.delete("nodeId");
        changed = true;
      }
    } else if (selectedNode) {
      const type = selectedNode.type;
      const id = selectedNode.data.id || selectedNode.data._id;
      if (params.get("nodeType") !== type || params.get("nodeId") !== id) {
        params.set("nodeType", type);
        params.set("nodeId", id);
        params.delete("lessonId");
        changed = true;
      }
    }

    if (changed) {
      setSearchParams(params, { replace: true });
    }
  }, [activeCourseId, selectedLessonId, selectedNode, setSearchParams, searchParams]);

  // Synchronize selectedNode with localCourses so Middle Pane updates instantly on DND/Delete
  useEffect(() => {
    if (selectedNode) {
      const type = selectedNode.type;
      const id = selectedNode.data.id || selectedNode.data._id;

      let foundData = null;
      for (const course of localCourses) {
        if (type === "course" && (course.id === id || course._id === id)) {
          foundData = course;
          break;
        }
        for (const rank of course.ranks || []) {
          if (type === "rank" && (rank.id === id || rank._id === id)) {
            foundData = rank;
            break;
          }
          for (const tier of rank.tiers || []) {
            if (type === "tier" && (tier.id === id || tier._id === id)) {
              foundData = tier;
              break;
            }
          }
          if (foundData) break;
        }
        if (foundData) break;
      }

      // Update if data reference changed in localCourses
      if (foundData && foundData !== selectedNode.data) {
        setSelectedNode({ type, data: foundData });
      }
    } else if (!selectedNode && localCourses.length > 0) {
      // Initial load from URL
      const type = searchParams.get("nodeType") as any;
      const id = searchParams.get("nodeId");
      if (type && id) {
        let foundData = null;
        for (const course of localCourses) {
          if (type === "course" && (course.id === id || course._id === id)) {
            foundData = course;
            break;
          }
          for (const rank of course.ranks || []) {
            if (type === "rank" && (rank.id === id || rank._id === id)) {
              foundData = rank;
              break;
            }
            for (const tier of rank.tiers || []) {
              if (type === "tier" && (tier.id === id || tier._id === id)) {
                foundData = tier;
                break;
              }
            }
            if (foundData) break;
          }
          if (foundData) break;
        }
        if (foundData) {
          setSelectedNode({ type, data: foundData });
        }
      }
    }
  }, [localCourses, selectedNode, searchParams]);

  // Navigation History State
  const [nodeHistory, setNodeHistory] = useState<{ type: "course" | "rank" | "tier" | "lesson"; data: any }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Editor State
  const [lessonData, setLessonData] = useState<any>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Force refetch trigger for ResourceBank
  const [refreshResourceBank, setRefreshResourceBank] = useState(0);

  // Resizable Panes State
  const [leftWidth, setLeftWidth] = useState(parseInt(localStorage.getItem("admin_left_width") || "320"));
  const [rightWidth, setRightWidth] = useState(parseInt(localStorage.getItem("admin_right_width") || "300"));

  const [isLeftCollapsed, setIsLeftCollapsed] = useState(localStorage.getItem("admin_left_collapsed") === "true");
  const [isRightCollapsed, setIsRightCollapsed] = useState(localStorage.getItem("admin_right_collapsed") === "true");

  const containerRef = useRef<HTMLDivElement>(null);

  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = leftWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(250, Math.min(startWidth + moveEvent.pageX - startX, 600));
      setLeftWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      localStorage.setItem("admin_left_width", leftWidth.toString());
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const startResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = rightWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(250, Math.min(startWidth - (moveEvent.pageX - startX), 600));
      setRightWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      localStorage.setItem("admin_right_width", rightWidth.toString());
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // Update localStorage when state settles
  useEffect(() => {
    localStorage.setItem("admin_left_width", leftWidth.toString());
  }, [leftWidth]);

  useEffect(() => {
    localStorage.setItem("admin_right_width", rightWidth.toString());
  }, [rightWidth]);

  useEffect(() => {
    localStorage.setItem("admin_left_collapsed", isLeftCollapsed.toString());
  }, [isLeftCollapsed]);

  useEffect(() => {
    localStorage.setItem("admin_right_collapsed", isRightCollapsed.toString());
  }, [isRightCollapsed]);

  // Modal States
  const [createLessonTierId, setCreateLessonTierId] = useState<string | null>(null);
  const [createLessonTitle, setCreateLessonTitle] = useState("");

  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null);

  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  useEffect(() => {
    fetchTree();

    // Initial load for lesson
    const initialLessonId = searchParams.get("lessonId");
    if (initialLessonId) {
      // Need a slight delay to ensure functions are ready, or just call it directly.
      // But loadLesson is defined below. So we can put this in a separate useEffect
    }
  }, []);

  const fetchTree = async () => {
    try {
      const res = await axiosInstance.get("/api/admin/courses/tree");
      setCourses(res.data);
      resetLocalCourses(res.data);
      if (res.data.length > 0 && !activeCourseId) {
        setActiveCourseId(res.data[0].id);
      }
    } catch (err) {
      toastService.error("Lỗi khi tải dữ liệu khóa học");
    } finally {
      setLoading(false);
    }
  };

  const isDirty = JSON.stringify(localCourses) !== JSON.stringify(courses);

  const handleSaveAllChanges = async () => {
    try {
      // Find all lessons with their tierId and order
      let updatedLessons: any[] = [];
      localCourses.forEach((c: any) =>
        c.ranks.forEach((r: any) =>
          r.tiers.forEach((t: any) => {
            t.lessons.forEach((l: any, i: number) => {
              updatedLessons.push({ id: l.id, tierId: t.id, order: i });
            });
          }),
        ),
      );

      await axiosInstance.put("/api/admin/courses/reorder-lessons", {
        lessons: updatedLessons,
      });
      toastService.success("Đã lưu tất cả thay đổi thành công!");
      fetchTree(); // Refresh
    } catch (err) {
      toastService.error("Lỗi khi lưu thay đổi");
    }
  };

  const handleDiscardChanges = () => {
    resetLocalCourses(courses);
    toastService.info("Đã hủy các thay đổi");
  };

  const loadLesson = async (id: string, noHistory = false) => {
    setLessonLoading(true);
    setSelectedLessonId(id);
    setSelectedNode(null);

    if (!noHistory) {
      const historyItem = { type: "lesson" as const, data: { id } };
      const newHistory = nodeHistory.slice(0, historyIndex + 1);
      newHistory.push(historyItem);
      setNodeHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }

    try {
      const res = await axiosInstance.get(`/api/admin/courses/lesson/${id}`);
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

  const executeCreateLesson = async () => {
    if (!createLessonTierId || !createLessonTitle.trim()) return;
    try {
      const res = await axiosInstance.post(`/api/admin/courses/tier/${createLessonTierId}/lesson`, {
        lessonId: `lesson_${Date.now()}`,
        title: createLessonTitle,
        category: "topic",
      });
      toastService.success("Tạo thành công");
      fetchTree();
      loadLesson(res.data.data._id);
      setCreateLessonTierId(null);
      setCreateLessonTitle("");
    } catch (err) {
      toastService.error("Lỗi khi tạo bài học");
    }
  };

  const executeDeleteCourse = async (courseId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn khóa học này cùng tất cả Rank, Tier, Bài học và Từ vựng liên quan không? Hành động này không thể hoàn tác.")) return;
    try {
      await axiosInstance.delete(`/api/admin/courses/${courseId}`);
      toastService.success("Đã xóa khóa học");

      // Clear selection if the deleted course was selected
      if (activeCourseId === courseId) {
        setActiveCourseId(courses.length > 1 ? courses.find((c) => c.id !== courseId)?.id || "" : "");
        setSelectedNode(null);
      }

      fetchTree();
    } catch (err) {
      toastService.error("Lỗi khi xóa khóa học");
    }
  };

  const executeDeleteLesson = async () => {
    if (!deleteLessonId) return;
    try {
      await axiosInstance.delete(`/api/admin/courses/lesson/${deleteLessonId}`);
      toastService.success("Đã xoá bài học");
      if (selectedLessonId === deleteLessonId) {
        setSelectedLessonId(null);
        setLessonData(null);
      }
      fetchTree();
      setDeleteLessonId(null);
    } catch (err) {
      toastService.error("Lỗi khi xoá bài học");
    }
  };

  const executeCreateCourse = async () => {
    if (!newCourseName.trim() || !newCourseCode.trim()) {
      toastService.error("Vui lòng nhập đủ thông tin");
      return;
    }
    setIsCreatingCourse(true);
    try {
      const res = await axiosInstance.post("/api/admin/courses/seed", {
        name: newCourseName,
        languageCode: newCourseCode,
      });
      toastService.success(`Đã tạo cấu trúc khóa học ${newCourseName}`);
      setActiveCourseId(res.data.data._id);
      fetchTree();
      setCreateCourseModalOpen(false);
      setNewCourseName("");
      setNewCourseCode("");
    } catch (err: any) {
      toastService.error(err.response?.data?.error || "Lỗi khi tạo khóa học");
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const closeLesson = () => {
    setSelectedLessonId(null);
    setLessonData(null);
  };

  const handleNavigateNode = (type: "course" | "rank" | "tier" | "lesson", data: any, noHistory = false) => {
    if (type === "lesson") {
      loadLesson(data.id || data._id);
    } else {
      setSelectedNode({ type, data });
      setSelectedLessonId(null);

      if (!noHistory) {
        const historyItem = { type, data };
        setNodeHistory((prev) => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push(historyItem);
          return newHistory;
        });
        setHistoryIndex((prev) => prev + 1);
      }
    }
  };

  const handleBack = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      const prevNode = nodeHistory[prevIndex];
      handleNavigateNode(prevNode.type, prevNode.data, true);
    }
  }, [historyIndex, nodeHistory]);

  const handleForward = useCallback(() => {
    if (historyIndex < nodeHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const nextNode = nodeHistory[nextIndex];
      handleNavigateNode(nextNode.type, nextNode.data, true);
    }
  }, [historyIndex, nodeHistory]);

  // Global mouse buttons handler for Back/Forward
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // button 3 is typically 'Back', button 4 is 'Forward' on mice
      if (e.button === 3) {
        e.preventDefault();
        handleBack();
      } else if (e.button === 4) {
        e.preventDefault();
        handleForward();
      }
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [handleBack, handleForward]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const [activeDragData, setActiveDragData] = useState<any>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragData(event.active.data.current);
  };

  const handleDragCancel = () => {
    setActiveDragData(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragData(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // CASE 1: Dragging from ResourceBank to CourseTree
    if (active.data.current?.type === "unassigned-lesson" && over.data.current?.type === "tier") {
      const lesson = active.data.current.lesson;
      const tier = over.data.current.tier;
      const selectedTopicIds = active.data.current.selectedTopicIds || [lesson.id];

      try {
        await Promise.all(selectedTopicIds.map((id: string) => axiosInstance.put(`/api/admin/courses/lesson/${id}`, { tierId: tier.id })));
        toastService.success(`Đã gán ${selectedTopicIds.length} chủ đề vào Tier!`);
        fetchTree();
        setRefreshResourceBank((prev) => prev + 1);
      } catch (e) {
        toastService.error("Lỗi khi gán chủ đề");
      }
      return;
    }

    // CASE 2: Dragging a regular lesson to reorder
    if (active.data.current?.type === "lesson" && over.data.current?.type === "lesson") {
      let activeTier = null;
      let overTier = null;

      localCourses.forEach((c) =>
        c.ranks.forEach((r: any) =>
          r.tiers.forEach((t: any) => {
            const a = t.lessons.find((l: any) => l.id === active.id);
            if (a) {
              activeTier = t;
            }
            const o = t.lessons.find((l: any) => l.id === over.id);
            if (o) {
              overTier = t;
            }
          }),
        ),
      );

      if (!activeTier || !overTier) return;

      if (activeTier.id !== overTier.id) {
        toastService.error("Kéo thả giữa các Tier khác nhau hiện chưa được hỗ trợ hoàn chỉnh.");
        return;
      }

      const oldIndex = activeTier.lessons.findIndex((l: any) => l.id === active.id);
      const newIndex = overTier.lessons.findIndex((l: any) => l.id === over.id);

      const newCourses = JSON.parse(JSON.stringify(localCourses));
      newCourses.forEach((c: any) =>
        c.ranks.forEach((r: any) =>
          r.tiers.forEach((t: any) => {
            if (t.id === activeTier.id) {
              t.lessons = arrayMove(t.lessons, oldIndex, newIndex);
              t.lessons.forEach((l: any, i: number) => (l.order = i));
            }
          }),
        ),
      );
      setLocalCourses(newCourses);
      toastService.success("Đã đổi thứ tự, hãy bấm Lưu để xác nhận");
      return;
    }

    // CASE 3: Dragging a question from ResourceBank to LessonEditor
    if (active.data.current?.type === "bank-question" && over.data.current?.type === "lesson-question-list") {
      if (!lessonData) {
        toastService.error("Vui lòng mở một bài học trước khi thêm câu hỏi.");
        return;
      }

      const question = active.data.current.question;
      const newQuestion = {
        id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: question.type || "multiple_choice",
        question: question.question,
        options: [...(question.options || [])],
        correctIndex: question.correctIndex || 0,
        explanation: question.explanation || "",
      };

      setLessonData({
        ...lessonData,
        questions: [...(lessonData.questions || []), newQuestion],
      });

      toastService.success("Đã copy câu hỏi vào bài học (Hãy nhấn Lưu Thay Đổi)!");
      return;
    }

    // CASE 4: Dragging a word from ResourceBank to LessonEditor
    if (active.data.current?.type === "bank-word" && over.data.current?.type === "lesson-word-list") {
      if (!lessonData) {
        toastService.error("Vui lòng mở một bài học trước khi thêm từ vựng.");
        return;
      }

      const word = active.data.current.word;
      const newWord = {
        id: `w_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        term: word.term,
        translation: word.translation,
        phonetic: word.phonetic || "",
        notes: word.notes || "",
        examples: [...(word.examples || [])],
      };

      setLessonData({
        ...lessonData,
        words: [...(lessonData.words || []), newWord],
      });

      toastService.success("Đã copy từ vựng vào bài học (Hãy nhấn Lưu Thay Đổi)!");
      return;
    }

    // CASE 5: Dragging a lesson to Resource Bank (unassign)
    if (active.data.current?.type === "lesson" && over.data.current?.type === "unassigned-lessons-zone") {
      const lessonId = active.id;
      // We must call API directly because save changes only updates order, not tierId removal
      try {
        await axiosInstance.put(`/api/admin/courses/lesson/${lessonId}`, { tierId: null });
        toastService.success("Đã gỡ chủ đề về Ngân hàng dữ liệu!");

        // Remove from localCourses to update UI
        const newCourses = JSON.parse(JSON.stringify(localCourses));
        newCourses.forEach((c: any) =>
          c.ranks.forEach((r: any) =>
            r.tiers.forEach((t: any) => {
              t.lessons = t.lessons.filter((l: any) => l.id !== lessonId);
            }),
          ),
        );
        setLocalCourses(newCourses);

        fetchTree();
        setRefreshResourceBank((prev) => prev + 1);
      } catch (err) {
        toastService.error("Lỗi khi gỡ chủ đề");
      }
      return;
    }

    // CASE 6: Dragging a word back to Resource Bank (remove from lesson)
    if (active.data.current?.type === "lesson-word" && over.data.current?.type === "bank-word-zone") {
      if (!lessonData) return;

      const wordIdx = active.data.current.index;
      const newWords = [...lessonData.words];
      newWords.splice(wordIdx, 1);

      setLessonData({
        ...lessonData,
        words: newWords,
      });

      toastService.success("Đã gỡ từ vựng về Ngân hàng (Hãy nhấn Lưu Thay Đổi)");
      return;
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center h-full">
        <RefreshCw className="animate-spin w-8 h-8 text-blue-500 mb-4" />
        <p className="text-slate-500">Đang tải dữ liệu khóa học...</p>
      </div>
    );
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
        <div ref={containerRef} className="flex h-[calc(100vh-80px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
          {/* LEFT PANE: Tree View */}
          <div style={{ width: isLeftCollapsed ? 0 : leftWidth }} className="shrink-0 relative transition-[width] duration-300">
            <div className={`w-full h-full ${isLeftCollapsed ? "overflow-hidden opacity-0 pointer-events-none" : ""}`}>
              <CourseTree
                localCourses={localCourses}
                fetchTree={fetchTree}
                selectedLessonId={selectedLessonId}
                loadLesson={loadLesson}
                onSelectNode={handleNavigateNode}
                handleCreateLesson={(tierId) => setCreateLessonTierId(tierId)}
                handleDeleteLesson={(id) => setDeleteLessonId(id)}
                activeCourseId={activeCourseId}
                openCreateCourseModal={() => setCreateCourseModalOpen(true)}
                setActiveCourseId={setActiveCourseId}
                onDeleteCourse={executeDeleteCourse}
                undo={undo}
                redo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
              />
            </div>
            {/* Splitter */}
            {!isLeftCollapsed && <div onMouseDown={startResizeLeft} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/50 active:bg-blue-500 transition-colors z-20" />}
          </div>

          {/* Unsaved Changes Bar */}
          {isDirty && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-bounce-short">
              <span className="font-medium text-sm">Có thay đổi chưa lưu</span>
              <div className="flex gap-2">
                <button onClick={handleDiscardChanges} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-full text-sm font-bold transition-colors">
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSaveAllChanges}
                  className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-full text-sm font-bold shadow-lg shadow-blue-500/30 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Lưu thay đổi
                </button>
              </div>
            </div>
          )}

          {/* MIDDLE PANE: Editor */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden relative  shadow-[0_0_15px_rgba(0,0,0,0.05)] border-x border-slate-200">
            {/* Toggle Left Button */}
            <button
              onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-16 bg-white border border-slate-200 border-l-0 rounded-r-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 z-30 shadow-md transition-colors"
            >
              {isLeftCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Toggle Right Button */}
            <button
              onClick={() => setIsRightCollapsed(!isRightCollapsed)}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-16 bg-white border border-slate-200 border-r-0 rounded-l-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 z-30 shadow-md transition-colors"
            >
              {isRightCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {!selectedLessonId ? (
              <FolderExplorer
                node={selectedNode || { type: "root", data: { courses: localCourses } }}
                onNavigate={handleNavigateNode}
                onClose={() => setSelectedNode(null)}
                canBack={historyIndex > 0}
                canForward={historyIndex < nodeHistory.length - 1}
                onBack={handleBack}
                onForward={handleForward}
                undo={undo}
                handleCreateLesson={() => {
                  if (selectedNode?.type === "tier") {
                    setCreateLessonTierId(selectedNode.data.id);
                  }
                }}
                handleDeleteLesson={(id) => setDeleteLessonId(id)}
                onRefresh={() => {
                  fetchTree();
                  setRefreshResourceBank((prev) => prev + 1);
                }}
              />
            ) : lessonLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <RefreshCw className="animate-spin w-8 h-8 text-blue-500 mb-4" />
                <p className="text-slate-500">Đang tải chi tiết bài học...</p>
              </div>
            ) : lessonData ? (
              <LessonEditor lessonData={lessonData} setLessonData={setLessonData} onBack={handleBack} handleSaveLesson={handleSaveLesson} isSaving={isSaving} />
            ) : null}
          </div>

          {/* RIGHT PANE: Resource Bank */}
          <div style={{ width: isRightCollapsed ? 0 : rightWidth }} className="shrink-0 relative bg-slate-50 transition-[width] duration-300 z-10">
            <div className={`w-full h-full ${isRightCollapsed ? "overflow-hidden opacity-0 pointer-events-none" : ""}`}>
              <ResourceBankPane
                key={refreshResourceBank}
                courseId={activeCourseId}
                onOpenLesson={(lessonId) => {
                  loadLesson(lessonId);
                }}
              />
            </div>
            {/* Splitter */}
            {!isRightCollapsed && (
              <div onMouseDown={startResizeRight} className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400/50 active:bg-blue-500 transition-colors z-20" />
            )}
          </div>
        </div>

        <DragOverlay>
          {activeDragData?.type === "unassigned-lesson" && (
            <div className="p-3 bg-white border border-blue-400 rounded-lg shadow-xl flex items-center justify-between opacity-95 scale-105 min-w-[250px]">
              <div className="flex items-center gap-2">
                <div className="text-blue-500 cursor-grabbing">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div>
                  {activeDragData.selectedTopicIds?.length > 1 ? (
                    <>
                      <p className="font-bold text-sm text-slate-700">Đang kéo {activeDragData.selectedTopicIds.length} chủ đề</p>
                      <p className="text-xs text-blue-500 font-medium">Thả vào Tier để phân bổ</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-sm text-slate-700">{activeDragData.lesson.title}</p>
                      <p className="text-xs text-slate-400">ID: {activeDragData.lesson.lessonId}</p>
                    </>
                  )}
                </div>
              </div>
              {activeDragData.selectedTopicIds?.length > 1 && (
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">{activeDragData.selectedTopicIds.length}</div>
              )}
            </div>
          )}

          {(activeDragData?.type === "bank-word" || activeDragData?.type === "lesson-word") && (
            <div className="p-3 bg-white border border-blue-400 rounded-lg shadow-xl flex items-start gap-2 opacity-95 scale-105 min-w-[250px]">
              <div className="text-blue-500 mt-1 cursor-grabbing">
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-blue-700 line-clamp-1">{activeDragData.word.term}</p>
                <p className="text-xs font-medium text-slate-600 mt-0.5">{activeDragData.word.translation}</p>
              </div>
            </div>
          )}

          {activeDragData?.type === "bank-question" && (
            <div className="p-3 bg-white border border-blue-400 rounded-lg shadow-xl flex items-start gap-2 opacity-95 scale-105 min-w-[250px]">
              <div className="text-blue-500 mt-1 cursor-grabbing">
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-slate-800 line-clamp-2">{activeDragData.question.question}</p>
                <p className="text-xs text-slate-400 mt-1">{activeDragData.question.options?.length} lựa chọn</p>
              </div>
            </div>
          )}

          {activeDragData?.type === "lesson" && (
            <div className="flex items-center gap-2 bg-blue-100 text-blue-700 py-2 px-3 rounded-md shadow-xl border border-blue-300 min-w-[200px] scale-105 cursor-grabbing">
              <GripVertical className="w-4 h-4 text-blue-500" />
              <FileText className="w-4 h-4 shrink-0 text-blue-500" />
              <span className="truncate font-bold text-sm">{activeDragData.lesson.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* MODALS */}

      {/* Create Lesson Modal */}
      <Modal isOpen={!!createLessonTierId} onClose={() => setCreateLessonTierId(null)} title="Tạo bài học mới" desc="Bài học sẽ được gán vào Tier bạn vừa chọn.">
        <div className="p-5">
          <input
            type="text"
            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
            placeholder="Nhập tên bài học..."
            value={createLessonTitle}
            onChange={(e) => setCreateLessonTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && executeCreateLesson()}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setCreateLessonTierId(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">
              Huỷ
            </button>
            <button onClick={executeCreateLesson} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow">
              Tạo mới
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Lesson Confirm Modal */}
      <Modal isOpen={!!deleteLessonId} onClose={() => setDeleteLessonId(null)} title="Xác nhận xoá" desc="Bạn có chắc chắn muốn xoá bài học này không? Hành động này không thể hoàn tác.">
        <div className="p-5 flex justify-end gap-2 border-t border-slate-100 mt-2">
          <button onClick={() => setDeleteLessonId(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">
            Huỷ
          </button>
          <button onClick={executeDeleteLesson} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow">
            Xoá
          </button>
        </div>
      </Modal>

      {/* Create Course Modal */}
      <Modal isOpen={createCourseModalOpen} onClose={() => setCreateCourseModalOpen(false)} title="Thêm Khóa Học Mới" desc="Hệ thống sẽ tự động khởi tạo các Rank và Tier chuẩn cho ngôn ngữ mới.">
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-1">Tên Khóa Học (Ngôn ngữ)</label>
            <input
              type="text"
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
              placeholder="Vd: Tiếng Đan Mạch"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-1">Mã Ngôn Ngữ (Language Code)</label>
            <input
              type="text"
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
              placeholder="Vd: da"
              value={newCourseCode}
              onChange={(e) => setNewCourseCode(e.target.value.toLowerCase())}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <button onClick={() => setCreateCourseModalOpen(false)} disabled={isCreatingCourse} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">
              Huỷ
            </button>
            <button
              onClick={executeCreateCourse}
              disabled={isCreatingCourse}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow flex items-center gap-2 disabled:opacity-50"
            >
              {isCreatingCourse ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              Khởi tạo cấu trúc
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
