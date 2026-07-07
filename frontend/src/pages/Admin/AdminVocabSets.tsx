import React, { useEffect } from "react";
import { Folder, Trash2 } from "lucide-react";
import { adminService } from "@/src/services/adminService";
import { DataTable } from "@/src/components/Admin/DataTable";
import { useAdminStore } from "@/src/store/useAdminStore";

export function AdminVocabSets() {
  const { vocabSets, fetchVocabSets } = useAdminStore();
  const page = vocabSets.currentPage;
  const pageData = vocabSets.pages[page] || { items: [], totalPages: 1 };
  const loading = vocabSets.loading;

  useEffect(() => {
    fetchVocabSets(page);
  }, [page, fetchVocabSets]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bộ từ vựng này cùng toàn bộ các thẻ bên trong?")) return;
    const success = await adminService.deleteVocabSet(id);
    if (success) fetchVocabSets(page, true);
  };

  const columns = [
    {
      header: "Tiêu đề",
      render: (item: any) => (
        <div>
          <p className="font-bold text-gray-900">{item.title}</p>
          <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
        </div>
      ),
    },
    {
      header: "Số lượng thẻ",
      render: (item: any) => <span className="inline-flex px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">{item.cardCount || 0} thẻ</span>,
    },
    {
      header: "Người tạo",
      render: (item: any) => <span className="text-sm font-mono text-gray-500">{item.userId}</span>,
    },
    {
      header: "Trạng thái",
      render: (item: any) => (
        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${item.isPublic ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-600"}`}>
          {item.isPublic ? "Công khai" : "Riêng tư"}
        </span>
      ),
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-red-600 shadow-sm">
          <Folder className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Bộ từ vựng</h1>
          <p className="text-gray-500 font-medium">Quản lý các bộ từ vựng trên hệ thống</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <DataTable columns={columns} data={pageData.items} loading={loading} currentPage={page} totalPages={pageData.totalPages} onPageChange={(p) => fetchVocabSets(p)} />
      </div>
    </div>
  );
}
