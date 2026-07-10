import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, ChevronRight, Play, Award } from "lucide-react";
import { TENSES_STAGES, Exercise, Stage } from "../data/tensesExercises";
import { cn } from "../lib/utils";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { useAuth } from "../contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_BACKEND;

export function TensesPractice() {
  const { stageId } = useParams();
  const navigate = useNavigate();
  const { width, height } = useWindowSize();
  const { user } = useAuth();

  const [stage, setStage] = useState<Stage | null>(null);
  const [isCustomTest, setIsCustomTest] = useState(false);
  
  // Practice flow state
  const [practiceState, setPracticeState] = useState<'start' | 'playing' | 'finished'>('start');
  const [queue, setQueue] = useState<Exercise[]>([]);
  const [currentExIndex, setCurrentExIndex] = useState(0);

  // Metrics Tracking
  const [startTime, setStartTime] = useState<number>(0);
  const [metrics, setMetrics] = useState({ correct: 0, wrong: 0 });
  const [exerciseLogs, setExerciseLogs] = useState<any[]>([]);
  const [currentExStartTime, setCurrentExStartTime] = useState<number>(0);
  
  // Exercise states
  const [inputValue, setInputValue] = useState("");
  const [scrambleOrder, setScrambleOrder] = useState<string[]>([]);
  const [availableScramble, setAvailableScramble] = useState<string[]>([]);
  
  // Checking state
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Error Identification state
  const [selectedErrorOption, setSelectedErrorOption] = useState("");

  useEffect(() => {
    let targetStageId: number | string = 1;
    let currentStage: any = null;
    let custom = false;

    if (stageId) {
      if (stageId.startsWith("custom_")) {
        targetStageId = stageId;
        custom = true;
        currentStage = user?.customTensesTests?.find((t: any) => t.id === stageId);
      } else {
        targetStageId = parseInt(stageId);
        localStorage.setItem("tenses_practice_stage", targetStageId.toString());
        currentStage = TENSES_STAGES.find((s) => s.id === targetStageId);
      }
    } else {
      const saved = localStorage.getItem("tenses_practice_stage");
      if (saved) targetStageId = parseInt(saved);
      navigate(`/tenses/practice/${targetStageId}`, { replace: true });
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
      if (custom && !user) return; // wait for user to load
      navigate("/tenses");
    }
  }, [stageId, navigate, user]);

  const exercise = queue[currentExIndex];

  useEffect(() => {
    if (exercise && exercise.type === "scramble" && exercise.options) {
      setAvailableScramble([...exercise.options].sort(() => Math.random() - 0.5));
      setScrambleOrder([]);
    }
  }, [exercise]);

  const resetExerciseState = () => {
    setInputValue("");
    setScrambleOrder([]);
    setIsAnswered(false);
    setIsCorrect(false);
    setSelectedErrorOption("");
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

  const checkAnswer = (answerOverride?: any) => {
    if (!exercise || isAnswered) return;
    let correct = false;

    if (exercise.type === "conjugation" || exercise.type === "transformation") {
      correct = inputValue.trim().toLowerCase() === (exercise.correctAnswer as string).toLowerCase();
    } else if (exercise.type === "multiple_choice") {
      correct = answerOverride === exercise.correctAnswer;
      if (!isAnswered) setInputValue(answerOverride); // store selected for UI highlight
    } else if (exercise.type === "scramble") {
      correct = scrambleOrder.join(" ") === (exercise.correctAnswer as string[]).join(" ");
    } else if (exercise.type === "error_identification") {
      correct = selectedErrorOption === exercise.correctAnswer;
    }

    if (!correct) {
      // Append to the queue to redo later
      setQueue(prev => [...prev, exercise]);
    }

    // Build log entry
    let userAnswer = null;
    if (exercise.type === "conjugation" || exercise.type === "transformation") userAnswer = inputValue;
    else if (exercise.type === "multiple_choice") userAnswer = answerOverride;
    else if (exercise.type === "scramble") userAnswer = scrambleOrder;
    else if (exercise.type === "error_identification") userAnswer = selectedErrorOption;

    const timeSpent = Math.round((Date.now() - currentExStartTime) / 1000);
    setExerciseLogs(prev => [...prev, {
      exerciseId: exercise.id,
      type: exercise.type,
      question: exercise.question,
      userAnswer,
      isCorrect: correct,
      timeSpent
    }]);

    // Only update metrics if this is the first time seeing this exact exercise
    // Since we append to queue, if it's appended, it's a retry. We can just count it in the metrics if we want.
    // For simplicity, we just add to metrics.
    setMetrics(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (!correct ? 1 : 0)
    }));

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
      // Finished all (including redos)
      setPracticeState('finished');
      
      // Save progress to backend
      if (user) {
        const totalTimeSpent = Math.round((Date.now() - startTime) / 1000);
        try {
          const res = await fetch(`${API_URL}/api/tenses/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              stageId: isCustomTest ? stage.id : parseInt(stage.id as any),
              correct: metrics.correct,
              wrong: metrics.wrong,
              timeSpent: totalTimeSpent,
              exerciseLogs
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.tensesProgress) {
              updateUser({ tensesProgress: data.tensesProgress });
            }
          }
        } catch (error) {
          console.error("Failed to save progress", error);
        }
      }
    }
  };

  const handleNextStage = () => {
    if (!stage) return;
    const nextStageId = stage.id + 1;
    if (nextStageId <= 4) {
      localStorage.setItem("tenses_practice_stage", nextStageId.toString());
      navigate(`/tenses/practice/${nextStageId}`);
    } else {
      navigate("/tenses");
    }
  };

  // Helper for scramble
  const toggleScrambleWord = (word: string, fromAvailable: boolean) => {
    if (isAnswered) return;
    if (fromAvailable) {
      setAvailableScramble(availableScramble.filter((w) => w !== word));
      setScrambleOrder([...scrambleOrder, word]);
    } else {
      setScrambleOrder(scrambleOrder.filter((w) => w !== word));
      setAvailableScramble([...availableScramble, word]);
    }
  };

  if (!stage) return null;

  const progressPercent = queue.length > 0 ? ((currentExIndex) / queue.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 h-16 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4 flex-1">
          <Link to="/tenses" className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {practiceState === 'playing' && (
            <div className="w-full max-w-md h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          )}
        </div>
        <div className="ml-4 font-bold text-gray-500 text-sm hidden sm:block">
          {isCustomTest ? "Bài tập cá nhân hoá" : `Chặng ${stage.id}: ${stage.title}`}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center p-4 sm:p-8 max-w-3xl mx-auto w-full">
        
        {/* START SCREEN */}
        {practiceState === 'start' && (
          <div className="w-full bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 mt-8 sm:mt-16 flex flex-col items-center text-center animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-black mb-6">
              {isCustomTest ? "AI" : stage.id}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
              {isCustomTest ? "Chào bạn, chúng ta bắt đầu bài tập cá nhân hoá nhé!" : `Chào bạn, chúng ta sẽ bắt đầu chặng ${stage.id} nhé!`}
            </h2>
            <h3 className="text-xl font-bold text-blue-600 mb-4">{stage.title}</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">{stage.description}</p>
            <button 
              onClick={handleStart}
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-1 flex items-center gap-2"
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
            <div className="w-full bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 mt-8 sm:mt-16 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8">
              <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6">
                <Award className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                Tuyệt vời!
              </h2>
              <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                {stage.id === 4 
                  ? "Chúc mừng bạn đã hoàn thành xong toàn bộ lộ trình Thì (Tenses)!"
                  : `Bạn đã xuất sắc hoàn thành Chặng ${stage.id}. Các câu trả lời sai đều đã được ôn tập lại kỹ càng.`}
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

            {/* Exercise Type Renderers */}
            
            {exercise.type === "conjugation" && (
              <div className="space-y-4">
                <input
                  type="text"
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isAnswered}
                  placeholder="Nhập động từ đã chia..."
                  className={cn(
                    "w-full text-lg p-4 bg-gray-50 border-2 rounded-xl focus:outline-none transition-colors",
                    !isAnswered ? "border-gray-200 focus:border-blue-500" : isCorrect ? "border-green-500 bg-green-50 text-green-700 font-bold" : "border-red-500 bg-red-50 text-red-700 font-bold"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inputValue) checkAnswer();
                  }}
                />
              </div>
            )}

            {exercise.type === "multiple_choice" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exercise.options?.map((opt, idx) => {
                  const isSelected = inputValue === opt;
                  let btnClass = "border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700";
                  
                  if (isAnswered) {
                    if (opt === exercise.correctAnswer) {
                      btnClass = "border-green-500 bg-green-50 text-green-700 font-bold";
                    } else if (isSelected) {
                      btnClass = "border-red-500 bg-red-50 text-red-700 font-bold";
                    } else {
                      btnClass = "border-gray-200 opacity-50";
                    }
                  } else if (isSelected) {
                    btnClass = "border-blue-500 bg-blue-50 text-blue-700 font-bold";
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswered}
                      onClick={() => checkAnswer(opt)}
                      className={cn("p-4 border-2 rounded-2xl text-left text-lg transition-all", btnClass)}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {exercise.type === "scramble" && (
              <div className="space-y-8">
                {/* Drop zone */}
                <div className={cn(
                  "min-h-[80px] p-4 rounded-2xl border-2 flex flex-wrap gap-2 items-start transition-colors",
                  !isAnswered ? "border-dashed border-gray-300 bg-gray-50" : isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                )}>
                  {scrambleOrder.map((word, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleScrambleWord(word, false)}
                      disabled={isAnswered}
                      className="px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-xl font-bold text-gray-800 active:scale-95 transition-transform"
                    >
                      {word}
                    </button>
                  ))}
                </div>

                {/* Available words */}
                <div className="flex flex-wrap gap-3 justify-center">
                  {availableScramble.map((word, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleScrambleWord(word, true)}
                      disabled={isAnswered}
                      className="px-4 py-2 bg-white border-2 border-gray-200 shadow-sm rounded-xl font-bold text-gray-800 hover:border-blue-300 hover:text-blue-600 transition-colors active:scale-95"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {exercise.type === "error_identification" && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-3 justify-center">
                  {exercise.options?.map((opt, idx) => {
                    const isSelected = selectedErrorOption === opt;
                    let btnClass = "border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-800";
                    
                    if (isAnswered) {
                      if (opt === exercise.correctAnswer) {
                        btnClass = isSelected ? "border-green-500 bg-green-50 text-green-700 font-bold" : "border-green-500 bg-green-50 text-green-700";
                      } else if (isSelected) {
                        btnClass = "border-red-500 bg-red-50 text-red-700 font-bold";
                      } else {
                        btnClass = "border-gray-200 opacity-50";
                      }
                    } else if (isSelected) {
                      btnClass = "border-blue-500 bg-blue-50 text-blue-700 font-bold";
                    }

                    return (
                      <button
                        key={idx}
                        disabled={isAnswered}
                        onClick={() => setSelectedErrorOption(opt)}
                        className={cn("px-5 py-2 border-2 rounded-xl text-lg font-medium transition-all", btnClass)}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {exercise.type === "transformation" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-blue-600">{exercise.hint}</span>
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
                    !isAnswered ? "border-gray-200 focus:border-blue-500" : isCorrect ? "border-green-500 bg-green-50 text-green-700 font-bold" : "border-red-500 bg-red-50 text-red-700 font-bold"
                  )}
                />
              </div>
            )}
          </div>
        )}

        {/* Feedback Section */}
        {practiceState === 'playing' && isAnswered && exercise && (
          <div className="w-full mt-6 animate-in slide-in-from-bottom-4">
            <div className={cn("p-6 rounded-3xl border-2 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between", isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
              <div className="flex gap-4 items-start">
                <div className={cn("mt-1 shrink-0", isCorrect ? "text-green-500" : "text-red-500")}>
                  {isCorrect ? <CheckCircle className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                </div>
                <div>
                  <h3 className={cn("text-xl font-extrabold mb-1", isCorrect ? "text-green-700" : "text-red-700")}>
                    {isCorrect ? "Chính xác!" : "Chưa đúng. Bạn sẽ được làm lại câu này sau."}
                  </h3>
                  
                  {!isCorrect && exercise.type === "conjugation" && (
                    <p className="text-red-600 font-medium mb-2">Đáp án đúng: <span className="font-bold">{exercise.correctAnswer as string}</span></p>
                  )}
                  {!isCorrect && exercise.type === "scramble" && (
                    <p className="text-red-600 font-medium mb-2">Đáp án đúng: <span className="font-bold">{(exercise.correctAnswer as string[]).join(" ")}</span></p>
                  )}
                  {!isCorrect && exercise.type === "transformation" && (
                    <p className="text-red-600 font-medium mb-2">Đáp án đúng: <span className="font-bold">{exercise.hint} {exercise.correctAnswer as string}</span></p>
                  )}
                  {!isCorrect && exercise.type === "error_identification" && (
                    <p className="text-red-600 font-medium mb-2">Lỗi sai ở từ: <span className="font-bold">{exercise.correctAnswer as string}</span></p>
                  )}

                  {exercise.explanation && (
                    <p className={cn("text-sm mt-1", isCorrect ? "text-green-700/80" : "text-red-700/80")}>
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

      {/* Action Footer for types that need explicit Check button */}
      {practiceState === 'playing' && !isAnswered && exercise && (exercise.type === "conjugation" || exercise.type === "scramble" || exercise.type === "error_identification" || exercise.type === "transformation") && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-center z-20">
          <div className="w-full max-w-3xl flex justify-end">
            <button
              onClick={() => checkAnswer()}
              disabled={
                (exercise.type === "conjugation" && !inputValue) ||
                (exercise.type === "scramble" && scrambleOrder.length === 0) ||
                (exercise.type === "error_identification" && !selectedErrorOption) ||
                (exercise.type === "transformation" && !inputValue)
              }
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-sm"
            >
              Kiểm tra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
