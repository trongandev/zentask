import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Clock, Loader2, ArrowRight, Flame, Sparkles, XCircle } from "lucide-react";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { useQuizStore, Quiz, QuizRoom } from "../../services/quizService";
import toastService from "@/src/services/toastService";

export function QuizPlay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("roomCode");

  const { socket } = useSocket();
  const { user } = useAuth();

  const { getQuizById, getRoomByCode, submitQuiz } = useQuizStore();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [room, setRoom] = useState<QuizRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);

  // Phoenix Rebirth States
  const [showPhoenix, setShowPhoenix] = useState(false);
  const [rebirthTarget, setRebirthTarget] = useState<string | null>(null);
  const [rebirthAnswer, setRebirthAnswer] = useState("");
  const [usedRebirth, setUsedRebirth] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await getQuizById(id || "");
        if (data) {
          setQuiz(data);
          setTimeLeft(data.duration * 60);
        } else {
          navigate("/quiz");
        }

        if (roomCode) {
          const roomData = await getRoomByCode(roomCode);
          setRoom(roomData);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, roomCode, navigate, getQuizById, getRoomByCode]);

  useEffect(() => {
    if (!quiz || timeLeft <= 0 || showPhoenix || submitting) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handlePreSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, timeLeft, showPhoenix, submitting]);

  useEffect(() => {
    if (!socket || !roomCode) return;

    // Join room just in case they reconnected or missed it
    if (user) {
      socket.emit("join_quiz_room", {
        roomCode,
        user: { uid: user.uid, name: user.displayName || "User", avatar: user.photoURL },
      });
    }

    socket.on("room_ended", () => {
      toastService.error("Giáo viên đã kết thúc phòng thi. Hệ thống đang tự động nộp bài...");

      // Auto submit immediately
      submitQuiz(id || "", answers, false, room?.id).then((res) => {
        if (res) {
          if (socket && user && roomCode) {
            socket.emit("student_finished", { roomCode, user: { uid: user.uid, name: user.displayName }, score: res.score });
          }
          if ((res as any).isBuiltIn) {
            sessionStorage.setItem(`builtin_quiz_result_${res.id}`, JSON.stringify({ result: res, quiz }));
          }
          navigate(`/quiz/result/${res.id}`);
        } else {
          navigate("/quiz");
        }
      });
    });

    return () => {
      socket.off("room_ended");
    };
  }, [socket, roomCode, user, id, answers, navigate, room?.id]);

  const wrongQuestions = useMemo(() => {
    if (!quiz) return [];
    return quiz.questions.filter((q) => answers[q.id] && answers[q.id] !== q.correctAnswer);
  }, [quiz, answers]);

  const handleSelect = (questionId: string, option: string) => {
    const newAnswers = { ...answers, [questionId]: option };
    setAnswers(newAnswers);

    if (socket && room && user && quiz) {
      const answeredCount = Object.keys(newAnswers).length;
      let correctCount = 0;
      for (const q of quiz.questions) {
        if (newAnswers[q.id] === q.correctAnswer) correctCount++;
      }

      socket.emit("student_progress", {
        roomCode: room.roomCode,
        user: { uid: user.uid, name: user.displayName, avatar: user.photoURL },
        answeredCount,
        totalQuestions: quiz.questions.length,
        correctCount,
      });
    }
  };

  const handlePreSubmit = () => {
    if (!quiz) return;

    const missing = quiz.questions.filter((q) => !answers[q.id]);
    if (missing.length > 0 && timeLeft > 0) {
      const confirm = window.confirm(`Bạn còn ${missing.length} câu chưa làm. Bạn có chắc chắn nộp bài?`);
      if (!confirm) return;
    }

    if (room?.settings.phoenixRebirth && wrongQuestions.length > 0 && !usedRebirth) {
      setShowPhoenix(true);
      return;
    }

    handleSubmit();
  };

  const handleSubmit = async (finalAnswers = answers, finalRebirth = usedRebirth) => {
    if (!quiz) return;
    try {
      setSubmitting(true);
      const res = await submitQuiz(quiz.id, finalAnswers, finalRebirth, room?.id);

      if (res) {
        if (socket && room && user) {
          socket.emit("student_finished", {
            roomCode: room.roomCode,
            user: { uid: user.uid, name: user.displayName },
            score: res.score,
          });
        }

        if ((res as any).isBuiltIn) {
          sessionStorage.setItem(`builtin_quiz_result_${res.id}`, JSON.stringify({ result: res, quiz }));
        }
        toastService.success(`Nộp bài thành công! Điểm: ${res.score}/100`);
        navigate(`/quiz/result/${res.id}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const executePhoenix = () => {
    if (!rebirthTarget || !rebirthAnswer) return;

    const newAnswers = { ...answers, [rebirthTarget]: rebirthAnswer };
    setAnswers(newAnswers);
    setUsedRebirth(true);
    setShowPhoenix(false);

    // After Phoenix is done, submit
    handleSubmit(newAnswers, true);
  };

  const skipPhoenix = () => {
    setShowPhoenix(false);
    handleSubmit();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!quiz) return null;

  if (showPhoenix) {
    return (
      <div className="max-w-3xl mx-auto py-12 animate-in zoom-in-95">
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/40 shadow-xl">
              <Flame className="w-10 h-10 text-yellow-300" />
            </div>
          </div>

          <h2 className="text-3xl font-black text-center mb-4">Phượng Hoàng Tái Sinh</h2>
          <p className="text-center text-white/90 mb-8 max-w-xl mx-auto">
            Bạn có {wrongQuestions.length} câu trả lời sai. Đặc quyền này cho phép bạn chọn 1 câu để sửa lại đáp án và gỡ điểm trước khi nộp bài chính thức.
          </p>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-8 space-y-4">
            <h3 className="font-bold text-lg mb-4">Chọn 1 câu sai để sửa:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {wrongQuestions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setRebirthTarget(q.id);
                    setRebirthAnswer("");
                  }}
                  className={`p-4 rounded-xl text-left border-2 transition-all ${
                    rebirthTarget === q.id ? "bg-white text-red-600 border-white shadow-lg" : "bg-transparent border-white/30 hover:border-white hover:bg-white/10"
                  }`}
                >
                  <div className="font-bold mb-1 line-clamp-1">Câu hỏi: {q.text}</div>
                  <div className="text-sm opacity-80">Đã chọn sai: {answers[q.id]}</div>
                </button>
              ))}
            </div>
          </div>

          {rebirthTarget && (
            <div className="bg-white text-gray-900 rounded-2xl p-6 shadow-xl mb-8 animate-in slide-in-from-bottom-4">
              <h3 className="font-bold text-xl mb-4">{quiz.questions.find((q) => q.id === rebirthTarget)?.text}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quiz.questions
                  .find((q) => q.id === rebirthTarget)
                  ?.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setRebirthAnswer(opt)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left font-semibold ${
                        rebirthAnswer === opt ? "bg-orange-50 border-orange-500 text-orange-700" : "bg-gray-50 border-gray-100 hover:border-orange-200"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${rebirthAnswer === opt ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      {opt}
                    </button>
                  ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={executePhoenix}
                  disabled={!rebirthAnswer}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Chốt đáp án & Nộp bài
                </button>
              </div>
            </div>
          )}

          {!rebirthTarget && (
            <div className="text-center">
              <button onClick={skipPhoenix} className="text-white/70 hover:text-white font-semibold underline underline-offset-4">
                Bỏ qua đặc quyền và nộp bài
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  const m = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0");
  const s = (timeLeft % 60).toString().padStart(2, "0");
  const isTimeLow = timeLeft < 60;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {room && <div className="bg-blue-600 text-white text-center py-2 rounded-2xl font-bold mb-4 shadow-sm">Đang thi trong phòng: {room.roomCode}</div>}

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm sticky top-4 z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-sm font-bold text-gray-500 mt-2">
            Câu {currentQuestionIndex + 1} / {quiz.questions.length}
          </div>
        </div>

        <div className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-mono text-2xl font-black ${isTimeLow ? "bg-red-50 text-red-600 animate-pulse" : "bg-gray-50 text-gray-800"}`}>
          <Clock className="w-6 h-6" />
          {m}:{s}
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-8 leading-relaxed">
          <span className="text-blue-600 mr-2">Q{currentQuestionIndex + 1}.</span>
          {currentQ.text}
        </h2>

        <div className="space-y-3">
          {currentQ.options
            .filter((o) => o)
            .map((opt, idx) => {
              const isSelected = answers[currentQ.id] === opt;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(currentQ.id, opt)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group ${
                    isSelected ? "border-blue-600 bg-blue-50 shadow-md" : "border-gray-100 bg-white hover:border-blue-200 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 transition-colors ${
                      isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className={`font-semibold text-lg ${isSelected ? "text-blue-900" : "text-gray-700"}`}>{opt}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentQuestionIndex((p) => Math.max(0, p - 1))}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-3 font-bold text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors"
        >
          Quay lại
        </button>

        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <button
            onClick={handlePreSubmit}
            disabled={submitting}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Nộp bài ngay"}
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestionIndex((p) => p + 1)}
            className="px-8 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl shadow-lg flex items-center gap-2 transition-colors"
          >
            Tiếp theo <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Jump Grid */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase">Danh sách câu hỏi</h3>
        <div className="flex flex-wrap gap-2">
          {quiz.questions.map((q, idx) => {
            const hasAnswered = !!answers[q.id];
            const isCurrent = idx === currentQuestionIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-10 h-10 rounded-xl font-bold text-sm transition-all flex items-center justify-center border-2 ${
                  isCurrent
                    ? "border-blue-600 text-blue-600 bg-blue-50 ring-2 ring-blue-500/20"
                    : hasAnswered
                      ? "border-blue-200 bg-blue-500 text-white"
                      : "border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
