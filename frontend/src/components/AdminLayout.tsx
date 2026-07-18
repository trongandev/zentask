import React from "react";
import { Outlet, Navigate, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Shield, Users, ListTodo, LogOut, ArrowLeft, BookOpen, Type, HelpCircle, History, Bot, Activity, LayoutDashboard, MessageSquare, Clock } from "lucide-react";

export function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-8 text-center">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quyền truy cập bị từ chối</h2>
        <p className="text-gray-500">Bạn không có quyền truy cập vào khu vực này.</p>
        <NavLink to="/dashboard" className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors">
          Về trang chủ
        </NavLink>
      </div>
    );
  }

  // Redirect /admin to /admin/dashboard
  if (location.pathname === "/admin" || location.pathname === "/admin/") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const ADMIN_NAV_LINKS = [
    { path: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { path: "/admin/daily-task", label: "Nhiệm vụ", icon: ListTodo },
    { path: "/admin/users", label: "Người dùng", icon: Users },
    { path: "/admin/courses", label: "Lộ trình học", icon: BookOpen },
    { path: "/admin/vocab-sets", label: "Bộ từ vựng", icon: BookOpen },
    { path: "/admin/vocab", label: "Từ vựng", icon: Type },
    { path: "/admin/quizzes", label: "Quiz", icon: HelpCircle },
    { path: "/admin/quiz-history", label: "Lịch sử Quiz", icon: History },
    { path: "/admin/community-posts", label: "Bài cộng đồng", icon: MessageSquare },
    { path: "/admin/banned-ips", label: "Honeypot", icon: Shield },
    { path: "/admin/bot-config", label: "Cấu hình Bot", icon: Bot },
    { path: "/admin/bot-jobs", label: "Lịch trình Bot", icon: Clock },
    { path: "/admin/ai-usage", label: "AI Usage", icon: Activity },
    { path: "/admin/system-logs", label: "System Logs", icon: Activity },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 text-red-600">
            <Shield className="w-8 h-8" />
            <span className="font-extrabold text-xl tracking-tight">Admin Portal</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {ADMIN_NAV_LINKS.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          <NavLink to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all w-full">
            <ArrowLeft className="w-5 h-5" />
            Về ứng dụng
          </NavLink>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-600 hover:bg-red-50 transition-all w-full">
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 ">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
