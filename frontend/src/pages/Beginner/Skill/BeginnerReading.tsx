import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

export function BeginnerReading() {
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    import("@/src/services/axiosConfig").then(({ default: axiosInstance }) => {
      axiosInstance
        .get("/api/beginner/daily-tasks")
        .then((res) => {
          if (res) {
            console.log(res);
            setDailyTasks(res.data.tasks.filter((t: any) => t.skill === "reading"));
          }
        })
        .catch((err) => console.error(err));
    });
  }, []);
  console.log(dailyTasks);
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button
        onClick={() => navigate("/beginner/skills")}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 bg-transparent shadow-none hover:bg-slate-100 border-none"
      >
        <ArrowLeft className="w-5 h-5" /> Quay lại
      </Button>

      <div className="bg-white rounded-3xl p-8 border-2 border-purple-100 shadow-xl w-full">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-slate-800">Luyện Đọc (Reading)</h1>
        </div>
        <p className="text-slate-500 mb-8">Đọc các đoạn văn ngắn và trả lời câu hỏi để rèn luyện kỹ năng đọc hiểu.</p>

        {/* Personalized AI Tasks */}
        {dailyTasks.length > 0 ? (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-slate-800">Lộ trình cá nhân hóa hôm nay</h2>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold border border-purple-200">AI Sinh ra</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dailyTasks.map((task) => (
                <div
                  key={task._id}
                  onClick={() => navigate(`/beginner/reading/${task._id}`)}
                  className="group bg-gradient-to-br from-purple-50 to-white rounded-2xl p-6 border-2 border-purple-100 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer flex flex-col relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                  <div className="flex items-center gap-4 mb-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white text-purple-600 shadow-sm">
                      <BookOpen className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-purple-600 transition-colors line-clamp-1">{task.topic}</h3>
                      <p className="text-sm font-medium text-slate-400">Level: {task.level}</p>
                    </div>
                  </div>
                  <p className="text-slate-600 flex-1 relative z-10 text-sm">Bài đọc hiểu do AI tạo riêng cho bạn.</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-sm text-center">
            <BookOpen className="w-12 h-12 text-purple-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có bài luyện đọc</h3>
            <p className="text-slate-500">Chúng tôi dựa trên những lỗi sai ngữ pháp của bạn để đưa ra các bài luyện đọc phù hợp nhất. Hãy tiếp tục học từ vựng và ngữ pháp nhé!</p>
          </div>
        )}
      </div>
    </div>
  );
}
