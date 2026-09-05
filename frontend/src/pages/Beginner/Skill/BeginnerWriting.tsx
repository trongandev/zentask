import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Edit3 } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

export function BeginnerWriting() {
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    import("@/src/services/axiosConfig").then(({ default: axiosInstance }) => {
      axiosInstance.get("/api/beginner/daily-tasks")
        .then(res => {
          if (res.data.success) {
            setDailyTasks(res.data.tasks.filter((t: any) => t.skill === "writing"));
          }
        })
        .catch(err => console.error(err));
    });
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button onClick={() => navigate("/beginner/skills")} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 bg-transparent shadow-none hover:bg-slate-100 border-none">
        <ArrowLeft className="w-5 h-5" /> Quay lại
      </Button>

      <div className="bg-white rounded-3xl p-8 border-2 border-blue-100 shadow-xl w-full">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <Edit3 className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-slate-800">Luyện Viết (Writing)</h1>
        </div>
        <p className="text-slate-500 mb-8">Viết đoạn văn ngắn dựa trên chủ đề để rèn luyện kỹ năng viết.</p>

        {/* Personalized AI Tasks */}
        {dailyTasks.length > 0 ? (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-slate-800">Lộ trình cá nhân hóa hôm nay</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200">AI Sinh ra</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dailyTasks.map((task) => (
                <div
                  key={task._id}
                  onClick={() => navigate(`/beginner/writing/${task._id}`)}
                  className="group bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border-2 border-blue-100 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer flex flex-col relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                  <div className="flex items-center gap-4 mb-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white text-blue-600 shadow-sm">
                      <Edit3 className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">{task.topic}</h3>
                      <p className="text-sm font-medium text-slate-400">Level: {task.level}</p>
                    </div>
                  </div>
                  <p className="text-slate-600 flex-1 relative z-10 text-sm">Chủ đề viết do AI tạo riêng cho bạn.</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-sm text-center">
            <Edit3 className="w-12 h-12 text-blue-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có bài luyện viết</h3>
            <p className="text-slate-500">Chúng tôi dựa trên những lỗi sai ngữ pháp của bạn để đưa ra các bài luyện viết phù hợp nhất. Hãy tiếp tục học từ vựng và ngữ pháp nhé!</p>
          </div>
        )}
      </div>
    </div>
  );
}
