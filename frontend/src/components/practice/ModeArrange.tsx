import React, { useState, useEffect, useRef } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { CheckCircle, RotateCw, Volume2, ArrowLeft, Lightbulb, Play } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";
import { getVoiceForLanguage } from "@/src/lib/ttsVoiceStorage";
import { useNavigate } from "react-router-dom";
import { Button } from "@/src/components/ui/Button";

interface ModeArrangeProps {
  cards: Flashcard[];
  setId: string;
  onComplete?: (wrongCardIds: string[]) => void;
  completionActions?: React.ReactNode;
}

function SortableItem({ id, value, disabled }: { id: string; value: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "px-5 py-4 bg-white border-2 border-b-4 rounded-2xl text-2xl font-black text-slate-800 shadow-sm touch-none select-none flex items-center justify-center min-w-[3.5rem] transition-colors",
        disabled ? "border-slate-200 border-b-2 translate-y-[2px] opacity-80 cursor-default" : "border-slate-200 cursor-grab active:cursor-grabbing hover:border-blue-300 hover:bg-slate-50",
        isDragging && "shadow-xl border-blue-500 bg-blue-50/50 ring-2 ring-blue-200 opacity-90 scale-105 border-b-4 -translate-y-1",
      )}
    >
      {value}
    </div>
  );
}

