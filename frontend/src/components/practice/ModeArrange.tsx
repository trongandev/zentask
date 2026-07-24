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
        "px-4 py-3 bg-white border-2 rounded-xl text-2xl font-bold text-slate-800 shadow-sm touch-none select-none flex items-center justify-center min-w-[3rem]",
        disabled ? "border-slate-200 opacity-80 cursor-default" : "border-slate-200 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-shadow",
        isDragging && "shadow-xl border-indigo-500 ring-2 ring-indigo-200 opacity-90 scale-105",
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
    return <div className="text-gray-500">Bộ thẻ không có từ vựng nào để luyện tập.</div>;
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Tuyệt vời!</h2>
        <p className="text-gray-500 mb-8">Bạn đã hoàn thành bài luyện tập sắp xếp.</p>
        <Button
          onClick={() => {
            setCompleted(false);
            setCurrentIndex(0);
            setWrongCardIds([]);
            wrongCardIdsRef.current = [];
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all active:scale-95 mb-4"
        >
          <RotateCw className="w-5 h-5" />
          Làm lại
        </Button>
        <Button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-6 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-200">
          <ArrowLeft className="w-5 h-5" />
          Quay về
        </Button>
        {completionActions}
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="w-full max-w-3xl flex flex-col items-center justify-center relative">
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <span className="text-gray-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          Câu {currentIndex + 1} / {cards.length}
        </span>
        <div className="flex-1 ml-6 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${(currentIndex / cards.length) * 100}%` }}></div>
        </div>
      </div>

      <div className="w-full bg-white rounded-[2rem] p-8 md:p-12 shadow-xl shadow-indigo-100/50 border border-slate-100 mb-8 relative flex flex-col items-center text-center overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-50 rounded-tr-full -z-0 opacity-50"></div>

        <div className="z-10 w-full flex flex-col items-center">
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-2">{currentCard.translation}</h2>
          <p className="text-slate-500 font-medium mb-12">Sắp xếp các chữ cái/từ để tạo thành nghĩa đúng</p>

          <div
            className={cn(
              "p-8 rounded-2xl border-4 border-dashed w-full flex flex-wrap items-center justify-center gap-3 transition-colors",
              status === "correct" ? "border-green-400 bg-green-50" : status === "wrong" ? "border-red-400 bg-red-50" : "border-indigo-100 bg-indigo-50/30",
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
            <div className="w-full mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-left animate-in slide-in-from-bottom-2">
              <p className="text-red-600 font-bold mb-1 text-sm uppercase tracking-wider">Đáp án đúng:</p>
              <p className="text-2xl font-black text-slate-800 mb-3">{currentCard.term}</p>
              {currentCard.examples && currentCard.examples.length > 0 && currentCard.examples[0].en && (
                <div className="text-sm bg-white p-3 rounded-lg border border-red-50">
                  <p className="font-semibold text-slate-700 mb-1">Ví dụ:</p>
                  <p className="text-slate-900 font-medium">{currentCard.examples[0].en}</p>
                  <p className="text-slate-500">{currentCard.examples[0].vi}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions Area */}
          <div className="flex items-center justify-center gap-4 mt-12 w-full flex-wrap">
            <Button
              onClick={() => setShowHint(true)}
              disabled={showHint || status !== "idle"}
              className="p-4 rounded-xl bg-amber-50 text-amber-600 font-bold hover:bg-amber-100 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Lightbulb className="w-5 h-5" />
              {showHint ? currentCard.term : "Gợi ý"}
            </Button>

            <Button
              onClick={(e) => handlePlayAudio(e, currentCard.term)}
              disabled={isLoading && loadingText === currentCard.term}
              className="p-4 rounded-xl bg-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading && loadingText === currentCard.term ? (
                <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
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
                "flex-1 max-w-[200px] px-8 py-4 rounded-xl font-black text-white text-lg transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg",
                status === "correct" ? "bg-green-500 shadow-green-500/30" : status === "wrong" ? "bg-red-500 shadow-red-500/30" : "bg-indigo-600 shadow-indigo-600/30 hover:bg-indigo-700",
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
