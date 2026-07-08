import React, { useEffect } from "react";
import { Users, Shield, User } from "lucide-react";
import { adminService } from "@/src/services/adminService";
import { DataTable } from "@/src/components/Admin/DataTable";
import { useAdminStore } from "@/src/store/useAdminStore";

export function AdminUsers() {
  const { users, fetchUsers } = useAdminStore();
  const page = users.currentPage;
  const pageData = users.pages[page] || { items: [], totalPages: 1 };

  useEffect(() => {
    fetchUsers(page);
  }, [page, fetchUsers]);

  const handleUpdateRole = async (uid: string, role: string) => {
    const success = await adminService.updateUserRole(uid, role);
    if (success) fetchUsers(page, true);
  };

  const columns = [
    {
      header: "Người dùng",
      render: (u: any) => (
        <div className="flex items-center gap-3">
          <img src={u.photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg"} alt={u.displayName || "User"} className="w-10 h-10 rounded-xl object-cover" />
          <div>
            <p className="font-bold text-gray-900">{u.displayName || "Người dùng"}</p>
            <p className="text-xs text-gray-500">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Vai trò",
      render: (u: any) => (
        <select
          className={`border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-red-500 transition-colors cursor-pointer ${
            u.role === "admin" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"
          }`}
          value={u.role || "user"}
          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
        >
          <option value="user">USER</option>
          <option value="admin">ADMIN</option>
        </select>
      ),
    },
    {
      header: "Cấp độ",
      render: (u: any) => <span className="font-bold text-gray-700">Level {u.level || 1}</span>,
    },
    {
      header: "Kinh nghiệm",
      render: (u: any) => <span className="font-extrabold text-blue-600">{u.xp?.toLocaleString() || 0} XP</span>,
    },
    {
      header: "Ngày tham gia",
      align: "right" as const,
      render: (u: any) => <span className="text-sm text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("vi-VN") : "Không rõ"}</span>,
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-red-600 shadow-sm">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Người dùng</h1>
          <p className="text-gray-500 font-medium">Quản lý và phân quyền người dùng</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <DataTable columns={columns} data={pageData.items} loading={users.loading} currentPage={page} totalPages={pageData.totalPages} onPageChange={(p) => fetchUsers(p)} />
      </div>
    </div>
  );
}
