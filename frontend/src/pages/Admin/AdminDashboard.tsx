import React, { useEffect, useState } from "react";
import { LayoutDashboard, Users, HelpCircle, BookOpen, MessageSquare, Activity } from "lucide-react";
import { adminService } from "../../services/adminService";

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const data = await adminService.getAnalyticsOverview();
      setStats(data);
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const cards = [
    { title: "Tổng số người dùng", value: stats?.totalUsers || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Người dùng mới (Hôm nay)", value: stats?.newUsersToday || 0, icon: Users, color: "text-green-600", bg: "bg-green-50" },
    { title: "Tổng số bài Quiz", value: stats?.totalQuizzes || 0, icon: HelpCircle, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Tổng số Thẻ từ vựng", value: stats?.totalFlashcards || 0, icon: BookOpen, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "Bài đăng Cộng đồng", value: stats?.totalPosts || 0, icon: MessageSquare, color: "text-pink-600", bg: "bg-pink-50" },
    { title: "Requests (Hôm nay)", value: stats?.systemLogsToday || 0, icon: Activity, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-blue-600 shadow-sm">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Tổng quan Hệ thống</h1>
          <p className="text-gray-500 font-medium">Theo dõi các chỉ số quan trọng của Zentask</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.bg} ${card.color}`}>
              <card.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{card.title}</p>
              <h3 className="text-3xl font-extrabold text-gray-900">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Xin chào Admin 👋</h2>
        <p className="text-gray-600">
          Chào mừng bạn đến với Admin Portal. Vui lòng sử dụng menu bên trái để quản lý người dùng, tạo bài học và kiểm duyệt cộng đồng.
        </p>
      </div>
    </div>
  );
}
