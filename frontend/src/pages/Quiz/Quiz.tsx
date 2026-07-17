import { HelpCircle, Clock, Target, Play, Award, RotateCcw, Plus, LogIn, Globe2, Lock, Crown, X, Star, Search, Tags } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuizStore } from "../../services/quizService";
import { useAuth } from "../../contexts/AuthContext";
import toastService from "@/src/services/toastService";
import { Modal } from "../../components/shared/Modal";

export function Quiz() {
  const {
    quizzes,
    publicQuizzes,
    builtinQuizzes,
    quizHistory: history,
    quizCategories,
    getQuizzes,
    getPublicQuizzes,
    getBuiltinQuizzes,
    getQuizHistory,
    fetchQuizCategories,
    createQuizCategory,
    deleteQuizCategory,
    loading,
    getRoomByCode,
  } = useQuizStore();
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [roomCodeDigits, setRoomCodeDigits] = useState(["", "", "", "", "", ""]);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [activeTab, setActiveTab] = useState<"mine" | "builtin" | "public">("mine");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createIsPublic, setCreateIsPublic] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryKey, setActiveCategoryKey] = useState("all");
  const [newQuizCategoryName, setNewQuizCategoryName] = useState("");
  const [selectedCreateCategoryId, setSelectedCreateCategoryId] = useState("");
  const navigate = useNavigate();

  const isVip = Boolean(
    (user as any)?.isVip ||
    (user as any)?.vip ||
    user?.role === "admin" ||
    (user as any)?.role === "vip" ||
    ["vip", "pro", "premium"].includes(String((user as any)?.plan || (user as any)?.subscriptionPlan || "").toLowerCase()) ||
    String((user as any)?.subscriptionStatus || "").toLowerCase() === "active",
  );

  const visibleQuizzes = activeTab === "mine" ? quizzes : activeTab === "builtin" ? builtinQuizzes : publicQuizzes;
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const getQuizCategoryKey = (quiz: any) => {
    if ((activeTab === "public" || activeTab === "builtin") && quiz.categoryName) return `name:${String(quiz.categoryName).trim().toLowerCase()}`;
    if (quiz.categoryId) return `id:${quiz.categoryId}`;
    if (quiz.categoryName) return `name:${String(quiz.categoryName).trim().toLowerCase()}`;
    return "uncategorized";
  };

  const matchesCategory = (quiz: any) => activeCategoryKey === "all" || getQuizCategoryKey(quiz) === activeCategoryKey;

  const searchedVisibleQuizzes = visibleQuizzes.filter(matchesCategory).filter((quiz) => {
    if (!normalizedSearch) return true;
    const haystack = [
      quiz.title,
      quiz.description,
      quiz.difficulty,
      quiz.categoryName,
      (quiz as any).creator?.displayName,
      ...(quiz.questions || []).flatMap((q: any) => [q.text, ...(q.options || []), q.correctAnswer]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  const orderedVisibleQuizzes =
    activeTab === "mine" ? [...searchedVisibleQuizzes.filter((quiz) => (quiz as any).isFeatured), ...searchedVisibleQuizzes.filter((quiz) => !(quiz as any).isFeatured)] : searchedVisibleQuizzes;

  const quizCategoryOptions = (() => {
    const base = [{ key: "all", name: "Tất cả", count: visibleQuizzes.length, color: "bg-blue-600" }];
    const uncategorizedCount = visibleQuizzes.filter((quiz: any) => getQuizCategoryKey(quiz) === "uncategorized").length;
    if (uncategorizedCount > 0) base.push({ key: "uncategorized", name: "Chưa phân loại", count: uncategorizedCount, color: "bg-slate-500" });

    if (activeTab === "mine") {
      return [
        ...base,
        ...quizCategories.map((category) => ({
          key: `id:${category.id}`,
          id: category.id,
          name: category.name,
          color: category.color || "bg-blue-500",
          count: visibleQuizzes.filter((quiz: any) => String(quiz.categoryId || "") === String(category.id)).length,
        })),
      ];
    }

    const byName = new Map<string, { key: string; name: string; count: number; color: string }>();
    visibleQuizzes.forEach((quiz: any) => {
      if (!quiz.categoryName) return;
      const name = String(quiz.categoryName).trim();
      const key = `name:${name.toLowerCase()}`;
      const current = byName.get(key) || { key, name, count: 0, color: activeTab === "builtin" ? (name.toUpperCase() === "IELTS" ? "bg-indigo-500" : "bg-emerald-500") : "bg-emerald-500" };
      current.count += 1;
      byName.set(key, current);
    });
    return [...base, ...Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, "vi"))];
  })();

  useEffect(() => {
    if (user) {
      getQuizzes();
      getQuizHistory();
    } else {
      setActiveTab("public");
    }
    getPublicQuizzes();
    getBuiltinQuizzes();
    fetchQuizCategories();
  }, [getQuizzes, getPublicQuizzes, getBuiltinQuizzes, getQuizHistory, fetchQuizCategories]);

  useEffect(() => {
    setActiveCategoryKey("all");
  }, [activeTab]);

  const handleJoinRoom = async () => {
    const codeToJoin = roomCodeDigits.join("").trim() || roomCode.trim();
    if (!codeToJoin) {
      setJoinError("Vui lòng nhập mã phòng");
      return;
    }
    if (codeToJoin.length < 6) {
      setJoinError("Mã phòng phải có 6 ký tự");
      return;
    }
    
    setJoinError("");
    const room = await getRoomByCode(codeToJoin);
    if (room) {
      setIsJoinModalOpen(false);
      navigate(`/quiz/room/${room.roomCode}`);
    } else {
      setJoinError("Mã phòng không tồn tại hoặc đã đóng");
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    setJoinError("");
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleanValue.length > 1) {
      const pasted = cleanValue.slice(0, 6).split("");
      const newDigits = [...roomCodeDigits];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setRoomCodeDigits(newDigits);
      const focusIndex = Math.min(5, pasted.length - 1);
      document.getElementById(`room-code-${focusIndex}`)?.focus();
      return;
    }

    const newDigits = [...roomCodeDigits];
    newDigits[index] = cleanValue;
    setRoomCodeDigits(newDigits);

    if (cleanValue && index < 5) {
      document.getElementById(`room-code-${index + 1}`)?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !roomCodeDigits[index] && index > 0) {
      document.getElementById(`room-code-${index - 1}`)?.focus();
    } else if (e.key === "Enter") {
      handleJoinRoom();
    }
  };

  const openJoinModal = () => {
    setJoinError("");
    setRoomCodeDigits(["", "", "", "", "", ""]);
    setIsJoinModalOpen(true);
    setTimeout(() => {
      document.getElementById("room-code-0")?.focus();
    }, 100);
  };

  const openCreateQuizModal = () => {
    setCreateIsPublic(true);
    setSelectedCreateCategoryId(activeCategoryKey.startsWith("id:") ? activeCategoryKey.replace("id:", "") : "");
    setIsCreateModalOpen(true);
  };

  const continueCreateQuiz = () => {
    if (!createIsPublic && !isVip) {
      toastService.error("Quiz riêng tư chỉ dành cho tài khoản VIP. Vui lòng chọn Công khai hoặc nâng cấp VIP.");
      return;
    }
    setIsCreateModalOpen(false);
    const params = new URLSearchParams({ privacy: createIsPublic ? "public" : "private" });
    if (selectedCreateCategoryId) params.set("categoryId", selectedCreateCategoryId);
    navigate(`/quiz/create?${params.toString()}`);
  };

  const handleCreateQuizCategory = async () => {
    const name = newQuizCategoryName.trim();
    if (!name) return toastService.error("Nhập tên đề mục quiz trước");
    const created = await createQuizCategory(name, "bg-blue-500");
    if (created) {
      setNewQuizCategoryName("");
      setActiveCategoryKey(`id:${created.id}`);
      setSelectedCreateCategoryId(created.id);
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
          <button
            onClick={openJoinModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border-2 border-blue-100 text-blue-600 px-5 py-2.5 rounded-xl font-bold hover:bg-blue-50 transition-all"
          >
            <LogIn className="w-5 h-5" /> Nhập mã phòng
          </button>
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex  gap-2 w-full sm:w-max">
          <button
            onClick={() => setActiveTab("mine")}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === "mine" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Của tôi
          </button>
          <button
            onClick={() => setActiveTab("builtin")}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === "builtin" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Có sẵn
          </button>
          <button
            onClick={() => setActiveTab("public")}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === "public" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Công khai
          </button>
        </div>
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "public" ? "Tìm quiz công khai..." : activeTab === "builtin" ? "Tìm quiz có sẵn IELTS/TOEIC..." : "Tìm trong bài thi nổi bật và quiz của tôi..."}
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-gray-700 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-gray-700">
              <Tags className="h-4 w-4 text-blue-500" /> Đề mục trắc nghiệm
            </h2>
            <p className="text-xs font-medium text-gray-400">
              {activeTab === "public" ? "Lọc quiz công khai theo đề mục do người chia sẻ đặt." : "Sắp xếp quiz của bạn theo IELTS, TOEIC, Ngữ pháp hoặc đề mục tự tạo."}
            </p>
          </div>
          {activeTab === "mine" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newQuizCategoryName}
                onChange={(e) => setNewQuizCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateQuizCategory()}
                placeholder="Tạo đề mục quiz..."
                className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-bold outline-none focus:border-blue-500 sm:w-56"
              />
              <button onClick={handleCreateQuizCategory} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-slate-800">
                Thêm
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
          {quizCategoryOptions.map((category: any) => (
            <div key={category.key} className="group inline-flex shrink-0 items-center overflow-hidden rounded-2xl bg-gray-100">
              <button
                onClick={() => setActiveCategoryKey(category.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-extrabold transition-all ${activeCategoryKey === category.key ? `${category.color || "bg-blue-600"} text-white shadow-sm` : "text-gray-600 hover:bg-gray-200"}`}
              >
                <span>{category.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${activeCategoryKey === category.key ? "bg-white/20 text-white" : "bg-white text-gray-500"}`}>{category.count}</span>
              </button>
              {activeTab === "mine" && category.id && (
                <button onClick={() => deleteQuizCategory(category.id)} title="Xóa đề mục" className="px-2 py-2 text-gray-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Quizzes */}
      <div>
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {activeTab === "public" ? (
              <Globe2 className="w-6 h-6 text-emerald-500" />
            ) : activeTab === "builtin" ? (
              <Star className="w-6 h-6 text-indigo-500" />
            ) : (
              <Award className="w-6 h-6 text-blue-500" />
            )}
            {activeTab === "public" ? "Quiz công khai" : activeTab === "builtin" ? "Quiz có sẵn IELTS/TOEIC" : "Bài thi nổi bật"}
          </h2>
          {activeTab === "mine" ? (
            <p className="text-sm font-medium text-gray-500">Các bài thi nổi bật có sẵn được xếp lên đầu. Quiz bạn tự tạo hoặc lưu về cá nhân nằm phía sau.</p>
          ) : activeTab === "builtin" ? (
            <p className="text-sm font-medium text-gray-500">Mock quiz IELTS/TOEIC được tách riêng khỏi quiz người dùng tạo và không thể xóa.</p>
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
            <p className="text-gray-500 mb-4">
              {searchQuery.trim()
                ? "Không tìm thấy quiz phù hợp."
                : activeTab === "public"
                  ? "Chưa có quiz công khai nào."
                  : activeTab === "builtin"
                    ? "Chưa có quiz có sẵn nào."
                    : "Chưa có bài thi nào được tạo."}
            </p>
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
                          {(quiz as any).categoryName && (
                            <span className="mt-2 inline-flex w-max rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-extrabold text-indigo-600">{(quiz as any).categoryName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    {(quiz as any).isBuiltIn && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border bg-indigo-50 text-indigo-700 border-indigo-100">
                        <Star className="w-3.5 h-3.5" /> Có sẵn
                      </span>
                    )}
                    {(quiz as any).isFeatured && !(quiz as any).isBuiltIn && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border bg-yellow-50 text-yellow-700 border-yellow-100">
                        <Star className="w-3.5 h-3.5" /> Nổi bật
                      </span>
                    )}
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getDifficultyColor(quiz.difficulty)}`}>{quiz.difficulty}</span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${quiz.isPublic === false ? "bg-slate-50 text-slate-600 border-slate-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}
                    >
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

      <Modal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} title="Vào phòng thi" desc="Nhập mã phòng gồm 6 ký tự để bắt đầu.">
        <div className="p-6">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
            {roomCodeDigits.map((digit, idx) => (
              <input
                key={idx}
                id={`room-code-${idx}`}
                type="text"
                maxLength={6}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-extrabold text-blue-700 bg-blue-50 border-2 rounded-xl focus:ring-4 outline-none transition-all uppercase ${
                  joinError ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-blue-100 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              />
            ))}
          </div>
          {joinError && (
            <div className="text-center text-red-500 text-sm font-bold mb-6 bg-red-50 py-2 rounded-lg">
              {joinError}
            </div>
          )}
          <button
            onClick={handleJoinRoom}
            className="w-full bg-blue-600 text-white font-bold text-lg py-3.5 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" /> Tìm phòng
          </button>
        </div>
      </Modal>

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
                <div className="flex items-center gap-2 font-extrabold text-gray-900">
                  <Globe2 className="w-5 h-5 text-emerald-600" /> Công khai
                </div>
                <p className="mt-1 text-sm font-medium text-gray-500">Mặc định. Quiz sẽ xuất hiện ở tab Công khai.</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isVip) {
                    toastService.error("Quiz riêng tư chỉ dành cho tài khoản VIP.");
                    return;
                  }
                  setCreateIsPublic(false);
                }}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${!createIsPublic ? "border-slate-400 bg-slate-100 ring-4 ring-slate-100" : "border-gray-200 bg-gray-50 hover:bg-white"} ${!isVip ? "opacity-75" : ""}`}
              >
                <div className="flex items-center gap-2 font-extrabold text-gray-900">
                  <Lock className="w-5 h-5 text-slate-600" /> Riêng tư {!isVip && <Crown className="w-4 h-4 text-yellow-500" />}
                </div>
                <p className="mt-1 text-sm font-medium text-gray-500">Chỉ tài khoản VIP mới được tạo quiz riêng tư.</p>
              </button>
            </div>
            <div className="border-t border-gray-100 px-6 py-5">
              <label className="mb-2 block text-sm font-bold text-gray-700">Đề mục</label>
              <select
                value={selectedCreateCategoryId}
                onChange={(e) => setSelectedCreateCategoryId(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:border-blue-500"
              >
                <option value="">Chưa phân loại</option>
                {quizCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 border-t border-gray-100 p-6">
              <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 rounded-xl bg-gray-100 py-3 font-bold text-gray-700 hover:bg-gray-200">
                Hủy
              </button>
              <button onClick={continueCreateQuiz} className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700">
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
