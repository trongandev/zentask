import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, ChevronRight, Play, Award, Link2, X } from "lucide-react";
import { GRAMMAR_STAGES, GrammarExercise, GrammarStage } from "../data/grammarExercises";
import { cn } from "../lib/utils";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { DndContext, useDraggable, useDroppable, DragEndEvent } from "@dnd-kit/core";
import { useAuth } from "../contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_BACKEND;

// --- DND COMPONENTS ---
function DraggableWord({ id, word, isAnswered, isCorrectPlace, isWrongPlace, onClick }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    disabled: isAnswered,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "px-4 py-2 bg-white rounded-xl shadow-sm font-bold text-gray-800 flex items-center gap-2 select-none touch-none transition-colors",
        isDragging ? "shadow-lg scale-105 opacity-80" : "",
        !isAnswered ? "cursor-grab active:cursor-grabbing hover:bg-gray-100 border-2 border-gray-200" : "",
        isCorrectPlace ? "bg-green-100 text-green-700 border-2 border-green-500" : "",
        isWrongPlace ? "bg-red-100 text-red-700 border-2 border-red-500 line-through" : ""
      )}
    >
      {word}
      {!isAnswered && onClick && <X className="w-3 h-3 text-gray-400" />}
    </button>
  );
}

function DroppableCategory({ id, title, children, isAnswered, isTargeted }: any) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
    disabled: isAnswered,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[120px] rounded-2xl border-4 p-4 flex flex-col items-center transition-all",
        isTargeted ? "border-blue-400 bg-blue-50 animate-pulse cursor-pointer" : "",
        isOver && !isAnswered ? "border-blue-500 bg-blue-100 scale-[1.02]" : "border-gray-200 bg-gray-50",
        isAnswered ? "border-gray-200" : ""
      )}
    >
      <h3 className="font-bold text-gray-500 mb-4 uppercase tracking-wide text-sm pointer-events-none">{title}</h3>
      <div className="flex flex-wrap gap-2 justify-center w-full min-h-[40px] pointer-events-none">
        {children}
      </div>
    </div>
  );
}

function DroppablePool({ children, isAnswered }: any) {
  const { isOver, setNodeRef } = useDroppable({
    id: "unplaced",
    disabled: isAnswered,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-white p-6 rounded-2xl border-2 border-dashed transition-colors min-h-[120px]",
        isOver && !isAnswered ? "border-blue-400 bg-blue-50" : "border-gray-200"
      )}
    >
      <p className="text-sm font-bold text-gray-400 mb-4 text-center pointer-events-none">
        Kéo từ bên dưới thả vào các hộp phân loại, hoặc bấm chọn từ rồi bấm chọn hộp
      </p>
      <div className="flex flex-wrap gap-3 justify-center">{children}</div>
    </div>
  );
}
// ----------------------

