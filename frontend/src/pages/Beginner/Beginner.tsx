import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Lock, Star, X, Play, BookOpen } from "lucide-react";
import axiosInstance from "@/src/services/axiosConfig";
import { useAuth } from "@/src/contexts/AuthContext";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { SEO } from "@/src/components/SEO";

const PATH_OFFSETS = [0, 40, 60, 40, 0, -40, -60, -40];

interface RoadmapDay {
  day: number;
  topic: string;
  words: any[];
}

interface Roadmap {
  _id: string;
  days: RoadmapDay[];
  completedDays: number[];
  lastCompletedAt?: string;
}

export function Beginner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<RoadmapDay | null>(null);
  const [showWaitTomorrowModal, setShowWaitTomorrowModal] = useState(false);
  const [viewPhaseIndex, setViewPhaseIndex] = useState(0);

  const currentNodeRef = useRef<HTMLDivElement>(null);

  // Initial scroll and calculate viewPhase
  useEffect(() => {
    if (!isLoading && roadmap) {
      const maxCompletedDay = roadmap.completedDays?.length ? Math.max(...roadmap.completedDays) : 0;
      const activeDay = Math.min(roadmap.days.length, maxCompletedDay + 1);
      const initialPhase = Math.max(0, Math.floor((activeDay - 1) / 7));
      setViewPhaseIndex(initialPhase);

      setTimeout(() => {
        currentNodeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [roadmap, isLoading]);

  useEffect(() => {
    const fetchRoadmap = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const res = await axiosInstance.get("/api/roadmap/me");
        setRoadmap(res.data);
      } catch (error: any) {
        if (error.response?.status === 404) {
          navigate("/onboarding");
        }
        console.error("Failed to fetch roadmap", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoadmap();
  }, [user, navigate]);

  const handleNodeClick = (dayData: RoadmapDay, status: string) => {
    if (status === "locked") {
      return;
    }

    if (status === "current" && roadmap?.lastCompletedAt) {
      const lastCompletedDate = new Date(roadmap.lastCompletedAt).toDateString();
      const today = new Date().toDateString();
      if (lastCompletedDate === today) {
        setShowWaitTomorrowModal(true);
        return;
      }
    }

    setSelectedDay(dayData);
  };

  const startLesson = (day: number) => {
    navigate(`/beginner/lesson/roadmap/${day}`);
  };

  const totalPhases = roadmap ? Math.ceil(roadmap.days.length / 7) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto min-h-screen bg-slate-50/50 font-sans pb-24 relative overflow-hidden flex flex-col items-center">
      <SEO title="Lộ trình học tập" description="Lộ trình học tiếng Anh theo từng chủ đề." />

      {/* Header Sticky Lộ trình AI */}
      {!isLoading && roadmap && (
        <div className="w-full max-w-2xl px-4 mt-8 mb-4 sticky top-6 z-40">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 shadow-xl shadow-slate-200/50 flex justify-between items-center border-2 border-slate-100 transition-all hover:shadow-2xl hover:-translate-y-1">
            <div>
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                Lộ trình AI Tuần {viewPhaseIndex + 1} <Star className="w-6 h-6 fill-yellow-400 text-yellow-400 drop-shadow-sm animate-pulse" />
              </h2>
              <p className="text-slate-500 font-medium text-sm mt-1">Hoàn thành mỗi ngày để nhận Diamonds!</p>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls Top */}
      {!isLoading && roadmap && totalPhases > 1 && (
        <div className="flex justify-center w-full max-w-lg px-4 mb-2 z-30 relative gap-4">
          <Button variant="secondary" size="sm" disabled={viewPhaseIndex === 0} onClick={() => setViewPhaseIndex((p) => Math.max(0, p - 1))} className="rounded-full px-6 shadow-md">
            Tuần trước
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={viewPhaseIndex >= totalPhases - 1}
            onClick={() => setViewPhaseIndex((p) => Math.min(totalPhases - 1, p + 1))}
            className="rounded-full px-6 shadow-md"
          >
            Tuần tiếp
          </Button>
        </div>
      )}

      {/* Các Node Lộ trình */}
      <div className="flex flex-col items-center justify-start relative w-full mt-4">
        {/* Vẽ đường nối SVG đằng sau */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[140px] pointer-events-none overflow-hidden z-0">
          <svg className="w-full h-full" preserveAspectRatio="none">
            <path
              d="M 70 0 Q 70 20, 110 50 T 130 100 T 110 150 T 70 180 T 30 210 T 10 260 T 30 310 T 70 340 V 1000"
              fill="transparent"
              stroke="#E5E7EB"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Đang tải */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center z-10 w-full max-w-lg mx-auto">
            <div className="w-16 h-16 border-4 border-[#58cc02]/30 border-t-[#58cc02] rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-black text-slate-800 animate-pulse">Đang tải lộ trình...</h2>
          </div>
        )}

        {/* Render danh sách nodes*/}
        {!isLoading &&
          roadmap &&
          roadmap.days.slice(viewPhaseIndex * 7, (viewPhaseIndex + 1) * 7).map((dayData, index) => {
            const offset = PATH_OFFSETS[index % PATH_OFFSETS.length];
            const absoluteIndex = viewPhaseIndex * 7 + index;

            const completedDays = roadmap.completedDays || [];
            const isCompleted = completedDays.includes(dayData.day);
            const isCurrent = !isCompleted && (absoluteIndex === 0 || completedDays.includes(roadmap.days[absoluteIndex - 1].day));
            const isLocked = !isCompleted && !isCurrent;
            const isLastInTopic = absoluteIndex === roadmap.days.length - 1;

            const status = isCompleted ? "completed" : isCurrent ? "current" : "locked";

            return (
              <div key={dayData.day} ref={isCurrent ? currentNodeRef : null} className={`w-full flex flex-col items-center relative z-10 ${index === 0 ? "mt-4" : ""}`}>
                <div className="relative my-6" style={{ transform: `translateX(${offset}px)` }}>
                  {/* Tooltip khi đang học */}
                  {isCurrent && (
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white px-5 py-2.5 rounded-2xl font-black text-[#58cc02] shadow-xl text-sm whitespace-nowrap animate-bounce z-30 border-2 border-slate-200 flex flex-col items-center gap-1">
                      <span>Ngày {dayData.day}</span>
                      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{dayData.topic}</span>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rotate-45 border-b-2 border-r-2 border-slate-200"></div>
                    </div>
                  )}

                  {/* Node Button (Duolingo Style with tactile press) */}
                  <button
                    onClick={() => handleNodeClick(dayData, status)}
                    className={cn(
                      "w-[84px] h-[84px] rounded-full flex items-center justify-center relative p-0 overflow-hidden transition-all duration-200 group",
                      isLocked
                        ? "bg-slate-200 text-slate-400 shadow-[0_8px_0_0_#e2e8f0] border-[4px] border-white cursor-not-allowed"
                        : isCompleted
                          ? "bg-yellow-400 text-white shadow-[0_8px_0_0_#d97706] border-[4px] border-white hover:-translate-y-1 hover:shadow-[0_12px_0_0_#d97706] active:translate-y-2 active:shadow-[0_0_0_0_#d97706]"
                          : "bg-[#58cc02] text-white shadow-[0_8px_0_0_#46a302] border-[4px] border-white hover:-translate-y-1 hover:shadow-[0_12px_0_0_#46a302] active:translate-y-2 active:shadow-[0_0_0_0_#46a302]",
                    )}
                  >
                    {isLocked ? (
                      <Lock className="w-8 h-8 stroke-[3]" />
                    ) : isLastInTopic && isCompleted ? (
                      <Star className="w-10 h-10 fill-current stroke-[1.5] group-hover:scale-110 transition-transform" />
                    ) : isCompleted ? (
                      <Check className="w-10 h-10 stroke-[4] group-hover:scale-110 transition-transform" />
                    ) : (
                      <Star className="w-10 h-10 stroke-[3] fill-[#58cc02] group-hover:scale-110 transition-transform" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Lopy Mascot Decorative */}
      {!isLoading && roadmap && (
        <div className="flex justify-center mt-12 opacity-50 pointer-events-none">
          <img src="/mascot/Lopy (16).png" className="w-24 h-24 object-contain grayscale" alt="Finished" />
        </div>
      )}

      {/* Modal Chi tiết Ngày */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div
            className="bg-white rounded-[2rem] -translate-y-5 w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-2xl text-slate-800">Ngày {selectedDay.day}</h3>
                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">{selectedDay.topic}</p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                <X className="w-5 h-5 stroke-[3]" />
              </button>
            </div>

            <div className="p-6 max-h-[50vh] overflow-y-auto">
              <h4 className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Từ vựng hôm nay
              </h4>
              <div className="flex flex-col gap-3">
                {selectedDay.words.map((w, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 flex flex-col gap-2">
                    <div className="flex items-end justify-between">
                      <span className="font-black text-lg text-slate-800">{w.word}</span>
                      <div className="flex gap-2 items-center">
                        {w.phonetic && <span className="text-xs font-medium text-slate-500">{w.phonetic}</span>}
                        {w.pos && <span className="text-xs font-bold text-blue-500 bg-blue-100 px-2 py-1 rounded-md">{w.pos}</span>}
                      </div>
                    </div>
                    <span className="font-bold text-slate-600">{w.meaning}</span>
                    {w.example && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <p className="text-sm font-medium text-slate-700 italic">"{w.example}"</p>
                        {w.example_translation && <p className="text-xs font-medium text-slate-500 mt-0.5">{w.example_translation}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-50/80 border-t border-slate-100">
              <Button
                onClick={() => startLesson(selectedDay.day)}
                className="w-full h-14 rounded-2xl bg-[#58cc02] hover:bg-[#46a302] text-white font-black text-lg border-b-4 border-[#46a302] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Play className="w-6 h-6 fill-current" /> BẮT ĐẦU HỌC +20XP
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Wait Tomorrow Modal */}
      {showWaitTomorrowModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowWaitTomorrowModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                <img src="/mascot/Lopy (12).png" alt="Mascot" className="w-16 h-16 object-contain drop-shadow-sm" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Hãy để bộ não nghỉ ngơi! 🧠💤</h3>
              <p className="text-slate-600 mb-4 font-medium leading-relaxed">
                Theo nghiên cứu khoa học, việc <strong>dừng lại đúng lúc</strong> khi bạn đang cực kỳ hứng thú sẽ tạo ra hiệu ứng Zeigarnik – một cảm giác thèm thuồng khiến bộ não của bạn ghi nhớ kiến
                thức sâu hơn và tự động thôi thúc bạn quay lại học tiếp vào ngày hôm sau.
              </p>
              <p className="text-slate-600 mb-8 font-medium leading-relaxed">
                Hãy giữ ngọn lửa này! Hôm nay bạn đã làm rất xuất sắc rồi. Nghỉ ngơi thật tốt và quay lại chinh phục lộ trình vào <strong>ngày mai</strong> nhé!
              </p>
              <Button onClick={() => setShowWaitTomorrowModal(false)} className="w-full py-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-600/30">
                Đã hiểu, hẹn ngày mai!
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
