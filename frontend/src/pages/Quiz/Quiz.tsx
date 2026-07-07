import { HelpCircle, Clock, Target, Play, Award, RotateCcw, Plus, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuizStore } from "../../services/quizService";
import toast from "react-hot-toast";

export function Quiz() {
  const { quizzes, quizHistory: history, getQuizzes, getQuizHistory, loading, getRoomByCode } = useQuizStore();
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getQuizzes();
    getQuizHistory();
  }, [getQuizzes, getQuizHistory]);

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return toast.error("Vui lòng nhập mã phòng");
    const room = await getRoomByCode(roomCode);
    if (room) {
      navigate(`/quiz/room/${room.roomCode}`);
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img src="/mascot/Lopy (12).png" className="w-20 h-20 object-contain drop-shadow-md" alt="Mascot" />
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Trắc nghiệm nhanh (Quiz)</h1>
            <p className="text-gray-500 font-medium">Đánh giá kiến thức và kiểm tra trình độ cùng mọi người.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Nhập mã phòng..."
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
              className="w-full sm:w-48 pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none uppercase placeholder:normal-case"
            />
            <button onClick={handleJoinRoom} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
              <LogIn className="w-4 h-4" />
            </button>
          </div>
          <Link
            to="/quiz/create"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            Tạo Quiz
          </Link>
        </div>
      </div>

      {/* Main Quizzes */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-6 h-6 text-blue-500" />
          Bài thi nổi bật
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-6 h-48 animate-pulse border border-gray-100"></div>
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">Chưa có bài thi nào được tạo.</p>
            <Link to="/quiz/create" className="text-blue-600 font-bold hover:underline">
              Tạo bài thi đầu tiên
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => {
              // Check if user completed this quiz
              const completedResult = history.find((h) => h.quizId === quiz.id);
              return (
                <div key={quiz.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col group relative overflow-hidden">
                  <Link to={`/quiz/${quiz.id}`} className="block group cursor-pointer hover:bg-gray-50/50 p-4 -m-4 mb-0 rounded-t-3xl transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex gap-4">
                        <div className={`w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform`}>
                          <HelpCircle className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">{quiz.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2">{quiz.description}</p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getDifficultyColor(quiz.difficulty)}`}>{quiz.difficulty}</span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                      <Target className="w-3.5 h-3.5" />
                      {quiz.questions.length} câu
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                      <Clock className="w-3.5 h-3.5" />
                      {quiz.duration} phút
                    </span>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                    {completedResult ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
                          <Award className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 font-medium">Điểm số</span>
                          <span className="text-sm font-bold text-green-600">{completedResult.score}/100</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-gray-400">Chưa làm</div>
                    )}

                    <Link to={`/quiz/play/${quiz.id}`} className="px-5 py-2.5 bg-gray-50 hover:bg-blue-50 text-blue-600 font-bold rounded-xl transition-colors flex items-center gap-2">
                      {completedResult ? (
                        <>
                          <RotateCcw className="w-4 h-4" /> Làm lại
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" /> Bắt đầu
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6 text-orange-500" />
            Lịch sử làm bài
          </h2>
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-sm font-bold text-gray-500 border-b border-gray-100">Tên bài thi</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-500 border-b border-gray-100">Độ khó</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-500 border-b border-gray-100 text-center">Kết quả</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-500 border-b border-gray-100 text-center">Hồi sinh</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-500 border-b border-gray-100 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{item.quizTitle || "Bài kiểm tra"}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getDifficultyColor(item.quizDifficulty || "Trung bình")}`}>{item.quizDifficulty || "Trung bình"}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${item.score >= 80 ? "text-green-600" : item.score >= 50 ? "text-orange-500" : "text-red-500"}`}>{item.score}/100</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.usedRebirth ? (
                          <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">Đã dùng</span>
                        ) : (
                          <span className="text-xs font-medium text-gray-400">Chưa</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/quiz/result/${item.id}`} className="text-blue-600 font-bold hover:underline text-sm">
                          Xem chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
