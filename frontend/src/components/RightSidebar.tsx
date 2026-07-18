import { Flame, Target, Trophy, ChevronRight, Check, X, PanelRightOpen, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { UserAvatar } from "./UserAvatar";
import { UserLevelBadge } from "./UserLevelBadge";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { useUserStore } from "../services/userService";
import { useConfigStore } from "../services/configService";
import { useEtcStore } from "../services/etcService";
import { useEffect, useState } from "react";
import { FloatingChat } from "./FloatingChat";
import { Users } from "lucide-react";
import { friendsService } from "../services/friendsService";

const getTimeUntilReset = () => {
  const now = new Date();
  const nextReset = new Date();
  nextReset.setUTCHours(24, 0, 0, 0); // Next midnight UTC (7 AM GMT+7)
  const diff = nextReset.getTime() - now.getTime();

  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff / (1000 * 60)) % 60);
  const s = Math.floor((diff / 1000) % 60);

  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export function RightSidebar({ isOpen = true, onClose, onOpen }: RightSidebarProps) {
  const { user, updateUser } = useAuth();
  const { checkIn, loading: checkingIn, stats } = useUserStore();
  const { dailyTasks, taskProgress } = useConfigStore();
  const { getLeaderboard } = useEtcStore();
  const [timeLeft, setTimeLeft] = useState(getTimeUntilReset());
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChats, setOpenChats] = useState<any[]>([]);
  const [minimizedChats, setMinimizedChats] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [onlineFriends, setOnlineFriends] = useState<any[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilReset());
    }, 1000);

    const fetchLeaderboard = async () => {
      const data = await getLeaderboard("week");
      const enrichedData = data.map((item: any) => ({
        ...item,
        isUser: user ? item.id === user.uid : false,
        xp: item.xp.toLocaleString(),
      }));
      setLeaderboard(enrichedData);
    };

    const fetchOnlineFriends = async () => {
      if (!user) return;
      try {
        const res = await friendsService.getOnlineFriends();
        if (res) setOnlineFriends(res);
      } catch (error) {
        console.error(error);
      }
    };

    fetchLeaderboard();
    fetchOnlineFriends();

    return () => {
      clearInterval(timer);
    };
  }, [user, getLeaderboard]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleReceive = async (payload: any) => {
      if (payload.senderId !== user.uid) {
        if (!openChats.find((c) => c.friendId === payload.senderId)) {
          setUnreadCounts((prev) => ({
            ...prev,
            [payload.senderId]: (prev[payload.senderId] || 0) + 1,
          }));

          let friend = onlineFriends.find((f) => f.friendId === payload.senderId);
          if (!friend) {
            try {
              const allFriends = await (friendsService as any).list();
              friend = allFriends.find((f: any) => f.friendId === payload.senderId);
            } catch (err) {}
          }
          if (friend) {
            setOpenChats((prev) => [...prev, friend]);
            setUnreadCounts((prev) => ({ ...prev, [payload.senderId]: 0 }));
          }
        }
      }
    };

    socket.on("receive_message", handleReceive);
    return () => {
      socket.off("receive_message", handleReceive);
    };
  }, [socket, user, openChats, onlineFriends]);

  const handleOpenChat = (friend: any) => {
    if (!openChats.find((c) => c.friendId === friend.friendId)) {
      setOpenChats((prev) => [...prev, friend]);
    }
    // ensure it's maximized
    setMinimizedChats((prev) => prev.filter((id) => id !== friend.friendId));
    setUnreadCounts((prev) => ({ ...prev, [friend.friendId]: 0 }));
  };

  const tasks = dailyTasks.map((t) => {
    const taskId = (t as any).type;
    let current = taskProgress[taskId] || 0;
    if (taskId === "daily_checkin") {
      const ts = new Date();
      ts.setMinutes(ts.getMinutes() - ts.getTimezoneOffset());
      current = user?.lastCheckInDate === ts.toISOString().split("T")[0] ? 1 : 0;
    }
    return { ...t, current };
  });

  // Lấy ngày hiện tại (local time)
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  const todayStr = today.toISOString().split("T")[0];
  const isCheckedInToday = user?.lastCheckInDate === todayStr;

  // Tính số ngày từ lần điểm danh cuối
  let daysSinceLastCheckIn = 999;
  if (user?.lastCheckInDate) {
    const last = new Date(user.lastCheckInDate);
    const current = new Date(todayStr);
    const diffTime = current.getTime() - last.getTime();
    daysSinceLastCheckIn = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }

  const streak = user?.streak || 0;

  // Lấy dữ liệu 7 ngày từ backend, nếu chưa có thì dùng logic mặc định
  let weekDays = [];
  if (stats && stats.length === 7) {
    weekDays = stats.map((stat) => ({
      name: stat.name,
      active: stat.isCheckedIn,
      current: stat.date === todayStr,
    }));
  } else {
    let currentDayOfWeek = today.getDay() - 1;
    if (currentDayOfWeek === -1) currentDayOfWeek = 6;
    const weekDayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    weekDays = weekDayNames.map((name, index) => {
      const diffDays = currentDayOfWeek - index;
      const isCurrent = diffDays === 0;
      let isActive = false;
      if (diffDays >= 0 && diffDays >= daysSinceLastCheckIn && diffDays <= daysSinceLastCheckIn + streak - 1) {
        isActive = true;
      }
      return { name, active: isActive, current: isCurrent };
    });
  }

  const RANK_NAMES: Record<number, string> = {
    1: "Bạc",
    2: "Lục bảo",
    3: "Tinh Anh",
    4: "Kim Cương",
    5: "Cao Thủ",
  };
  const TIER_NAMES: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };

  return (
    <>
      <aside className={cn("w-full bg-white border-l border-gray-100 h-full space-y-6 relative flex flex-col", isOpen ? "p-6 overflow-y-auto" : "p-3 items-center py-6 overflow-visible")}>
        {isOpen ? (
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors z-20">
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button onClick={onOpen} className="p-2 mb-4 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors group relative border border-gray-100 shadow-sm">
            <PanelRightOpen className="w-6 h-6" />
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
              Mở rộng
              <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-4 border-transparent border-l-gray-900"></div>
            </div>
          </button>
        )}

        {/* Mascot Card */}
        {isOpen && (
          <>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 shadow-sm text-white relative overflow-hidden flex-shrink-0 mt-4">
              <div className="relative z-10 w-2/3">
                <h3 className="font-bold text-lg mb-1 font-heading">Cố lên nhé!</h3>
                <p className="text-xs text-blue-100 mb-3">Bạn đang làm rất tốt, tiếp tục phát huy nha.</p>
              </div>
              <img src="/mascot/Lopy (10).png" className="absolute -right-2 -bottom-2 w-24 h-24 object-contain drop-shadow-lg" alt="Mascot" />
            </div>
            <Link
              to="https://chromewebstore.google.com/detail/lkhjgkjabnfbfblflgkcapamidmfkjnc?utm_source=item-share-cb"
              target="_blank"
              className="bg-white rounded-2xl p-1 border border-gray-100 shadow-sm"
            >
              <img src="/zentask-extension-banner.png" alt="" className="h-full w-full cursor-pointer" />
            </Link>
          </>
        )}

        {/* Guest CTA Card */}
        {!user && isOpen && (
          <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm flex flex-col items-center text-center bg-blue-50/30">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <Target className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Trải nghiệm đầy đủ</h3>
            <p className="text-xs text-gray-500 mb-4 px-2">Đăng nhập để nhận điểm danh hàng ngày, kết nối bạn bè và làm nhiệm vụ nhận XP!</p>
            <button onClick={() => (window.location.href = "/auth")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-sm transition-colors text-sm">
              Đăng nhập ngay
            </button>
          </div>
        )}

        {/* Streak Card */}
        {user &&
          !isCheckedInToday &&
          (isOpen ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-gray-900">Chuỗi ngày học tập</h3>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
                  <Flame className="w-8 h-8 text-orange-500 fill-current" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-gray-900 tracking-tight">{user?.streak || 0}</span>
                    <span className="text-gray-900 font-bold">ngày</span>
                    <span className="text-gray-500 font-medium ml-1">liên tiếp</span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">Tuyệt vời! Hãy duy trì nhé!</p>
                </div>
              </div>

              {(() => {
                return (
                  <button
                    onClick={async () => {
                      if (isCheckedInToday || checkingIn) return;
                      const res = await checkIn();
                      if (res) {
                        const updates: any = { streak: res.streak, lastCheckInDate: res.lastCheckInDate };
                        if ((res as any).xpResult) {
                          updates.xp = (res as any).xpResult.xp;
                          updates.level = (res as any).xpResult.level;
                        }
                        updateUser(updates);
                      }
                    }}
                    disabled={isCheckedInToday || checkingIn}
                    className={cn(
                      "w-full py-2.5 rounded-xl font-bold text-sm mb-4 transition-all flex items-center justify-center gap-2",
                      isCheckedInToday ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 text-white shadow-sm active:scale-95",
                    )}
                  >
                    {checkingIn ? "Đang điểm danh..." : isCheckedInToday ? "Đã điểm danh hôm nay" : "Điểm danh ngay"}
                  </button>
                );
              })()}

              <div className="flex justify-between mb-4">
                {weekDays.map((day, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-400">{day.name}</span>
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all",
                        day.active ? "bg-blue-500 border-blue-500 text-white" : day.current ? "border-blue-500 text-blue-500" : "border-gray-200 text-transparent",
                      )}
                    >
                      {day.active && <Check className="w-4 h-4" />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-orange-50/50 rounded-xl p-3 flex items-center justify-between border border-orange-100 cursor-pointer hover:bg-orange-50 transition-colors">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-800">
                    Kỷ lục cá nhân: <strong>{user?.maxStreak || 0} ngày</strong>
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-orange-400" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 group relative cursor-pointer" onClick={onOpen}>
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100 shadow-sm">
                <Flame className="w-7 h-7 text-orange-500 fill-current" />
              </div>
              <span className="font-bold text-sm text-gray-900">{user?.streak || 0}</span>
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                Chuỗi 7 ngày
                <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-4 border-transparent border-l-gray-900"></div>
              </div>
            </div>
          ))}

        {/* Online Friends */}
        {user && isOpen ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                <h3 className="font-bold text-gray-900">Bạn bè trực tuyến</h3>
              </div>
              <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{onlineFriends.length}</span>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {onlineFriends.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">Không có ai</p>
              ) : (
                onlineFriends.map((friend) => (
                  <div key={friend.friendId} onClick={() => handleOpenChat(friend)} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                    <div className="relative">
                      <img src={friend.photoURL || "https://ui-avatars.com/api/?name=User"} className="w-8 h-8 rounded-full bg-white object-cover border border-gray-200" />
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <span className="text-sm font-bold text-gray-800 truncate">{friend.displayName}</span>
                    {unreadCounts[friend.friendId] > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCounts[friend.friendId]}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : user ? (
          <div className="flex flex-col items-center gap-2 w-full border-t border-gray-100 pt-6 mt-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center border border-green-100 shadow-sm group relative cursor-pointer" onClick={onOpen}>
              <Users className="w-6 h-6 text-green-600" />
              {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10">
                  <span className="text-[10px] font-bold text-white">{Object.values(unreadCounts).reduce((a, b) => a + b, 0)}</span>
                </div>
              )}
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none shadow-xl">
                Bạn bè trực tuyến ({onlineFriends.length})<div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-[6px] border-transparent border-l-gray-900"></div>
              </div>
            </div>
          </div>
        ) : (
          <div></div>
        )}

        {/* Daily Tasks */}
        {user && isOpen ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Nhiệm vụ</h3>
              </div>
              <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold font-mono">{timeLeft}</div>
            </div>

            <div className="space-y-4 mb-4">
              {tasks.map((task, idx) => {
                const percent = (task.current / task.total) * 100;
                return (
                  <div key={idx} className="group relative">
                    <div className="flex justify-between text-sm font-medium text-gray-700 mb-1.5 cursor-help">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0">
                          <img src={task.icon} alt={task.title} className="w-full h-full object-contain" />
                        </span>
                        <div className="flex flex-col">
                          <span>{task.title}</span>
                          <span className="text-[10px] text-blue-600 font-bold">+{task.xpPerItem} XP/lần</span>
                        </div>
                      </div>
                      <span className="text-gray-500 text-xs mt-1">
                        {task.current}/{task.total}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${percent}%` }}></div>
                    </div>
                    <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none shadow-lg">
                      {task.desc}
                      <div className="absolute top-full left-6 w-0 h-0 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-500 font-medium text-center">
              Hoàn thành tất cả để nhận <span className="text-blue-600 font-bold">{tasks.reduce((acc, task) => acc + task.total * (task.xpPerItem || 0), 0)} XP!</span>
            </p>
          </div>
        ) : (
          user && (
            <div className="flex flex-col items-center gap-3 w-full border-t border-gray-100 pt-6">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm group relative cursor-pointer" onClick={onOpen}>
                <Target className="w-6 h-6 text-blue-600" />
                <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none shadow-xl">
                  Nhiệm vụ hôm nay
                  <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-[6px] border-transparent border-l-gray-900"></div>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full items-center">
                {tasks.every((t) => t.current >= t.total) ? (
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center border border-green-200 shadow-sm relative group cursor-pointer" onClick={onOpen}>
                    <Check className="w-5 h-5 text-green-600" />
                    <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                      Đã hoàn thành tất cả!
                      <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-4 border-transparent border-l-gray-900"></div>
                    </div>
                  </div>
                ) : (
                  tasks.map((task, idx) => {
                    const percent = (task.current / task.total) * 100;
                    return (
                      <div key={idx} className="relative group cursor-pointer" onClick={onOpen}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center relative shadow-sm">
                          <div className="absolute inset-0 rounded-full border border-gray-200 bg-white" style={{ background: `conic-gradient(#3b82f6 ${percent}%, #f9fafb ${percent}%)` }}></div>
                          <div className="absolute inset-0.5 rounded-full bg-white flex items-center justify-center">
                            <img src={task.icon} alt={task.title} className="w-6 h-6 object-contain" />
                          </div>
                          {task.current === task.total && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900 text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none shadow-xl flex flex-col min-w-[160px] items-start">
                          <span className="text-gray-100 mb-2">{task.title}</span>
                          <span className="text-[10px] text-gray-400 mb-2 whitespace-normal break-words leading-tight w-full">{task.desc}</span>
                          <div className="w-full bg-gray-700 h-1.5 rounded-full mb-1.5 overflow-hidden">
                            <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
                          </div>
                          <div className="flex justify-between w-full items-center">
                            <span className="text-blue-300 font-medium text-[10px]">
                              {task.current} / {task.total} hoàn thành
                            </span>
                            <span className="text-green-400 font-bold text-[10px]">+{task.xpPerItem} XP</span>
                          </div>
                          <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-[6px] border-transparent border-l-gray-900"></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )
        )}

        {/* Dev-only Test Buttons */}
        {import.meta.env.DEV && isOpen && (
          <div className="bg-purple-50 rounded-2xl border border-purple-100 p-4 shadow-sm mt-4">
            <h3 className="font-bold text-purple-900 mb-2 text-xs uppercase tracking-wider">Dev Tools (Test XP)</h3>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const res = await useUserStore.getState().gainXp(100, "test");
                  if (res) {
                    updateUser({ xp: res.xp, level: res.level });
                  }
                }}
                className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                +100 XP
              </button>
              <button
                onClick={async () => {
                  const res = await useUserStore.getState().gainXp(-100, "test");
                  if (res) {
                    updateUser({ xp: res.xp, level: res.level });
                  }
                }}
                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                -100 XP
              </button>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {isOpen ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">B. XH</h3>
              </div>
              <Link to="/leaderboard" className="text-xs font-semibold text-blue-600 flex items-center gap-0.5 hover:text-blue-700">
                Xem tất cả
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-4">
              {leaderboard.slice(0, 3).map((lUser, idx) => (
                <Link
                  to={lUser.isUser ? "/profile" : `/profile/${lUser.id}`}
                  key={`top-${idx}`}
                  className={cn("flex items-center gap-3 p-2.5 rounded-xl transition-colors cursor-pointer", lUser.isUser ? "bg-blue-50 border border-blue-100" : "hover:bg-gray-50")}
                >
                  {lUser.rank <= 3 ? (
                    <div className="w-6 flex-shrink-0 flex items-center justify-center">
                      <img src={`/top/top${lUser.rank}.png`} alt={`Top ${lUser.rank}`} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-8 font-bold text-gray-400 text-sm flex justify-center flex-shrink-0">{lUser.rank}</div>
                  )}
                  <UserAvatar src={lUser.avatar} level={lUser.level} className="w-10 h-10 flex-shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className={cn("text-sm font-bold truncate mb-0.5", lUser.isUser ? "text-blue-900" : "text-gray-900")}>{lUser.name}</p>
                    <UserLevelBadge level={lUser.level} size="sm" />
                    <div className={cn("text-xs font-bold mt-0.5 flex items-center gap-2", lUser.isUser ? "text-blue-600" : "text-gray-500")}>
                      <span>
                        {lUser.xp} <span className="text-gray-400 font-medium">XP</span>
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-gray-500">
                      {RANK_NAMES[lUser.rankId]} {TIER_NAMES[lUser.tier || 3]}
                    </span>
                  </div>
                  <img src={`/rank/${lUser.rankId}.png`} alt="Rank" className="w-6 object-contain" />
                </Link>
              ))}

              <div className="flex items-center justify-center py-1">
                <div className="w-1 h-1 rounded-full bg-gray-300 mx-0.5"></div>
                <div className="w-1 h-1 rounded-full bg-gray-300 mx-0.5"></div>
                <div className="w-1 h-1 rounded-full bg-gray-300 mx-0.5"></div>
              </div>

              {leaderboard.find((u) => u.isUser) && (
                <Link to="/profile" className="flex items-center gap-3 p-2.5 rounded-xl transition-colors bg-blue-50 border border-blue-100 cursor-pointer">
                  <div className="w-8 font-bold text-blue-600 text-sm flex justify-center flex-shrink-0">{leaderboard.find((u) => u.isUser)?.rank}</div>
                  <UserAvatar src={leaderboard.find((u) => u.isUser)?.avatar || ""} level={leaderboard.find((u) => u.isUser)?.level || 1} className="w-10 h-10 flex-shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-sm font-bold truncate text-blue-900 mb-0.5">Bạn</p>
                    <UserLevelBadge level={leaderboard.find((u) => u.isUser)?.level || 1} size="sm" />
                    <div className="text-xs font-bold text-blue-600 mt-0.5 flex items-center gap-2">
                      <span>
                        {leaderboard.find((u) => u.isUser)?.xp} <span className="text-gray-400 font-medium">XP</span>
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-blue-500">
                      {RANK_NAMES[user?.rankId || 1]} {TIER_NAMES[user?.tier || 3]}
                    </span>
                  </div>
                  <img src={`/rank/${user?.rankId || 1}.png`} alt="Rank" className="w-6 object-contain drop-shadow-sm" />
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full border-t border-gray-100 pt-6 mt-auto mb-4">
            <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center border border-yellow-100 shadow-sm group relative cursor-pointer" onClick={onOpen}>
              <Trophy className="w-6 h-6 text-yellow-600" />
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none shadow-xl">
                Bảng xếp hạng
                <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-[6px] border-transparent border-l-gray-900"></div>
              </div>
            </div>
            <div className="flex flex-col gap-3 pb-6">
              {leaderboard.slice(0, 3).map((lUser, idx) => (
                <Link to={lUser.isUser ? "/profile" : `/profile/${lUser.id}`} key={idx} className="relative group cursor-pointer block">
                  <UserAvatar src={lUser.avatar} level={lUser.level} className="w-10 h-10" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100">
                    <span className="text-[8px] font-bold text-gray-700">{lUser.rank}</span>
                  </div>
                  <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900 text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none shadow-xl flex flex-col min-w-[140px] text-center">
                    <span className="text-gray-100">
                      Top {lUser.rank}: {lUser.name}
                    </span>
                    <div className="flex items-center flex-col">
                      <img src={`/rank/${lUser.rankId}.png`} alt="Rank" className="w-10 object-contain my-2" />
                      <div className="">
                        <span className="text-yellow-400 font-medium text-[10px]">{lUser.xp} XP</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-300 font-bold uppercase">
                            {RANK_NAMES[lUser.rankId]} {TIER_NAMES[lUser.tier || 3]}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-[6px] border-transparent border-l-gray-900"></div>
                  </div>
                </Link>
              ))}
              <div className="flex flex-col items-center py-1">
                <div className="w-1 h-1 rounded-full bg-gray-300 my-0.5"></div>
                <div className="w-1 h-1 rounded-full bg-gray-300 my-0.5"></div>
              </div>
              {leaderboard.find((u) => u.isUser) && (
                <Link to="/profile" className="relative group cursor-pointer block">
                  <UserAvatar src={leaderboard.find((u) => u.isUser)?.avatar || ""} level={leaderboard.find((u) => u.isUser)?.level || 1} className="w-10 h-10" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100">
                    <span className="text-[8px] font-bold text-blue-600">{leaderboard.find((u) => u.isUser)?.rank}</span>
                  </div>
                  <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900 text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none shadow-xl flex flex-col min-w-[140px] text-center">
                    <span className="text-gray-100">Hạng {leaderboard.find((u) => u.isUser)?.rank}: Bạn</span>
                    <div className="flex items-center gap-2 mt-1 flex-col">
                      <img src={`/rank/${user?.rankId || 1}.png`} alt="Rank" className="w-10 object-contain" />
                      <div className="flex flex-col">
                        <span className="text-yellow-400 font-medium text-[10px]">{leaderboard.find((u) => u.isUser)?.xp} XP</span>
                        <span className="text-[10px] text-gray-300 font-bold uppercase">
                          {RANK_NAMES[user?.rankId || 1]} {TIER_NAMES[user?.tier || 3]}
                        </span>
                      </div>
                    </div>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-[6px] border-transparent border-l-gray-900"></div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Cửa sổ chat nổi (hỗ trợ nhiều cửa sổ) */}
      {openChats.map((chat) => {
        const isMinimized = minimizedChats.includes(chat.friendId);

        // Chỉ tính index của các chat CÙNG trạng thái (minimized hoặc maximized)
        const activeArray = isMinimized ? minimizedChats : openChats.filter((c) => !minimizedChats.includes(c.friendId)).map((c) => c.friendId);
        const idx = activeArray.indexOf(chat.friendId);

        return (
          <FloatingChat
            key={chat.friendId}
            friend={chat}
            index={Math.max(0, idx)}
            isMinimized={isMinimized}
            onMinimize={() => setMinimizedChats((prev) => [...prev, chat.friendId])}
            onMaximize={() => setMinimizedChats((prev) => prev.filter((id) => id !== chat.friendId))}
            onClose={() => {
              setOpenChats((prev) => prev.filter((c) => c.friendId !== chat.friendId));
              setMinimizedChats((prev) => prev.filter((id) => id !== chat.friendId));
            }}
          />
        );
      })}
    </>
  );
}
