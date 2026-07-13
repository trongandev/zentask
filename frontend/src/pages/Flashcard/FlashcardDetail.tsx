import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Play, Volume2, Trash2, Brain, ChevronDown, ChevronUp, MoreVertical, Pencil, Star, LayoutGrid, AlignJustify, Rows3, ChevronRight, X, Check } from "lucide-react";
import { useFlashcardStore, getMemoryLevel, type MemoryLevel } from "../../services/flashcardService";
import { useConfigStore } from "../../services/configService";
import { useAuth } from "../../contexts/AuthContext";
import { useUserStore } from "../../services/userService";
import { cn } from "../../lib/utils";
import toastService from "@/src/services/toastService";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { VoiceSelectorModal } from "../../components/practice/VoiceSelectorModal";
import { getVoiceForLanguage } from "../../lib/ttsVoiceStorage";
import { Modal } from "../../components/shared/Modal";

type ViewMode = "line" | "grid" | "compact";

const MEMORY_CONFIG = {
  known: { label: "Đã nhớ", cls: "bg-green-100 text-green-700 border-green-200", icon: "✓", activeCls: "bg-green-500 text-white border-green-600" },
  almost: { label: "Gần nhớ", cls: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: "◎", activeCls: "bg-yellow-400 text-white border-yellow-500" },
  unknown: { label: "Chưa nhớ", cls: "bg-red-100 text-red-600 border-red-200", icon: "✗", activeCls: "bg-red-500 text-white border-red-600" },
};

