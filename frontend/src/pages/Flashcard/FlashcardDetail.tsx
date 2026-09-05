import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Play,
  Volume2,
  Trash2,
  Pencil,
  Star,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  ArrowLeft,
  Brain,
  BookOpen,
  LayoutGrid,
  List,
  Loader2,
} from "lucide-react";
import { useFlashcardStore, getMemoryLevel, type MemoryLevel } from "../../services/flashcardService";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { getVoiceForLanguage } from "../../lib/ttsVoiceStorage";
import { Modal } from "../../components/ui/Modal";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Textarea } from "@/src/components/ui/Textarea";
import toastService from "@/src/services/toastService";
import { cn } from "../../lib/utils";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";

export function FlashcardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchCards, createCard, updateCard, deleteCard, fetchProgress, setManualProgress, cardProgress, currentSet, cards, loading } = useFlashcardStore();
  const { playAudio, isLoading, loadingText } = useTTSAudio();

  const [activeTab, setActiveTab] = useState<"ai" | "manual" | "bulk_ai">("ai");
  const [bulkTerms, setBulkTerms] = useState("");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [currentVoiceId, setCurrentVoiceId] = useState(() => getVoiceForLanguage());

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
      fetchProgress(id);
    }
  }, [id, fetchCards, fetchProgress]);

  useEffect(() => {
    if (currentSet?.language) {
      setCurrentVoiceId(getVoiceForLanguage(currentSet.language));
    }
  }, [currentSet?.language]);

  // --- NEW UI STATE ---
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [filterMode, setFilterMode] = useState<"all" | "relearn" | "mastered" | "unknown">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [direction, setDirection] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const itemsPerPage = isMobile ? (viewMode === "list" ? 3 : 6) : viewMode === "list" ? 6 : 12;
  const filterCounts = useMemo(() => {
    let all = cards.length;
    let relearn = 0;
    let mastered = 0;
    let unknown = 0;
    cards.forEach((c) => {
      const lvl = getMemoryLevel(cardProgress[c.id]);
      if (lvl === "known") mastered++;
      else if (lvl === "almost") relearn++;
      else unknown++;
    });
    return { all, relearn, mastered, unknown };
  }, [cards, cardProgress]);

  // Filter cards
  const filteredCards = useMemo(() => {
    let filtered = cards;
    if (filterMode === "relearn") {
      filtered = filtered.filter((c) => getMemoryLevel(cardProgress[c.id]) === "almost");
    } else if (filterMode === "mastered") {
      filtered = filtered.filter((c) => getMemoryLevel(cardProgress[c.id]) === "known");
    } else if (filterMode === "unknown") {
      filtered = filtered.filter((c) => getMemoryLevel(cardProgress[c.id]) === "unknown");
    }
    if (searchTerm) {
      filtered = filtered.filter((c) => c.term.toLowerCase().includes(searchTerm.toLowerCase()) || c.translation.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return filtered;
  }, [cards, filterMode, searchTerm, cardProgress]);

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / itemsPerPage));
  const currentCards = filteredCards.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const activeCard = cards.find((c) => c.id === activeCardId) || currentCards[0] || cards[0];

  useEffect(() => {
    setCurrentPage(0);
  }, [filterMode, searchTerm, viewMode]);

  // Sync activeCardId if currentCards changes and activeCard is not in view
  useEffect(() => {
    if (currentCards.length > 0 && (!activeCardId || !currentCards.find((c) => c.id === activeCardId))) {
      setActiveCardId(currentCards[0].id);
    }
  }, [currentCards, activeCardId]);

  const handlePageChange = (newPage: number) => {
    setDirection(newPage > currentPage ? 1 : -1);
    setCurrentPage(newPage);
  };

  const handlePlayAudio = (text: string) => {
    playAudio(text, currentVoiceId);
  };

  // --- SWIPE GESTURES ---
  const dragX = useMotionValue(0);
  const dragRotate = useTransform(dragX, [-200, 200], [-10, 10]);

  const handleDragEnd = (e: any, info: any) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    const minSwipeOffset = 50;
    const minVelocity = 300;

    const isLeftSwipe = offset < -minSwipeOffset || velocity < -minVelocity;
    const isRightSwipe = offset > minSwipeOffset || velocity > minVelocity;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = filteredCards.findIndex((c) => c.id === activeCard?.id);
      if (currentIndex === -1) return;

      let newIndex = currentIndex;
      if (isLeftSwipe && currentIndex < filteredCards.length - 1) {
        newIndex++; // Next card
      } else if (isRightSwipe && currentIndex > 0) {
        newIndex--; // Prev card
      }

      if (newIndex !== currentIndex) {
        setActiveCardId(filteredCards[newIndex].id);
        const newPage = Math.floor(newIndex / itemsPerPage);
        if (newPage !== currentPage) {
          handlePageChange(newPage);
        }
      }
    }
  };
  const isBuiltInSet = Boolean((currentSet as any)?.isBuiltIn || String(currentSet?.id || "").startsWith("builtin_"));

  // --- FORM LOGIC ---
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
    if (editingCardId) {
      const res = await updateCard(editingCardId, { term, phonetic, translation, notes, examples: filteredExamples });
      if (res) {
        setIsModalOpen(false);
        resetForm();
        setEditingCardId(null);
      }
    } else if (id) {
      const res = await createCard(id, { term, phonetic, translation, notes, examples: filteredExamples });
      if (res) {
        setIsModalOpen(false);
        resetForm();
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa thẻ này?")) {
      await deleteCard(cardId);
      if (activeCardId === cardId) setActiveCardId(null);
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

  const handleCreateBulkAI = async () => {
    const words = bulkTerms
      .split(";")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
      
    if (words.length === 0) {
      toastService.error("Vui lòng nhập ít nhất 1 từ vựng");
      return;
    }
    if (words.length > 30) {
      toastService.error("Vui lòng chỉ nhập tối đa 30 từ mỗi lần tạo");
      return;
    }
    if (!id) return;
    
    const res = await useFlashcardStore.getState().generateAIList(words, id);
    if (res) {
      setIsModalOpen(false);
      setBulkTerms("");
      fetchCards(id); // reload cards after bulk generate
    }
  };

  const handleManualMemory = async (level: MemoryLevel, cardId: string) => {
    if (!id) return;
    await setManualProgress(cardId, id, level);
  };

  if (loading && !currentSet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentSet) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy bộ thẻ</p>
        <Button onClick={() => navigate("/flashcards")} className="mt-4 text-blue-600 font-semibold">
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full relative min-h-[calc(100vh-8rem)] rounded-3xl bg-gray-50/80 p-4 sm:p-6 shadow-sm border border-gray-200 flex flex-col gap-6 overflow-hidden">
      {/* Background decoration */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at center, #9ca3af 1px, transparent 1px)", backgroundSize: "20px 20px" }}
      ></div>

      {/* HEADER / NAVIGATION */}
      <div className="relative z-10 flex flex-col gap-4">
        {/* Top breadcrumb & Practice button */}
        <div className="flex flex-wrap items-center justify-between text-slate-900 mb-2 gap-4">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/flashcards")} className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-full p-2.5 transition-all shadow-sm hover:shadow-md active:scale-95">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight">
              <BookOpen className="w-6 h-6 text-blue-600" /> {currentSet.title}
            </h1>
          </div>
          <Button
            onClick={() => navigate(`/flashcard/${id}/practice`)}
            disabled={currentSet.cardCount === 0}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold shadow-sm hover:shadow-md hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" /> Học bộ thẻ ({currentSet.cardCount})
          </Button>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-col md:flex-row flex-wrap items-center justify-between gap-4 bg-slate-100/80 backdrop-blur rounded-[2rem] p-1.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-1 text-sm font-bold w-full md:w-auto">
            <Button
              onClick={() => setFilterMode("all")}
              className={cn("px-4 py-2 rounded-full transition-all duration-300 flex-1 md:flex-none", filterMode === "all" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Tất cả <span className="ml-1 opacity-70">({filterCounts.all})</span>
            </Button>
            <Button
              onClick={() => setFilterMode("unknown")}
              className={cn("px-4 py-2 rounded-full transition-all duration-300 flex-1 md:flex-none", filterMode === "unknown" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Chưa học <span className="ml-1 opacity-70">({filterCounts.unknown})</span>
            </Button>
            <Button
              onClick={() => setFilterMode("relearn")}
              className={cn("px-4 py-2 rounded-full transition-all duration-300 flex-1 md:flex-none", filterMode === "relearn" ? "bg-white text-yellow-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Cần ôn <span className="ml-1 opacity-70">({filterCounts.relearn})</span>
            </Button>
            <Button
              onClick={() => setFilterMode("mastered")}
              className={cn("px-4 py-2 rounded-full transition-all duration-300 flex-1 md:flex-none", filterMode === "mastered" ? "bg-white text-green-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Đã thuộc <span className="ml-1 opacity-70">({filterCounts.mastered})</span>
            </Button>
          </div>
        </div>

        {/* Action Row: Search & Create */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-full shadow-sm shrink-0 border border-slate-200/50">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-2 rounded-full transition-all duration-300", viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-2 rounded-full transition-all duration-300", viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white text-slate-800 border border-slate-200 rounded-full pl-11 pr-10 py-3 font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400 shadow-sm transition-all"
              placeholder="Tìm kiếm từ vựng..."
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {!isBuiltInSet && (
            <Button
              onClick={() => {
                setEditingCardId(null);
                setActiveTab("ai");
                setIsModalOpen(true);
                resetForm();
              }}
              className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-full font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
            >
              <Plus className="w-5 h-5" /> Thêm từ mới
            </Button>
          )}
        </div>
      </div>

      {/* ─── MAIN BOOK SPLIT LAYOUT ─── */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-4 min-h-[500px]">
        {/* LEFT PANEL: Active Card Details (Notepad Style) */}
        <motion.div
          style={{ x: dragX, rotate: dragRotate }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={handleDragEnd}
          className="w-full lg:w-2/5 bg-white rounded-[2rem] shadow-sm border border-gray-200 flex flex-col relative overflow-hidden"
        >
          {/* Notepad rings decoration */}
          <div className="absolute top-0 left-0 right-0 h-4 flex justify-around px-8 mt-3 pointer-events-none opacity-40">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-4 h-4 rounded-full bg-gray-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"></div>
            ))}
          </div>

          {activeCard ? (
            <div className="p-8 pt-12 flex-1 flex flex-col h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 items-center ">
                  {/* We use level badge as the 'type' badge here for aesthetics */}
                  {activeCard.phonetic && <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold font-mono">{activeCard.phonetic}</span>}
                </div>
                <div className="flex gap-2">
                  {activeCard.notes && (
                    <Button
                      onClick={() => setIsNoteModalOpen(true)}
                      className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-blue-600 flex items-center justify-center transition-colors"
                    >
                      <Info className="w-5 h-5" />
                    </Button>
                  )}
                  <Button
                    onClick={() => handlePlayAudio(activeCard.term)}
                    className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-blue-600 flex items-center justify-center transition-colors"
                  >
                    {isLoading && loadingText === activeCard.term ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>

              <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">{activeCard.term}</h2>

              <div className="bg-blue-50 rounded-2xl p-5 mb-6 border border-blue-100">
                <p className="text-blue-800 text-lg font-medium leading-relaxed">{activeCard.translation}</p>
              </div>

              {activeCard.examples && activeCard.examples.length > 0 && (
                <div className="mb-6 space-y-4">
                  <h4 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Ví dụ</h4>
                  {activeCard.examples.map((ex: any, idx: number) => (
                    <div key={idx} className="group">
                      <p className="text-gray-800 text-base font-medium flex items-start gap-2">
                        <button onClick={() => handlePlayAudio(ex.en)} className="mt-0.5 text-gray-400 group-hover:text-blue-500 transition-colors">
                          {isLoading && loadingText === ex.en ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <span>{ex.en}</span>
                      </p>
                      <p className="text-gray-500 text-sm pl-6 mt-1">{ex.vi}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-auto pt-6">
                {!isBuiltInSet && (
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => {
                        setTerm(activeCard.term);
                        setPhonetic(activeCard.phonetic || "");
                        setTranslation(activeCard.translation);
                        setNotes(activeCard.notes || "");
                        const ex = activeCard.examples || [];
                        setExamples([ex[0] || { en: "", vi: "" }, ex[1] || { en: "", vi: "" }, ex[2] || { en: "", vi: "" }]);
                        setEditingCardId(activeCard.id);
                        setActiveTab("manual");
                        setIsModalOpen(true);
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      <Pencil className="w-4 h-4" /> Chỉnh sửa
                    </Button>
                    <Button
                      onClick={() => handleDeleteCard(activeCard.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 p-3.5 rounded-xl font-bold flex items-center justify-center shadow-sm transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 flex-1 flex flex-col items-center justify-center text-gray-400">
              <Brain className="w-16 h-16 mb-4 opacity-50" />
              <p className="font-bold text-lg text-gray-600">Không có từ vựng nào</p>
              <p className="text-sm">Hãy thử tìm kiếm từ khác hoặc thêm mới.</p>
            </div>
          )}
        </motion.div>

        {/* RIGHT PANEL: Grid of Cards (Book Page Flip) */}
        <div className="w-full lg:w-3/5 bg-gray-100/50 rounded-[2rem] p-4 sm:p-6 shadow-inner border border-gray-200 relative overflow-hidden flex flex-col">
          {viewMode === "list" ? (
            <div className="flex flex-col overflow-y-auto pr-2 h-full pb-4 ">
              {currentCards.map((card) => {
                const level = getMemoryLevel(cardProgress[card.id]);

                return (
                  <div
                    key={card.id}
                    onClick={() => setActiveCardId(card.id)}
                    className={cn("p-4 m-2 rounded-[1.5rem] cursor-pointer flex gap-4 items-center transition-all duration-300 border shadow-sm hover:shadow-md active:scale-[0.98]", "bg-white border-slate-200 hover:bg-slate-50")}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className={cn("font-medium text-lg leading-tight truncate", "text-gray-900")}>
                        {card.term}
                        {card.phonetic && <span className="ml-3 font-normal text-xs font-mono text-gray-400">{card.phonetic}</span>}
                      </h3>
                      <p className={cn("text-sm font-medium truncate mt-1", "text-gray-600")}>{card.translation}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayAudio(card.term);
                        }}
                        className={cn(
                          "p-2 rounded-full transition-all bg-gray-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50",
                          isLoading && loadingText === card.term && "text-blue-600 bg-blue-50",
                        )}
                      >
                        {isLoading && loadingText === card.term ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={currentPage}
                custom={direction}
                initial={{ opacity: 0, x: direction * 50, rotateY: direction * 10 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: direction * -50, rotateY: direction * -10, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-x-4 content-start flex-1 pb-10 pt-20"
              >
                {currentCards.map((card, index) => {
                  const level = getMemoryLevel(cardProgress[card.id]);

                  let bgClass = "bg-white hover:bg-gray-50 border-gray-200";
                  if (level === "known") bgClass = "bg-green-50 hover:bg-green-100 border-green-200";
                  else if (level === "almost") bgClass = "bg-yellow-50 hover:bg-yellow-100 border-yellow-200";

                  return (
                    <div
                      key={card.id}
                      onClick={() => setActiveCardId(card.id)}
                      style={{ zIndex: index }}
                      className={cn(
                        "relative p-5 rounded-[1.5rem] cursor-pointer transition-all duration-300 flex flex-col h-[150px] border shadow-sm group hover:shadow-xl hover:-translate-y-4 active:scale-[0.98] select-none",
                        bgClass,
                        "max-xl:[&:nth-child(n+3)]:-mt-16 xl:[&:nth-child(n+4)]:-mt-16",
                      )}
                    >
                      <div className={cn("absolute top-3 right-3 w-2 h-2 rounded-full", level === "known" ? "bg-green-500" : level === "almost" ? "bg-yellow-500" : "bg-gray-300")}></div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className={cn("font-medium text-lg leading-tight line-clamp-2")}>{card.term}</h3>
                      </div>
                      {card.phonetic && <p className="text-xs font-mono text-gray-400 mb-2 opacity-80">{card.phonetic}</p>}

                      <div className="mt-auto flex justify-between items-end">
                        <p className={cn("text-sm font-medium line-clamp-2 flex-1 pr-2")}>{card.translation}</p>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayAudio(card.term);
                          }}
                          className={cn(
                            "p-2 rounded-full shrink-0 mt-2 transition-all bg-gray-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50",
                            isLoading && loadingText === card.term ? "opacity-100 text-blue-600 bg-blue-50" : "opacity-0 group-hover:opacity-100",
                          )}
                        >
                          {isLoading && loadingText === card.term ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}

          {currentCards.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium text-lg">Trang này trống</div>}
          <div className="flex items-center justify-end gap-1 text-slate-600 select-none bg-white p-2 rounded-full shadow-sm w-max ml-auto border border-slate-100 mt-2">
            <Button variant="ghost" onClick={() => handlePageChange(0)} disabled={currentPage === 0} className="hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 rounded-full p-2 h-auto">
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 rounded-full p-2 h-auto"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-bold px-3 text-slate-800">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 rounded-full p-2 h-auto"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => handlePageChange(totalPages - 1)}
              disabled={currentPage >= totalPages - 1}
              className="hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 rounded-full p-2 h-auto"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Add/Edit Word Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCardId ? "Chỉnh sửa thẻ" : "Thêm từ mới"} className="max-w-2xl">
        <div className="flex p-2 bg-slate-50 border-b border-slate-100 overflow-x-auto hide-scrollbar">
          {!editingCardId && (
            <>
              <Button
                onClick={() => setActiveTab("ai")}
                className={cn("flex-1 whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-sm transition-all", activeTab === "ai" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50")}
              >
                Tạo bằng AI
              </Button>
              <Button
                onClick={() => setActiveTab("bulk_ai")}
                className={cn("flex-1 whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-sm transition-all", activeTab === "bulk_ai" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50")}
              >
                Tạo nhiều bằng AI
              </Button>
            </>
          )}
          <Button
            onClick={() => setActiveTab("manual")}
            className={cn("flex-1 whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-sm transition-all", activeTab === "manual" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50")}
          >
            {editingCardId ? "Chỉnh sửa thủ công" : "Tạo thủ công"}
          </Button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === "ai" ? (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">Nhập từ vựng tiếng Anh, AI sẽ tự động điền phiên âm, nghĩa tiếng Việt và các ví dụ cụ thể.</p>
              <Input
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
              <Button
                disabled={loading}
                onClick={handleCreateAI}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Đang tạo..." : "Tạo bằng AI ✨"}
              </Button>
            </div>
          ) : activeTab === "bulk_ai" ? (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">Nhập nhiều từ vựng cách nhau bằng dấu chấm phẩy (<b>;</b>). AI sẽ tạo hàng loạt thẻ lật.</p>
              <div className="relative">
                <Textarea
                  value={bulkTerms}
                  autoFocus
                  onChange={(e) => setBulkTerms(e.target.value)}
                  placeholder="Ví dụ: hello; world; apple; banana"
                  className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none pb-8"
                />
                <div className="absolute bottom-3 right-4 text-xs font-bold text-slate-400">
                  <span className={cn(bulkTerms.split(';').filter(w => w.trim()).length > 30 && "text-red-500")}>
                    {bulkTerms.split(';').filter(w => w.trim()).length}
                  </span>
                  /30
                </div>
              </div>
              <Button
                disabled={loading || bulkTerms.split(';').filter(w => w.trim()).length > 30 || bulkTerms.split(';').filter(w => w.trim()).length === 0}
                onClick={handleCreateBulkAI}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-5 h-5 animate-spin"/> Đang xử lý...</> : "Tạo hàng loạt ✨"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Tiêu đề (Tiếng Anh)</label>
                  <Input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    type="text"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500"
                    placeholder="Hello"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phiên âm</label>
                  <Input
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
                <Input
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
                      <Input
                        value={examples[idx].en}
                        onChange={(e) => handleExampleChange(idx, "en", e.target.value)}
                        type="text"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                        placeholder="Tiếng Anh (ví dụ: Hello there!)"
                      />
                      <Input
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
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 resize-none"
                  placeholder="Ghi chú thêm về từ này..."
                />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6 pt-6">
                <Button onClick={() => setIsModalOpen(false)} className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-6 py-2.5 rounded-xl font-bold transition-colors">
                  Hủy
                </Button>
                <Button
                  disabled={loading}
                  onClick={handleCreateManual}
                  className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-2.5 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-50 active:scale-95"
                >
                  {loading ? "Đang xử lý..." : editingCardId ? "Lưu thay đổi" : "Lưu thẻ"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
      {/* ── Note Modal ── */}
      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title="Ghi chú" className="max-w-md">
        <div className="p-6">
          <div className="bg-blue-50/80 p-5 rounded-2xl text-slate-700 whitespace-pre-wrap leading-relaxed border border-blue-100/50 shadow-inner">{activeCard?.notes}</div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setIsNoteModalOpen(false)} className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-6 py-2.5 rounded-xl font-bold transition-colors">
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
