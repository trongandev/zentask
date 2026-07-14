import React, { useEffect, useState } from "react";
import { Plus, MoreVertical, BookOpen, Clock, Play, Trophy, Star, Medal, Trash2, Folder as FolderIcon, Edit2, Globe2, Lock, Crown, Copy, Search } from "lucide-react";
import { cn } from "../../lib/utils";

import { RankCard } from "../../components/shared/RankCard";
import { useFlashcardStore } from "../../services/flashcardService";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toastService from "@/src/services/toastService";
import { SEO } from "../../components/SEO";
import { Modal } from "../../components/shared/Modal";
import { CreateEditFolderModal, DeleteFolderModal, CreateEditSetModal, DeleteSetModal, COLORS } from "./components/FlashcardModals";

import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable, pointerWithin, rectIntersection } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const RANK_CONFIG: any = {
  1: { name: "Bạc", maxTiers: 3, starsPerTier: 3 },
  2: { name: "Lục bảo", maxTiers: 4, starsPerTier: 4 },
  3: { name: "Tinh Anh", maxTiers: 5, starsPerTier: 5 },
  4: { name: "Kim Cương", maxTiers: 5, starsPerTier: 5 },
  5: { name: "Cao Thủ", maxTiers: 1, starsPerTier: 99 },
};
const TIER_NAMES: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };
const timeAgo = (date: any) => {
  if (!date) return "Chưa học";
  return "Gần đây";
};

const LANG_MAP: Record<string, string> = {
  en: "Anh",
  zh: "Trung",
  ja: "Nhật",
  ko: "Hàn",
  fr: "Pháp",
  de: "Đức",
  es: "Tây Ban Nha",
  th: "Thái",
  vi: "Việt",
};