export function FlashcardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchCards, createCard, deleteCard, fetchProgress, setManualProgress, cardProgress, currentSet, cards, loading } = useFlashcardStore();

  const { incrementTaskProgress } = useConfigStore();
  const { updateUser } = useAuth();
  const { triggerLevelUp } = useUserStore();
  const { playAudio, isLoading, loadingText } = useTTSAudio();

  // UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("line");
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [memoryModalCardId, setMemoryModalCardId] = useState<string | null>(null);
  // Grid: track which card is expanded (col-span-full)
  const [expandedGridCardId, setExpandedGridCardId] = useState<string | null>(null);

  const [currentVoiceId, setCurrentVoiceId] = useState(() => {
    return getVoiceForLanguage();
  });

  // Sticky header state
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const headerSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headerSentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeaderVisible(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" },
    );
    observer.observe(headerSentinelRef.current);
    return () => observer.disconnect();
  }, []);

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

  // Close popover when clicking outside
  const popoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (openPopoverId && !(e.target as Element).closest("[data-popover-root]")) {
        setOpenPopoverId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openPopoverId]);

  useEffect(() => {
    if (id) {
      fetchCards(id);
      fetchProgress(id);
    }
  }, [id, fetchCards, fetchProgress]);

  // Update voice when set language is known
  useEffect(() => {
    if (currentSet?.language) {
      setCurrentVoiceId(getVoiceForLanguage(currentSet.language));
    }
  }, [currentSet?.language]);

  // Compute memory statistics
  const memoryStats = useMemo(() => {
    let known = 0,
      almost = 0,
      unknown = 0;
    cards.forEach((card) => {
      const level = getMemoryLevel(cardProgress[card.id]);
      if (level === "known") known++;
      else if (level === "almost") almost++;
      else unknown++;
    });
    return { known, almost, unknown, total: cards.length };
  }, [cards, cardProgress]);

  const unknownCards = useMemo(() => cards.filter((c) => getMemoryLevel(cardProgress[c.id]) === "unknown"), [cards, cardProgress]);

  const handlePlayAudio = (text: string) => {
    playAudio(text, currentVoiceId);
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
      toastService.error("Vui lòng điền tiêu đề và dịch nghĩa");
      return;
    }
    const filteredExamples = examples.filter((ex) => ex.en.trim() !== "");
    if (id) {
      const res = await createCard(id, { term, phonetic, translation, notes, examples: filteredExamples });
      if (res) {
        setIsModalOpen(false);
        resetForm();
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa thẻ này?")) {
      setOpenPopoverId(null);
      await deleteCard(cardId);
    }
  };

  const handleCreateAI = async () => {
    if (!term.trim()) {
      toastService.error("Vui lòng nhập từ vựng cần tạo");
      return;
    }
    const res = await useFlashcardStore.getState().generateAI(term, id);
    if (res && id) {
      const examplesToSave = res.examples?.length > 0 ? res.examples.slice(0, 3).map((ex: any) => ({ en: ex.en || "", vi: ex.vi || "" })) : [];
      const cardRes = await createCard(id, {
        term: res.term || term,
        phonetic: res.phonetic || "",
        translation: res.translation || "",
        notes: res.notes || "",
        examples: examplesToSave,
      });
      if (cardRes) {
        setIsModalOpen(false);
        resetForm();
      }
    }
  };

  const handleManualMemory = async (level: MemoryLevel) => {
    if (!memoryModalCardId || !id) return;
    await setManualProgress(memoryModalCardId, id, level);
    setMemoryModalCardId(null);
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

  const isBuiltInSet = Boolean((currentSet as any)?.isBuiltIn || String(currentSet.id || "").startsWith("builtin_"));

  // ─── Card item renderers per view ───────────────────────────────────────────

  const renderPopover = (cardId: string) => {
    if (isBuiltInSet) {
      return <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-extrabold text-indigo-600">Có sẵn</span>;
    }
    return (
      <div data-popover-root className="relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setOpenPopoverId(openPopoverId === cardId ? null : cardId)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
        {openPopoverId === cardId && (
          <div className="absolute right-0 top-8 z-50 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => {
                setOpenPopoverId(null);
                toastService.info("Tính năng chỉnh sửa đang phát triển");
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-4 h-4 text-blue-500" />
              Chỉnh sửa từ vựng
            </button>
            <button
              onClick={() => {
                setMemoryModalCardId(cardId);
                setOpenPopoverId(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Star className="w-4 h-4 text-yellow-500" />
              Thay đổi độ nhớ
            </button>
            <div className="my-1 border-t border-gray-100" />
            <button onClick={() => handleDeleteCard(cardId)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
              Xóa từ
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderBadge = (cardId: string) => {
    const level = getMemoryLevel(cardProgress[cardId]);
    const cfg = MEMORY_CONFIG[level];
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border", cfg.cls)}>
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  // LINE VIEW (default)
  const renderLineCard = (card: any) => (
    <div key={card.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
      <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-900">{card.term}</h3>
            <button onClick={() => handlePlayAudio(card.term)} disabled={isLoading && loadingText === card.term} className="text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50">
              {isLoading && loadingText === card.term ? <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
          {renderPopover(card.id)}
        </div>
        {card.phonetic && <p className="text-gray-400 font-mono text-sm mb-2">{card.phonetic}</p>}
        <p className="text-blue-600 font-bold mb-3">{card.translation}</p>
        {renderBadge(card.id)}
        {card.notes && (
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800 border border-yellow-100">
            <span className="font-bold block mb-1">Ghi chú:</span>
            {card.notes}
          </div>
        )}
      </div>
      <div className="md:w-2/3 space-y-3">
        <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Ví dụ</h4>
        {card.examples?.length > 0 ? (
          card.examples.map((ex: any, idx: number) => (
            <div key={idx} className="flex items-start gap-2">
              <button
                onClick={() => handlePlayAudio(ex.en)}
                disabled={isLoading && loadingText === ex.en}
                className="mt-0.5 text-gray-300 hover:text-blue-500 transition-colors shrink-0 disabled:opacity-50"
              >
                {isLoading && loadingText === ex.en ? <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div> : <Volume2 className="w-4 h-4" />}
              </button>
              <div>
                <p className="text-gray-800 font-medium text-sm">{ex.en}</p>
                <p className="text-gray-500 text-xs">{ex.vi}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-sm italic">Không có ví dụ</p>
        )}
      </div>
    </div>
  );

  // GRID VIEW (2 per row, expandable examples)
  const renderGridCard = (card: any) => {
    const isExpanded = expandedGridCardId === card.id;
    return (
      <div key={card.id} className={cn("bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 transition-all duration-300", isExpanded ? "col-span-2" : "")}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{card.term}</h3>
            <button
              onClick={() => handlePlayAudio(card.term)}
              disabled={isLoading && loadingText === card.term}
              className="text-gray-400 hover:text-blue-500 transition-colors shrink-0 disabled:opacity-50"
            >
              {isLoading && loadingText === card.term ? <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
          {renderPopover(card.id)}
        </div>

        {card.phonetic && <p className="text-gray-400 font-mono text-xs">{card.phonetic}</p>}
        <p className="text-blue-600 font-bold text-sm">{card.translation}</p>
        {renderBadge(card.id)}

        {/* Toggle example */}
        <button
          onClick={() => setExpandedGridCardId(isExpanded ? null : card.id)}
          className="mt-auto flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 font-medium transition-colors self-start"
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          {isExpanded ? "Ẩn ví dụ" : "Xem ví dụ"}
        </button>

        {isExpanded && card.examples?.length > 0 && (
          <div className="pt-3 border-t border-gray-100 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ví dụ</h4>
            {card.examples.map((ex: any, idx: number) => (
              <div key={idx} className="flex items-start gap-2">
                <button
                  onClick={() => handlePlayAudio(ex.en)}
                  disabled={isLoading && loadingText === ex.en}
                  className="mt-0.5 text-gray-300 hover:text-blue-500 transition-colors shrink-0 disabled:opacity-50"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                <div>
                  <p className="text-gray-800 font-medium text-sm">{ex.en}</p>
                  <p className="text-gray-500 text-xs">{ex.vi}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // COMPACT VIEW (3 per row, minimal)
  const renderCompactCard = (card: any) => (
    <div key={card.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
      <button onClick={() => handlePlayAudio(card.term)} disabled={isLoading && loadingText === card.term} className="text-gray-400 hover:text-blue-500 transition-colors shrink-0 disabled:opacity-50">
        {isLoading && loadingText === card.term ? <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div> : <Volume2 className="w-4 h-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-900 text-sm truncate">{card.term}</p>
        <p className="text-blue-600 text-xs truncate">{card.translation}</p>
      </div>
      {renderBadge(card.id)}
      {renderPopover(card.id)}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      {/* Sentinel for sticky header */}
      <div ref={headerSentinelRef} className="absolute top-0 w-full h-px pointer-events-none" />

      {/* Sticky Header */}
      <div className="sticky top-0 z-50 h-0 overflow-visible">
        <div
          className={cn(
            "absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300 flex items-center justify-between px-4 sm:px-6 py-3 rounded-b-2xl -mx-4 sm:-mx-6",
            !isHeaderVisible ? "translate-y-0 opacity-100 pointer-events-auto" : "-translate-y-full opacity-0 pointer-events-none",
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-gray-900 text-sm leading-tight truncate">{currentSet.title}</span>
              <span className="text-xs text-gray-500">{currentSet.cardCount} thẻ</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setIsVoiceModalOpen(true)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors hidden sm:block">
              Đổi giọng
            </button>
            <button
              onClick={() => navigate(`/flashcard/${id}/practice`)}
              className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
            >
              <Play className="w-4 h-4 fill-current" /> Học
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{currentSet.title}</h1>
            <p className="text-gray-500">
              {currentSet.cardCount} thẻ {isBuiltInSet ? "• Học liệu có sẵn, không thể xóa/sửa" : ""}
            </p>
          </div>
        </div>
        <button onClick={() => setIsVoiceModalOpen(true)} className="px-4 py-2 bg-blue-50 text-blue-600 font-semibold rounded-xl hover:bg-blue-100 transition-colors">
          Thay đổi giọng nói
        </button>
      </div>

      {/* Action bar */}
      <div className="flex justify-between items-center flex-wrap gap-3 md:gap-0 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <button onClick={() => navigate(`/flashcard/${id}/practice`)} className="bg-blue-50 text-blue-600 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors">
          <Play className="w-5 h-5 fill-current" /> Học bộ thẻ này
        </button>
        <div className="flex items-center gap-2">
          {/* View mode switcher */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            {(
              [
                { key: "line", icon: <AlignJustify className="w-4 h-4" />, title: "Dạng dòng" },
                { key: "grid", icon: <LayoutGrid className="w-4 h-4" />, title: "Dạng lưới" },
                { key: "compact", icon: <Rows3 className="w-4 h-4" />, title: "Thu gọn" },
              ] as { key: ViewMode; icon: React.ReactNode; title: string }[]
            ).map(({ key, icon, title }) => (
              <button
                key={key}
                title={title}
                onClick={() => setViewMode(key)}
                className={cn("p-2 rounded-lg transition-all", viewMode === key ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                {icon}
              </button>
            ))}
          </div>
          {!isBuiltInSet && (
            <button
              onClick={() => {
                setIsModalOpen(true);
                resetForm();
              }}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-5 h-5" /> Thêm từ mới
            </button>
          )}
        </div>
      </div>

      {/* Card Overview */}
      {cards.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Brain className="w-5 h-5 text-blue-500" />
              <span className="font-bold text-sm">Tổng quan học tập</span>
            </div>
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex">
                {memoryStats.total > 0 && (
                  <>
                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(memoryStats.known / memoryStats.total) * 100}%` }} />
                    <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: `${(memoryStats.almost / memoryStats.total) * 100}%` }} />
                    <div className="h-full bg-red-400 transition-all duration-500" style={{ width: `${(memoryStats.unknown / memoryStats.total) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-sm font-bold">
                <span className="flex items-center gap-1 text-green-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  {memoryStats.known}
                </span>
                <span className="flex items-center gap-1 text-yellow-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
                  {memoryStats.almost}
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                  {memoryStats.unknown}
                </span>
              </div>
            </div>
            {unknownCards.length > 0 && (
              <button onClick={() => setOverviewExpanded(!overviewExpanded)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
                {overviewExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {overviewExpanded ? "Ẩn" : `${unknownCards.length} chưa nhớ`}
              </button>
            )}
          </div>
          <div className="px-5 pb-4 flex items-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Đã nhớ ({memoryStats.known})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Gần nhớ ({memoryStats.almost})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Chưa nhớ ({memoryStats.unknown})
            </span>
          </div>
          {overviewExpanded && unknownCards.length > 0 && (
            <div className="border-t border-gray-100 px-5 py-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Từ cần học thêm</p>
              <div className="flex flex-wrap gap-2">
                {unknownCards.map((card) => (
                  <span key={card.id} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-semibold border border-red-100">
                    {card.term}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cards List */}
      {cards.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Chưa có từ vựng nào</h3>
          <p className="text-gray-500 mb-6">{isBuiltInSet ? "Bộ thẻ có sẵn này đang chưa có dữ liệu." : "Hãy thêm những từ vựng đầu tiên vào bộ thẻ này."}</p>
          {!isBuiltInSet && (
            <button
              onClick={() => {
                setIsModalOpen(true);
                resetForm();
              }}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 mx-auto hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" /> Thêm từ mới
            </button>
          )}
        </div>
      ) : viewMode === "line" ? (
        <div className="space-y-4">{cards.map(renderLineCard)}</div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-4">{cards.map(renderGridCard)}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">{cards.map(renderCompactCard)}</div>
      )}

      {/* ── Memory Level Modal ── */}
      {memoryModalCardId &&
        (() => {
          const card = cards.find((c) => c.id === memoryModalCardId);
          if (!card) return null;
          const currentLevel = getMemoryLevel(cardProgress[memoryModalCardId]);
          return (
            <div className="fixed inset-0 bg-gray-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setMemoryModalCardId(null)}>
              <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Thay đổi độ nhớ</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      <span className="font-bold text-gray-800">{card.term}</span> — {card.translation}
                    </p>
                  </div>
                  <button onClick={() => setMemoryModalCardId(null)} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-4">Chọn mức độ ghi nhớ</p>
                  {(["known", "almost", "unknown"] as MemoryLevel[]).map((level) => {
                    const cfg = MEMORY_CONFIG[level];
                    const isActive = currentLevel === level;
                    return (
                      <button
                        key={level}
                        onClick={() => handleManualMemory(level)}
                        className={cn(
                          "w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-200 text-left",
                          isActive ? cfg.activeCls + " scale-[1.02] shadow-md" : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700",
                        )}
                      >
                        <span className="text-2xl">{cfg.icon}</span>
                        <div className="flex-1">
                          <p className="font-bold text-base">{cfg.label}</p>
                          <p className="text-xs opacity-70">
                            {level === "known" ? "Tôi nhớ rõ từ này, không cần ôn sớm" : level === "almost" ? "Tôi gần nhớ, cần ôn lại trong vài ngày" : "Tôi chưa nhớ, cần ôn lại sớm"}
                          </p>
                        </div>
                        {isActive && <Check className="w-5 h-5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── Add Word Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Thêm từ mới" className="max-w-2xl">
        <div className="flex border-b border-gray-100">
          {(["ai", "manual"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn("flex-1 py-3 font-bold text-sm transition-colors", activeTab === tab ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-500 hover:bg-gray-50")}
            >
              {tab === "ai" ? "Tạo bằng AI" : "Tạo thủ công"}
            </button>
          ))}
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === "ai" ? (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">Nhập từ vựng tiếng Anh, AI sẽ tự động điền phiên âm, nghĩa tiếng Việt và các ví dụ cụ thể.</p>
              <input
                value={term}
                autoFocus
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateAI();
                }}
                type="text"
                placeholder="Ví dụ: determine"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
              <button
                disabled={loading}
                onClick={handleCreateAI}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Đang tạo..." : "Tạo bằng AI ✨"}
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
      </Modal>

      <VoiceSelectorModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} currentVoiceId={currentVoiceId} onSelectVoice={setCurrentVoiceId} language={currentSet?.language} />
    </div>
  );
}
