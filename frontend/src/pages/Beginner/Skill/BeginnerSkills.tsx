import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Headphones, Mic, BookOpen, PenTool, PlayCircle, Trophy, CheckCircle2, Circle } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "@/src/components/ui/Button";
import { useAuth } from "../../../contexts/AuthContext";
import axiosInstance from "@/src/services/axiosConfig";
import toastService from "@/src/services/toastService";
import { LANGUAGE_LEVELS } from "../../../config/languageLevels";
import { Loader2 } from "lucide-react";

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

const PREFERENCES = [
  {
    id: "entertainment",
    title: "Entertainment (Giải trí)",
    desc: "Movies, TV shows, talk shows, songs.",
    benefit: "Phù hợp cho ai muốn học tiếng Anh một cách thoải mái, tự nhiên qua những nội dung yêu thích.",
  },
  {
    id: "academic",
    title: "Academic Listening (Học thuật)",
    desc: "IELTS/TOEIC practice tests, audiobooks, TED Talks.",
    benefit: "Dành cho người học tiếng Anh vì mục tiêu thi cử, học tập, nghiên cứu.",
  },
  {
    id: "daily",
    title: "Daily Life (Đời sống hàng ngày)",
    desc: "Vlogs về cooking, shopping, beauty, routines…",
    benefit: "Giúp người học làm quen với cách nói tiếng Anh trong ngữ cảnh đời thường.",
  },
  {
    id: "news",
    title: "News & Information (Tin tức & thông tin)",
    desc: "BBC News, VOA, News Reviews…",
    benefit: "Thích hợp cho ai muốn cập nhật tin tức thế giới đồng thời nâng cao kỹ năng nghe.",
  },
];

export function BeginnerSkills() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [isGeneratingDev, setIsGeneratingDev] = useState(false);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axiosInstance.get("/api/beginner/daily-tasks");
        setDailyTasks(res.data.tasks || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingTasks(false);
      }
    };
    if (user?.dailyLearningOptIn) {
      fetchTasks();
    } else {
      setIsLoadingTasks(false);
    }
  }, [user]);

  // Determine user level string
  const PREF_LANG_MAP: Record<string, string> = {
    "Tiếng Anh": "en",
    "Tiếng Nhật": "ja",
    "Tiếng Trung": "zh",
    "Tiếng Hàn": "ko",
  };
  const prefLang = user?.preferences?.language || "Tiếng Anh";
  const targetLang = PREF_LANG_MAP[prefLang] || "en";
  const langLevels = LANGUAGE_LEVELS[targetLang] || LANGUAGE_LEVELS["en"];
  const userLevelId = user?.languageLevel || langLevels[0].id;
  const levelObj = langLevels.find((l) => l.id === userLevelId) || langLevels[0];
  const userLevelStr = levelObj.name.split(" ")[0] || "A1";

  const handleDevGenerate = async () => {
    setIsGeneratingDev(true);
    try {
      await axiosInstance.post("/api/beginner/dev-generate-tasks");
      toastService.success("Đã ra lệnh sinh dữ liệu. Vui lòng tải lại trang sau ít phút.");
    } catch (error) {
      console.error(error);
      toastService.error("Có lỗi xảy ra khi gọi lệnh sinh data.");
    } finally {
      setIsGeneratingDev(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-24 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-lg relative overflow-hidden mt-8">
        <div className="z-10 text-center md:text-left space-y-4 max-w-lg">
          <h1 className="text-3xl font-black">Luyện tập 4 Kỹ Năng</h1>
          <p className="text-indigo-100 text-lg">Áp dụng ngay từ vựng và ngữ pháp bạn đã học vào 4 kỹ năng Nghe - Nói - Đọc - Viết để ghi nhớ sâu hơn.</p>
          <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
            <div className="flex items-center gap-2 bg-indigo-700/30 px-4 py-2 rounded-xl backdrop-blur-sm">
              <Trophy className="w-5 h-5 text-yellow-300" />
              <span className="font-bold text-sm">
                Thử thách hằng ngày: {dailyTasks.filter((t) => t.status === "completed").length}/{Math.max(4, dailyTasks.length)} hoàn thành
              </span>
            </div>
            {import.meta.env.MODE === "development" && (
              <Button onClick={handleDevGenerate} disabled={isGeneratingDev} variant="secondary" size="sm">
                {isGeneratingDev ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
                [DEV] Sinh dữ liệu ngay
              </Button>
            )}
          </div>
        </div>
        <img src="/mascot/Lopy (1).png" alt="Mascot" className="w-44 h-44 object-contain z-10 mt-6 md:mt-0 animate-bounce-slow" />
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl"></div>
      </div>

      {/* Skills Grid */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-700">Danh sách kỹ năng</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SKILLS.map((skill) => {
            const isUnsupported = targetLang !== "en" && (skill.id === "speaking" || skill.id === "writing");

            return (
              <div
                key={skill.id}
                className={cn(
                  "group bg-white rounded-3xl p-6 border-2 border-slate-100 transition-all duration-300 flex flex-col relative overflow-hidden",
                  isUnsupported ? "opacity-75 grayscale-[0.2]" : "hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer",
                )}
              >
                {isUnsupported && <div className="absolute top-4 right-[-32px] bg-red-500 text-white text-[10px] font-bold px-8 py-1.5 rotate-45 shadow-sm">EN ONLY</div>}
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm", skill.lightColor, skill.textColor)}>{skill.icon}</div>
                  {!isUnsupported && <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{userLevelStr}</span>}
                </div>

                <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-slate-600 transition-colors relative z-10">{skill.title}</h3>
                <p className="text-slate-500 line-clamp-2 flex-1 mb-6 relative z-10">{skill.description}</p>

                <Button
                  disabled={isUnsupported}
                  onClick={() => {
                    if (skill.id === "listening") {
                      navigate("/beginner/listening");
                    } else if (skill.id === "speaking") {
                      navigate("/beginner/speaking");
                    } else if (skill.id === "reading") {
                      navigate("/beginner/reading");
                    } else if (skill.id === "writing") {
                      navigate("/beginner/writing");
                    } else {
                      navigate(`/beginner/skill/${skill.id}`);
                    }
                  }}
                  variant={isUnsupported ? "secondary" : "outline"}
                  size="lg"
                  className="w-full mt-4 relative z-10"
                >
                  {isUnsupported ? (
                    "CHƯA HỖ TRỢ"
                  ) : (
                    <>
                      <PlayCircle className="w-5 h-5 mr-1" /> BẮT ĐẦU LUYỆN
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
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
        <Button disabled className="px-6 py-3 bg-slate-200 text-slate-400 rounded-2xl font-bold whitespace-nowrap cursor-not-allowed">
          Chưa mở khoá
        </Button>
      </div>
    </div>
  );
}
