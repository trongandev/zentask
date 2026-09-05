import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit3 } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import toastService from "@/src/services/toastService";

const WRITING_DATA: Record<string, { title: string; prompt: string }> = {
  "introduce-yourself": {
    title: "Introduce Yourself",
    prompt: "Write a short paragraph (3-5 sentences) introducing yourself. Include your name, age, where you live, and what you do."
  },
  "my-hobbies": {
    title: "My Hobbies",
    prompt: "Write a short paragraph (3-5 sentences) about your favorite hobbies. What do you like to do in your free time and why?"
  }
};

export function BeginnerWritingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [data, setData] = useState<any>(null);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (id.length === 24) {
      import("@/src/services/axiosConfig").then(({ default: axiosInstance }) => {
        axiosInstance.get(`/api/beginner/skill-task/${id}`)
          .then(res => {
            const taskData = res.data.task;
            const mappedData = {
              title: taskData.content.topic?.en || taskData.topic,
              prompt: taskData.content.prompt
            };
            setData(mappedData);
          })
          .catch(err => {
            console.error(err);
            toastService.error("Không tìm thấy bài tập");
          });
      });
    } else {
      setData(WRITING_DATA[id] || null);
    }
  }, [id]);

  if (!data) {
    return <div className="p-8 text-center">Đang tải dữ liệu...</div>;
  }

  const handleSubmit = () => {
    if (text.trim().length < 20) {
      toastService.error("Bài viết của bạn quá ngắn! Vui lòng viết dài hơn.");
      return;
    }
    setIsSubmitting(true);
    // Giả lập AI feedback (Trong tương lai sẽ gọi API AI chấm điểm)
    setTimeout(() => {
      setFeedback("Bài viết của bạn khá tốt! Tuy nhiên, cố gắng sử dụng thêm một số tính từ để đoạn văn thêm sinh động nhé. Hãy duy trì thói quen viết mỗi ngày!");
      setIsSubmitting(false);
      toastService.success("Đã nộp bài thành công!");
    }, 1500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button onClick={() => navigate("/beginner/writing")} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 bg-transparent shadow-none hover:bg-slate-100 border-none">
        <ArrowLeft className="w-5 h-5" /> Quay lại
      </Button>

      <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-blue-100 shadow-xl w-full">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <Edit3 className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-slate-800">{data.title}</h1>
        </div>
        
        {/* Prompt */}
        <div className="bg-blue-50/50 rounded-2xl p-5 md:p-6 border border-blue-100 mb-8">
          <h2 className="font-bold text-blue-900 mb-2">Đề bài (Prompt)</h2>
          <p className="text-slate-700 leading-relaxed">{data.prompt}</p>
        </div>

        {/* Text Area */}
        <div className="mb-6">
          <textarea
            disabled={!!feedback || isSubmitting}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Bắt đầu viết tại đây..."
            className="w-full h-48 md:h-64 p-5 md:p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all resize-none text-base md:text-lg text-slate-800 custom-scrollbar disabled:opacity-70 disabled:cursor-not-allowed"
          />
          <div className="mt-2 text-right text-sm text-slate-400 font-medium">
            {text.trim().split(/\s+/).filter(w => w.length > 0).length} từ
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="bg-green-50 rounded-2xl p-5 md:p-6 border border-green-200 mb-8 animate-in zoom-in-95 duration-300">
            <h2 className="font-bold text-green-800 mb-2">Đánh giá (AI Feedback)</h2>
            <p className="text-green-700 leading-relaxed">{feedback}</p>
          </div>
        )}

        {/* Submit */}
        {!feedback && (
          <Button 
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg text-lg"
          >
            {isSubmitting ? "Đang gửi..." : "Nộp bài"}
          </Button>
        )}
      </div>
    </div>
  );
}
