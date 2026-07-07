import { useState } from "react";
import { Bell, Flame, Star, BookOpen, UserPlus, CheckCircle2, Trophy, MoreHorizontal, User, Heart, MessageSquare } from "lucide-react";
import { cn, timeAgo } from "../lib/utils";
import { useSocket } from "../contexts/SocketContext";
import { useNavigate } from "react-router-dom";

export function Notifications() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { notifications, markAsRead } = useSocket();
  const navigate = useNavigate();

  const filteredNotifications = filter === "all" ? notifications : notifications.filter(n => !n.isRead);

  const handleNotificationClick = (n: any) => {
    if (!n.isRead) markAsRead(n.id);
    
    let link = "/";
    if (n.type === "follow") {
      link = `/profile/${n.referenceId}`;
    } else if (n.type === "leaderboard") {
      link = "/leaderboard";
    } else if (n.type?.startsWith("community")) {
      link = "/community";
    } else if (n.type === "learning_reminder") {
      link = "/flashcards";
    }
    
    navigate(link);
  };

  const getNotificationStyles = (type: string) => {
    switch(type) {
      case 'follow': return { Icon: UserPlus, color: "text-purple-600", bg: "bg-purple-100" };
      case 'leaderboard': return { Icon: Trophy, color: "text-yellow-600", bg: "bg-yellow-100" };
      case 'community_like': return { Icon: Heart, color: "text-red-600", bg: "bg-red-100" };
      case 'community_comment': return { Icon: MessageSquare, color: "text-green-600", bg: "bg-green-100" };
      case 'learning_reminder': return { Icon: Flame, color: "text-orange-600", bg: "bg-orange-100" };
      default: return { Icon: Bell, color: "text-blue-600", bg: "bg-blue-100" };
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Thông báo
          </h1>
          <p className="text-gray-500 font-medium">Cập nhật những hoạt động mới nhất của bạn.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setFilter("all")}
            className={cn(
              "px-4 py-2 rounded-xl font-bold text-sm transition-colors",
              filter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            Tất cả
          </button>
          <button 
            onClick={() => setFilter("unread")}
            className={cn(
              "px-4 py-2 rounded-xl font-bold text-sm transition-colors relative",
              filter === "unread" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            Chưa đọc
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-end">
          <button onClick={() => markAsRead()} className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
            Đánh dấu tất cả đã đọc
          </button>
        </div>
        {filteredNotifications.length > 0 ? (
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto no-scrollbar">
            {filteredNotifications.map((notification) => {
              const { Icon, color, bg } = getNotificationStyles(notification.type);
              
              return (
                <div 
                  key={notification.id} 
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "p-4 md:p-6 flex gap-4 transition-colors hover:bg-gray-50 cursor-pointer group",
                    !notification.isRead ? "bg-blue-50/30" : "bg-white"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                    bg
                  )}>
                    <Icon className={cn("w-6 h-6", color)} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={cn(
                          "text-base mb-1",
                          !notification.isRead ? "font-extrabold text-gray-900" : "font-bold text-gray-700"
                        )}>
                          {notification.title}
                        </h3>
                        <p className={cn(
                          "text-sm mb-2",
                          !notification.isRead ? "text-gray-700 font-medium" : "text-gray-500"
                        )}>
                          {notification.message}
                        </p>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-all flex-shrink-0" onClick={(e) => { e.stopPropagation(); }}>
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-gray-400">{timeAgo(notification.createdAt)}</span>
                  </div>
                  
                  {!notification.isRead && (
                    <div className="flex items-center justify-center w-4 flex-shrink-0">
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Không có thông báo nào</h3>
            <p className="text-gray-500 font-medium">Bạn đã xem hết tất cả thông báo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
