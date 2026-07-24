import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flame, Clock, BookOpen, Star, Search, Bell, ChevronDown, PanelLeftOpen, PanelLeftClose, Menu, User, Settings, LogOut, X } from "lucide-react";
import { UserAvatar } from "./ui/UserAvatar";
import { UserLevelBadge } from "@/src/components/ui/UserLevelBadge";
import { useAuth } from "../contexts/AuthContext";
import { useUserStore } from "../services/userService";
import { useSocket } from "../contexts/SocketContext";
import { timeAgo } from "../lib/utils";
import { getNotificationStyles, getNotificationLink } from "../config/notificationConfig";
import { LanguageOverlay } from "./common/LanguageOverlay";
import axiosInstance from "@/src/services/axiosConfig";
import { Button } from "@/src/components/ui/Button";

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
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [showExtensionAd, setShowExtensionAd] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const { notifications, markAsRead } = useSocket();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!localStorage.getItem("hideExtensionAd")) {
      setShowExtensionAd(true);
    }

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
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    initTodayMinutes();

    const intervalId = setInterval(() => {
      incrementLocalMinutes(1);
    }, 60000);

    const handleUnload = () => {
      syncStudyTime();
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("beforeunload", handleUnload);
      syncStudyTime();
    };
  }, [user, initTodayMinutes, incrementLocalMinutes, syncStudyTime]);

  const handleLogout = async () => {
    try {
      await syncStudyTime();

      window.postMessage(
        {
          type: "ZENTASK_SYNC_LOGOUT",
        },
        "*",
      );

      await axiosInstance.post(`/api/auth/logout`);
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

  const handleCloseAd = () => {
    localStorage.setItem("hideExtensionAd", "true");
    setShowExtensionAd(false);
  };

  return (
    <div className="sticky top-0 z-50 flex flex-col w-full flex-shrink-0">
      {showExtensionAd && (
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-4 py-2.5 flex items-center justify-between text-sm shadow-md">
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center sm:text-left">
            <span>
              🎉 <strong>ZenTask Extension mới ra mắt!</strong> Trải nghiệm dịch thuật trực tiếp và lưu từ vựng chỉ với 1 cú click!
            </span>
            <a
              href="https://chromewebstore.google.com/detail/lkhjgkjabnfbfblflgkcapamidmfkjnc"
              target="_blank"
              rel="noreferrer"
              className="bg-white text-blue-600 px-3 py-1 rounded-full font-bold text-xs whitespace-nowrap hover:bg-blue-50 transition-colors shadow-sm"
            >
              Cài đặt ngay
            </a>
          </div>
          <Button onClick={handleCloseAd} className="p-1.5 hover:bg-white/20 rounded-full transition-colors shrink-0 ml-2" title="Đóng quảng cáo">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-4">
          {/* Mobile menu toggle */}
          <Button onClick={onToggleMobileMenu} className="lg:hidden p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
            <Menu className="w-6 h-6" />
          </Button>

          {/* Desktop sidebar toggle */}
          {isLeftSidebarOpen && (
            <Button onClick={onToggleLeftSidebar} className="hidden lg:block p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
              {isLeftSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </Button>
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
          {user && user.targetLanguage && (
            <Button onClick={() => setIsLanguageOpen(true)} className="w-8 h-6 rounded overflow-hidden shadow-sm hover:scale-110 transition-transform" title="Đổi ngôn ngữ">
              <img src={`/flag/${user.targetLanguage}.svg`} alt="Current Language" className="w-full h-full object-cover" />
            </Button>
          )}

          <Button className="text-gray-400 hover:text-gray-600 transition-colors">
            <Search className="w-5" />
          </Button>
          <div className="relative" ref={notificationsRef}>
            <Button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative text-gray-400 hover:text-gray-600 transition-colors focus:outline-none h-full  flex items-center justify-center flex-col"
            >
              <Bell className="w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            {isNotificationsOpen && (
              <div className="fixed left-4 right-4 top-20 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-4 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-[999999] animate-in fade-in slide-in-from-top-2">
                <div className="px-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Thông báo</h3>
                  {unreadCount > 0 && <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-full">{unreadCount} mới</span>}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 py-6">Không có thông báo mới</div>
                  ) : (
                    notifications.slice(0, 5).map((n) => {
                      const { Icon, color, bg } = getNotificationStyles(n.type);
                      const link = getNotificationLink(n);

                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.isRead) markAsRead(n.id);
                            setIsNotificationsOpen(false);
                            navigate(link);
                          }}
                          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer flex gap-3 transition-colors ${!n.isRead ? "bg-blue-50/30" : ""}`}
                        >
                          <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0 relative`}>
                            <Icon className={`w-5 h-5 ${color}`} />
                            {!n.isRead && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></div>}
                          </div>
                          <div>
                            <p className="text-sm text-gray-900 line-clamp-2">
                              <span className="font-bold">{n.title}:</span> {n.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{timeAgo(n.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="px-4 pt-2 border-t border-gray-100 flex items-center justify-between">
                  <Button onClick={() => markAsRead()} className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                    Đánh dấu đã đọc
                  </Button>
                  <Link to="/notifications" onClick={() => setIsNotificationsOpen(false)} className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
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
              <Button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none">
                <UserAvatar src={user.photoURL} level={user.level} className="w-10 h-10" />
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-bold text-gray-900 leading-tight">{user.displayName}</p>
                  <UserLevelBadge level={user.level} size="sm" />
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 ml-1 hidden sm:block" />
              </Button>

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
                  <Link
                    to="/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    Cài đặt
                  </Link>
                  <div className="h-px bg-gray-100 my-1"></div>
                  <Button
                    onClick={() => {
                      handleLogout();
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Đăng xuất
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      {user && (
        <LanguageOverlay isOpen={isLanguageOpen || !user.targetLanguage} canClose={!!user.targetLanguage} onClose={() => setIsLanguageOpen(false)} onSelect={(code) => setIsLanguageOpen(false)} />
      )}
    </div>
  );
}
