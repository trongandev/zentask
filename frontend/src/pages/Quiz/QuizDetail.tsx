import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, Users, Clock, Target, Loader2, ArrowLeft, Settings2 } from "lucide-react";
import { useQuizStore, Quiz, QuizRoomSettings } from "../../services/quizService";
import toastService from "@/src/services/toastService";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

export function QuizDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getQuizById, createRoom } = useQuizStore();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const [settings, setSettings] = useState<QuizRoomSettings>({
    allowRetry: false,
    showAnswers: true,
    phoenixRebirth: true,
    shuffleQuestions: false,
  });

  const [creatingRoom, setCreatingRoom] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!id) return;
      try {
        const data = await getQuizById(id);
        if (data) {
          setQuiz(data);
        } else {
          navigate("/quiz");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id, navigate, getQuizById]);

  const handleCreateRoom = async () => {
    if (!quiz) return;
    try {
      setCreatingRoom(true);
      const room = await createRoom(quiz.id, settings);
      if (room) {
        navigate(`/quiz/room/${room.roomCode}`);
      }
    } finally {
      setCreatingRoom(false);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "Dễ":
        return "text-green-600 bg-green-50 border-green-100";
      case "Trung bình":
        return "text-orange-600 bg-orange-50 border-orange-100";
      case "Khó":
        return "text-red-600 bg-red-50 border-red-100";
      default:
        return "text-blue-600 bg-blue-50 border-blue-100";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!quiz) return null;
  const isBuiltInQuiz = Boolean((quiz as any).isBuiltIn || String(quiz.id || "").startsWith("builtin_quiz_"));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <Button onClick={() => navigate("/quiz")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-semibold">
        <ArrowLeft className="w-5 h-5" />
        Quay lại danh sách
      </Button>

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full blur-3xl opacity-50 -z-10 translate-x-1/3 -translate-y-1/3" />

        <div className="flex flex-wrap items-center gap-3 mb-6">
          {isBuiltInQuiz && <span className="px-3 py-1.5 rounded-xl text-sm font-bold border bg-indigo-50 text-indigo-700 border-indigo-100">Có sẵn</span>}
          <span className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${getDifficultyColor(quiz.difficulty)}`}>{quiz.difficulty}</span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
            <Target className="w-4 h-4" />
            {quiz.questions.length} câu hỏi
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
            <Clock className="w-4 h-4" />
            {quiz.duration} phút
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight leading-tight">{quiz.title}</h1>
        <p className="text-lg text-gray-500 mb-8 max-w-2xl">{quiz.description || "Bài thi trắc nghiệm giúp bạn ôn tập và kiểm tra kiến thức nhanh chóng."}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            onClick={() => navigate(`/quiz/play/${quiz.id}`)}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            <Play className="w-6 h-6" />
            Làm bài ngay (Cá nhân)
          </Button>

          {!isBuiltInQuiz && (
            <Button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg border-2 transition-all hover:scale-[1.02] ${
                showSettings ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Users className="w-6 h-6" />
              Mở phòng thi (Nhiều người)
            </Button>
          )}
        </div>
      </div>

      {showSettings && !isBuiltInQuiz && (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Settings2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Cài đặt phòng thi</h2>
              <p className="text-sm text-gray-500">Tùy chỉnh luật chơi trước khi mời học viên tham gia</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <label className="flex items-start gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 cursor-pointer transition-colors group">
              <Input
                type="checkbox"
                className="w-5 h-5 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={settings.showAnswers}
                onChange={(e) => setSettings({ ...settings, showAnswers: e.target.checked })}
              />
              <div>
                <div className="font-bold text-gray-900 group-hover:text-blue-900 mb-1">Hiển thị đáp án cuối giờ</div>
                <div className="text-sm text-gray-500">Cho phép học viên xem lại chi tiết đúng/sai sau khi thi xong toàn bộ.</div>
              </div>
            </label>

            <label className="flex items-start gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-orange-100 hover:bg-orange-50/30 cursor-pointer transition-colors group">
              <Input
                type="checkbox"
                className="w-5 h-5 mt-1 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                checked={settings.phoenixRebirth}
                onChange={(e) => setSettings({ ...settings, phoenixRebirth: e.target.checked })}
              />
              <div>
                <div className="font-bold text-gray-900 group-hover:text-orange-900 mb-1">Phượng Hoàng Tái Sinh</div>
                <div className="text-sm text-gray-500">Đặc quyền sửa 1 câu sai ở cuối bài để gỡ điểm. Rất thú vị!</div>
              </div>
            </label>

            <label className="flex items-start gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-100 hover:bg-purple-50/30 cursor-pointer transition-colors group">
              <Input
                type="checkbox"
                className="w-5 h-5 mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                checked={settings.shuffleQuestions}
                onChange={(e) => setSettings({ ...settings, shuffleQuestions: e.target.checked })}
              />
              <div>
                <div className="font-bold text-gray-900 group-hover:text-purple-900 mb-1">Xáo trộn câu hỏi</div>
                <div className="text-sm text-gray-500">Tránh học viên nhìn bài nhau khi ngồi cạnh.</div>
              </div>
            </label>

            <label className="flex items-start gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-green-100 hover:bg-green-50/30 cursor-pointer transition-colors group">
              <Input
                type="checkbox"
                className="w-5 h-5 mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                checked={settings.allowRetry}
                onChange={(e) => setSettings({ ...settings, allowRetry: e.target.checked })}
              />
              <div>
                <div className="font-bold text-gray-900 group-hover:text-green-900 mb-1">Cho phép làm lại</div>
                <div className="text-sm text-gray-500">Học viên có thể thi lại nhiều lần trong phòng này.</div>
              </div>
            </label>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleCreateRoom}
              disabled={creatingRoom}
              className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 transition-all flex items-center gap-2 text-lg"
            >
              {creatingRoom ? <Loader2 className="w-6 h-6 animate-spin" /> : "Tạo phòng chờ ngay"}
            </Button>
          </div>
        </div>
      )}

      {/* Danh sách câu hỏi */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">Danh sách câu hỏi ({quiz.questions.length})</h2>
        <div className="space-y-4">
          {quiz.questions.map((q, idx) => (
            <div key={q.id} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50">
              <div className="font-bold text-gray-900 mb-3">
                <span className="text-blue-600 mr-2">Câu {idx + 1}.</span>
                {q.text}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options
                  .filter((o) => o)
                  .map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
                        opt === q.correctAnswer ? "border-green-200 bg-green-50 font-bold text-green-700" : "border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      <div className={`w-6 h-6 flex items-center justify-center rounded-full font-bold ${opt === q.correctAnswer ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                        {String.fromCharCode(65 + oIdx)}
                      </div>
                      {opt}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
