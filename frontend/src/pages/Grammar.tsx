import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Map, Play, BookOpen, Brain, Sparkles, CheckCircle2, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { Prepositions } from "../components/grammar/Prepositions";
import { Conditionals } from "../components/grammar/Conditionals";
import { Nouns } from "../components/grammar/Nouns";
import { PassiveVoice } from "../components/grammar/PassiveVoice";
import { GRAMMAR_STAGES } from "../data/grammarExercises";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";

const API_URL = import.meta.env.VITE_API_BACKEND;

export function Grammar() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [currentStageId, setCurrentStageId] = useState(1);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'theory'>('roadmap');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingText, setLoadingText] = useState("Đang xem lại các lộ trình bạn đã học...");

  useEffect(() => {
    if (user?.grammarProgress) {
      setCurrentStageId(user.grammarProgress.maxStage || 1);
      setCompletedStages(user.grammarProgress.completedStages || []);
    } else {
      const saved = localStorage.getItem("grammar_practice_stage");
      if (saved) setCurrentStageId(parseInt(saved));
    }
  }, [user]);

  const handleGenerateCustomGrammar = async () => {
    if (!user) return alert("Vui lòng đăng nhập để sử dụng tính năng này!");
    if (completedStages.length === 0) {
      return alert("Vui lòng hoàn thành ít nhất 1 bài học trong lộ trình để AI có đủ dữ liệu tạo bài tập cho bạn!");
    }
    setIsGenerating(true);
    setLoadingText("Đang xem lại các lộ trình bạn đã học...");
    
    const timer1 = setTimeout(() => setLoadingText("Đang tính toán logic và cá nhân hóa ngữ pháp cho bạn..."), 3000);
    const timer2 = setTimeout(() => setLoadingText("Đã đủ dữ liệu, đang tạo bài tập..."), 6000);

    try {
      const res = await fetch(`${API_URL}/api/grammar/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      const data = await res.json();
      if (res.ok && data.id) {
        updateUser({ customGrammarTests: [data, ...(user.customGrammarTests || [])] });
        setTimeout(() => {
           navigate(`/grammar/practice/${data.id}`);
        }, 1000);
      } else {
        alert("Có lỗi xảy ra khi tạo bài tập cá nhân hoá.");
        setIsGenerating(false);
      }
    } catch (e) {
      console.error(e);
      alert("Không thể kết nối đến máy chủ.");
      setIsGenerating(false);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
    }
  };

  const handleDeleteCustomTest = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xoá bài tập này?")) return;
    
    try {
      const res = await fetch(`${API_URL}/api/grammar/custom/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        updateUser({
          customGrammarTests: user.customGrammarTests.filter((t: any) => t.id !== id)
        });
      }
    } catch (error) {
      console.error(error);
      alert("Không thể xoá bài tập");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Loading Modal */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-sm w-full flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 relative">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <Sparkles className="w-4 h-4 text-amber-500 absolute top-2 right-2 animate-pulse" />
            </div>
            <h3 className="font-bold text-gray-900 text-xl mb-3">AI Đang Phân Tích</h3>
            <p className="text-gray-500 font-medium h-12 flex items-center justify-center animate-pulse">{loadingText}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src="/mascot/Lopy (15).png" className="w-16 h-16 object-contain drop-shadow-md" alt="Mascot" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Cốt lõi Ngữ pháp (Grammar)</h1>
            <p className="text-gray-500">Học ngữ pháp một cách trực quan, sinh động và dễ nhớ.</p>
          </div>
        </div>
        <Link to="/grammar/practice" className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0">
          <Play className="w-5 h-5" fill="currentColor" />
          Ôn tập tổng hợp
        </Link>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('roadmap')}
          className={cn("px-6 py-3 font-bold text-lg border-b-2 transition-colors", activeTab === 'roadmap' ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")}
        >
          Lộ trình học
        </button>
        <button
          onClick={() => setActiveTab('theory')}
          className={cn("px-6 py-3 font-bold text-lg border-b-2 transition-colors", activeTab === 'theory' ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")}
        >
          Lý thuyết
        </button>
      </div>

      {activeTab === 'roadmap' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          {/* 0. Roadmap */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50/50 rounded-3xl p-6 md:p-8 border border-emerald-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Map className="w-32 h-32 text-emerald-600" />
        </div>
        <div className="relative z-10">
          <h3 className="font-bold text-gray-900 text-lg mb-6 flex items-center gap-2">
            <Map className="w-5 h-5 text-emerald-600" />
            Lộ trình học (Roadmap)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {GRAMMAR_STAGES.map((stage) => {
              const isCompleted = completedStages.includes(stage.id) || stage.id < currentStageId;
              const isCurrent = stage.id === currentStageId;
              
              let cardClass = "border-gray-100 hover:shadow-md hover:border-emerald-200";
              let badge = null;

              if (isCurrent) {
                cardClass = "border-emerald-300 ring-2 ring-emerald-100";
                badge = (
                  <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    <BookOpen className="w-3 h-3" />
                    Đang học
                  </span>
                );
              } else if (isCompleted) {
                cardClass = "border-emerald-200 bg-emerald-50/30 opacity-80 hover:opacity-100";
                badge = (
                  <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Đã hoàn thành
                  </span>
                );
              }

              return (
                <Link 
                  key={stage.id}
                  to={`/grammar/practice/${stage.id}`} 
                  className={cn("bg-white p-5 rounded-2xl border shadow-sm transition-all group hover:-translate-y-1 block", cardClass)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm transition-colors",
                      isCurrent ? "bg-emerald-600 text-white" : isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-600 group-hover:bg-emerald-50 group-hover:text-emerald-600"
                    )}>
                      {stage.id}
                    </div>
                    {badge}
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">{stage.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{stage.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Grammar Generator Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-blue-100 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-bold text-sm">
            <Brain className="w-4 h-4" />
            AI Cá nhân hoá
          </div>
          <h3 className="font-extrabold text-2xl text-gray-900">Bài tập Ngữ pháp cho riêng bạn</h3>
          <p className="text-gray-500 leading-relaxed max-w-xl">
            Hệ thống AI sẽ phân tích các lỗi sai, thời gian và lộ trình bạn đã học để tự động tạo ra một bộ câu hỏi ngữ pháp ôn tập dành riêng cho bạn, giúp lấp đầy lỗ hổng kiến thức nhanh nhất.
          </p>
          <button 
            onClick={handleGenerateCustomGrammar}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-1 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Tạo bài tập cá nhân hoá ngay
          </button>
        </div>
        
        {/* Render existing custom tests if any */}
        {user?.customGrammarTests && user.customGrammarTests.length > 0 && (
          <div className="w-full md:w-80 bg-gray-50 rounded-2xl p-4 border border-gray-100 shrink-0">
            <h4 className="font-bold text-gray-700 mb-3 text-sm">Lịch sử bài tập cá nhân hoá:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {user.customGrammarTests.map((test: any) => (
                <Link 
                  key={test.id}
                  to={`/grammar/practice/${test.id}`}
                  className="bg-white border border-gray-200 p-3 rounded-xl flex items-center justify-between hover:border-blue-300 hover:bg-blue-50 group transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-gray-800 group-hover:text-blue-700 line-clamp-1">{test.title}</span>
                    <span className="text-xs text-gray-500">{new Date(test.createdAt._seconds * 1000).toLocaleDateString("vi-VN")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleDeleteCustomTest(e, test.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xoá bài tập"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
      )}

      {activeTab === 'theory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
          <Prepositions />
          <Conditionals />
          <Nouns />
          <PassiveVoice />
        </div>
      )}
    </div>
  );
}
