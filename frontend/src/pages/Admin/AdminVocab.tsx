import React, { useEffect } from "react";
import { BookOpen, Trash2, BookA, TrendingUp, Activity } from "lucide-react";
import { adminService } from "@/src/services/adminService";
import { DataTable } from "@/src/components/Admin/DataTable";
import { AdminStatCards } from "@/src/components/Admin/AdminStatCards";
import { useAdminStore } from "@/src/store/useAdminStore";
import { UserAvatar } from "@/src/components/UserAvatar";
import { Link } from "react-router-dom";

export function AdminVocab() {
  const { vocab, fetchVocab } = useAdminStore();
  const page = vocab.currentPage;
  const pageData = vocab.pages[page] || { items: [], totalPages: 1 };
  const loading = vocab.loading;

  useEffect(() => {
    fetchVocab(page);
  }, [page, fetchVocab]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa từ vựng này không?")) return;
    const success = await adminService.deleteVocab(id);
    if (success) fetchVocab(page, true);
  };

  const columns = [
    {
      header: "Từ vựng (Term)",
      render: (item: any) => (
        <div>
          <p className="font-bold text-gray-900">{item.term}</p>
          <p className="text-sm text-gray-500 font-mono">{item.phonetic}</p>
        </div>
      ),
    },
    {
      header: "Nghĩa (Translation)",
      render: (item: any) => <span className="font-medium text-gray-700">{item.translation}</span>,
    },
    {
      header: "Bộ thẻ",
      render: (item: any) => {
        const setId = item.setId;
        if (!setId) return <span className="text-gray-400">Không có</span>;

        const idStr = typeof setId === "string" ? setId : setId._id;
        const title = typeof setId === "object" && setId.title ? setId.title : "Bộ thẻ liên kết";

        return (
          <Link to={`/flashcard/${idStr}`} className="text-sm font-bold text-indigo-600 hover:underline">
            {title}
          </Link>
        );
      },
    },
    {
      header: "Người tạo",
      render: (item: any) => {
        const u = item.userId;
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
        <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors inline-block">
          <Trash2 className="w-5 h-5" />
        </button>
      ),
    },
  ];

  const totalVocab = vocab.totalItems || 0;
  const newVocab = pageData.items.filter((item: any) => {
    if (!item.createdAt) return false;
    const diffTime = Math.abs(new Date().getTime() - new Date(item.createdAt).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 7;
  }).length;
  const uniqueUsers = new Set(pageData.items.map((i: any) => i.userId)).size;

  const stats = [
    { title: "Tổng từ vựng", value: totalVocab, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Từ mới (tuần)", value: newVocab, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { title: "Người tạo (trang)", value: uniqueUsers, icon: BookA, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Hoạt động", value: "Ổn định", icon: Activity, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-red-600 shadow-sm">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Từ vựng (Flashcards)</h1>
          <p className="text-gray-500 font-medium">Quản lý các thẻ từ vựng trên hệ thống</p>
        </div>
      </div>

      <AdminStatCards stats={stats} />

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <DataTable columns={columns} data={pageData.items} loading={loading} currentPage={page} totalPages={pageData.totalPages} onPageChange={(p) => fetchVocab(p)} />
      </div>
    </div>
  );
}
