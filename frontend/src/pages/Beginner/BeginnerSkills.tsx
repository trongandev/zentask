import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Headphones, Mic, BookOpen, PenTool, PlayCircle, Trophy, CheckCircle2, Circle } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";
import { useAuth } from "../../contexts/AuthContext";
import axiosInstance from "@/src/services/axiosConfig";
import toastService from "@/src/services/toastService";
import { LANGUAGE_LEVELS } from "../../config/languageLevels";
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
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingDev, setIsGeneratingDev] = useState(false);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  useEffect(() => {
    if (user && !user.dailyLearningOptIn) {
      setShowModal(true);
    }
  }, [user]);

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
  const targetLang = user?.targetLanguage || "en";
  const langLevels = LANGUAGE_LEVELS[targetLang] || LANGUAGE_LEVELS["en"];
  const userLevelId = user?.languageLevels?.[targetLang] || langLevels[0].id;
  const levelObj = langLevels.find((l) => l.id === userLevelId) || langLevels[0];
  const userLevelStr = levelObj.name.split(" ")[0] || "A1";

  const togglePref = (id: string) => {
    setSelectedPrefs((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (selectedPrefs.length === 0) {
      toastService.error("Vui lòng chọn ít nhất 1 sở thích!");
      return;
    }
    setIsSaving(true);
    try {
      await axiosInstance.post("/api/beginner/opt-in", {
        preferences: selectedPrefs,
      });
      updateUser({ learningPreferences: selectedPrefs, dailyLearningOptIn: true });
      setStep(2);
    } catch (error) {
      console.error(error);
      toastService.error("Có lỗi xảy ra khi lưu sở thích.");
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className="w-full max-w-4xl mx-auto px-4 pb-24 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-lg relative overflow-hidden mt-8">
        <div className="z-10 text-center md:text-left space-y-4 max-w-lg">
          <h1 className="text-3xl font-black">Luyện tập 4 Kỹ Năng</h1>
          <p className="text-indigo-100 text-lg">Áp dụng ngay từ vựng và ngữ pháp bạn đã học vào 4 kỹ năng Nghe - Nói - Đọc - Viết để ghi nhớ sâu hơn.</p>
          <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
            <div className="flex items-center gap-2 bg-indigo-700/30 px-4 py-2 rounded-xl backdrop-blur-sm">
              <Trophy className="w-5 h-5 text-yellow-300" />
              <span className="font-bold text-sm">
                Thử thách hằng ngày: {dailyTasks.filter(t => t.status === 'completed').length}/{Math.max(4, dailyTasks.length)} hoàn thành
              </span>
            </div>
            {import.meta.env.MODE === "development" && (
              <Button onClick={handleDevGenerate} disabled={isGeneratingDev} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg border-2 border-orange-400">
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
          {SKILLS.map((skill) => (
            <div
              key={skill.id}
              className="group bg-white rounded-3xl p-6 border-2 border-slate-100 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm", skill.lightColor, skill.textColor)}>{skill.icon}</div>
                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{userLevelStr}</span>
              </div>

              <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-slate-600 transition-colors">{skill.title}</h3>
              <p className="text-slate-500 line-clamp-2 flex-1 mb-6">{skill.description}</p>

              <Button
                onClick={() => {
                  if (skill.id === "listening") {
                    navigate("/beginner/listening");
                  } else if (skill.id === "speaking") {
                    navigate("/beginner/speaking");
                  } else if (skill.id === "reading") {
                    navigate("/beginner/reading");
                  } else {
                    navigate(`/beginner/skill/${skill.id}`);
                  }
                }}
                className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200"
              >
                <PlayCircle className="w-5 h-5" /> Bắt đầu luyện
              </Button>
            </div>
          ))}
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

      <Modal isOpen={showModal} onClose={() => step === 2 && setShowModal(false)} hideCloseButton={step === 1}>
        {step === 1 ? (
          <div className="p-6">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Chọn nội dung bạn thích học</h2>
            <p className="text-slate-500 mb-6 text-sm">Zentask sẽ lưu lại sở thích của bạn để thiết kế các bài học lộ trình cá nhân hóa phù hợp nhất! (Có thể chọn nhiều)</p>

            <div className="space-y-3 mb-8">
              {PREFERENCES.map((pref) => {
                const isSelected = selectedPrefs.includes(pref.id);
                return (
                  <div
                    key={pref.id}
                    onClick={() => togglePref(pref.id)}
                    className={cn(
                      "p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3",
                      isSelected ? "border-indigo-500 bg-indigo-50" : "border-slate-100 hover:border-indigo-200 bg-white",
                    )}
                  >
                    <div className="mt-1">{isSelected ? <CheckCircle2 className="w-5 h-5 text-indigo-600" /> : <Circle className="w-5 h-5 text-slate-300" />}</div>
                    <div>
                      <h3 className={cn("font-bold", isSelected ? "text-indigo-900" : "text-slate-800")}>{pref.title}</h3>
                      <p className="text-sm text-slate-500 my-1">{pref.desc}</p>
                      <p className="text-xs text-indigo-600 font-medium">=&gt; {pref.benefit}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg">
              {isSaving ? "Đang lưu..." : "Lưu và Tiếp tục"}
            </Button>
          </div>
        ) : (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-4">Đã lưu sở thích thành công!</h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Chúng tôi đang thiết kế lộ trình phù hợp với bạn bằng AI.<br />
              Bạn hãy quay lại vào ngày mai để bắt đầu những bài học cá nhân hóa đầu tiên nhé!
            </p>
            <Button onClick={() => setShowModal(false)} className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl">
              Đã hiểu
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
