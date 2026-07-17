import React from "react";
import { Headphones, Mic, BookOpen, PenTool, PlayCircle, Trophy } from "lucide-react";
import { cn } from "../lib/utils";

const SKILLS = [
  {
    id: "listening",
    title: "Luyện Nghe",
    description: "Nghe chép chính tả và hiểu các đoạn hội thoại thực tế.",
    icon: <Headphones className="w-8 h-8" />,
    color: "bg-blue-500",
    lightColor: "bg-blue-100",
    textColor: "text-blue-500",
    level: "Cơ bản",
  },
  {
    id: "speaking",
    title: "Luyện Nói",
    description: "Luyện phát âm chuẩn AI và shadowing theo mẫu.",
    icon: <Mic className="w-8 h-8" />,
    color: "bg-green-500",
    lightColor: "bg-green-100",
    textColor: "text-green-500",
    level: "Cơ bản",
  },
  {
    id: "reading",
    title: "Luyện Đọc",
    description: "Đọc hiểu đoạn văn ngắn và tìm kiếm thông tin.",
    icon: <BookOpen className="w-8 h-8" />,
    color: "bg-purple-500",
    lightColor: "bg-purple-100",
    textColor: "text-purple-500",
    level: "Nâng cao",
  },
  {
    id: "writing",
    title: "Luyện Viết",
    description: "Sắp xếp từ thành câu và viết đoạn văn miêu tả.",
    icon: <PenTool className="w-8 h-8" />,
    color: "bg-orange-500",
    lightColor: "bg-orange-100",
    textColor: "text-orange-500",
    level: "Nâng cao",
  },
];

export function BeginnerSkills() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-24 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-lg relative overflow-hidden mt-8">
        <div className="z-10 text-center md:text-left space-y-4 max-w-lg">
          <h1 className="text-3xl font-black">Luyện tập 4 Kỹ Năng</h1>
          <p className="text-indigo-100 text-lg">Áp dụng ngay từ vựng và ngữ pháp bạn đã học vào 4 kỹ năng Nghe - Nói - Đọc - Viết để ghi nhớ sâu hơn.</p>
          <div className="flex items-center gap-3 justify-center md:justify-start bg-indigo-700/30 px-4 py-2 rounded-xl w-fit backdrop-blur-sm">
            <Trophy className="w-5 h-5 text-yellow-300" />
            <span className="font-bold text-sm">Thử thách hằng ngày: 0/4 hoàn thành</span>
          </div>
        </div>
        <img src="/mascot/Lopy (1).png" alt="Mascot" className="w-44 h-44 object-contain z-10 mt-6 md:mt-0 animate-bounce-slow" />
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl"></div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SKILLS.map((skill) => (
          <div
            key={skill.id}
            className="group bg-white rounded-3xl p-6 border-2 border-slate-100 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm", skill.lightColor, skill.textColor)}>
                {skill.icon}
              </div>
              <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {skill.level}
              </span>
            </div>
            
            <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
              {skill.title}
            </h3>
            <p className="text-slate-500 line-clamp-2 flex-1 mb-6">
              {skill.description}
            </p>

            <button className="w-full py-3 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200 hover:border-indigo-200">
              <PlayCircle className="w-5 h-5" /> Bắt đầu luyện
            </button>
          </div>
        ))}
      </div>
      
      {/* Daily Challenge Banner */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 flex flex-col md:flex-row items-center gap-6 shadow-sm">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
           <Trophy className="w-10 h-10 text-yellow-500" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-bold text-slate-800">Thử thách tổng hợp (Sắp ra mắt)</h3>
          <p className="text-slate-500 mt-1">Bài test 15 phút trộn lẫn cả 4 kỹ năng giúp bạn đánh giá toàn diện năng lực của mình.</p>
        </div>
        <button disabled className="px-6 py-3 bg-slate-200 text-slate-400 rounded-2xl font-bold whitespace-nowrap cursor-not-allowed">
          Chưa mở khoá
        </button>
      </div>
    </div>
  );
}
