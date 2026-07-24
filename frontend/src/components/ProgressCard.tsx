import React, { useEffect, useState } from "react";
import { TrendingUp, BookOpen, Star, ChevronRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/src/components/ui/Button";
import axiosInstance from "../services/axiosConfig";

export function ProgressCard() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalWords: 0,
    totalTopics: 0,
    completedTopics: 0,
    learnedWords: 0,
    totalXP: 0,
  });

  useEffect(() => {
    if (user) {
      axiosInstance
        .get("/api/beginner/stats")
        .then((res) => {
          if (res.data) setStats(res.data);
        })
        .catch((err) => console.error("Error fetching beginner stats:", err));
    }
  }, [user]);
  console.log(stats);
  const percentage = stats.totalWords > 0 ? Math.round((stats.learnedWords / stats.totalWords) * 100) : 0;

  if (!user) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-gray-100 flex flex-col items-center justify-center h-full shadow-sm min-h-[300px]">
        <TrendingUp className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Tiến độ học tập</h3>
        <p className="text-gray-500 mb-6 text-center text-sm">Vui lòng đăng nhập để lưu trữ tiến độ học tập và theo dõi số từ vựng đã thuộc!</p>
        <Button onClick={() => (window.location.href = "/auth")} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors">
          Đăng nhập ngay
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 flex flex-col h-full shadow-sm">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg">Tiến độ học tập</h3>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-end mb-3">
          <div>
            <p className="text-gray-500 font-medium mb-1">Bạn đã hoàn thành</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-gray-900 tracking-tight">{stats.learnedWords}</span>
              <span className="text-gray-500 font-medium">/ {stats.totalWords} từ vựng</span>
            </div>
          </div>
          <span className="text-sm font-bold text-gray-700">{percentage}%</span>
        </div>
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-gray-100">
          <BookOpen className="w-5 h-5 text-blue-500 mb-2" />
          <span className="text-lg font-bold text-gray-900 mb-1">
            {stats.completedTopics} / {stats.totalTopics}
          </span>
          <span className="text-[11px] font-medium text-gray-500">
            Chủ đề đã hoàn
            <br />
            thành
          </span>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-gray-100">
          <CheckCircle2 className="w-5 h-5 text-green-500 mb-2" />
          <span className="text-lg font-bold text-gray-900 mb-1">{stats.learnedWords}</span>
          <span className="text-[11px] font-medium text-gray-500">Từ vựng đã thuộc</span>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-gray-100">
          <Star className="w-5 h-5 text-yellow-500 mb-2" />
          <span className="text-lg font-bold text-gray-900 mb-1">{stats.totalXP}</span>
          <span className="text-[11px] font-medium text-gray-500">Điểm XP tích lũy</span>
        </div>
      </div>

      <div className="mt-auto">
        <Link
          to="/beginner"
          className="w-full py-3.5 flex items-center justify-center gap-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-gray-100 hover:border-blue-100"
        >
          Đi tới học tiếp các chủ đề
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
