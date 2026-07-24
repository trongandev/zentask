import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, Plus, Play, Volume2, Trash2, Pencil, Star, Info, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, ArrowLeft, Brain, BookOpen, LayoutGrid, List } from "lucide-react";
import { useFlashcardStore, getMemoryLevel, type MemoryLevel } from "../../services/flashcardService";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { getVoiceForLanguage } from "../../lib/ttsVoiceStorage";
import { Modal } from "../../components/ui/Modal";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Textarea } from "@/src/components/ui/Textarea";
import toastService from "@/src/services/toastService";
import { cn } from "../../lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export function FlashcardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchCards, createCard, updateCard, deleteCard, fetchProgress, setManualProgress, cardProgress, currentSet, cards, loading } = useFlashcardStore();
  const { playAudio, isLoading, loadingText } = useTTSAudio();

  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");
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

  const itemsPerPage = viewMode === "list" ? 6 : 12;
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
        <div className="flex items-center justify-between text-gray-900 mb-2">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/flashcards")} className="bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-full p-2 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" /> {currentSet.title}
            </h1>
          </div>
          <Button
            onClick={() => navigate(`/flashcard/${id}/practice`)}
            disabled={currentSet.cardCount === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-sm hover:shadow-md hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" /> Học bộ thẻ ({currentSet.cardCount})
          </Button>
        </div>

        {/* Filter Radio Buttons & Pagination */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
          <div className="flex items-center gap-6 text-sm font-semibold">
            <label className={cn("flex items-center gap-2 cursor-pointer transition-colors", filterMode === "all" ? "text-blue-700" : "text-gray-700 hover:text-blue-600")}>
              <input type="radio" checked={filterMode === "all"} onChange={() => setFilterMode("all")} className="w-4 h-4 accent-blue-600" /> Tất cả ({filterCounts.all})
            </label>
            <label className={cn("flex items-center gap-2 cursor-pointer transition-colors", filterMode === "unknown" ? "text-gray-900" : "text-gray-700 hover:text-gray-900")}>
              <input type="radio" checked={filterMode === "unknown"} onChange={() => setFilterMode("unknown")} className="w-4 h-4 accent-gray-500" /> Chưa học ({filterCounts.unknown})
            </label>
            <label className={cn("flex items-center gap-2 cursor-pointer transition-colors", filterMode === "relearn" ? "text-yellow-700" : "text-gray-700 hover:text-yellow-600")}>
              <input type="radio" checked={filterMode === "relearn"} onChange={() => setFilterMode("relearn")} className="w-4 h-4 accent-yellow-500" /> Cần ôn tập ({filterCounts.relearn})
            </label>
            <label className={cn("flex items-center gap-2 cursor-pointer transition-colors", filterMode === "mastered" ? "text-green-700" : "text-gray-700 hover:text-green-600")}>
              <input type="radio" checked={filterMode === "mastered"} onChange={() => setFilterMode("mastered")} className="w-4 h-4 accent-green-600" /> Đã thuộc ({filterCounts.mastered})
            </label>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Button variant="ghost" onClick={() => handlePageChange(0)} disabled={currentPage === 0} className="hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 rounded-full p-1.5 h-auto">
              <ChevronsLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 rounded-full p-1.5 h-auto"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm font-bold px-2 text-gray-800">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 rounded-full p-1.5 h-auto"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => handlePageChange(totalPages - 1)}
              disabled={currentPage >= totalPages - 1}
              className="hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 rounded-full p-1.5 h-auto"
            >
              <ChevronsRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Action Row: Search & Create */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex bg-white border border-gray-200 p-1 rounded-full shadow-sm shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-2 rounded-full transition-all", viewMode === "grid" ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600")}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-2 rounded-full transition-all", viewMode === "list" ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600")}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white text-gray-800 border border-gray-200 rounded-full pl-11 pr-10 py-3 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400 shadow-sm transition-all"
              placeholder="Tìm kiếm từ vựng..."
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
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
              className="bg-gray-900 text-white hover:bg-gray-800 px-5 py-3 rounded-full font-bold shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" /> Thêm từ mới
            </Button>
          )}
        </div>
      </div>

      {/* ─── MAIN BOOK SPLIT LAYOUT ─── */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-4 min-h-[500px]">
        {/* LEFT PANEL: Active Card Details (Notepad Style) */}
        <div className="w-full lg:w-2/5 bg-white rounded-[2rem] shadow-sm border border-gray-200 flex flex-col relative overflow-hidden">
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
                          <Volume2 className="w-4 h-4" />
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
        </div>

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
                    className={cn("p-4 m-2 rounded-xl cursor-pointer flex gap-4 items-center transition-all border shadow-sm active:scale-[0.97]", "bg-white border-gray-200 hover:bg-gray-50")}
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
                        className={cn("p-2 rounded-full transition-all bg-gray-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50")}
                      >
                        <Volume2 className="w-4 h-4" />
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
                className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-x-4 content-start flex-1 pb-10 pt-20"
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
                        "relative p-4 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col h-[150px] border shadow-sm group hover:-translate-y-6  active:scale-[0.97]",
                        bgClass,
                        // Màn hình nhỏ (2 cột): Từ thẻ thứ 3 trở đi lùi lên
                        // Màn hình lớn (3 cột): Từ thẻ thứ 4 trở đi lùi lên
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
                          className={cn("p-2 rounded-full shrink-0 mt-2", "bg-gray-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all")}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}

          {currentCards.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium text-lg">Trang này trống</div>}
        </div>
      </div>

      {/* ── Add/Edit Word Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCardId ? "Chỉnh sửa thẻ" : "Thêm từ mới"} className="max-w-2xl">
        <div className="flex border-b border-gray-100">
          {!editingCardId && (
            <Button
              onClick={() => setActiveTab("ai")}
              className={cn("flex-1 py-3 font-bold text-sm transition-colors", activeTab === "ai" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50" : "text-gray-500 hover:bg-gray-50")}
            >
              Tạo bằng AI
            </Button>
          )}
          <Button
            onClick={() => setActiveTab("manual")}
            className={cn("flex-1 py-3 font-bold text-sm transition-colors", activeTab === "manual" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50" : "text-gray-500 hover:bg-gray-50")}
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
              <div className="pt-4 flex justify-end gap-3">
                <Button onClick={() => setIsModalOpen(false)} className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-6 py-2.5 rounded-xl font-bold transition-colors">
                  Hủy
                </Button>
                <Button
                  disabled={loading}
                  onClick={handleCreateManual}
                  className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-2.5 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-50"
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
          <div className="bg-blue-50/50 p-4 rounded-xl text-gray-700 whitespace-pre-wrap leading-relaxed border border-blue-100">{activeCard?.notes}</div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setIsNoteModalOpen(false)} className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-6 py-2 rounded-xl font-bold transition-colors">
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
