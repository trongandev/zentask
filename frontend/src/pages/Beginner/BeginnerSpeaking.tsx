import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Coffee, Sun, Users, BookOpen } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

const SPEAKING_TOPICS = [
  {
    id: "coffee-shop",
    title: "At the coffee shop",
    description: "Luyện tập gọi đồ uống và trò chuyện với nhân viên.",
    icon: <Coffee className="w-8 h-8" />,
    color: "bg-amber-500",
    lightColor: "bg-amber-100",
    textColor: "text-amber-500",
    questionsCount: 5,
  },
  {
    id: "morning-routine",
    title: "Morning Routine",
    description: "Kể về thói quen buổi sáng của bạn.",
    icon: <Sun className="w-8 h-8" />,
    color: "bg-orange-500",
    lightColor: "bg-orange-100",
    textColor: "text-orange-500",
    questionsCount: 4,
  },
  {
    id: "meeting-friend",
    title: "Meeting a new friend",
    description: "Cách làm quen và giới thiệu bản thân.",
    icon: <Users className="w-8 h-8" />,
    color: "bg-blue-500",
    lightColor: "bg-blue-100",
    textColor: "text-blue-500",
    questionsCount: 6,
  },
  {
    id: "reading-books",
    title: "Talking about hobbies",
    description: "Chia sẻ sở thích cá nhân với người khác.",
    icon: <BookOpen className="w-8 h-8" />,
    color: "bg-purple-500",
    lightColor: "bg-purple-100",
    textColor: "text-purple-500",
    questionsCount: 4,
  },
];

export function BeginnerSpeaking() {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button onClick={() => navigate("/beginner/skills")} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 bg-transparent shadow-none hover:bg-slate-100 border-none">
        <ArrowLeft className="w-5 h-5" /> Quay lại
      </Button>

      <div className="bg-white rounded-3xl p-8 border-2 border-green-100 shadow-xl w-full">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <Mic className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-slate-800">Luyện Nói (Daily Life)</h1>
        </div>
        <p className="text-slate-500 mb-8">Chọn một chủ đề giao tiếp hàng ngày để bắt đầu luyện phát âm tiếng Anh.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SPEAKING_TOPICS.map((topic) => (
            <div
              key={topic.id}
              onClick={() => navigate(`/beginner/speaking/${topic.id}`)}
              className="group bg-slate-50 rounded-2xl p-6 border-2 border-slate-100 hover:border-green-300 hover:shadow-lg transition-all cursor-pointer flex flex-col"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${topic.lightColor} ${topic.textColor}`}>
                  {topic.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-green-600 transition-colors">{topic.title}</h3>
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
