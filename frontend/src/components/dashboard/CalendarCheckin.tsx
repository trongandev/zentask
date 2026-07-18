import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Check, Flame } from "lucide-react";
import { cn } from "../../lib/utils";
import { useUserStore } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_BACKEND;

export function CalendarCheckin() {
  const { user, updateUser } = useAuth();
  const { checkIn, loading: checkingIn } = useUserStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stats, setStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/user/calendar-stats?year=${year}&month=${month}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch calendar stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [year, month]);

  // Generate calendar days
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 is Sunday, 1 is Monday

  // Adjust for Monday start (0=Mon, 6=Sun)
  const emptyDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() + 1 === month && today.getFullYear() === year;
  };

  const todayDate = new Date();
  todayDate.setMinutes(todayDate.getMinutes() - todayDate.getTimezoneOffset());
  const todayStr = todayDate.toISOString().split("T")[0];
  const isCheckedInToday = user?.lastCheckInDate === todayStr;

  const handleCheckIn = async () => {
    if (isCheckedInToday || checkingIn) return;
    const res = await checkIn();
    if (res) {
      const updates: any = { streak: res.streak, lastCheckInDate: res.lastCheckInDate };
      if ((res as any).xpResult) {
        updates.xp = (res as any).xpResult.xp;
        updates.level = (res as any).xpResult.level;
      }
      updateUser(updates);
      // Re-fetch stats to update calendar
      setLoading(true);
      try {
        const resStats = await fetch(`${API_URL}/api/user/calendar-stats?year=${year}&month=${month}`, {
          credentials: "include",
        });
        if (resStats.ok) {
          const data = await resStats.json();
          setStats(data);
        }
      } catch (error) {}
      setLoading(false);
    }
  };

  const getDayStat = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return stats[dateStr];
  };

  if (!user) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
        <CalendarIcon className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Lịch Điểm Danh</h3>
        <p className="text-gray-500 mb-6 text-center text-sm">Vui lòng đăng nhập để theo dõi tiến độ và nhận điểm danh mỗi ngày!</p>
        <button onClick={() => (window.location.href = "/auth")} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors">
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-blue-500" />
          Lịch Điểm Danh
        </h3>
        <div className="flex items-center gap-4">
          <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 font-bold">
            &lt;
          </button>
          <span className="font-bold text-gray-800 w-24 text-center">
            Tháng {month}/{year}
          </span>
          <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 font-bold">
            &gt;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-bold text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: emptyDays }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square"></div>
        ))}
        {days.map((day) => {
          const stat = getDayStat(day);
          const checkedIn = stat?.isCheckedIn;
          const today = isToday(day);

          return (
            <div
              key={day}
              className={cn(
                "aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all relative",
                checkedIn ? "bg-orange-50 border-orange-200" : today ? "border-blue-500 text-blue-600 bg-blue-50/30" : "border-gray-100 text-gray-500",
                loading ? "opacity-50" : "opacity-100",
              )}
            >
              <span className={cn("font-bold text-sm", checkedIn ? "text-orange-600" : "")}>{day}</span>
              {checkedIn && (
                <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-full p-0.5 shadow-sm">
                  <Flame className="w-3 h-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <button
          onClick={handleCheckIn}
          disabled={isCheckedInToday || checkingIn}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
            isCheckedInToday ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 text-white shadow-sm active:scale-95",
          )}
        >
          {checkingIn ? "Đang điểm danh..." : isCheckedInToday ? "Đã điểm danh hôm nay" : "Điểm danh ngay"}
        </button>
      </div>
    </div>
  );
}
