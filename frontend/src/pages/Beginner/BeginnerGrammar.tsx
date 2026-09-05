import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle, Lock, Play, Star, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import axiosInstance from "../../services/axiosConfig";
import { Button } from "@/src/components/ui/Button";
import toastService from "@/src/services/toastService";

export function BeginnerGrammar() {
  const navigate = useNavigate();
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [isGeneratingDev, setIsGeneratingDev] = useState(false);

  const handleDevGenerate = async () => {
    setIsGeneratingDev(true);
    try {
      await axiosInstance.post("/api/beginner/dev-generate-grammar-mock");
      toastService.success("Đã ra lệnh sinh dữ liệu mock. Vui lòng tải lại trang sau ít phút.");
    } catch (error) {
      console.error(error);
      toastService.error("Có lỗi xảy ra khi gọi lệnh sinh data.");
    } finally {
      setIsGeneratingDev(false);
    }
  };

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await axiosInstance.get("/api/beginner/progress");
        if (res.data && res.data.completedGrammarTopics) {
          setCompletedTopics(res.data.completedGrammarTopics);
        }
      } catch (error) {
        console.error("Error fetching beginner progress:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchPersonalizedGrammar = async () => {
      try {
        const res = await axiosInstance.get("/api/beginner/grammar/me");
        if (res.data && res.data.categories && res.data.categories.length > 0) {
          setCategories(res.data.categories);
          setIsPersonalized(true);
        }
      } catch (error) {
        // Fallback to default
      }
    };

    fetchProgress();
    fetchPersonalizedGrammar();
  }, []);

  const totalTopics = categories.reduce((acc: any, cat: any) => acc + cat.topics.length, 0);

  // Cập nhật progress động cho các topics
  const renderCategories = categories.map((category: any) => ({
    ...category,
    topics: category.topics.map((topic: any) => {
      const isCompleted = completedTopics.includes(topic.id);
      return {
        ...topic,
        progress: isCompleted ? 100 : 0,
        isLocked: false, // For demo, let's unlock all or keep original logic
      };
    }),
  }));

  const firstIncompleteTopic = React.useMemo(() => {
    for (const cat of renderCategories) {
      for (const topic of cat.topics) {
        if (!topic.isLocked && topic.progress !== 100) {
          return topic.id;
        }
      }
    }
    return null;
  }, [renderCategories]);

  if (loading) {
    return <div className="p-8 text-center">Đang tải tiến trình học...</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-24 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-lg relative overflow-hidden mt-8">
        <div className="z-10 text-center md:text-left space-y-4 max-w-lg">
          <h1 className="text-3xl font-black">Ngữ pháp căn bản</h1>
          <p className="text-blue-100 text-lg">Chinh phục cấu trúc câu, từ đó ghép các từ vựng lại thành câu hoàn chỉnh và tự tin giao tiếp.</p>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
            <div className="flex items-center gap-4 bg-blue-700/30 p-3 rounded-2xl w-fit backdrop-blur-sm">
              <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
              <div>
                <p className="text-sm font-medium text-blue-100">Điểm ngữ pháp</p>
                <p className="text-xl font-bold">
                  {completedTopics.length}/{totalTopics} Chủ đề
                </p>
              </div>
            </div>

            {isPersonalized && <div className="bg-yellow-500 text-white text-xs px-3 py-1 rounded-full font-bold flex items-center justify-center animate-pulse shadow-md">Lộ trình từ lỗi sai</div>}

            {firstIncompleteTopic && (
              <Button
                onClick={() => navigate(`/beginner/grammar/${firstIncompleteTopic}`)}
                className="bg-white text-blue-600 font-black px-8 h-14 rounded-2xl border-b-4 border-blue-200 hover:bg-slate-50 hover:-translate-y-1 hover:shadow-xl active:border-b-0 active:translate-y-1 transition-all flex items-center gap-2"
              >
                TIẾP TỤC HỌC <Play className="w-5 h-5 fill-current" />
              </Button>
            )}

            {import.meta.env.MODE === "development" && (
              <Button onClick={handleDevGenerate} disabled={isGeneratingDev} variant="secondary" size="sm" className="h-14 px-6 rounded-2xl">
                {isGeneratingDev ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
                [DEV] Sinh lộ trình lỗi sai
              </Button>
            )}
          </div>
        </div>
        <img src="/mascot/Lopy (8).png" alt="Mascot" className="w-48 h-48 object-contain z-10 mt-6 md:mt-0 animate-bounce-slow" />
        {/* Decorative elements */}
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-blue-400/20 rounded-full blur-2xl"></div>
      </div>

      {/* Content Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <BookOpen className="w-7 h-7 text-blue-500" />
          <h2 className="text-2xl font-bold text-slate-800">Lộ trình của bạn</h2>
        </div>

        <div className="space-y-12">
          {renderCategories.length > 0 ? (
            renderCategories.map((category) => (
              <div key={category.title} className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-700 px-2 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-lg">{category.title.split(".")[0]}</span>
                  {category.title.split(".")[1]}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.topics.map((topic: any) => (
                    <div
                      key={topic.id}
                      onClick={() => {
                        if (!topic.isLocked) navigate(`/beginner/grammar/${topic.id}`);
                      }}
                      className={cn(
                        "relative group bg-white rounded-3xl p-6 border-2 transition-all duration-200",
                        topic.isLocked ? "border-slate-100 bg-slate-50/50" : "border-slate-200 border-b-4 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 active:border-b-2 active:translate-y-0 cursor-pointer",
                      )}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl shadow-sm">{topic.icon}</div>
                        {topic.isLocked ? (
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Lock className="w-5 h-5" />
                          </div>
                        ) : topic.progress === 100 ? (
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-500">
                            <CheckCircle className="w-6 h-6" />
                          </div>
                        ) : (
                          <Button
                            onClick={() => navigate(`/beginner/grammar/${topic.id}`)}
                            className="w-10 h-10 bg-blue-100 hover:bg-blue-500 hover:text-white rounded-full flex items-center justify-center text-blue-500 transition-colors"
                          >
                            <Play className="w-5 h-5 ml-1" />
                          </Button>
                        )}
                      </div>

                      <h3 className={cn("text-xl font-bold mb-2", topic.isLocked ? "text-slate-400" : "text-slate-800")}>{topic.title}</h3>
                      <p className={cn("text-sm line-clamp-2 mb-6", topic.isLocked ? "text-slate-400" : "text-slate-500")}>{topic.description}</p>

                      {!topic.isLocked && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm font-bold">
                            <span className="text-slate-500">Tiến độ</span>
                            <span className={topic.progress === 100 ? "text-green-500" : "text-blue-500"}>{topic.progress}%</span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all duration-1000 ease-out", topic.progress === 100 ? "bg-green-500" : "bg-blue-500")} style={{ width: `${topic.progress}%` }} />
                          </div>
                        </div>
                      )}

                      {topic.isLocked && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-3xl z-10" />}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-sm text-center">
              <BookOpen className="w-12 h-12 text-blue-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có lộ trình ngữ pháp cá nhân hóa</h3>
              <p className="text-slate-500">Chúng tôi dựa trên những lỗi sai của bạn trong quá trình học để đưa ra các bài luyện tập ngữ pháp phù hợp. Hãy tiếp tục học và làm bài tập nhé!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