export function GrammarPractice() {
  const { stageId } = useParams();
  const navigate = useNavigate();
  const { width, height } = useWindowSize();
  const { user, updateUser } = useAuth();

  const [stage, setStage] = useState<GrammarStage | null>(null);
  const [isCustomTest, setIsCustomTest] = useState(false);
  
  // Practice flow state
  const [practiceState, setPracticeState] = useState<'start' | 'playing' | 'finished'>('start');
  const [queue, setQueue] = useState<GrammarExercise[]>([]);
  const [currentExIndex, setCurrentExIndex] = useState(0);
  
  // Metrics Tracking
  const [startTime, setStartTime] = useState<number>(0);
  const [metrics, setMetrics] = useState({ correct: 0, wrong: 0 });
  const [exerciseLogs, setExerciseLogs] = useState<any[]>([]);
  const [currentExStartTime, setCurrentExStartTime] = useState<number>(0);
  
  // Checking state
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // === Exercise Specific States ===
  // 1. Classification
  const [placedItems, setPlacedItems] = useState<Record<string, string>>({}); // word -> category
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  
  // 2. Matching
  const [matches, setMatches] = useState<Record<string, string>>({}); // leftId -> rightId
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  
  // 3. Cloze
  const [clozeAnswers, setClozeAnswers] = useState<Record<string, string>>({});
  
  // 4. Transformation
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    let targetStageId: number | string = 1;
    let currentStage: any = null;
    let custom = false;

    if (stageId) {
      if (stageId.startsWith("custom_")) {
        targetStageId = stageId;
        custom = true;
        currentStage = user?.customGrammarTests?.find((t: any) => t.id === stageId);
      } else {
        targetStageId = parseInt(stageId);
        localStorage.setItem("grammar_practice_stage", targetStageId.toString());
        currentStage = GRAMMAR_STAGES.find((s) => s.id === targetStageId);
      }
    } else {
      const saved = localStorage.getItem("grammar_practice_stage");
      if (saved) targetStageId = parseInt(saved);
      navigate(`/grammar/practice/${targetStageId}`, { replace: true });
      return;
    }

    if (currentStage) {
      setStage(currentStage);
      setIsCustomTest(custom);
      setPracticeState('start');
      setCurrentExIndex(0);
      setQueue([]);
      resetExerciseState();
      setMetrics({ correct: 0, wrong: 0 });
      setExerciseLogs([]);
    } else {
      // If custom test not found, maybe wait for user to load or redirect
      if (custom && !user) return; // waiting for user
      navigate("/grammar");
    }
  }, [stageId, navigate, user]);

  const exercise = queue[currentExIndex];

  const resetExerciseState = () => {
    setIsAnswered(false);
    setIsCorrect(false);
    setPlacedItems({});
    setSelectedWord(null);
    setMatches({});
    setSelectedLeft(null);
    setClozeAnswers({});
    setInputValue("");
  };

  const handleStart = () => {
    if (stage) {
      setQueue(stage.exercises);
      setCurrentExIndex(0);
      setPracticeState('playing');
      setStartTime(Date.now());
      setCurrentExStartTime(Date.now());
      resetExerciseState();
    }
  };

  const checkAnswer = () => {
    if (!exercise || isAnswered) return;
    let correct = false;

    if (exercise.type === "classification" && exercise.items) {
      const allPlaced = exercise.items.every(item => placedItems[item.word]);
      if (allPlaced) {
        correct = exercise.items.every(item => placedItems[item.word] === item.category);
      }
    } else if (exercise.type === "matching" && exercise.correctMatches) {
      const keys = Object.keys(exercise.correctMatches);
      const allMatched = keys.every(k => matches[k]);
      if (allMatched) {
        correct = keys.every(k => matches[k] === exercise.correctMatches![k]);
      }
    } else if (exercise.type === "cloze" && exercise.blanksAnswers) {
      const keys = Object.keys(exercise.blanksAnswers);
      const allFilled = keys.every(k => clozeAnswers[k]);
      if (allFilled) {
        correct = keys.every(k => clozeAnswers[k].toLowerCase() === exercise.blanksAnswers![k].toLowerCase());
      }
    } else if (exercise.type === "transformation" && exercise.correctAnswer) {
      correct = inputValue.trim().toLowerCase() === exercise.correctAnswer.toLowerCase();
    }

    if (!correct) {
      setQueue(prev => [...prev, exercise]); // Re-queue wrong answer
      setMetrics(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    } else {
      setMetrics(prev => ({ ...prev, correct: prev.correct + 1 }));
    }

    const timeSpent = Math.floor((Date.now() - currentExStartTime) / 1000);
    const userAnswer = 
      exercise.type === "classification" ? placedItems :
      exercise.type === "matching" ? matches :
      exercise.type === "cloze" ? clozeAnswers : inputValue;

    setExerciseLogs(prev => [...prev, {
      exerciseId: exercise.id,
      type: exercise.type,
      question: exercise.question,
      isCorrect: correct,
      timeSpent,
      userAnswer
    }]);

    setIsCorrect(correct);
    setIsAnswered(true);
  };

  const handleNext = async () => {
    if (!stage) return;
    if (currentExIndex < queue.length - 1) {
      setCurrentExIndex(currentExIndex + 1);
      setCurrentExStartTime(Date.now());
      resetExerciseState();
    } else {
      setPracticeState('finished');
      
      // Save progress to backend
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      try {
        const res = await fetch(`${API_URL}/api/grammar/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            stageId: isCustomTest ? stage.id : parseInt(stage.id as any),
            correct: metrics.correct,
            wrong: metrics.wrong,
            timeSpent,
            exerciseLogs
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.grammarProgress) {
            updateUser({ grammarProgress: data.grammarProgress });
          }
        }
      } catch (e) {
        console.error("Failed to save progress", e);
      }
    }
  };

  const handleNextStage = () => {
    if (!stage) return;
    const nextStageId = stage.id + 1;
    if (nextStageId <= 4) {
      localStorage.setItem("grammar_practice_stage", nextStageId.toString());
      navigate(`/grammar/practice/${nextStageId}`);
    } else {
      navigate("/grammar");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || isAnswered) return;

    const word = active.id as string;
    const category = over.id as string;

    if (category === "unplaced") {
      const newPlaced = { ...placedItems };
      delete newPlaced[word];
      setPlacedItems(newPlaced);
    } else {
      setPlacedItems({ ...placedItems, [word]: category });
    }
    setSelectedWord(null); // Clear click selection if any
  };

  // Render Helpers
  const renderClozeText = () => {
    if (!exercise || exercise.type !== "cloze" || !exercise.textWithBlanks) return null;
    
    // Split text by [id] pattern
    const parts = exercise.textWithBlanks.split(/(\[\d+\])/g);
    
    return (
      <div className="text-xl sm:text-2xl font-medium leading-loose text-gray-800">
        {parts.map((part, index) => {
          const match = part.match(/\[(\d+)\]/);
          if (match) {
            const blankId = match[1];
            const options = exercise.blanksOptions?.[blankId];
            const isWrong = isAnswered && clozeAnswers[blankId]?.toLowerCase() !== exercise.blanksAnswers?.[blankId]?.toLowerCase();
            const isCorrectBlank = isAnswered && clozeAnswers[blankId]?.toLowerCase() === exercise.blanksAnswers?.[blankId]?.toLowerCase();
            
            return (
              <span key={index} className="inline-block mx-2 relative">
                {options ? (
                  <select
                    disabled={isAnswered}
                    value={clozeAnswers[blankId] || ""}
                    onChange={(e) => setClozeAnswers({...clozeAnswers, [blankId]: e.target.value})}
                    className={cn(
                      "appearance-none bg-gray-100 border-2 rounded-xl px-4 py-1 text-center font-bold text-blue-600 focus:outline-none focus:border-blue-400 cursor-pointer min-w-[80px]",
                      isCorrectBlank ? "border-green-500 bg-green-50 text-green-700" : "",
                      isWrong ? "border-red-500 bg-red-50 text-red-700" : ""
                    )}
                  >
                    <option value="" disabled>---</option>
                    {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled={isAnswered}
                    value={clozeAnswers[blankId] || ""}
                    onChange={(e) => setClozeAnswers({...clozeAnswers, [blankId]: e.target.value})}
                    className={cn(
                      "w-32 bg-gray-100 border-2 border-b-4 border-gray-300 rounded-xl px-3 py-1 text-center font-bold text-blue-600 focus:outline-none focus:border-blue-400",
                      isCorrectBlank ? "border-green-500 bg-green-50 text-green-700" : "",
                      isWrong ? "border-red-500 bg-red-50 text-red-700" : ""
                    )}
                  />
                )}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  if (!stage) return null;
  const progressPercent = queue.length > 0 ? ((currentExIndex) / queue.length) * 100 : 0;

  let canCheck = false;
  if (exercise) {
    if (exercise.type === "classification") canCheck = exercise.items?.every(i => placedItems[i.word]) ?? false;
    else if (exercise.type === "matching") canCheck = Object.keys(exercise.correctMatches || {}).every(k => matches[k]);
    else if (exercise.type === "cloze") canCheck = Object.keys(exercise.blanksAnswers || {}).every(k => clozeAnswers[k]);
    else if (exercise.type === "transformation") canCheck = inputValue.trim().length > 0;
  }

  const colorPalette = ["bg-emerald-100 border-emerald-300", "bg-purple-100 border-purple-300", "bg-amber-100 border-amber-300", "bg-rose-100 border-rose-300", "bg-cyan-100 border-cyan-300"];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 h-16 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <Link to="/grammar" className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {practiceState === 'playing' && (
            <div className="w-full max-w-md h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          )}
        </div>
        <div className="ml-4 font-bold text-gray-500 text-sm hidden sm:block">
          {isCustomTest ? "Bài tập cá nhân hoá" : `Chặng ${stage.id}: ${stage.title}`}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center p-4 sm:p-8 max-w-4xl mx-auto w-full">
        
        {/* START SCREEN */}
        {practiceState === 'start' && (
          <div className="w-full bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-emerald-100 mt-8 sm:mt-16 flex flex-col items-center text-center animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-black mb-6">
              {isCustomTest ? "AI" : stage.id}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
              {isCustomTest ? "Chào bạn, chúng ta bắt đầu bài tập cá nhân hoá nhé!" : `Chào bạn, chúng ta bắt đầu chặng ${stage.id} nhé!`}
            </h2>
            <h3 className="text-xl font-bold text-emerald-600 mb-4">{stage.title}</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">{stage.description}</p>
            <button 
              onClick={handleStart}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-1 flex items-center gap-2"
            >
              <Play className="w-6 h-6" fill="currentColor" />
              Bắt đầu học
            </button>
          </div>
        )}

        {/* FINISHED SCREEN */}
        {practiceState === 'finished' && (
          <>
            <Confetti width={width} height={height} recycle={false} numberOfPieces={400} />
            <div className="w-full bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-emerald-100 mt-8 sm:mt-16 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8">
              <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6">
                <Award className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                Tuyệt vời!
              </h2>
              <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                {stage.id === 4 
                  ? "Chúc mừng bạn đã hoàn thành xong toàn bộ lộ trình Ngữ pháp (Grammar)!"
                  : `Bạn đã xuất sắc hoàn thành Chặng ${stage.id}. Các lỗi sai đều đã được khắc phục hoàn toàn.`}
              </p>
              <button 
                onClick={handleNextStage}
                className="bg-green-500 hover:bg-green-600 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-1 flex items-center gap-2"
              >
                {stage.id === 4 ? "Trở về Danh mục" : "Sang chặng tiếp theo"}
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </>
        )}

        {/* PLAYING SCREEN */}
        {practiceState === 'playing' && exercise && (
          <div className="w-full bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-gray-100 mt-4 sm:mt-8 animate-in fade-in">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-8">{exercise.question}</h2>

            {/* 1. CLASSIFICATION (WITH DND) */}
            {exercise.type === "classification" && exercise.categories && exercise.items && (
              <DndContext onDragEnd={handleDragEnd}>
                <div className="space-y-8">
                  {/* Categories */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {exercise.categories.map((cat, idx) => {
                      const isTargeted = selectedWord !== null && !isAnswered;
                      return (
                        <div 
                          key={idx}
                          onClick={() => {
                            if (selectedWord && !isAnswered) {
                              setPlacedItems({...placedItems, [selectedWord]: cat});
                              setSelectedWord(null);
                            }
                          }}
                        >
                          <DroppableCategory 
                            id={cat} 
                            title={cat} 
                            isAnswered={isAnswered}
                            isTargeted={isTargeted}
                          >
                            {exercise.items?.filter(item => placedItems[item.word] === cat).map((item, i) => {
                              const isWrongPlace = isAnswered && placedItems[item.word] !== item.category;
                              const isCorrectPlace = isAnswered && placedItems[item.word] === item.category;
                              return (
                                <DraggableWord
                                  key={item.word}
                                  id={item.word}
                                  word={item.word}
                                  isAnswered={isAnswered}
                                  isCorrectPlace={isCorrectPlace}
                                  isWrongPlace={isWrongPlace}
                                  onClick={!isAnswered ? (e: any) => {
                                    e.stopPropagation();
                                    const newPlaced = {...placedItems};
                                    delete newPlaced[item.word];
                                    setPlacedItems(newPlaced);
                                  } : undefined}
                                />
                              );
                            })}
                          </DroppableCategory>
                        </div>
                      );
                    })}
                  </div>

                  {/* Unplaced words pool */}
                  <DroppablePool isAnswered={isAnswered}>
                    {exercise.items.filter(item => !placedItems[item.word]).map((item, i) => (
                      <div 
                        key={item.word} 
                        onClick={() => setSelectedWord(selectedWord === item.word ? null : item.word)}
                        className={cn("transition-transform", selectedWord === item.word ? "scale-110 ring-2 ring-blue-500 rounded-xl" : "")}
                      >
                        <DraggableWord
                          id={item.word}
                          word={item.word}
                          isAnswered={isAnswered}
                          isCorrectPlace={false}
                          isWrongPlace={false}
                        />
                      </div>
                    ))}
                  </DroppablePool>
                </div>
              </DndContext>
            )}

            {/* 2. MATCHING */}
            {exercise.type === "matching" && exercise.leftPairs && exercise.rightPairs && (
              <div className="flex flex-col sm:flex-row gap-8 sm:gap-4 relative">
                {/* Left Column */}
                <div className="flex-1 flex flex-col gap-3">
                  {exercise.leftPairs.map((pair, idx) => {
                    const matchedRightId = matches[pair.id];
                    const isSelected = selectedLeft === pair.id;
                    const matchedRightIndex = exercise.rightPairs?.findIndex(r => r.id === matchedRightId);
                    
                    let colorClass = "bg-white border-gray-200 hover:border-blue-400";
                    if (isSelected) colorClass = "bg-blue-50 border-blue-500 ring-2 ring-blue-200";
                    else if (matchedRightId && matchedRightIndex !== undefined) {
                      colorClass = isAnswered 
                        ? (matches[pair.id] === exercise.correctMatches?.[pair.id] ? "bg-green-100 border-green-500" : "bg-red-100 border-red-500")
                        : colorPalette[matchedRightIndex % colorPalette.length];
                    }

                    return (
                      <button
                        key={pair.id}
                        disabled={isAnswered}
                        onClick={() => {
                          if (matchedRightId) {
                            const newMatches = {...matches};
                            delete newMatches[pair.id];
                            setMatches(newMatches);
                            setSelectedLeft(pair.id);
                          } else {
                            setSelectedLeft(pair.id);
                          }
                        }}
                        className={cn("p-4 border-2 rounded-2xl text-left font-semibold transition-all relative flex justify-between items-center", colorClass)}
                      >
                        {pair.text}
                        {matchedRightId && !isAnswered && <X className="w-4 h-4 opacity-50 hover:opacity-100" />}
                      </button>
                    )
                  })}
                </div>

                <div className="hidden sm:flex items-center justify-center text-gray-300">
                  <Link2 className="w-8 h-8" />
                </div>

                {/* Right Column */}
                <div className="flex-1 flex flex-col gap-3">
                  {exercise.rightPairs.map((pair, idx) => {
                    // Find if this right item is matched to any left item
                    const matchedLeftId = Object.keys(matches).find(k => matches[k] === pair.id);
                    
                    let colorClass = "bg-white border-gray-200 hover:border-blue-400";
                    if (matchedLeftId) {
                       colorClass = isAnswered 
                        ? (matches[matchedLeftId] === exercise.correctMatches?.[matchedLeftId] ? "bg-green-100 border-green-500" : "bg-red-100 border-red-500")
                        : colorPalette[idx % colorPalette.length];
                    } else if (selectedLeft && !isAnswered) {
                      colorClass = "bg-gray-50 border-gray-300 border-dashed animate-pulse";
                    }

                    return (
                      <button
                        key={pair.id}
                        disabled={isAnswered || matchedLeftId !== undefined}
                        onClick={() => {
                          if (selectedLeft) {
                            setMatches({...matches, [selectedLeft]: pair.id});
                            setSelectedLeft(null);
                          }
                        }}
                        className={cn("p-4 border-2 rounded-2xl text-left font-semibold transition-all", colorClass, matchedLeftId && !isAnswered ? "opacity-90" : "")}
                      >
                        {pair.text}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 3. CLOZE TEST */}
            {exercise.type === "cloze" && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-gray-100">
                {renderClozeText()}
              </div>
            )}

            {/* 4. TRANSFORMATION */}
            {exercise.type === "transformation" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-emerald-600">{exercise.hint}</span>
                </div>
                <textarea
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isAnswered}
                  placeholder="Nhập phần tiếp theo của câu..."
                  rows={3}
                  className={cn(
                    "w-full text-lg p-4 bg-gray-50 border-2 rounded-xl focus:outline-none transition-colors resize-none",
                    !isAnswered ? "border-gray-200 focus:border-emerald-500" : isCorrect ? "border-green-500 bg-green-50 text-green-700 font-bold" : "border-red-500 bg-red-50 text-red-700 font-bold"
                  )}
                />
              </div>
            )}
          </div>
        )}

        {/* Feedback Section */}
        {practiceState === 'playing' && isAnswered && exercise && (
          <div className="w-full mt-6 animate-in slide-in-from-bottom-4">
            <div className={cn("p-6 rounded-3xl border-2 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between shadow-sm", isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
              <div className="flex gap-4 items-start">
                <div className={cn("mt-1 shrink-0", isCorrect ? "text-green-500" : "text-red-500")}>
                  {isCorrect ? <CheckCircle className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                </div>
                <div>
                  <h3 className={cn("text-xl font-extrabold mb-1", isCorrect ? "text-green-700" : "text-red-700")}>
                    {isCorrect ? "Chính xác!" : "Chưa chính xác. Bạn sẽ được học lại phần này."}
                  </h3>
                  
                  {/* Provide exact correct answers if wrong */}
                  {!isCorrect && exercise.type === "transformation" && (
                    <p className="text-red-600 font-medium mb-2">Đáp án đúng: <span className="font-bold">{exercise.hint} {exercise.correctAnswer}</span></p>
                  )}
                  {!isCorrect && exercise.type === "matching" && exercise.correctMatches && (
                    <div className="text-red-600 font-medium mb-2">
                      Đáp án đúng:
                      <ul className="list-disc ml-5 mt-1 opacity-90 text-sm">
                        {Object.entries(exercise.correctMatches).map(([left, right]) => (
                          <li key={left}>
                            <span className="font-bold">{exercise.leftPairs?.find(l=>l.id === left)?.text}</span> <br className="sm:hidden"/> ➔ {exercise.rightPairs?.find(r=>r.id === right)?.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!isCorrect && exercise.type === "classification" && exercise.items && (
                    <div className="text-red-600 font-medium mb-2">
                      <p>Một số từ xếp sai vị trí.</p>
                    </div>
                  )}

                  {exercise.explanation && (
                    <p className={cn("text-sm mt-2", isCorrect ? "text-green-700/90" : "text-red-700/90")}>
                      {exercise.explanation}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleNext}
                className={cn(
                  "w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2",
                  isCorrect ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                )}
              >
                Tiếp tục
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Action Footer */}
      {practiceState === 'playing' && !isAnswered && exercise && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-center z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="w-full max-w-4xl flex justify-end">
            <button
              onClick={() => checkAnswer()}
              disabled={!canCheck}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-10 py-3.5 rounded-xl font-bold text-lg transition-colors shadow-sm"
            >
              Kiểm tra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
