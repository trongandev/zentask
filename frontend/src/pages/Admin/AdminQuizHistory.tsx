import React, { useEffect } from "react";
import { History, Trophy, Target, Activity } from "lucide-react";
import { adminService } from "@/src/services/adminService";
import { DataTable } from "@/src/components/Admin/DataTable";
import { AdminStatCards } from "@/src/components/Admin/AdminStatCards";
import { useAdminStore } from "@/src/store/useAdminStore";

export function AdminQuizHistory() {
  const { quizHistory, fetchQuizHistory } = useAdminStore();
  const page = quizHistory.currentPage;
  const pageData = quizHistory.pages[page] || { items: [], totalPages: 1 };
  const loading = quizHistory.loading;

  useEffect(() => {
    fetchQuizHistory(page);
  }, [page, fetchQuizHistory]);

  const columns = [
    {
      header: "Mã người chơi",
      render: (item: any) => <span className="font-mono text-sm text-gray-700">{item.uid}</span>,
    },
    {
      header: "Mã Quiz",
      render: (item: any) => <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{item.quizId}</span>,
    },
    {
      header: "Điểm số",
      render: (item: any) => <span className={`font-extrabold ${item.score >= 80 ? "text-green-600" : item.score >= 50 ? "text-yellow-600" : "text-red-600"}`}>{item.score}%</span>,
    },
    {
      header: "Chi tiết",
      render: (item: any) => (
        <span className="text-sm font-medium text-gray-600">
          Đúng {item.totalCorrect}/{item.totalQuestions}
        </span>
      ),
    },
    {
      header: "Hồi sinh",
      render: (item: any) =>
        item.usedRebirth ? (
          <span className="inline-flex px-2 py-1 rounded bg-purple-50 text-purple-600 text-xs font-bold uppercase tracking-wider">Đã dùng</span>
        ) : (
          <span className="inline-flex px-2 py-1 rounded bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">Không</span>
        ),
    },
    {
      header: "Ngày làm",
      align: "right" as const,
      render: (item: any) => <span className="text-sm text-gray-500">{item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : "Không rõ"}</span>,
    },
  ];

  const totalHistory = quizHistory.totalItems || 0;
  const highScores = pageData.items.filter((item: any) => item.score >= 80).length;
  const perfectScores = pageData.items.filter((item: any) => item.score === 100).length;
  const avgScore = pageData.items.length > 0 
    ? Math.round(pageData.items.reduce((acc: number, cur: any) => acc + (cur.score || 0), 0) / pageData.items.length)
    : 0;

  const stats = [
    { title: "Lượt làm bài", value: totalHistory, icon: History, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Điểm xuất sắc (≥80)", value: highScores, icon: Trophy, color: "text-green-600", bg: "bg-green-50" },
    { title: "Điểm tuyệt đối (100)", value: perfectScores, icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Điểm TB (trang)", value: `${avgScore}%`, icon: Activity, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-red-600 shadow-sm">
          <History className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Lịch sử đố vui</h1>
          <p className="text-gray-500 font-medium">Theo dõi hoạt động làm bài của người dùng</p>
        </div>
      </div>

      <AdminStatCards stats={stats} />

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <DataTable columns={columns} data={pageData.items} loading={loading} currentPage={page} totalPages={pageData.totalPages} onPageChange={(p) => fetchQuizHistory(p)} />
      </div>
    </div>
  );
}
