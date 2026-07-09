import { HelpCircle, Clock, Target, Play, Award, RotateCcw, Plus, LogIn, Globe2, Lock, Crown, X, Star, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuizStore } from "../../services/quizService";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export function Quiz() {
  const { quizzes, publicQuizzes, quizHistory: history, getQuizzes, getPublicQuizzes, getQuizHistory, loading, getRoomByCode } = useQuizStore();
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [activeTab, setActiveTab] = useState<"mine" | "public">("mine");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createIsPublic, setCreateIsPublic] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const isVip = Boolean(
    (user as any)?.isVip ||
    (user as any)?.vip ||
    user?.role === "admin" ||
    (user as any)?.role === "vip" ||
    ["vip", "pro", "premium"].includes(String((user as any)?.plan || (user as any)?.subscriptionPlan || "").toLowerCase()) ||
    String((user as any)?.subscriptionStatus || "").toLowerCase() === "active"
  );

  const visibleQuizzes = activeTab === "mine" ? quizzes : publicQuizzes;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchedVisibleQuizzes = normalizedSearch
    ? visibleQuizzes.filter((quiz) => {
        const haystack = [
          quiz.title,
          quiz.description,
          quiz.difficulty,
          (quiz as any).creator?.displayName,
          ...(quiz.questions || []).flatMap((q: any) => [q.text, ...(q.options || []), q.correctAnswer]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : visibleQuizzes;
  const orderedVisibleQuizzes = activeTab === "mine"
    ? [
        ...searchedVisibleQuizzes.filter((quiz) => (quiz as any).isFeatured),
        ...searchedVisibleQuizzes.filter((quiz) => !(quiz as any).isFeatured),
      ]
    : searchedVisibleQuizzes;

  useEffect(() => {
    getQuizzes();
    getPublicQuizzes();
    getQuizHistory();
  }, [getQuizzes, getPublicQuizzes, getQuizHistory]);

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return toast.error("Vui lòng nhập mã phòng");
    const room = await getRoomByCode(roomCode);
    if (room) {
      navigate(`/quiz/room/${room.roomCode}`);
    }
  };

  const openCreateQuizModal = () => {
    setCreateIsPublic(true);
    setIsCreateModalOpen(true);
  };

  const continueCreateQuiz = () => {
    if (!createIsPublic && !isVip) {
      toast.error("Quiz riêng tư chỉ dành cho tài khoản VIP. Vui lòng chọn Công khai hoặc nâng cấp VIP.");
      return;
    }
    setIsCreateModalOpen(false);
    navigate(`/quiz/create?privacy=${createIsPublic ? "public" : "private"}`);
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
          <button
            onClick={openCreateQuizModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            Tạo Quiz
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex flex-col sm:flex-row gap-2 w-full sm:w-max">
          <button
            onClick={() => setActiveTab("mine")}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === "mine" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Của tôi
          </button>
          <button
            onClick={() => setActiveTab("public")}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === "public" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Công khai
          </button>
        </div>
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "public" ? "Tìm quiz công khai..." : "Tìm trong bài thi nổi bật và quiz của tôi..."}
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-gray-700 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
      </div>

      {/* Main Quizzes */}
      <div>
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {activeTab === "public" ? <Globe2 className="w-6 h-6 text-emerald-500" /> : <Award className="w-6 h-6 text-blue-500" />}
            {activeTab === "public" ? "Quiz công khai" : "Bài thi nổi bật"}
          </h2>
          {activeTab === "mine" ? (
            <p className="text-sm font-medium text-gray-500">Các bài thi nổi bật có sẵn được xếp lên đầu. Quiz bạn tự tạo hoặc lưu về cá nhân nằm phía sau.</p>
          ) : (
            <p className="text-sm font-medium text-gray-500">Các quiz công khai từ mọi người trong hệ thống.</p>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-6 h-48 animate-pulse border border-gray-100"></div>
            ))}
          </div>
        ) : orderedVisibleQuizzes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">{searchQuery.trim() ? "Không tìm thấy quiz phù hợp." : activeTab === "public" ? "Chưa có quiz công khai nào." : "Chưa có bài thi nào được tạo."}</p>
            {activeTab === "mine" && (
              <button onClick={openCreateQuizModal} className="text-blue-600 font-bold hover:underline">
                Tạo bài thi đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orderedVisibleQuizzes.map((quiz) => {
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
                          {activeTab === "public" && (quiz as any).creator?.displayName && <p className="mt-1 text-xs font-semibold text-gray-400">Tác giả: {(quiz as any).creator.displayName}</p>}
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    {(quiz as any).isFeatured && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border bg-yellow-50 text-yellow-700 border-yellow-100">
                        <Star className="w-3.5 h-3.5" /> Nổi bật
                      </span>
                    )}
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getDifficultyColor(quiz.difficulty)}`}>{quiz.difficulty}</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${quiz.isPublic === false ? "bg-slate-50 text-slate-600 border-slate-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                      {quiz.isPublic === false ? <Lock className="w-3.5 h-3.5" /> : <Globe2 className="w-3.5 h-3.5" />}
                      {quiz.isPublic === false ? "Riêng tư" : "Công khai"}
                    </span>
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

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Tạo Quiz mới</h2>
                <p className="mt-1 text-sm font-medium text-gray-500">Chọn quyền hiển thị trước khi tạo quiz.</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 p-6">
              <button
                type="button"
                onClick={() => setCreateIsPublic(true)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${createIsPublic ? "border-emerald-400 bg-emerald-50 ring-4 ring-emerald-100" : "border-gray-200 bg-gray-50 hover:bg-white"}`}
              >
                <div className="flex items-center gap-2 font-extrabold text-gray-900"><Globe2 className="w-5 h-5 text-emerald-600" /> Công khai</div>
                <p className="mt-1 text-sm font-medium text-gray-500">Mặc định. Quiz sẽ xuất hiện ở tab Công khai.</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isVip) {
                    toast.error("Quiz riêng tư chỉ dành cho tài khoản VIP.");
                    return;
                  }
                  setCreateIsPublic(false);
                }}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${!createIsPublic ? "border-slate-400 bg-slate-100 ring-4 ring-slate-100" : "border-gray-200 bg-gray-50 hover:bg-white"} ${!isVip ? "opacity-75" : ""}`}
              >
                <div className="flex items-center gap-2 font-extrabold text-gray-900"><Lock className="w-5 h-5 text-slate-600" /> Riêng tư {!isVip && <Crown className="w-4 h-4 text-yellow-500" />}</div>
                <p className="mt-1 text-sm font-medium text-gray-500">Chỉ tài khoản VIP mới được tạo quiz riêng tư.</p>
              </button>
            </div>
            <div className="flex gap-3 border-t border-gray-100 p-6">
              <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 rounded-xl bg-gray-100 py-3 font-bold text-gray-700 hover:bg-gray-200">Hủy</button>
              <button onClick={continueCreateQuiz} className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700">Tiếp tục</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
