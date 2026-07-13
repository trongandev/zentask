import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Award, Flame, CheckCircle2, XCircle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useQuizStore, QuizResult as ResultType, Quiz } from "../../services/quizService";
import confetti from "canvas-confetti";
import toastService from "@/src/services/toastService";

export function QuizResult() {
  const { resultId } = useParams<{ resultId: string }>();

  const [result, setResult] = useState<ResultType | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [roomSettings, setRoomSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Phoenix Rebirth State
  const [rebirthTarget, setRebirthTarget] = useState<string | null>(null);
  const [rebirthAnswer, setRebirthAnswer] = useState("");
  const [rebirthLoading, setRebirthLoading] = useState(false);

  const { getQuizHistory, getQuizById, useRebirth } = useQuizStore();

  useEffect(() => {
    const fetchResult = async () => {
      try {
        if (resultId?.startsWith("builtin_result_")) {
          const raw = sessionStorage.getItem(`builtin_quiz_result_${resultId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            setResult(parsed.result);
            setQuiz(parsed.quiz);
            if (parsed.result?.score >= 80) triggerConfetti();
            return;
          }
        }

        const history = await getQuizHistory();
        const found = history.find((h) => h.id === resultId);
        if (found) {
          setResult(found);
          const qData = await getQuizById(found.quizId);
          setQuiz(qData);

          if (found.roomId && found.roomSettings) {
            setRoomSettings(found.roomSettings);
          }

          if (found.score >= 80) {
            triggerConfetti();
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [resultId, getQuizHistory, getQuizById]);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handleRebirth = async () => {
    if (!result || !rebirthTarget || !rebirthAnswer) return;
    try {
      setRebirthLoading(true);
      const res = await useRebirth(result.id, rebirthTarget, rebirthAnswer);

      if (res) {
        if (res.isCorrect) {
          toastService.success(`Hồi sinh thành công! Bạn được cộng thêm điểm. Điểm mới: ${res.newScore}`);
          triggerConfetti();
        } else {
          toastService.error(`Rất tiếc, đáp án vẫn chưa đúng. Đáp án là: ${res.correctAnswer}`);
        }

        // Update local state
        setResult((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            score: res.newScore,
            totalCorrect: res.isCorrect ? prev.totalCorrect + 1 : prev.totalCorrect,
            usedRebirth: true,
            evaluation: {
              ...prev.evaluation,
              [rebirthTarget]: {
                ...prev.evaluation[rebirthTarget],
                userAnswer: rebirthAnswer,
                isCorrect: res.isCorrect,
              },
            },
          };
        });
      }
      setRebirthTarget(null);
    } finally {
      setRebirthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!result || !quiz) return <div className="text-center p-12 text-gray-500">Không tìm thấy dữ liệu</div>;

  const wrongQuestions = quiz.questions.filter((q) => !result.evaluation[q.id]?.isCorrect);
  const canRebirth = !result.usedRebirth && !result.roomId && wrongQuestions.length > 0 && !(result as any).isBuiltIn;

  const hideDetails = result.roomId && roomSettings && !roomSettings.showAnswers;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Overview Card */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-2 ${result.score >= 80 ? "bg-green-500" : result.score >= 50 ? "bg-orange-500" : "bg-red-500"}`} />

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
        <p className="text-gray-500 mb-8">
          Hoàn thành lúc: {new Date((result as any).createdAt?._seconds ? (result as any).createdAt._seconds * 1000 : (result as any).createdAt || Date.now()).toLocaleString("vi-VN")}
        </p>

        <div className="flex justify-center mb-8">
          <div className="relative">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle cx="80" cy="80" r="70" className="text-gray-100 stroke-current" strokeWidth="12" fill="none" />
              <circle
                cx="80"
                cy="80"
                r="70"
                className={`${result.score >= 80 ? "text-green-500" : result.score >= 50 ? "text-orange-500" : "text-red-500"} stroke-current`}
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(result.score / 100) * 440} 440`}
                style={{ transition: "stroke-dasharray 1s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-gray-900">{result.score}</span>
              <span className="text-sm font-bold text-gray-500">ĐIỂM</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 md:gap-12">
          <div className="text-center">
            <div className="text-3xl font-black text-gray-900">{result.totalQuestions}</div>
            <div className="text-sm font-bold text-gray-500">TỔNG CÂU</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-green-500">{result.totalCorrect}</div>
            <div className="text-sm font-bold text-green-600/50">ĐÚNG</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-red-500">{result.totalQuestions - result.totalCorrect}</div>
            <div className="text-sm font-bold text-red-600/50">SAI</div>
          </div>
        </div>
      </div>

      {/* Phoenix Rebirth Banner */}
      {canRebirth && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center gap-6 animate-in zoom-in-95">
          <div className="absolute -right-10 -bottom-10 opacity-20">
            <Flame className="w-64 h-64" />
          </div>

          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center flex-shrink-0 z-10 border border-white/30">
            <Sparkles className="w-8 h-8 text-yellow-300" />
          </div>
          <div className="flex-1 text-center md:text-left z-10">
            <h3 className="text-2xl font-black mb-2 flex items-center justify-center md:justify-start gap-2">
              Phượng Hoàng Tái Sinh <Flame className="w-6 h-6 text-yellow-300" />
            </h3>
            <p className="text-white/90 font-medium">Bạn có 1 đặc quyền chọn 1 câu đã làm sai để sửa lại và gỡ điểm. Hãy dùng cẩn thận!</p>
          </div>
          <div className="z-10">
            <button
              onClick={() => {
                document.getElementById("review-section")?.scrollIntoView({ behavior: "smooth" });
                toast.dismiss("Hãy chọn 1 câu sai bên dưới và bấm nút Hồi Sinh");
              }}
              className="px-6 py-3 bg-white text-red-600 font-bold rounded-2xl shadow-md hover:scale-105 transition-transform"
            >
              Dùng ngay
            </button>
          </div>
        </div>
      )}

      {/* Rebirth Modal */}
      {rebirthTarget && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-red-500" />
            <h2 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-2">
              <Flame className="w-6 h-6 text-orange-500" /> Sử dụng Phượng Hoàng Tái Sinh
            </h2>
            <p className="text-gray-500 mb-6">Bạn chỉ có 1 cơ hội duy nhất để sửa sai cho câu hỏi này.</p>

            {(() => {
              const q = quiz.questions.find((x) => x.id === rebirthTarget);
              if (!q) return null;
              return (
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                    <p className="font-bold text-gray-900 text-lg leading-relaxed">{q.text}</p>
                  </div>

                  <div className="space-y-3">
                    {q.options
                      .filter((o) => o)
                      .map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setRebirthAnswer(opt)}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                            rebirthAnswer === opt ? "border-orange-500 bg-orange-50" : "border-gray-100 hover:border-orange-200"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                              rebirthAnswer === opt ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className="font-semibold text-gray-800">{opt}</span>
                        </button>
                      ))}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => {
                        setRebirthTarget(null);
                        setRebirthAnswer("");
                      }}
                      className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={handleRebirth}
                      disabled={!rebirthAnswer || rebirthLoading}
                      className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {rebirthLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" /> Chốt đáp án
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Detail Review */}
      {hideDetails ? (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Đã ẩn chi tiết bài làm</h2>
          <p className="text-gray-500">Phòng thi này không cho phép xem lại chi tiết bài làm sau khi hoàn thành.</p>
        </div>
      ) : (
        <div id="review-section" className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">Chi tiết bài làm</h2>

          {quiz.questions.map((q, idx) => {
            const evalData = result.evaluation[q.id];
            const isCorrect = evalData?.isCorrect;

            return (
              <div key={q.id} className={`bg-white rounded-3xl p-6 border-2 transition-colors ${isCorrect ? "border-green-100" : "border-red-100"}`}>
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isCorrect ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                      {isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-400 mb-1 block">Câu {idx + 1}</span>
                      <h3 className="font-bold text-gray-900 text-lg">{q.text}</h3>
                    </div>
                  </div>
                  {!isCorrect && canRebirth && (
                    <button
                      onClick={() => setRebirthTarget(q.id)}
                      className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-600 font-bold text-sm rounded-xl transition-colors flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Flame className="w-4 h-4" /> Hồi sinh
                    </button>
                  )}
                </div>

                <div className="space-y-3 pl-14">
                  {q.options
                    .filter((o) => o)
                    .map((opt, oIdx) => {
                      const isUserSelected = evalData?.userAnswer === opt;
                      const isActuallyCorrect = evalData?.correctAnswer === opt;

                      let optionClass = "border-gray-100 bg-gray-50/50 text-gray-500 opacity-60";
                      if (isActuallyCorrect) optionClass = "border-green-500 bg-green-50 text-green-700 font-bold";
                      else if (isUserSelected && !isActuallyCorrect) optionClass = "border-red-500 bg-red-50 text-red-700 font-bold";

                      return (
                        <div key={oIdx} className={`flex items-center gap-3 p-3 rounded-xl border-2 ${optionClass}`}>
                          <div className="w-6 h-6 flex items-center justify-center font-bold text-sm">{String.fromCharCode(65 + oIdx)}</div>
                          <span className="flex-1">{opt}</span>
                          {isActuallyCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                          {isUserSelected && !isActuallyCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                        </div>
                      );
                    })}
                </div>

                {evalData?.explanation && (
                  <div className="mt-6 pl-14">
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                      <p className="text-sm font-bold text-blue-800 mb-1">Giải thích:</p>
                      <p className="text-sm text-blue-900/80 leading-relaxed">{evalData.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-center pt-8">
        <Link to="/quiz" className="px-8 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2">
          Về trang chủ Quiz <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
