import React, { useEffect, useState } from "react";
import { MessageSquare, ShieldAlert, Trash2 } from "lucide-react";
import { adminService } from "../../services/adminService";
import { DataTable } from "../../components/Admin/DataTable";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { Button } from "@/src/components/ui/Button";

export function AdminCommunityPosts() {
  const [data, setData] = useState({ items: [], totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchPosts = async (p = 1) => {
    setLoading(true);
    const res = await adminService.getCommunityPosts(p, 10);
    setData(res);
    setPage(p);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts(page);
  }, [page]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xoá bài viết này không? Hành động này không thể hoàn tác.")) {
      const success = await adminService.deleteCommunityPost(id);
      if (success) fetchPosts(page);
    }
  };

  const columns = [
    {
      header: "Tác giả",
      render: (item: any) => {
        const u = item.authorId;
        if (!u) return <span className="text-gray-500">Ẩn danh</span>;
        return (
          <div className="flex items-center gap-3">
            <UserAvatar src={u.photoURL} alt={u.displayName} level={u.level} uid={u.uid || u._id} className="w-10 h-10" />
            <div>
              <p className="font-bold text-gray-900">{u.displayName}</p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: "Nội dung",
      render: (item: any) => (
        <div className="max-w-md">
          <p className="text-sm text-gray-900 line-clamp-2" dangerouslySetInnerHTML={{ __html: item.content }}></p>
        </div>
      ),
    },
    {
      header: "Tương tác",
      render: (item: any) => (
        <div className="text-sm text-gray-500">
          <span className="font-bold text-red-500">{item.likes?.length || 0}</span> Thích · <span className="font-bold text-blue-500">{item.comments?.length || 0}</span> Bình luận
        </div>
      ),
    },
    {
      header: "Ngày đăng",
      align: "right" as const,
      render: (item: any) => <span className="text-sm text-gray-500">{item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : "Không rõ"}</span>,
    },
    {
      header: "Hành động",
      align: "right" as const,
      render: (item: any) => (
        <Button onClick={() => handleDelete(item.id || item._id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Xoá bài viết">
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-pink-600 shadow-sm">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Kiểm duyệt Cộng đồng</h1>
          <p className="text-gray-500 font-medium">Quản lý và loại bỏ các bài viết vi phạm</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <DataTable columns={columns} data={data.items} loading={loading} currentPage={page} totalPages={data.totalPages} onPageChange={(p) => setPage(p)} />
      </div>
    </div>
  );
}