// SORTABLE SET ITEM
function SortableSetItem({ set, onClick, onContextMenu, onMoreClick, popoverId, setPopoverId, onEdit, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: set.id, data: { type: "set", set } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 99 : 1,
  };

  const cardCount = set.cardCount || 0;
  const knownCount = set.knownCount || 0;
  const almostCount = set.almostCount || 0;
  const knownPct = cardCount > 0 ? (knownCount / cardCount) * 100 : 0;
  const almostPct = cardCount > 0 ? (almostCount / cardCount) * 100 : 0;
  const progress = cardCount > 0 ? (set.learnedCount / cardCount) * 100 : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onContextMenu={(e) => onContextMenu(e, "set", set)}
      onClick={onClick}
      className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full group cursor-pointer relative overflow-hidden"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl ${set.color || "bg-blue-500"} flex items-center justify-center text-white shadow-sm`}>
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPopoverId(popoverId === set.id ? null : set.id);
            }}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {popoverId === set.id && (
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPopoverId(null);
                  onEdit(set);
                }}
                className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sửa & Đổi màu
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPopoverId(null);
                  onDelete(set);
                }}
                className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Xóa
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">{set.title}</h3>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${set.isPublic === false ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-600"}`}>
          {set.isPublic === false ? <Lock className="w-3 h-3" /> : <Globe2 className="w-3 h-3" />}
          {set.isPublic === false ? "Riêng tư" : "Công khai"}
        </span>
        {set.categoryName && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">{set.categoryName}</span>}
        {set.language && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600">{LANG_MAP[set.language || "en"] || set.language.toUpperCase()}</span>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 font-medium">
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" />
          {set.cardCount} thẻ
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {timeAgo(set.lastStudied)}
        </span>
      </div>

      <div className="mt-auto">
        <div className="flex justify-between text-xs font-bold text-gray-700 mb-2">
          <span>Tiến độ</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-3 flex">
          <div className="bg-green-500 h-full transition-all" style={{ width: `${knownPct}%` }} title={`Đã nhớ: ${knownCount}`}></div>
          <div className="bg-yellow-400 h-full transition-all" style={{ width: `${almostPct}%` }} title={`Gần nhớ: ${almostCount}`}></div>
        </div>
        <div className="flex justify-between text-[10px] font-semibold text-gray-500 mb-4 px-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div> Đã nhớ ({knownCount})
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-400"></div> Gần nhớ ({almostCount})
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-200"></div> Chưa nhớ ({Math.max(0, cardCount - knownCount - almostCount)})
          </div>
        </div>
        <button className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors pointer-events-none">
          <Play className="w-4 h-4 fill-current" />
          {cardCount === 0 ? "Thêm thẻ" : progress === 0 ? "Bắt đầu học" : progress === 100 ? "Ôn tập lại" : "Tiếp tục học"}
        </button>
      </div>

      {set.isNew && <div className="absolute top-4 right-4 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-md">MỚI</div>}
    </div>
  );
}

// FOLDER THEMES
const FOLDER_THEMES: Record<string, { bg: string; text: string; fill: string }> = {
  blue: { bg: "bg-blue-50/50", text: "text-blue-600", fill: "fill-blue-600/20" },
  red: { bg: "bg-red-50/50", text: "text-red-600", fill: "fill-red-600/20" },
  yellow: { bg: "bg-yellow-50/50", text: "text-yellow-600", fill: "fill-yellow-600/20" },
  green: { bg: "bg-green-50/50", text: "text-green-600", fill: "fill-green-600/20" },
  purple: { bg: "bg-purple-50/50", text: "text-purple-600", fill: "fill-purple-600/20" },
  pink: { bg: "bg-pink-50/50", text: "text-pink-600", fill: "fill-pink-600/20" },
  orange: { bg: "bg-orange-50/50", text: "text-orange-600", fill: "fill-orange-600/20" },
  teal: { bg: "bg-teal-50/50", text: "text-teal-600", fill: "fill-teal-600/20" },
};

// DROPPABLE FOLDER
function FolderDroppable({ folder, setsInFolder, onContextMenu, onSetClick, popoverId, setPopoverId, onEditSet, onDeleteSet, forceOver = false }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: `folder-${folder.id}`, data: { type: "folder", folder } });
  const activeOver = isOver || forceOver;

  const colorName = folder.color ? folder.color.replace("bg-", "") : "blue-500";
  const baseColor = colorName.split("-")[0];
  const theme = FOLDER_THEMES[baseColor] || FOLDER_THEMES.blue;

  return (
    <div
      ref={setNodeRef}
      data-flashcard-dropzone={`folder-${folder.id}`}
      onContextMenu={(e) => onContextMenu(e, "folder", folder)}
      className={`${theme.bg} p-6 rounded-3xl border transition-all duration-200 ${activeOver ? "border-blue-500 shadow-lg ring-4 ring-blue-500/20 scale-[1.02]" : "border-gray-200"}`}
    >
      <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${theme.text}`}>
        <FolderIcon className={`${theme.text} ${theme.fill}`} /> {folder.name}
      </h2>
      <SortableContext items={setsInFolder.map((s: any) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[150px]">
          {setsInFolder.length === 0 && (
            <div
              data-flashcard-dropzone={`folder-${folder.id}`}
              className={`col-span-full flex min-h-[120px] items-center justify-center rounded-2xl border-2 border-dashed font-medium transition-all ${activeOver ? "border-blue-400 bg-white text-blue-700" : "border-gray-300 text-gray-400"}`}
            >
              Kéo thả bộ thẻ vào đây
            </div>
          )}
          {setsInFolder.map((s: any) => (
            <SortableSetItem
              key={s.id}
              set={s}
              onClick={() => onSetClick(s)}
              onContextMenu={onContextMenu}
              popoverId={popoverId}
              setPopoverId={setPopoverId}
              onEdit={onEditSet}
              onDelete={onDeleteSet}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function Flashcards() {
  const {
    sets,
    publicSets,
    builtinSets,
    folders,
    categories,
    fetchSets,
    fetchPublicSets,
    fetchBuiltinSets,
    fetchFolders,
    fetchCategories,
    createSet,
    updateSet,
    deleteSet,
    createFolder,
    updateFolder,
    deleteFolder,
    createCategory,
    deleteCategory,
    cloneSet,
    cloneBuiltinSet,
    loading,
  } = useFlashcardStore();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Modals & Popovers
  const [isModalOpen, setIsModalOpen] = useState(false); // Set create/edit
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false); // Folder create
  const [editingSet, setEditingSet] = useState<any>(null);
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [setToDelete, setSetToDelete] = useState<any>(null);
  const [folderToDelete, setFolderToDelete] = useState<any>(null); // { folder, step: 1|2 }
  const [popoverId, setPopoverId] = useState<string | null>(null);

  // Form States
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedColor, setSelectedColor] = useState("bg-blue-500");
  const [setIsPublic, setSetIsPublic] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as "mine" | "builtin" | "public") || "mine";

  const setActiveTab = (tab: "mine" | "builtin" | "public") => {
    setSearchParams((prev) => {
      prev.set("tab", tab);
      return prev;
    });
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const activePublicCategoryName = searchParams.get("publicCategory") || "all";
  const setActivePublicCategoryName = (category: string) => {
    setSearchParams((prev) => {
      prev.set("publicCategory", category);
      return prev;
    });
  };

  const activeBuiltinCategoryName = searchParams.get("builtinCategory") || "all";
  const setActiveBuiltinCategoryName = (category: string) => {
    setSearchParams((prev) => {
      prev.set("builtinCategory", category);
      return prev;
    });
  };
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const isVip = Boolean(
    (user as any)?.isVip ||
    (user as any)?.vip ||
    user?.role === "admin" ||
    (user as any)?.role === "vip" ||
    ["vip", "pro", "premium"].includes(String((user as any)?.plan || (user as any)?.subscriptionPlan || "").toLowerCase()) ||
    String((user as any)?.subscriptionStatus || "").toLowerCase() === "active",
  );

  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("bg-blue-500");

  const [targetFolderIdForNewSet, setTargetFolderIdForNewSet] = useState<string | null>(null);

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: "root" | "folder" | "set"; item: any } | null>(null);

  // Debounce saving
  const pendingUpdatesRef = React.useRef<Record<string, string | null>>({});
  const saveTimeoutRef = React.useRef<any>(null);

  const currentRank = {
    rankId: user?.rankId || 1,
    name: RANK_CONFIG[user?.rankId || 1]?.name || "Bạc",
    tier: TIER_NAMES[user?.tier || 3] || "III",
    stars: user?.stars || 0,
    maxStars: RANK_CONFIG[user?.rankId || 1]?.starsPerTier || 3,
    position: 142,
  };

  useEffect(() => {
    if (user) {
      fetchSets();
      fetchFolders();
      fetchCategories();
    }
    fetchPublicSets();
    fetchBuiltinSets();
  }, [fetchSets, fetchFolders, fetchCategories, fetchPublicSets, fetchBuiltinSets, user]);

  useEffect(() => {
    const handleClickOutside = () => {
      setPopoverId(null);
      setContextMenu(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // --- DND Logic ---
  const { setNodeRef: rootDropRef, isOver: isRootOver } = useDroppable({ id: "root", data: { type: "root" } });
  const { setNodeRef: removeZoneRef, isOver: isRemoveZoneOver } = useDroppable({ id: "remove-zone", data: { type: "root" } });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const [activeId, setActiveId] = useState<string | null>(null);
  const [coordinateOverId, setCoordinateOverId] = useState<string | null>(null);
  const lastPointerRef = React.useRef<{ x: number; y: number } | null>(null);

  const getDropzoneIdAtPoint = React.useCallback((x: number, y: number) => {
    const elements = document.elementsFromPoint(x, y);
    for (const element of elements) {
      if (!(element instanceof HTMLElement)) continue;
      const dropzone = element.dataset.flashcardDropzone;
      if (dropzone) return dropzone;
    }
    return null;
  }, []);

  const getDropzoneIdAtLastPointer = React.useCallback(() => {
    const point = lastPointerRef.current;
    if (!point) return null;
    return getDropzoneIdAtPoint(point.x, point.y);
  }, [getDropzoneIdAtPoint]);

  useEffect(() => {
    if (!activeId) {
      setCoordinateOverId(null);
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      setCoordinateOverId(getDropzoneIdAtPoint(event.clientX, event.clientY));
    };

    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", handlePointerMove, true);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", handlePointerMove, true);
    };
  }, [activeId, getDropzoneIdAtPoint]);

  const collisionDetectionStrategy = (args: any) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;

    const intersecting = rectIntersection(args);
    if (intersecting.length > 0) return intersecting;

    return closestCorners(args);
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
    setCoordinateOverId(null);
    setContextMenu(null);

    const activatorEvent = event.activatorEvent;
    if (activatorEvent && typeof activatorEvent.clientX === "number" && typeof activatorEvent.clientY === "number") {
      lastPointerRef.current = { x: activatorEvent.clientX, y: activatorEvent.clientY };
    }
  };

  const handleDragMove = () => {
    const dropzoneId = getDropzoneIdAtLastPointer();
    setCoordinateOverId(dropzoneId);
  };

  const resolveFolderIdFromDropTarget = (targetId: any, activeSetId: string) => {
    if (!targetId) return undefined;

    const target = String(targetId);
    if (target === "root" || target === "remove-zone") return null;
    if (target.startsWith("folder-")) return target.replace("folder-", "");

    const overSet = sets.find((s) => s.id === target && s.id !== activeSetId);
    if (overSet) return overSet.folderId ?? null;

    return undefined;
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    const activeSetId = String(active.id);
    const activeSet = sets.find((s) => s.id === activeSetId);

    setActiveId(null);
    setCoordinateOverId(null);

    if (!activeSet) return;

    const coordinateDropId = getDropzoneIdAtLastPointer();
    const resolvedByPointer = resolveFolderIdFromDropTarget(coordinateDropId, activeSetId);
    const resolvedByDnd = resolveFolderIdFromDropTarget(over?.id, activeSetId);

    // Pointer position is more reliable than over.id when the root area is empty.
    // over.id can still be the dragged card or its old folder, so prefer the real dropzone under the cursor.
    const newFolderId = resolvedByPointer !== undefined ? resolvedByPointer : resolvedByDnd;
    if (newFolderId === undefined) return;

    const oldFolderId = activeSet.folderId ?? null;
    if (oldFolderId === newFolderId) return;

    useFlashcardStore.setState((state) => ({
      sets: state.sets.map((s) => (s.id === activeSet.id ? { ...s, folderId: newFolderId } : s)),
    }));

    const saved = await updateSet(activeSet.id, { folderId: newFolderId });
    if (!saved) {
      useFlashcardStore.setState((state) => ({
        sets: state.sets.map((s) => (s.id === activeSet.id ? { ...s, folderId: oldFolderId } : s)),
      }));
      toastService.error("Chưa lưu được vị trí mới của bộ thẻ.");
    }
  };

  // --- Context Menu Handlers ---
  const handleContextMenu = (e: React.MouseEvent, type: "root" | "folder" | "set", item: any = null) => {
    e.preventDefault();
    e.stopPropagation();

    // Calculate position keeping it within screen bounds
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 200);

    setContextMenu({ x, y, type, item });
  };

  const openCreateSetModal = (folderId: string | null = null) => {
    setEditingSet(null);
    setNewTitle("");
    setNewDesc("");
    setSetIsPublic(true);
    setSelectedLanguage("en");
    setSelectedCategoryId(activeCategoryId !== "all" ? activeCategoryId : "");
    setTargetFolderIdForNewSet(folderId);
    setSelectedColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    setIsModalOpen(true);
  };

  const handleCreateOrUpdateSet = async () => {
    if (!newTitle.trim()) {
      toastService.error("Vui lòng nhập tên bộ thẻ");
      return;
    }

    if (!setIsPublic && !isVip) {
      toastService.error("Bộ thẻ riêng tư chỉ dành cho tài khoản VIP. Vui lòng chọn Công khai hoặc nâng cấp VIP.");
      return;
    }

    let res;
    if (editingSet) {
      res = await updateSet(editingSet.id, { title: newTitle, description: newDesc, color: selectedColor, isPublic: setIsPublic, categoryId: selectedCategoryId || null, language: selectedLanguage });
    } else {
      res = await createSet(newTitle, newDesc, selectedColor, setIsPublic, selectedCategoryId || null, selectedLanguage);
      if (res && targetFolderIdForNewSet) {
        await updateSet(res.id, { folderId: targetFolderIdForNewSet });
      }
    }

    if (res) {
      await fetchPublicSets();
    }

    if (res) {
      setIsModalOpen(false);
      setEditingSet(null);
    }
  };

  const handleCreateOrUpdateFolder = async () => {
    if (!newFolderName.trim()) {
      toastService.error("Vui lòng nhập tên thư mục");
      return;
    }

    let res;
    if (editingFolder) {
      res = await updateFolder(editingFolder.id, { name: newFolderName, color: newFolderColor });
    } else {
      res = await createFolder(newFolderName, newFolderColor);
    }

    if (res) {
      setIsFolderModalOpen(false);
      setEditingFolder(null);
      setNewFolderName("");
    }
  };

  const handleDeleteFolderConfirmed = async (folderId: string, deleteSets: boolean) => {
    await deleteFolder(folderId, deleteSets);
    setFolderToDelete(null);
  };

  const matchesSearch = React.useCallback(
    (set: any) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      const haystack = [set.title, set.description, set.categoryName, set.category, set.creator?.displayName, String(set.cardCount || "")].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    },
    [searchQuery],
  );

  // Helper arrays
  const searchedSets = sets.filter(matchesSearch).filter((s) => activeCategoryId === "all" || s.categoryId === activeCategoryId);
  const unassignedSets = searchedSets.filter((s) => !s.folderId);
  const activeSetForOverlay = sets.find((s) => s.id === activeId);
  const isRootDropActive = isRootOver || coordinateOverId === "root" || coordinateOverId === "remove-zone";
  const getCategoryCount = (categoryId: string) => sets.filter((set: any) => String(set.categoryId || "") === String(categoryId)).length;
  const publicCategoryOptions = Array.from(
    publicSets
      .filter((set: any) => set.isPublic && set.categoryName)
      .reduce((map: Map<string, { name: string; count: number }>, set: any) => {
        const name = String(set.categoryName).trim();
        const key = name.toLowerCase();
        const current = map.get(key) || { name, count: 0 };
        current.count += 1;
        map.set(key, current);
        return map;
      }, new Map<string, { name: string; count: number }>())
      .values(),
  ).sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const displayedPublicSets = publicSets
    .filter((set: any) => set.isPublic)
    .filter(matchesSearch)
    .filter(
      (set: any) =>
        activePublicCategoryName === "all" ||
        String(set.categoryName || "")
          .trim()
          .toLowerCase() === activePublicCategoryName,
    );

  const builtinCategoryOptions = [
    { name: "IELTS", count: builtinSets.filter((set: any) => String(set.categoryName || set.category).toUpperCase() === "IELTS").length, color: "bg-indigo-600" },
    { name: "TOEIC", count: builtinSets.filter((set: any) => String(set.categoryName || set.category).toUpperCase() === "TOEIC").length, color: "bg-emerald-600" },
  ];

  const displayedBuiltinSets = builtinSets.filter(matchesSearch).filter(
    (set: any) =>
      activeBuiltinCategoryName === "all" ||
      String(set.categoryName || set.category || "")
        .trim()
        .toLowerCase() === activeBuiltinCategoryName,
  );

  const handleClonePublicSet = async (setId: string) => {
    const cloned = await cloneSet(setId);
    if (cloned) {
      await fetchSets();
      setActiveTab("mine");
    }
  };

  const handleCloneBuiltinSet = async (setId: string) => {
    const cloned = await cloneBuiltinSet(setId);
    if (cloned) {
      await fetchSets();
      setActiveTab("mine");
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toastService.error("Nhập tên đề mục trước");
      return;
    }
    const created = await createCategory(name, COLORS[Math.floor(Math.random() * COLORS.length)]);
    if (created) {
      setNewCategoryName("");
      setActiveCategoryId(created.id);
      setSelectedCategoryId(created.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 min-h-screen" onContextMenu={(e) => handleContextMenu(e, "root")}>
      <SEO title="Quản lý thẻ ghi nhớ" description="Tạo và quản lý các bộ thẻ Flashcards cá nhân để học từ vựng hiệu quả." />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src="/mascot/Lopy (11).png" className="w-16 h-16 object-contain drop-shadow-md" alt="Mascot" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Thẻ lật</h1>
            <p className="text-gray-500">Ôn tập và ghi nhớ từ vựng hiệu quả qua các bộ thẻ.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingFolder(null);
              setNewFolderName("");
              setNewFolderColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
              setIsFolderModalOpen(true);
            }}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <FolderIcon className="w-5 h-5" /> Tạo Folder
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openCreateSetModal(null);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" /> Tạo bộ thẻ
          </button>
        </div>
      </div>

      {activeTab === "mine" && (
        <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-700">Đề mục flashcard</h2>
              <p className="text-xs font-medium text-gray-400">Chia bộ thẻ theo mục như IELTS, TOEIC, Giao tiếp hoặc mục tự tạo.</p>
            </div>
            <div className="flex gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
                placeholder="Tạo đề mục mới..."
                className="w-44 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
              />
              <button onClick={handleCreateCategory} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                Thêm
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategoryId("all")}
              className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition-all ${activeCategoryId === "all" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Tất cả
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${activeCategoryId === "all" ? "bg-white/20 text-white" : "bg-white text-gray-500"}`}>{sets.length}</span>
            </button>
            {categories.map((category: any) => (
              <div key={category.id} className="group inline-flex shrink-0 items-center overflow-hidden rounded-2xl bg-gray-100">
                <button
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-extrabold transition-all ${activeCategoryId === category.id ? `${category.color || "bg-blue-600"} text-white shadow-sm` : "text-gray-600 hover:bg-gray-200"}`}
                >
                  <span>{category.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${activeCategoryId === category.id ? "bg-white/20 text-white" : "bg-white text-gray-500"}`}>
                    {getCategoryCount(category.id)}
                  </span>
                </button>
                <button onClick={() => deleteCategory(category.id)} title="Xóa đề mục" className="px-2 py-2 text-gray-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100">
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex flex-col sm:flex-row gap-2 w-full sm:w-max">
          <button
            onClick={() => setActiveTab("mine")}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === "mine" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Của tôi
          </button>
          <button
            onClick={() => setActiveTab("builtin")}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === "builtin" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Có sẵn
          </button>
          <button
            onClick={() => setActiveTab("public")}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === "public" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Công khai
          </button>
        </div>
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "public" ? "Tìm bộ thẻ công khai..." : activeTab === "builtin" ? "Tìm bộ thẻ có sẵn IELTS/TOEIC..." : "Tìm bộ thẻ của tôi..."}
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-gray-700 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
      </div>

      {activeTab === "builtin" ? (
        <div className="space-y-5">
          <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-5">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-indigo-800">
              <Star className="w-6 h-6" /> Bộ thẻ có sẵn cho người học
            </h2>
            <p className="mt-1 text-sm font-medium text-indigo-700/80">Học liệu IELTS và TOEIC được tách riêng khỏi bộ thẻ người dùng tạo. Đây là dữ liệu hệ thống nên không thể xóa.</p>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-700">Đề mục có sẵn</h3>
              <p className="text-xs font-medium text-gray-400">Chọn IELTS hoặc TOEIC để học nhanh theo mục tiêu.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveBuiltinCategoryName("all")}
                className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition-all ${activeBuiltinCategoryName === "all" ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                Tất cả
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${activeBuiltinCategoryName === "all" ? "bg-white/20 text-white" : "bg-white text-gray-500"}`}>{builtinSets.length}</span>
              </button>
              {builtinCategoryOptions.map((category) => {
                const key = category.name.toLowerCase();
                return (
                  <button
                    key={key}
                    onClick={() => setActiveBuiltinCategoryName(key)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition-all ${activeBuiltinCategoryName === key ? `${category.color} text-white shadow-sm` : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    {category.name}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${activeBuiltinCategoryName === key ? "bg-white/20 text-white" : "bg-white text-gray-500"}`}>{category.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {displayedBuiltinSets.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500 font-medium">Không tìm thấy bộ thẻ có sẵn phù hợp.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedBuiltinSets.map((set: any) => (
                <div key={set.id} className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden">
                  <div className={`w-12 h-12 rounded-2xl ${set.color || "bg-indigo-500"} flex items-center justify-center text-white shadow-sm mb-4`}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{set.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{set.description || "Bộ thẻ có sẵn của ZenTask"}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold mb-5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-600">
                      <Star className="w-3 h-3" /> Có sẵn
                    </span>
                    <span className="rounded-full bg-gray-50 px-2.5 py-1 text-gray-600">{set.cardCount || 0} thẻ</span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-600">{set.categoryName || set.category}</span>
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-3">
                    <button onClick={() => navigate(`/flashcard/${set.id}`)} className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-100 transition-colors">
                      Học ngay
                    </button>
                    <button
                      onClick={() => handleCloneBuiltinSet(set.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
                    >
                      <Copy className="w-4 h-4" /> Lưu
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "public" ? (
        <div className="space-y-5">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-emerald-800">
              <Globe2 className="w-6 h-6" /> Bộ thẻ công khai
            </h2>
            <p className="mt-1 text-sm font-medium text-emerald-700/80">Tất cả bộ thẻ được người dùng đặt công khai sẽ xuất hiện tại đây.</p>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-700">Đề mục công khai</h3>
              <p className="text-xs font-medium text-gray-400">Lọc nhanh các bộ thẻ công khai theo IELTS, TOEIC, Giao tiếp hoặc đề mục người chia sẻ đặt.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActivePublicCategoryName("all")}
                className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition-all ${activePublicCategoryName === "all" ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                Tất cả
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${activePublicCategoryName === "all" ? "bg-white/20 text-white" : "bg-white text-gray-500"}`}>
                  {publicSets.filter((set: any) => set.isPublic).length}
                </span>
              </button>
              {publicCategoryOptions.map((category) => {
                const key = category.name.toLowerCase();
                return (
                  <button
                    key={key}
                    onClick={() => setActivePublicCategoryName(key)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition-all ${activePublicCategoryName === key ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    {category.name}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${activePublicCategoryName === key ? "bg-white/20 text-white" : "bg-white text-gray-500"}`}>{category.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {loading && displayedPublicSets.length === 0 ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
          ) : displayedPublicSets.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500 font-medium">
              {searchQuery.trim() ? "Không tìm thấy bộ thẻ công khai phù hợp." : "Chưa có bộ thẻ công khai nào."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedPublicSets.map((set: any) => (
                <div key={set.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden">
                  <div className={`w-12 h-12 rounded-2xl ${set.color || "bg-blue-500"} flex items-center justify-center text-white shadow-sm mb-4`}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{set.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{set.description || "Không có mô tả"}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold mb-5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-600">
                      <Globe2 className="w-3 h-3" /> Công khai
                    </span>
                    <span className="rounded-full bg-gray-50 px-2.5 py-1 text-gray-600">{set.cardCount || 0} thẻ</span>
                    {set.categoryName && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-600">{set.categoryName}</span>}
                    {set.language && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-orange-600">{LANG_MAP[set.language || "en"] || set.language.toUpperCase()}</span>
                    )}
                  </div>
                  {set.creator?.displayName && <p className="mb-5 text-xs font-semibold text-gray-400">Tác giả: {set.creator.displayName}</p>}
                  <div className="mt-auto grid grid-cols-2 gap-3">
                    <button onClick={() => navigate(`/flashcard/${set.id}`)} className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-100 transition-colors">
                      Xem trước
                    </button>
                    <button
                      onClick={() => handleClonePublicSet(set.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
                    >
                      <Copy className="w-4 h-4" /> Lưu
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={collisionDetectionStrategy} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
          {/* Floating Remove Dropzone */}
          <div
            ref={removeZoneRef}
            data-flashcard-dropzone="remove-zone"
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-full shadow-2xl transition-all duration-300 border-2 flex items-center gap-3 ${
              activeId && activeSetForOverlay?.folderId ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20 pointer-events-none"
            } ${isRemoveZoneOver || coordinateOverId === "remove-zone" ? "bg-red-50 border-red-500 text-red-600 scale-110 shadow-red-200" : "bg-white border-dashed border-gray-400 text-gray-600"}`}
          >
            <FolderIcon className="w-6 h-6" />
            <span className="font-bold text-lg">Kéo thả vào đây để đưa ra ngoài thư mục</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
              {/* Folders */}
              {folders.map((folder) => (
                <FolderDroppable
                  key={folder.id}
                  folder={folder}
                  setsInFolder={searchedSets.filter((s) => s.folderId === folder.id)}
                  onContextMenu={handleContextMenu}
                  onSetClick={(s: any) => navigate(`/flashcard/${s.id}`)}
                  popoverId={popoverId}
                  setPopoverId={setPopoverId}
                  onEditSet={(s: any) => {
                    setEditingSet(s);
                    setNewTitle(s.title);
                    setNewDesc(s.description || "");
                    setSelectedColor(s.color || "bg-blue-500");
                    setSetIsPublic(s.isPublic !== false);
                    setSelectedCategoryId(s.categoryId || "");
                    setSelectedLanguage(s.language || "en");
                    setIsModalOpen(true);
                  }}
                  onDeleteSet={(s: any) => setSetToDelete(s)}
                  forceOver={coordinateOverId === `folder-${folder.id}`}
                />
              ))}

              {/* Unassigned Sets (Root) */}
              <div
                ref={rootDropRef}
                data-flashcard-dropzone="root"
                className={`space-y-4 min-h-[240px] p-4 rounded-3xl transition-all duration-200 border ${isRootDropActive ? "border-blue-500 shadow-md ring-4 ring-blue-500/20 bg-blue-50/50" : "border-transparent"}`}
              >
                <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">Bộ thẻ chưa phân loại</h2>

                {loading && sets.length === 0 ? (
                  <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <SortableContext items={unassignedSets.map((s) => s.id)} strategy={rectSortingStrategy}>
                    <div
                      data-flashcard-dropzone="root"
                      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[200px] p-4 rounded-3xl border transition-all ${isRootDropActive ? "bg-blue-50 border-blue-300 ring-4 ring-blue-500/10" : "bg-gray-50/50 border-gray-100"}`}
                    >
                      {unassignedSets.length === 0 && (
                        <div
                          data-flashcard-dropzone="root"
                          className={`col-span-full flex min-h-[150px] flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl transition-all ${isRootDropActive ? "border-blue-400 bg-white text-blue-700" : "border-gray-300 text-gray-500"}`}
                        >
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {searchQuery.trim() ? "Không tìm thấy bộ thẻ phù hợp" : folders.length === 0 ? "Chưa có bộ thẻ nào" : "Chưa có bộ thẻ chưa phân loại"}
                          </h3>
                          <p className="text-gray-500 mb-6">
                            {searchQuery.trim()
                              ? "Thử đổi từ khóa hoặc chuyển sang tab Công khai."
                              : folders.length === 0
                                ? "Hãy tạo bộ thẻ đầu tiên hoặc thư mục để bắt đầu."
                                : "Kéo bộ thẻ từ thư mục vào vùng này để đưa ra ngoài."}
                          </p>
                        </div>
                      )}
                      {unassignedSets.map((set) => (
                        <SortableSetItem
                          key={set.id}
                          set={set}
                          onClick={() => navigate(`/flashcard/${set.id}`)}
                          onContextMenu={handleContextMenu}
                          popoverId={popoverId}
                          setPopoverId={setPopoverId}
                          onEdit={(s: any) => {
                            setEditingSet(s);
                            setNewTitle(s.title);
                            setNewDesc(s.description || "");
                            setSelectedColor(s.color || "bg-blue-500");
                            setSetIsPublic(s.isPublic !== false);
                            setSelectedCategoryId(s.categoryId || "");
                            setSelectedLanguage(s.language || "en");
                            setIsModalOpen(true);
                          }}
                          onDelete={(s: any) => setSetToDelete(s)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                )}
              </div>
            </div>

            {/* Rank Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Current Rank Card */}
              <div className="bg-gradient-to-b from-blue-900 to-indigo-950 rounded-2xl p-5 text-white shadow-sm relative overflow-hidden transition-all">
                <div className="absolute top-1/2 -translate-y-1/2 right-0 opacity-20 pointer-events-none scale-150">
                  <img src={`/rank/${currentRank.rankId}.png`} alt="Rank Background" className="w-40 h-40 object-contain drop-shadow-2xl" />
                </div>

                <RankCard showButton={true} buttonText="Tham gia Rank" />
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeSetForOverlay ? (
              <div className="w-[300px] pointer-events-none">
                <SortableSetItem set={activeSetForOverlay} onClick={() => {}} onContextMenu={() => {}} popoverId={null} setPopoverId={() => {}} onEdit={() => {}} onDelete={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* --- Context Menu Portal --- */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-xl shadow-2xl border border-gray-100 py-2 w-48 z-[200] overflow-hidden animate-in fade-in zoom-in duration-200"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === "root" && (
            <>
              <button
                onClick={() => {
                  openCreateSetModal(null);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Tạo bộ thẻ mới
              </button>
              <button
                onClick={() => {
                  setEditingFolder(null);
                  setNewFolderName("");
                  setNewFolderColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
                  setIsFolderModalOpen(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <FolderIcon className="w-4 h-4" /> Tạo Folder mới
              </button>
            </>
          )}
          {contextMenu.type === "folder" && (
            <>
              <button
                onClick={() => {
                  setEditingFolder(contextMenu.item);
                  setNewFolderName(contextMenu.item.name);
                  setNewFolderColor(contextMenu.item.color || "bg-blue-500");
                  setIsFolderModalOpen(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Sửa thư mục
              </button>
              <button
                onClick={() => {
                  openCreateSetModal(contextMenu.item.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Tạo thẻ trong folder
              </button>
              <div className="h-px bg-gray-100 my-1"></div>
              <button
                onClick={() => {
                  setFolderToDelete({ folder: contextMenu.item, step: 1 });
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Xóa folder
              </button>
              <button
                onClick={() => {
                  setFolderToDelete({ folder: contextMenu.item, step: 2 });
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Xóa folder + thẻ
              </button>
            </>
          )}
          {contextMenu.type === "set" && (
            <>
              <button
                onClick={() => {
                  setEditingSet(contextMenu.item);
                  setNewTitle(contextMenu.item.title);
                  setNewDesc(contextMenu.item.description || "");
                  setSelectedColor(contextMenu.item.color || "bg-blue-500");
                  setSetIsPublic(contextMenu.item.isPublic !== false);
                  setSelectedLanguage(contextMenu.item.language || "en");
                  setIsModalOpen(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Sửa bộ thẻ
              </button>
              <button
                onClick={() => {
                  setSetToDelete(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Xóa
              </button>
            </>
          )}
        </div>
      )}
      <div className="flex gap-4">
        <Link to="https://zalo.me/0842034755" target="_blank" className="bg-white rounded-2xl p-1 border border-gray-100 shadow-sm">
          <img src="/lopy-zentask-bot.png" alt="" className="h-full w-full cursor-pointer" />
        </Link>
        <Link
          to="https://chromewebstore.google.com/detail/lkhjgkjabnfbfblflgkcapamidmfkjnc?utm_source=item-share-cb"
          target="_blank"
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm "
        >
          <img src="/zentask-extension-banner.png" alt="" className="h-full w-full cursor-pointer rounded-2xl" />
        </Link>
      </div>
      {/* --- Modals --- */}
      <CreateEditFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        editingFolder={editingFolder}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        newFolderColor={newFolderColor}
        setNewFolderColor={setNewFolderColor}
        handleCreateOrUpdateFolder={handleCreateOrUpdateFolder}
        loading={loading}
      />

      <DeleteFolderModal folderToDelete={folderToDelete} onClose={() => setFolderToDelete(null)} handleDeleteFolderConfirmed={handleDeleteFolderConfirmed} loading={loading} />

      <CreateEditSetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingSet={editingSet}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newDesc={newDesc}
        setNewDesc={setNewDesc}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        categories={categories}
        setIsPublic={setIsPublic}
        setSetIsPublic={setSetIsPublic}
        isVip={isVip}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        handleCreateOrUpdateSet={handleCreateOrUpdateSet}
        loading={loading}
      />

      <DeleteSetModal
        setToDelete={setToDelete}
        onClose={() => setSetToDelete(null)}
        handleDeleteSet={async (id: string) => {
          await deleteSet(id);
          setSetToDelete(null);
        }}
        loading={loading}
      />
    </div>
  );
}
