import React, { useEffect } from "react";
import { Users, Shield, UserPlus, Activity } from "lucide-react";
import { adminService } from "@/src/services/adminService";
import { AdminStatCards } from "@/src/components/Admin/AdminStatCards";
import { DataTable } from "@/src/components/Admin/DataTable";
import { useAdminStore } from "@/src/store/useAdminStore";
import { UserAvatar } from "@/src/components/ui/UserAvatar";
import { UserLevelBadge } from "@/src/components/ui/UserLevelBadge";
import { Button } from "@/src/components/ui/Button";
import { Select } from "@/src/components/ui/Select";

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

  const handleBanUser = async (uid: string, currentBanStatus: boolean) => {
    const confirmMessage = currentBanStatus ? "Bạn có chắc chắn muốn MỞ KHOÁ tài khoản này không?" : "Bạn có chắc chắn muốn KHOÁ tài khoản này không?";

    if (window.confirm(confirmMessage)) {
      const success = await adminService.banUser(uid, !currentBanStatus);
      if (success) fetchUsers(page, true);
    }
  };

  const columns = [
    {
      header: "Người dùng",
      render: (u: any) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <UserAvatar
              src={u.photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg"}
              alt={u.displayName || "User"}
              level={u.level || 1}
              uid={u.id || u.uid}
              className={`w-12 h-12 ${u.isBanned ? "opacity-50 grayscale" : ""}`}
            />
            {u.isBanned && (
              <div className="absolute -top-1 -right-1 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white" title="Banned">
                <span className="text-[10px] font-bold">B</span>
              </div>
            )}
          </div>
          <div>
            <p className={`font-bold ${u.isBanned ? "text-gray-400 line-through" : "text-gray-900"}`}>{u.displayName || "Người dùng"}</p>
            <p className="text-xs text-gray-500">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Vai trò",
      render: (u: any) => (
        <Select
          className={`border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-red-500 transition-colors cursor-pointer ${
            u.role === "admin" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"
          }`}
          value={u.role || "user"}
          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
          disabled={u.isBanned}
        >
          <option value="user">USER</option>
          <option value="admin">ADMIN</option>
        </Select>
      ),
    },
    {
      header: "Cấp độ",
      render: (u: any) => <UserLevelBadge level={u.level || 1} size="md" />,
    },
    {
      header: "Trạng thái",
      render: (u: any) =>
        u.isBanned ? (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg uppercase">Bị khoá</span>
        ) : (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg uppercase">Hoạt động</span>
        ),
    },
    {
      header: "Ngày tham gia",
      align: "right" as const,
      render: (u: any) => <span className="text-sm text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("vi-VN") : "Không rõ"}</span>,
    },
    {
      header: "Hành động",
      align: "right" as const,
      render: (u: any) => (
        <Button
          onClick={() => handleBanUser(u.id, u.isBanned)}
          disabled={u.role === "admin"}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
            u.role === "admin"
              ? "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed"
              : u.isBanned
                ? "bg-white text-green-600 border-green-200 hover:bg-green-50"
                : "bg-white text-red-600 border-red-200 hover:bg-red-50"
          }`}
        >
          {u.isBanned ? "MỞ KHOÁ" : "KHOÁ"}
        </Button>
      ),
    },
  ];

  const totalUsers = users.totalItems || 0;
  const adminCount = pageData.items.filter((u: any) => u.role === "admin").length;
  const newUsers = pageData.items.filter((u: any) => {
    if (!u.createdAt) return false;
    const diffTime = Math.abs(new Date().getTime() - new Date(u.createdAt).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 7;
  }).length;

  const stats = [
    { title: "Tổng người dùng", value: totalUsers, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Đăng ký mới trong tuần", value: newUsers, icon: UserPlus, color: "text-green-600", bg: "bg-green-50" },
    { title: "Quản trị viên", value: adminCount, icon: Shield, color: "text-red-600", bg: "bg-red-50" },
    { title: "Đang hoạt động", value: "98%", icon: Activity, color: "text-orange-600", bg: "bg-orange-50" },
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

      <AdminStatCards stats={stats} />

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <DataTable columns={columns} data={pageData.items} loading={users.loading} currentPage={page} totalPages={pageData.totalPages} onPageChange={(p) => fetchUsers(p)} />
      </div>
    </div>
  );
}
