import React, { useEffect, useState } from "react";
import { BarChart3, ChevronRight, ChevronDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useUserStore } from "../services/userService";
import { useAuth } from "../contexts/AuthContext";

export function StatsChart() {
  const { getStats } = useUserStore();
  const [data, setData] = useState<any[]>([
    { name: "T2", minutes: 0 },
    { name: "T3", minutes: 0 },
    { name: "T4", minutes: 0 },
    { name: "T5", minutes: 0 },
    { name: "T6", minutes: 0 },
    { name: "T7", minutes: 0 },
    { name: "CN", minutes: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [totalMinutes, setTotalMinutes] = useState(0);

  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    async function fetchData() {
      const stats = await getStats();
      if (stats && stats.length > 0) {
        setData(stats);
        const total = stats.reduce((sum: number, item: any) => sum + item.minutes, 0);
        setTotalMinutes(total);
      }
      setLoading(false);
    }
    fetchData();
  }, [getStats, user]);

  if (!user) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-gray-100 flex flex-col h-full shadow-sm items-center justify-center min-h-[300px]">
        <BarChart3 className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Thống kê học tập</h3>
        <p className="text-gray-500 mb-6 text-center text-sm">Vui lòng đăng nhập để xem biểu đồ thống kê thời gian học của bạn trong tuần!</p>
        <button onClick={() => window.location.href = '/auth'} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors">
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const latestMinutes = data[data.length - 1]?.minutes || 0;

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 flex flex-col h-full shadow-sm relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Thống kê học tập</h3>
        </div>
        <button className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
          7 ngày qua
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="h-48 w-full flex items-center justify-center mb-6">
          <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="h-48 w-full relative mb-6">
          <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded">
            {latestMinutes} phút
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                dx={-10}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => [`${value} phút`, 'Thời gian']}
              />
              <Area 
                type="monotone" 
                dataKey="minutes" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorMinutes)" 
                dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }}
                activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="absolute top-0 left-0 text-xs font-medium text-gray-400 -mt-5">Phút</div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-gray-100">
          <span className="text-lg font-bold text-gray-900 mb-1">{formatHours(totalMinutes)}</span>
          <span className="text-[11px] font-medium text-gray-500">Tổng thời gian học</span>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-gray-100">
          <span className="text-lg font-bold text-gray-900 mb-1">0</span>
          <span className="text-[11px] font-medium text-gray-500">Bài học đã học</span>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-gray-100">
          <span className="text-lg font-bold text-gray-900 mb-1">0%</span>
          <span className="text-[11px] font-medium text-gray-500">Tỷ lệ hoàn thành</span>
        </div>
      </div>

      <div className="mt-auto">
        <button className="w-full py-3.5 flex items-center justify-center gap-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-gray-100 hover:border-blue-100">
          Xem thống kê chi tiết
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
