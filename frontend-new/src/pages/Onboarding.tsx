import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/Button";
import { Globe, Lightbulb, TrendingUp, Compass, Loader2 } from "lucide-react";

type Step = "WELCOME" | "LANGUAGE" | "INTERESTS" | "LEVEL" | "GOALS" | "LOADING";

export default function Onboarding() {
  const [step, setStep] = useState<Step>("WELCOME");
  const navigate = useNavigate();

  // State
  const [selectedLang, setSelectedLang] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("");

  const nextStep = (next: Step) => setStep(next);

  const startAIProcessing = () => {
    setStep("LOADING");
    setTimeout(() => {
      navigate("/dashboard");
    }, 4000);
  };

  const variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:justify-center">
      <div className="w-full max-w-md mx-auto h-full min-h-screen md:min-h-[700px] md:h-auto bg-white md:rounded-3xl md:shadow-xl md:border border-slate-100 flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait">
          {step === "WELCOME" && (
            <motion.div key="welcome" variants={variants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col p-8 items-center justify-center text-center">
              <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-8">
                <Globe className="w-12 h-12" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Chào mừng đến với ZenTask</h1>
              <p className="text-slate-500 mb-10 text-lg">AI sẽ giúp bạn thiết kế lộ trình học ngoại ngữ hoàn hảo nhất.</p>
              <Button onClick={() => nextStep("LANGUAGE")} size="lg" className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold">
                Bắt đầu ngay
              </Button>
            </motion.div>
          )}

          {step === "LANGUAGE" && (
            <motion.div key="language" variants={variants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col p-6 pt-12">
              <h2 className="text-3xl font-black text-slate-900 mb-2">Bạn muốn học ngôn ngữ nào?</h2>
              <p className="text-slate-500 mb-8">Hãy chọn ngôn ngữ bạn muốn chinh phục.</p>
              <div className="grid gap-3">
                {["Tiếng Anh", "Tiếng Trung", "Tiếng Nhật", "Tiếng Hàn"].map((lang) => (
                  <Button
                    key={lang}
                    variant={selectedLang === lang ? "default" : "outline"}
                    onClick={() => {
                      setSelectedLang(lang);
                      nextStep("INTERESTS");
                    }}
                    className={`py-6 justify-start px-6 rounded-2xl text-lg font-semibold ${selectedLang === lang ? "border-transparent" : "border-2"}`}
                  >
                    {lang}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "INTERESTS" && (
            <motion.div key="interests" variants={variants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col p-6 pt-12">
              <h2 className="text-3xl font-black text-slate-900 mb-2">Bạn thích chủ đề gì?</h2>
              <p className="text-slate-500 mb-8">Chọn ít nhất 1 chủ đề để AI cá nhân hóa nội dung bài học.</p>
              
              <div className="flex flex-wrap gap-3 mb-auto">
                {["Công nghệ", "Du lịch", "Kinh doanh", "Nghệ thuật", "Phim ảnh", "Giao tiếp hàng ngày", "Văn hóa", "Sức khỏe"].map((topic) => {
                  const isSelected = selectedInterests.includes(topic);
                  return (
                    <button
                      key={topic}
                      onClick={() => {
                        if (isSelected) setSelectedInterests(prev => prev.filter(t => t !== topic));
                        else setSelectedInterests(prev => [...prev, topic]);
                      }}
                      className={`px-5 py-3 rounded-xl font-bold border-2 transition-all active:scale-95 ${isSelected ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30" : "bg-white border-slate-200 text-slate-600"}`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>

              <div className="pt-8">
                <Button 
                  disabled={selectedInterests.length === 0} 
                  onClick={() => nextStep("LEVEL")} 
                  size="lg" 
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white"
                >
                  Tiếp tục
                </Button>
              </div>
            </motion.div>
          )}

          {step === "LEVEL" && (
            <motion.div key="level" variants={variants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col p-6 pt-12">
              <h2 className="text-3xl font-black text-slate-900 mb-2">Trình độ hiện tại?</h2>
              <p className="text-slate-500 mb-8">Bạn có thể tự chọn hoặc làm bài test ngắn.</p>
              
              <div className="flex flex-col gap-4">
                <Button onClick={() => { setSelectedLevel("TEST"); nextStep("GOALS"); }} className="w-full py-6 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 text-lg flex flex-col h-auto">
                  <span>Làm bài Test năng lực</span>
                  <span className="text-sm font-medium text-blue-200 opacity-90 mt-1">~5 phút • Độ chuẩn xác cao</span>
                </Button>
                
                <div className="relative my-4 flex items-center py-2">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-bold uppercase">Hoặc tự chọn</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {["A1 - Mới bắt đầu", "A2 - Sơ cấp", "B1 - Trung cấp", "B2 - Thượng cấp", "C1 - Cao cấp", "C2 - Bản ngữ"].map((lvl) => (
                    <Button 
                      key={lvl} 
                      variant="outline" 
                      onClick={() => { setSelectedLevel(lvl); nextStep("GOALS"); }} 
                      className="py-4 rounded-xl text-slate-700 h-auto"
                    >
                      <span className="truncate w-full block text-left">{lvl.split(" - ")[0]}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === "GOALS" && (
            <motion.div key="goals" variants={variants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col p-6 pt-12">
              <h2 className="text-3xl font-black text-slate-900 mb-2">Mục tiêu của bạn là gì?</h2>
              <p className="text-slate-500 mb-8">Để AI định hướng tốt nhất cho lộ trình của bạn.</p>
              
              <div className="grid gap-3">
                {[
                  { id: "exam", icon: <TrendingUp className="w-5 h-5"/>, title: "Thi chứng chỉ", desc: "Luyện thi IELTS, TOEIC, HSK..." },
                  { id: "speak", icon: <Globe className="w-5 h-5"/>, title: "Giao tiếp & Nói", desc: "Tập trung vào phát âm và phản xạ" },
                  { id: "work", icon: <Lightbulb className="w-5 h-5"/>, title: "Phục vụ công việc", desc: "Từ vựng chuyên ngành, email" },
                  { id: "explore", icon: <Compass className="w-5 h-5"/>, title: "Chưa rõ mục tiêu", desc: "Học nền tảng cơ bản & khám phá" }
                ].map((g) => (
                  <Button
                    key={g.id}
                    variant="outline"
                    onClick={() => {
                      setSelectedGoal(g.title);
                      startAIProcessing();
                    }}
                    className="p-5 rounded-2xl flex items-center justify-start gap-4 h-auto border-2 hover:border-blue-300"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                      {g.icon}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-bold text-slate-900 text-base">{g.title}</div>
                      <div className="text-sm text-slate-500 font-medium">{g.desc}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "LOADING" && (
            <motion.div key="loading" variants={variants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col p-8 items-center justify-center text-center">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-8" />
              <h2 className="text-2xl font-black text-slate-900 mb-3">Đang tạo lộ trình...</h2>
              <p className="text-slate-500">AI đang phân tích sở thích, trình độ và mục tiêu của bạn để xây dựng lộ trình học hoàn hảo nhất.</p>
              
              <div className="w-full max-w-xs mt-12 h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 4, ease: "linear" }}
                  className="h-full bg-blue-600 rounded-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
