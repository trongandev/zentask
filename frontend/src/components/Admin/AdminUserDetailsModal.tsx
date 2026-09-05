import React, { useEffect, useState } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { Button } from "@/src/components/ui/Button";
import { adminService } from "@/src/services/adminService";
import toastService from "@/src/services/toastService";
import { User, Activity, BrainCircuit, Library, Award, RefreshCw, AlertTriangle, Crown, Check } from "lucide-react";
import { UserAvatar } from "@/src/components/ui/UserAvatar";
import { UserLevelBadge } from "@/src/components/ui/UserLevelBadge";
import { getRankName } from "@/src/config/rankTopicConfig";

interface AdminUserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string | null;
}

export function AdminUserDetailsModal({ isOpen, onClose, uid }: AdminUserDetailsModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Rank states
  const [rankId, setRankId] = useState(1);
  const [tier, setTier] = useState(3);

  const fetchUserDetails = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const res = await adminService.getUserDetails(uid);
      setData(res);
      setRankId(res.rankProgress?.rankId || 1);
      setTier(res.rankProgress?.tier || 3);
    } catch (error: any) {
      toastService.error("Không thể tải thông tin chi tiết user.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && uid) {
      fetchUserDetails();
    }
  }, [isOpen, uid]);

  const handleManageAction = async (action: string, payload: any = {}, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      const res = await adminService.manageUserDetails(uid as string, action, payload);
      toastService.success(res.message || "Thao tác thành công");
      fetchUserDetails();
    } catch (error: any) {
      toastService.error("Thao tác thất bại.");
    }
  };

  if (!isOpen || !uid) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl p-0 overflow-hidden bg-slate-50">
      <div className="flex flex-col h-[80vh]">
        {/* Header */}
        <div className="bg-white p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {data?.user && <UserAvatar src={data.user.photoURL} alt={data.user.displayName} level={data.user.level} uid={data.user._id} className="w-16 h-16" />}
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{data?.user?.displayName || "Đang tải..."}</h2>
              <p className="text-slate-500">{data?.user?.email}</p>
            </div>
          </div>
          {data?.user && (
            <div className="text-right pr-10">
              <UserLevelBadge level={data.user.level || 1} />
              <p className="text-sm font-medium text-slate-500 mt-1">XP: {data.user.xp || 0}</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : data ? (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Sidebar Tabs */}
              <div className="w-full md:w-64 flex flex-col gap-2">
                <Button variant={activeTab === "overview" ? "default" : "outline"} size="default" className="justify-start gap-3 w-full" onClick={() => setActiveTab("overview")}>
                  <Award className="w-5 h-5" /> Cấp độ & Rank
                </Button>
                <Button variant={activeTab === "progress" ? "default" : "outline"} size="default" className="justify-start gap-3 w-full" onClick={() => setActiveTab("progress")}>
                  <Activity className="w-5 h-5" /> Lộ trình cơ bản
                </Button>
                <Button variant={activeTab === "flashcard" ? "default" : "outline"} size="default" className="justify-start gap-3 w-full" onClick={() => setActiveTab("flashcard")}>
                  <Library className="w-5 h-5" /> Flashcards
                </Button>
                <Button variant={activeTab === "quiz" ? "default" : "outline"} size="default" className="justify-start gap-3 w-full" onClick={() => setActiveTab("quiz")}>
                  <BrainCircuit className="w-5 h-5" /> Quizzes
                </Button>
                <Button variant={activeTab === "vip" ? "default" : "outline"} size="default" className="justify-start gap-3 w-full" onClick={() => setActiveTab("vip")}>
                  <Crown className="w-5 h-5" /> Quản lý VIP
                </Button>
              </div>

              {/* Main Panel */}
              <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">Thông tin Arena Rank</h3>
                      <p className="text-sm text-slate-500 mb-4">Điều chỉnh Rank và Tier của user (Chỉ áp dụng cho ngôn ngữ đang học hiện tại).</p>
                    </div>

                    <div className="flex items-center gap-6 max-w-sm mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="w-20 h-20 shrink-0 bg-white rounded-xl flex items-center justify-center p-2 border-2 border-slate-200 shadow-sm">
                        <img src={`/rank/${Math.min(Math.max(rankId, 1), 5)}.png`} alt="Rank Icon" className="w-full h-full object-contain drop-shadow-md" />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Preview</p>
                        <h4 className="text-xl font-black text-indigo-700 tracking-wide">{getRankName(rankId, tier)}</h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 max-w-sm">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Rank ID (1-8)</label>
                        <input type="number" min="1" max="8" value={rankId} onChange={(e) => setRankId(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tier (1-3)</label>
                        <input type="number" min="1" max="3" value={tier} onChange={(e) => setTier(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-lg" />
                      </div>
                    </div>
                    <Button
                      variant="default"
                      onClick={() => handleManageAction("UPDATE_RANK", { rankId, tier }, "Cập nhật Rank cho user này?")}
                      size="default"
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Lưu thay đổi Rank
                    </Button>
                  </div>
                )}

                {activeTab === "progress" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">Bài học đã hoàn thành</h4>
                        <p className="text-2xl font-black text-blue-600">{data.stats?.beginnerCompletedLessons || 0}</p>
                      </div>
                    </div>

                    {data.roadmap && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-800 mb-4">Lộ trình AI cá nhân hoá</h4>
                        <div className="flex flex-wrap gap-4">
                          {data.roadmap.days?.map((day: any) => {
                            const isCompleted = data.roadmap.completedDays?.includes(day.day);
                            return (
                              <div
                                key={day.day}
                                title={day.topic}
                                className={`w-12 h-12 rounded-full flex items-center justify-center relative shadow-[0_4px_0_0] border-[2px] border-white transition-all cursor-help ${
                                  isCompleted
                                    ? "bg-yellow-400 text-white shadow-[#d97706]"
                                    : "bg-slate-200 text-slate-400 shadow-slate-300"
                                }`}
                              >
                                {isCompleted ? <Check className="w-6 h-6 stroke-[3]" /> : <span className="font-bold text-sm">{day.day}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Danger Zone
                      </h4>
                      <p className="text-sm text-red-600 mb-4">Hành động này sẽ xoá toàn bộ tiến trình học lộ trình cơ bản và roadmap sinh ra bởi AI của user. User sẽ phải làm bài test lại từ đầu. Không thể hoàn tác.</p>
                      <Button variant="destructive" size="default" onClick={() => handleManageAction("RESET_BEGINNER_PROGRESS", {}, "Xoá toàn bộ tiến trình học cơ bản và roadmap của user?")}>
                        Reset Lộ trình cơ bản
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === "flashcard" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-purple-50 p-4 rounded-xl border border-purple-100">
                      <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                        <Library className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">Tổng số Flashcards</h4>
                        <p className="text-2xl font-black text-purple-600">{data.stats?.totalFlashcards || 0}</p>
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Danger Zone
                      </h4>
                      <p className="text-sm text-red-600 mb-4">Hành động này sẽ xoá toàn bộ Flashcards và Vocab Sets của user. Không thể hoàn tác.</p>
                      <Button variant="destructive" size="default" onClick={() => handleManageAction("RESET_FLASHCARDS", {}, "Xoá toàn bộ Flashcards?")}>
                        Xoá tất cả Flashcards
                      </Button>
                    </div>

                    {data.flashcardSets && data.flashcardSets.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700">
                          Danh sách bộ Flashcard
                        </div>
                        <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                          {data.flashcardSets.map((set: any) => (
                            <li key={set._id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                              <div>
                                <h5 className="font-semibold text-slate-800">{set.title}</h5>
                                <p className="text-xs text-slate-500">{set.cardCount || 0} thẻ • {new Date(set.createdAt).toLocaleDateString("vi-VN")}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "quiz" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
                      <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                        <BrainCircuit className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">Lượt làm bài Quiz</h4>
                        <p className="text-2xl font-black text-orange-600">{data.stats?.totalQuizzesTaken || 0}</p>
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Danger Zone
                      </h4>
                      <p className="text-sm text-red-600 mb-4">Hành động này sẽ xoá toàn bộ lịch sử thi Quiz của user. Không thể hoàn tác.</p>
                      <Button variant="destructive" size="default" onClick={() => handleManageAction("RESET_QUIZZES", {}, "Xoá toàn bộ lịch sử thi Quiz?")}>
                        Xoá Lịch sử Quiz
                      </Button>
                    </div>

                    {data.quizHistory && data.quizHistory.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700">
                          Lịch sử làm Quiz
                        </div>
                        <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                          {data.quizHistory.map((history: any) => (
                            <li key={history._id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                              <div>
                                <h5 className="font-semibold text-slate-800">{history.quizId?.title || "Quiz ẩn/xóa"}</h5>
                                <p className="text-xs text-slate-500">
                                  {new Date(history.createdAt).toLocaleDateString("vi-VN")} • Độ khó: <span className="uppercase">{history.quizId?.difficulty || "N/A"}</span>
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-slate-800">{history.score} điểm</span>
                                <p className="text-xs text-slate-500">{history.totalCorrect}/{history.totalQuestions} câu</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "vip" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">Trạng thái VIP</h3>
                      <p className="text-sm text-slate-500 mb-4">Quản lý đặc quyền VIP cho user này.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-amber-50 p-4 rounded-xl border border-amber-100">
                      <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                        <Crown className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">Trạng thái hiện tại</h4>
                        {data.user?.isVip ? (
                          <p className="text-amber-600 font-semibold">VIP {data.user?.vipUntil ? `đến ${new Date(data.user.vipUntil).toLocaleDateString("vi-VN")}` : "(Trọn đời)"}</p>
                        ) : (
                          <p className="text-slate-500 font-medium">Chưa đăng ký VIP</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => {
                          const date = new Date();
                          date.setMonth(date.getMonth() + 1);
                          handleManageAction("UPDATE_VIP", { isVip: true, vipUntil: date }, "Gia hạn VIP 1 tháng?");
                        }}
                      >
                        +1 Tháng
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => {
                          const date = new Date();
                          date.setMonth(date.getMonth() + 3);
                          handleManageAction("UPDATE_VIP", { isVip: true, vipUntil: date }, "Gia hạn VIP 3 tháng?");
                        }}
                      >
                        +3 Tháng
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => {
                          const date = new Date();
                          date.setMonth(date.getMonth() + 6);
                          handleManageAction("UPDATE_VIP", { isVip: true, vipUntil: date }, "Gia hạn VIP 6 tháng?");
                        }}
                      >
                        +6 Tháng
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => {
                          const date = new Date();
                          date.setFullYear(date.getFullYear() + 1);
                          handleManageAction("UPDATE_VIP", { isVip: true, vipUntil: date }, "Gia hạn VIP 1 năm?");
                        }}
                      >
                        +1 Năm
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => {
                          const date = new Date();
                          date.setFullYear(date.getFullYear() + 2);
                          handleManageAction("UPDATE_VIP", { isVip: true, vipUntil: date }, "Gia hạn VIP 2 năm?");
                        }}
                      >
                        +2 Năm
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        className="border-amber-500 text-amber-600 hover:bg-amber-50"
                        onClick={() => {
                          handleManageAction("UPDATE_VIP", { isVip: true, vipUntil: null }, "Cấp VIP trọn đời?");
                        }}
                      >
                        Trọn đời
                      </Button>
                    </div>

                    {data.user?.isVip && (
                      <div className="pt-4 border-t border-slate-100">
                        <Button variant="destructive" size="default" onClick={() => handleManageAction("UPDATE_VIP", { isVip: false, vipUntil: null }, "Huỷ VIP của user này?")}>
                          Huỷ VIP
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p>Không tìm thấy dữ liệu.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
