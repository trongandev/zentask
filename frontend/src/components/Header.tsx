import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flame, Clock, BookOpen, Star, Search, Bell, ChevronDown, PanelLeftOpen, PanelLeftClose, Menu, User, Settings, LogOut } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { UserLevelBadge } from "./UserLevelBadge";
import { useAuth } from "../contexts/AuthContext";
import { useUserStore } from "../services/userService";

interface HeaderProps {
  isLeftSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  onToggleMobileMenu: () => void;
}

export function Header({ isLeftSidebarOpen, onToggleLeftSidebar, onToggleMobileMenu }: HeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { todayMinutes, initTodayMinutes, incrementLocalMinutes, syncStudyTime } = useUserStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initTodayMinutes();

    const intervalId = setInterval(() => {
      incrementLocalMinutes(1);
    }, 60000);

    const handleUnload = () => {
      syncStudyTime();
    };

    window.addEventListener("beforeunload", handleUnload);

    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearInterval(intervalId);
      window.removeEventListener("beforeunload", handleUnload);
      syncStudyTime();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await syncStudyTime();
      await fetch(`${import.meta.env.VITE_API_BACKEND}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      window.location.reload();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const stats = [
    {
      icon: Flame,
      iconColor: "text-orange-500",
      bgColor: "bg-orange-50",
      label: "Chuỗi",
      value: `${user?.streak || 0} ngày`,
    },
    {
      icon: Clock,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50",
      label: "Hôm nay",
      value: `${todayMinutes} phút`,
    },
    {
      icon: BookOpen,
      iconColor: "text-teal-500",
      bgColor: "bg-teal-50",
      label: "Hoàn thành",
      value: "0",
    },
    {
      icon: Star,
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-50",
      label: "XP",
      value: user?.xp?.toLocaleString() || "0",
    },
  ];

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10 flex-shrink-0">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button onClick={onToggleMobileMenu} className="lg:hidden p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
          <Menu className="w-6 h-6" />
        </button>

        {/* Desktop sidebar toggle */}
        {isLeftSidebarOpen && (
          <button onClick={onToggleLeftSidebar} className="hidden lg:block p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
            {isLeftSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
        )}

        <div className="hidden xl:flex gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-2 rounded-2xl border border-gray-100">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-sm font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <Search className="w-5 h-5" />
        </button>
        <div className="relative" ref={notificationsRef}>
          <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="relative text-gray-400 hover:text-gray-600 transition-colors focus:outline-none">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-bold text-white">3</span>
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-4 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Thông báo</h3>
                <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-full">3 mới</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex gap-3 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Flame className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">
                      <span className="font-bold">Nhắc nhở học tập:</span> Đừng quên hoàn thành bài học hôm nay để giữ chuỗi nhé!
                    </p>
                    <p className="text-xs text-gray-500 mt-1">2 giờ trước</p>
                  </div>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex gap-3 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">
                      <span className="font-bold">Chúc mừng:</span> Bạn vừa đạt thành tích "Chăm chỉ"!
                    </p>
                    <p className="text-xs text-gray-500 mt-1">5 giờ trước</p>
                  </div>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex gap-3 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">
                      <span className="font-bold">Có bài học mới:</span> 50 từ vựng chủ đề Du lịch đã được thêm.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">1 ngày trước</p>
                  </div>
                </div>
              </div>
              <div className="px-4 pt-2 border-t border-gray-100">
                <Link to="/notifications" onClick={() => setIsNotificationsOpen(false)} className="block text-center text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors py-2">
                  Xem tất cả
                </Link>
              </div>
            </div>
          )}
        </div>
        <div className="h-8 w-px bg-gray-200"></div>

        {!user ? (
          <Link to="/auth" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors text-sm">
            Tham gia ngay
          </Link>
        ) : (
          <div className="relative" ref={profileRef}>
            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none">
              <UserAvatar src={user.photoURL} level={user.level} className="w-10 h-10" />
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold text-gray-900 leading-tight">{user.displayName}</p>
                <UserLevelBadge level={user.level} size="sm" />
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 ml-1 hidden sm:block" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-gray-100 mb-1 sm:hidden">
                  <p className="text-sm font-bold text-gray-900 leading-tight">{user.displayName}</p>
                  <div className="mt-1">
                    <UserLevelBadge level={user.level} size="sm" />
                  </div>
                </div>
                <Link to="/profile" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <User className="w-4 h-4 text-gray-400" />
                  Thông tin tài khoản
                </Link>
                <Link to="/settings" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <Settings className="w-4 h-4 text-gray-400" />
                  Cài đặt
                </Link>
                <div className="h-px bg-gray-100 my-1"></div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
