import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Coffee, Sun, Moon } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

const READING_TOPICS = [
  {
    id: "my-daily-routine",
    title: "My Daily Routine",
    description: "Bài đọc về thói quen sinh hoạt mỗi ngày.",
    icon: <Sun className="w-8 h-8" />,
    color: "bg-orange-500",
    lightColor: "bg-orange-100",
    textColor: "text-orange-500",
    questionsCount: 3,
  },
  {
    id: "favorite-weekend",
    title: "My Favorite Weekend",
    description: "Kể về một kỳ nghỉ cuối tuần tuyệt vời.",
    icon: <Moon className="w-8 h-8" />,
    color: "bg-indigo-500",
    lightColor: "bg-indigo-100",
    textColor: "text-indigo-500",
    questionsCount: 3,
  },
  {
    id: "the-coffee-shop",
    title: "The Coffee Shop",
    description: "Miêu tả một quán cà phê quen thuộc.",
    icon: <Coffee className="w-8 h-8" />,
    color: "bg-amber-500",
    lightColor: "bg-amber-100",
    textColor: "text-amber-500",
    questionsCount: 3,
  }
];

export function BeginnerReading() {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button onClick={() => navigate("/beginner/skills")} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 bg-transparent shadow-none hover:bg-slate-100 border-none">
        <ArrowLeft className="w-5 h-5" /> Quay lại
      </Button>

      <div className="bg-white rounded-3xl p-8 border-2 border-purple-100 shadow-xl w-full">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-slate-800">Luyện Đọc (Daily Life)</h1>
        </div>
        <p className="text-slate-500 mb-8">Đọc các đoạn văn ngắn và trả lời câu hỏi để rèn luyện kỹ năng đọc hiểu.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {READING_TOPICS.map((topic) => (
            <div
              key={topic.id}
              onClick={() => navigate(`/beginner/reading/${topic.id}`)}
              className="group bg-slate-50 rounded-2xl p-6 border-2 border-slate-100 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer flex flex-col"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${topic.lightColor} ${topic.textColor}`}>
                  {topic.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-purple-600 transition-colors">{topic.title}</h3>
                  <p className="text-sm font-medium text-slate-400">{topic.questionsCount} câu hỏi</p>
                </div>
              </div>
              <p className="text-slate-600 flex-1">{topic.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
