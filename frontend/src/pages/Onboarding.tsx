import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Laptop, Plane, Briefcase, Film, Globe, Dumbbell, Music, Palette, Gamepad2, Utensils, Shirt, BookOpen, Loader2, Check } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import axiosInstance from "../services/axiosConfig";
import { LANGUAGE_LEVELS, getDefaultLevels } from "../config/languageLevels";
import { PlacementTest } from "../components/common/PlacementTest";

const interestsList = [
  { name: "Công nghệ", icon: <Laptop className="w-4 h-4" /> },
  { name: "Du lịch", icon: <Plane className="w-4 h-4" /> },
  { name: "Kinh doanh", icon: <Briefcase className="w-4 h-4" /> },
  { name: "Phim ảnh", icon: <Film className="w-4 h-4" /> },
  { name: "Văn hóa", icon: <Globe className="w-4 h-4" /> },
  { name: "Thể thao", icon: <Dumbbell className="w-4 h-4" /> },
  { name: "Âm nhạc", icon: <Music className="w-4 h-4" /> },
  { name: "Nghệ thuật", icon: <Palette className="w-4 h-4" /> },
  { name: "Chơi game", icon: <Gamepad2 className="w-4 h-4" /> },
  { name: "Ẩm thực", icon: <Utensils className="w-4 h-4" /> },
  { name: "Thời trang", icon: <Shirt className="w-4 h-4" /> },
  { name: "Đọc sách", icon: <BookOpen className="w-4 h-4" /> },
];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState("Tiếng Anh");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [wordsPerDay, setWordsPerDay] = useState(10);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [isTakingTest, setIsTakingTest] = useState(false);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Generate roadmap khi ở bước 6
    if (step === 6 && !isGeneratingRoadmap) {
      const generateRoadmap = async () => {
        setIsGeneratingRoadmap(true);
        try {
          const preferences = { language, interests: selectedInterests, goal, wordsPerDay, level: selectedLevel };
          await axiosInstance.post("/api/roadmap/init", { preferences });
          
          // Redirect sau khi tạo xong
          setTimeout(() => {
            navigate("/beginner");
          }, 1000);
        } catch (error) {
          console.error("Failed to generate roadmap", error);
          navigate("/beginner");
        }
      };
      
      generateRoadmap();
    }
  }, [step, isGeneratingRoadmap, navigate, language, selectedInterests, goal, wordsPerDay]);

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const PREF_LANG_MAP: Record<string, string> = {
    "Tiếng Anh": "en",
    "Tiếng Nhật": "ja",
    "Tiếng Trung": "zh",
    "Tiếng Hàn": "ko",
  };
  const currentLangCode = PREF_LANG_MAP[language] || "en";
  const levels = LANGUAGE_LEVELS[currentLangCode] || getDefaultLevels();

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6 text-center relative font-sans text-slate-900">
      {/* Nút Back */}
      {step > 0 && step < 6 && (
        <button onClick={handleBack} className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-700 transition-colors rounded-full hover:bg-slate-200 z-10">
          <ArrowLeft className="w-6 h-6" />
        </button>
      )}

      <div className="flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step-0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center">
              <h1 className="text-3xl font-black tracking-tight mb-2">Chào mừng bạn!</h1>
              <p className="text-slate-500 mb-8 max-w-sm">Trí tuệ nhân tạo sẽ giúp bạn thiết kế lộ trình học hoàn hảo nhất.</p>
              <Button onClick={handleNext} className="rounded-full px-8 py-6 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30">
                Bắt đầu thiết kế lộ trình
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step-1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-xs">
              <h2 className="text-2xl font-black tracking-tight mb-6">Ngôn ngữ mục tiêu của bạn?</h2>
              <div className="flex flex-col gap-3">
                {[
                  { name: "Tiếng Anh", flag: "en.svg" },
                  { name: "Tiếng Nhật", flag: "ja.svg" },
                  { name: "Tiếng Trung", flag: "zh.svg" },
                  { name: "Tiếng Hàn", flag: "ko.svg" },
                ].map((lang) => (
                  <button
                    key={lang.name}
                    onClick={() => {
                      setLanguage(lang.name);
                      handleNext();
                    }}
                    className="flex items-center gap-4 px-6 py-4 rounded-2xl border-2 border-slate-200 bg-white shadow-sm hover:border-blue-500 hover:bg-blue-50 transition-colors font-bold text-left"
                  >
                    <img src={`/flag/${lang.flag}`} alt={lang.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                    <span className="flex-1 text-center pr-12">{lang.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center w-full max-w-md">
              <h2 className="text-2xl font-black tracking-tight mb-2">Bạn có những sở thích gì?</h2>
              <p className="text-slate-500 mb-6 text-sm">Giúp AI tạo bài tập phù hợp với bạn. (Có thể chọn nhiều)</p>
              <div className="flex flex-wrap justify-center gap-3 w-full mb-8">
                {interestsList.map((item) => {
                  const isSelected = selectedInterests.includes(item.name);
                  return (
                    <button
                      key={item.name}
                      onClick={() => toggleInterest(item.name)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm transition-all duration-200 font-bold",
                        isSelected ? "border-blue-500 bg-blue-50 text-blue-600 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300",
                      )}
                    >
                      {item.icon}
                      {item.name}
                    </button>
                  );
                })}
              </div>
              <Button onClick={handleNext} disabled={selectedInterests.length === 0} className="rounded-full px-8 py-6 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30">
                Tiếp tục
              </Button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center w-full max-w-sm">
              <h2 className="text-2xl font-black tracking-tight mb-6">Mục tiêu của bạn là gì?</h2>
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => {
                    setGoal("Giao tiếp cơ bản");
                    handleNext();
                  }}
                  className="p-4 rounded-2xl border-2 border-slate-200 bg-white text-left shadow-sm hover:border-blue-500 group transition-colors"
                >
                  <div className="font-bold group-hover:text-blue-600 transition-colors">Giao tiếp cơ bản</div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">Dùng để đi du lịch và kết bạn.</div>
                </button>
                <button
                  onClick={() => {
                    setGoal("Phục vụ công việc");
                    handleNext();
                  }}
                  className="p-4 rounded-2xl border-2 border-slate-200 bg-white text-left shadow-sm hover:border-blue-500 group transition-colors"
                >
                  <div className="font-bold group-hover:text-blue-600 transition-colors">Phục vụ công việc</div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">Đọc hiểu tài liệu chuyên ngành.</div>
                </button>
                <button
                  onClick={() => {
                    setGoal("Thi chứng chỉ");
                    handleNext();
                  }}
                  className="p-4 rounded-2xl border-2 border-slate-200 bg-white text-left shadow-sm hover:border-blue-500 group transition-colors"
                >
                  <div className="font-bold group-hover:text-blue-600 transition-colors">Thi chứng chỉ (IELTS/TOEIC)</div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">Luyện thi chuyên sâu.</div>
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center w-full max-w-xs">
              <h2 className="text-2xl font-black tracking-tight mb-2">Mục tiêu hàng ngày?</h2>
              <p className="text-slate-500 mb-8 text-sm">Số từ vựng mới bạn muốn học mỗi ngày.</p>
              <div className="flex flex-col gap-3 w-full">
                {[
                  { value: 5, label: "Thư giãn", desc: "5 từ / ngày" },
                  { value: 10, label: "Bình thường", desc: "10 từ / ngày" },
                  { value: 20, label: "Nghiêm túc", desc: "20 từ / ngày" },
                  { value: 50, label: "Cường độ cao", desc: "50 từ / ngày" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setWordsPerDay(opt.value);
                      handleNext();
                    }}
                    className="flex justify-between items-center p-4 rounded-2xl border-2 border-slate-200 bg-white text-left shadow-sm hover:border-blue-500 group transition-colors"
                  >
                    <div className="font-bold group-hover:text-blue-600">{opt.label}</div>
                    <div className="text-xs text-slate-500 font-medium">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="step-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center w-full max-w-lg">
              {isTakingTest ? (
                <div className="w-full bg-white rounded-3xl shadow-xl shadow-blue-500/10 border border-blue-100 p-8">
                  <PlacementTest 
                    selectedLang="en" 
                    onComplete={(levelId) => {
                      setSelectedLevel(levelId);
                      setIsTakingTest(false);
                      handleNext();
                    }}
                    onCancel={() => setIsTakingTest(false)}
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-black tracking-tight mb-2">Trình độ hiện tại?</h2>
                  <p className="text-slate-500 mb-8 text-sm">Xác định trình độ để có lộ trình phù hợp nhất.</p>
                  
                  {currentLangCode === "en" && (
                    <Button
                      onClick={() => setIsTakingTest(true)}
                      className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/30 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-1 border-b-4 border-indigo-800 mb-8"
                    >
                      <span className="text-lg">Bắt đầu Test Năng lực</span>
                      <span className="text-indigo-200 text-sm font-medium">Khuyên dùng • Chỉ mất 5 phút</span>
                    </Button>
                  )}

                  <div className="w-full">
                    {currentLangCode === "en" && <p className="text-center text-sm font-medium text-slate-400 mb-4 uppercase tracking-widest">Hoặc tự chọn</p>}
                    <div className={cn("grid gap-3 w-full", currentLangCode === "en" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
                      {levels.map((lvl) => (
                        <button
                          key={lvl.id}
                          onClick={() => {
                            setSelectedLevel(lvl.id);
                            handleNext();
                          }}
                          className="flex flex-col items-start p-4 bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl text-left transition-all group"
                        >
                          <span className="font-bold text-slate-800 group-hover:text-blue-700 mb-1">{lvl.id} - {lvl.name}</span>
                          <span className="text-xs text-slate-500 line-clamp-2">{lvl.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {step === 6 && (
            <motion.div key="step-6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-xl shadow-blue-500/10 border border-blue-100 max-w-md w-full">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 relative">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin absolute" />
                <img src="/mascot/Lopy (16).png" alt="AI Magic" className="w-10 h-10 object-contain z-10" />
              </div>
              
              <h2 className="text-2xl font-black text-slate-800 mb-3">Đang tạo lộ trình...</h2>
              <div className="space-y-2 w-full text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                  <Check className="w-4 h-4 text-green-500" /> Phân tích mục tiêu {goal}
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                  <Check className="w-4 h-4 text-green-500" /> Chọn lọc từ vựng theo chủ đề
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-blue-600 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" /> Sắp xếp {wordsPerDay} từ/ngày
                </div>
              </div>
              <p className="text-slate-500 mt-6 text-sm font-medium">
                Vui lòng đợi trong giây lát, AI của Zentask đang làm việc...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8">
        <div className="flex gap-2 justify-center">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={cn("h-2 rounded-full transition-all duration-300", i === step ? "w-6 bg-blue-600" : i < 6 ? "w-2 bg-slate-200" : "hidden")} />
          ))}
        </div>
      </div>
    </div>
  );
}