export function ModeArrange({ cards, setId, onComplete, completionActions }: ModeArrangeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);
  const wrongCardIdsRef = React.useRef<string[]>([]);

  const [items, setItems] = useState<{ id: string; value: string }[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [showHint, setShowHint] = useState(false);

  const cardStartTime = useRef<number>(Date.now());
  const navigate = useNavigate();
  const { playAudio, playSoundEffect, isLoading, loadingText } = useTTSAudio();
  const { reportCorrect, reportWrong, flushProgress } = useSM2(setId);

  const [currentVoiceId] = useState(() => {
    return getVoiceForLanguage();
  });
  const currentCard = cards[currentIndex];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // Initialize pieces
  useEffect(() => {
    if (!currentCard) return;
    const term = currentCard.term.trim();
    const isPhrase = term.includes(" ");

    // Break into parts
    let parts = isPhrase ? term.split(" ") : term.split("");

    // Shuffle
    const shuffled = parts.map((value, index) => ({ id: `${index}-${value}-${Math.random()}`, value })).sort(() => Math.random() - 0.5);

    setItems(shuffled);
    setStatus("idle");
    setIsChecking(false);
    setShowHint(false);
    cardStartTime.current = Date.now();
  }, [currentIndex, currentCard]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (status !== "idle") return; // disable drag after checking

    if (active.id !== over?.id && over) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleCheck = () => {
    if (status !== "idle" || !currentCard) return;
    setIsChecking(true);

    const isPhrase = currentCard.term.trim().includes(" ");
    const userString = items.map((i) => i.value).join(isPhrase ? " " : "");
    const isCorrect = userString === currentCard.term.trim();

    const responseMs = Date.now() - cardStartTime.current;

    if (isCorrect) {
      setStatus("correct");
      reportCorrect(currentCard.id, "guess", currentCard.term, responseMs);
      playAudio(currentCard.term, currentVoiceId, "correct");

      setTimeout(() => {
        nextCard();
      }, 1500);
    } else {
      setStatus("wrong");
      reportWrong(currentCard.id, "guess");
      setWrongCardIds((prev) => {
        const next = prev.includes(currentCard.id) ? prev : [...prev, currentCard.id];
        wrongCardIdsRef.current = next;
        return next;
      });
      playSoundEffect("wrong");
      setIsChecking(false);
      // Wait for user to click "Thử lại"
    }
  };

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((curr) => curr + 1);
    } else {
      flushProgress();
      onComplete?.(wrongCardIdsRef.current);
      setCompleted(true);
    }
  };

  const handlePlayAudio = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    playAudio(text, currentVoiceId);
  };

  if (cards.length === 0) {
    return <div className="text-slate-500 font-bold bg-white p-6 rounded-2xl shadow-sm">Bộ thẻ không có từ vựng nào để luyện tập.</div>;
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 w-full h-full">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] border-2 border-slate-200/60 shadow-xl shadow-slate-200/50 flex flex-col items-center max-w-lg w-full">
          <div className="w-24 h-24 bg-green-100 rounded-[2rem] flex items-center justify-center mb-6 rotate-3 border-2 border-green-200">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Tuyệt vời!</h2>
          <p className="text-slate-500 mb-8 font-bold">Bạn đã hoàn thành bài luyện tập sắp xếp.</p>
          <Button
            onClick={() => {
              setCompleted(false);
              setCurrentIndex(0);
              setWrongCardIds([]);
              wrongCardIdsRef.current = [];
            }}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl border-2 border-blue-600 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2 mb-3"
          >
            <RotateCw className="w-5 h-5" />
            Làm lại
          </Button>
          <Button 
            onClick={() => navigate(-1)}
            className="w-full py-4 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-2xl border-2 border-slate-200 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay về
          </Button>
          {completionActions && <div className="mt-4 w-full">{completionActions}</div>}
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="w-full max-w-3xl flex flex-col items-center justify-center relative py-8">
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <span className="text-slate-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border-2 border-slate-100">
          Câu {currentIndex + 1} / {cards.length}
        </span>
        <div className="flex-1 ml-6 h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-200/50">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(currentIndex / cards.length) * 100}%` }}></div>
        </div>
      </div>

      <div className="w-full bg-white rounded-[2rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border-2 border-slate-200/60 mb-8 relative flex flex-col items-center text-center overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-full -z-0"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-slate-50 rounded-tr-full -z-0"></div>

        <div className="z-10 w-full flex flex-col items-center">
          <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-3 tracking-tight">{currentCard.translation}</h2>
          <p className="text-slate-500 font-bold mb-10">Sắp xếp các chữ cái/từ để tạo thành nghĩa đúng</p>

          <div
            className={cn(
              "p-8 rounded-[2rem] border-4 border-dashed w-full flex flex-wrap items-center justify-center gap-4 transition-colors",
              status === "correct" ? "border-green-400 bg-green-50/50" : status === "wrong" ? "border-red-400 bg-red-50/50" : "border-slate-200 bg-slate-50/50",
            )}
          >
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
                {items.map((item) => (
                  <SortableItem key={item.id} id={item.id} value={item.value} disabled={status !== "idle"} />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {status === "wrong" && (
            <div className="w-full mt-8 p-6 bg-red-50 border-2 border-red-100 rounded-2xl text-left animate-in slide-in-from-bottom-2 shadow-sm">
              <p className="text-red-500 font-bold mb-1 text-sm uppercase tracking-widest">Đáp án đúng:</p>
              <p className="text-3xl font-black text-slate-800 mb-4 tracking-tight">{currentCard.term}</p>
              {currentCard.examples && currentCard.examples.length > 0 && currentCard.examples[0].en && (
                <div className="text-sm bg-white p-5 rounded-xl border-2 border-red-50/50">
                  <p className="font-bold text-slate-400 mb-2 uppercase tracking-widest">Ví dụ:</p>
                  <p className="text-slate-800 font-black text-base">{currentCard.examples[0].en}</p>
                  <p className="text-slate-500 font-medium mt-1">{currentCard.examples[0].vi}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions Area */}
          <div className="flex items-center justify-center gap-4 mt-12 w-full flex-wrap">
            <Button
              onClick={() => setShowHint(true)}
              disabled={showHint || status !== "idle"}
              className="px-6 py-4 rounded-xl border-2 border-amber-200 border-b-4 active:border-b-2 active:translate-y-[2px] bg-amber-50 text-amber-600 font-bold hover:bg-amber-100 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Lightbulb className="w-5 h-5" />
              {showHint ? currentCard.term : "Gợi ý"}
            </Button>

            <Button
              onClick={(e) => handlePlayAudio(e, currentCard.term)}
              disabled={isLoading && loadingText === currentCard.term}
              className="px-6 py-4 rounded-xl border-2 border-slate-200 border-b-4 active:border-b-2 active:translate-y-[2px] bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading && loadingText === currentCard.term ? (
                <div className="w-6 h-6 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
              ) : (
                <Volume2 className="w-6 h-6" />
              )}
            </Button>

            <Button
              onClick={() => {
                if (status === "wrong") {
                  setStatus("idle");
                  // Optional: we can reset the order if we want, or let them continue from their wrong order
                } else {
                  handleCheck();
                }
              }}
              disabled={status === "correct" || isChecking}
              className={cn(
                "flex-1 max-w-[250px] px-8 py-4 rounded-xl font-black text-white text-lg transition-all active:scale-95 flex items-center justify-center gap-2 border-2 border-b-4 active:border-b-2",
                status === "correct" ? "bg-green-500 border-green-600 shadow-lg shadow-green-500/30" : status === "wrong" ? "bg-red-500 border-red-600 shadow-lg shadow-red-500/30" : "bg-blue-600 border-blue-700 shadow-lg shadow-blue-500/30 hover:bg-blue-700",
              )}
            >
              {status === "correct" ? (
                <>
                  <CheckCircle className="w-6 h-6" /> Chuẩn!
                </>
              ) : status === "wrong" ? (
                <>
                  <RotateCw className="w-6 h-6" /> Thử lại
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" /> Kiểm Tra
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
