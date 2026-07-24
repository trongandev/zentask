import React, { useEffect } from "react";
import { Gamepad2, Trash2, Clock, CheckCircle, Activity } from "lucide-react";
import { adminService } from "@/src/services/adminService";
import { DataTable } from "@/src/components/Admin/DataTable";
import { AdminStatCards } from "@/src/components/Admin/AdminStatCards";
import { useAdminStore } from "@/src/store/useAdminStore";
import { UserAvatar } from "@/src/components/ui/UserAvatar";
import { Link } from "react-router-dom";
import { Button } from "@/src/components/ui/Button";

export function AdminQuizzes() {
  const { quizzes, fetchQuizzes } = useAdminStore();
  const page = quizzes.currentPage;
  const pageData = quizzes.pages[page] || { items: [], totalPages: 1 };
  const loading = quizzes.loading;

  useEffect(() => {
    fetchQuizzes(page);
  }, [page, fetchQuizzes]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài quiz này không?")) return;
    const success = await adminService.deleteQuiz(id);
    if (success) fetchQuizzes(page, true);
  };

  const columns = [
    {
      header: "Tiêu đề",
      render: (item: any) => (
        <Link to={`/quiz/${item.id}`} className="font-bold text-indigo-600 hover:underline">
          {item.title}
        </Link>
      ),
    },
    {
      header: "Độ khó",
      render: (item: any) => {
        let color = "bg-gray-100 text-gray-600";
        if (item.difficulty === "Easy") color = "bg-green-50 text-green-600";
        if (item.difficulty === "Medium") color = "bg-blue-50 text-blue-600";
        if (item.difficulty === "Hard") color = "bg-red-50 text-red-600";

        return <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${color}`}>{item.difficulty || "Medium"}</span>;
      },
    },
    {
      header: "Số câu hỏi",
      render: (item: any) => <span className="font-bold text-gray-700">{item.questionCount || 0} câu</span>,
    },
    {
      header: "Người tạo",
      render: (item: any) => {
        const u = item.creatorId;
        if (!u || typeof u === "string") {
          return <span className="text-sm font-mono text-gray-500">{typeof u === "string" ? u : "Không rõ"}</span>;
        }

        return (
          <div className="flex items-center gap-3">
            <UserAvatar
              src={u.photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg"}
              alt={u.displayName || "User"}
              level={u.level || 1}
              uid={u.uid || u._id}
              className="w-10 h-10"
            />
            <div>
              <p className="font-bold text-gray-900">{u.displayName || "Người dùng"}</p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: "Ngày tạo",
      render: (item: any) => <span className="text-sm text-gray-500">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : "Không rõ"}</span>,
    },
    {
      header: "Thao tác",
      align: "right" as const,
      render: (item: any) => (
        <Button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors inline-block">
          <Trash2 className="w-5 h-5" />
        </Button>
      ),
    },
  ];

  const totalQuizzes = quizzes.totalItems || 0;
  const easyCount = pageData.items.filter((q: any) => q.difficulty === "Easy").length;
  const hardCount = pageData.items.filter((q: any) => q.difficulty === "Hard").length;
  const newQuizzes = pageData.items.filter((q: any) => {
    if (!q.createdAt) return false;
    const diffTime = Math.abs(new Date().getTime() - new Date(q.createdAt).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 7;
  }).length;

  const stats = [
    { title: "Tổng số Quiz", value: totalQuizzes, icon: Gamepad2, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Quiz mới (tuần)", value: newQuizzes, icon: Clock, color: "text-green-600", bg: "bg-green-50" },
    { title: "Mức độ Dễ (trang)", value: easyCount, icon: CheckCircle, color: "text-teal-600", bg: "bg-teal-50" },
    { title: "Mức độ Khó (trang)", value: hardCount, icon: Activity, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-red-600 shadow-sm">
          <Gamepad2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Bài đố vui (Quizzes)</h1>
          <p className="text-gray-500 font-medium">Quản lý các bài tập trắc nghiệm</p>
        </div>
      </div>

      <AdminStatCards stats={stats} />

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <DataTable columns={columns} data={pageData.items} loading={loading} currentPage={page} totalPages={pageData.totalPages} onPageChange={(p) => fetchQuizzes(p)} />
      </div>
    </div>
  );
}
