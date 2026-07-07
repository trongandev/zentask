import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, FileText, ArrowLeft, Loader2, Sparkles, Plus, Trash2 } from "lucide-react";
import { useQuizStore, QuizQuestion } from "../../services/quizService";
import toast from "react-hot-toast";

export function QuizCreate() {
  const navigate = useNavigate();
  const { generateQuizByAI, createQuiz } = useQuizStore();
  const [mode, setMode] = useState<"manual" | "ai">("ai");
  const [loading, setLoading] = useState(false);

  // AI Settings
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState("Trung bình");

  // Manual Settings
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Trung bình");
  const [duration, setDuration] = useState(15);
  const [questions, setQuestions] = useState<QuizQuestion[]>([{ id: "1", text: "", options: ["", "", "", ""], correctAnswer: "" }]);

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Vui lòng nhập chủ đề cần tạo");
      return;
    }
    try {
      setLoading(true);
      const quiz = await generateQuizByAI(aiPrompt, aiNumQuestions, aiDifficulty);
      if (quiz) {
        toast.success("Tạo quiz thành công!");
        navigate(`/quiz/${quiz.id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveManual = async () => {
    if (!title.trim()) return toast.error("Vui lòng nhập tiêu đề");

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return toast.error(`Câu hỏi ${i + 1} chưa có nội dung`);
      if (q.options.some((opt) => !opt.trim())) return toast.error(`Câu hỏi ${i + 1} chưa điền đủ 4 đáp án`);
      if (!q.correctAnswer.trim()) return toast.error(`Câu hỏi ${i + 1} chưa chọn đáp án đúng`);
      if (!q.options.includes(q.correctAnswer)) return toast.error(`Đáp án đúng của câu ${i + 1} phải nằm trong 4 lựa chọn`);
    }

    try {
      setLoading(true);
      const res = await createQuiz({
        title,
        description,
        difficulty,
        duration,
        questions,
      });
      if (res) {
        navigate(`/quiz/${res.id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { id: Date.now().toString(), text: "", options: ["", "", "", ""], correctAnswer: "" }]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length === 1) return toast.error("Phải có ít nhất 1 câu hỏi");
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, field: string, value: string | string[], optIndex?: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === id) {
          if (field === "option" && typeof optIndex === "number") {
            const newOpts = [...q.options];
            newOpts[optIndex] = value as string;
            return { ...q, options: newOpts };
          }
          return { ...q, [field]: value };
        }
        return q;
      }),
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/quiz")} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tạo bài thi mới</h1>
          <p className="text-sm text-gray-500">Tạo thủ công hoặc nhờ trợ lý AI tạo tự động</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-2 flex gap-2 border border-gray-100 shadow-sm w-max">
        <button
          onClick={() => setMode("ai")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all ${mode === "ai" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <Bot className="w-5 h-5" />
          Tạo bằng AI (Khuyên dùng)
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all ${mode === "manual" ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <FileText className="w-5 h-5" />
          Tạo thủ công
        </button>
      </div>

      {mode === "ai" ? (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-blue-900">
            <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold mb-1">Trợ lý AI tạo đề thông minh</h3>
              <p className="text-sm text-blue-700/80">
                Chỉ cần nhập chủ đề bạn muốn (ví dụ: "Từ vựng tiếng Anh chủ đề gia đình cho người mới bắt đầu", "Ngữ pháp câu điều kiện loại 1 và 2"), AI sẽ tự động sinh ra câu hỏi, 4 đáp án và lời
                giải thích chi tiết.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Chủ đề bài thi</label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="VD: Tạo 10 câu hỏi ngữ pháp tiếng Anh B1 tập trung vào các thì quá khứ..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none min-h-[120px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Số lượng câu hỏi</label>
                <select
                  value={aiNumQuestions}
                  onChange={(e) => setAiNumQuestions(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-900 outline-none focus:border-blue-500"
                >
                  <option value={5}>5 câu</option>
                  <option value={10}>10 câu</option>
                  <option value={15}>15 câu</option>
                  <option value={20}>20 câu</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Độ khó</label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-900 outline-none focus:border-blue-500"
                >
                  <option value="Dễ">Dễ (A1-A2)</option>
                  <option value="Trung bình">Trung bình (B1)</option>
                  <option value="Khó">Khó (B2-C1)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleGenerateAI}
                disabled={loading || !aiPrompt.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang tạo dữ liệu...
                  </>
                ) : (
                  <>
                    <Bot className="w-5 h-5" /> Bắt đầu tạo (AI)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Thông tin chung</h2>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tiêu đề bài thi</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                type="text"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-gray-900"
                placeholder="VD: Bài kiểm tra định kỳ Unit 3"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả ngắn</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-gray-900"
                placeholder="Tổng hợp kiến thức..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Thời gian (phút)</label>
                <input
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  type="number"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Độ khó</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-gray-900">
                  <option value="Dễ">Dễ</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Khó">Khó</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, qIndex) => (
              <div key={q.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative group">
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="absolute top-4 right-4 p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors hidden group-hover:block"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-gray-900 mb-4">Câu hỏi {qIndex + 1}</h3>
                <input
                  value={q.text}
                  onChange={(e) => updateQuestion(q.id, "text", e.target.value)}
                  type="text"
                  placeholder="Nhập nội dung câu hỏi..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 font-medium outline-none focus:border-gray-900"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-gray-100 font-bold text-gray-500 flex items-center justify-center flex-shrink-0">{String.fromCharCode(65 + oIndex)}</span>
                      <input
                        value={opt}
                        onChange={(e) => updateQuestion(q.id, "option", e.target.value, oIndex)}
                        type="text"
                        placeholder={`Đáp án ${String.fromCharCode(65 + oIndex)}`}
                        className="flex-1 bg-white border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-gray-900"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Đáp án đúng</label>
                  <select
                    value={q.correctAnswer}
                    onChange={(e) => updateQuestion(q.id, "correctAnswer", e.target.value)}
                    className="w-full bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 outline-none focus:border-green-500 font-bold"
                  >
                    <option value="">-- Chọn đáp án đúng --</option>
                    {q.options
                      .filter((o) => o.trim() !== "")
                      .map((opt, idx) => (
                        <option key={idx} value={opt}>
                          {String.fromCharCode(65 + idx)}: {opt}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={addQuestion}
              className="flex-1 border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-600 font-bold py-4 rounded-3xl flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" /> Thêm câu hỏi
            </button>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSaveManual}
              disabled={loading}
              className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Lưu và Xuất bản"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
