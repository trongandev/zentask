import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { Button } from "@/src/components/ui/Button";
import { Textarea } from "@/src/components/ui/Textarea";
import { Input } from "@/src/components/ui/Input";

interface Props {
  questions: any[];
  setQuestions: (qs: any[]) => void;
}

export function QuestionBankEditor({ questions, setQuestions }: Props) {
  const { isOver, setNodeRef } = useDroppable({
    id: "lesson-question-list",
    data: { type: "lesson-question-list" },
  });

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `q_${Date.now()}`,
        type: "multiple_choice",
        question: "",
        options: ["", "", "", ""],
        correctIndex: 0,
        explanation: "",
      },
    ]);
  };

  const updateQuestion = (qIndex: number, field: string, value: any) => {
    const updated = [...questions];
    updated[qIndex] = { ...updated[qIndex], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const removeQuestion = (qIndex: number) => {
    const updated = [...questions];
    updated.splice(qIndex, 1);
    setQuestions(updated);
  };

  return (
    <div ref={setNodeRef} className={`space-y-6 p-4 rounded-xl transition-colors ${isOver ? 'bg-indigo-50 border-2 border-indigo-400 border-dashed' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-800">Ngân hàng câu hỏi ({questions.length})</h3>
        <Button
          onClick={addQuestion}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm câu hỏi
        </Button>
      </div>

      {questions.map((q, qIndex) => (
        <div key={qIndex} className="bg-white border border-slate-200 rounded-xl p-5 relative group shadow-sm">
          <Button
            onClick={() => removeQuestion(qIndex)}
            className="absolute -right-3 -top-3 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <div className="mb-4">
            <label className="text-xs font-bold text-slate-500 block mb-1">Câu hỏi</label>
            <Textarea
              value={q.question}
              onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
              className="w-full p-3 bg-slate-50 border rounded-lg focus:border-indigo-500 outline-none"
              placeholder="Nhập nội dung câu hỏi..."
              rows={2}
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            {q.options.map((opt: string, optIndex: number) => (
              <div key={optIndex} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
                <Input
                  type="radio"
                  name={`correct_${qIndex}`}
                  checked={q.correctIndex === optIndex}
                  onChange={() => updateQuestion(qIndex, "correctIndex", optIndex)}
                  className="w-4 h-4 text-indigo-600"
                />
                <Input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                  placeholder={`Lựa chọn ${optIndex + 1}`}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Giải thích (tuỳ chọn)</label>
            <Input
              type="text"
              value={q.explanation || ""}
              onChange={(e) => updateQuestion(qIndex, "explanation", e.target.value)}
              className="w-full p-2 bg-slate-50 border rounded-lg focus:border-indigo-500 outline-none text-sm"
              placeholder="Giải thích tại sao đáp án này đúng..."
            />
          </div>
        </div>
      ))}

      {questions.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
          Chưa có câu hỏi nào trong bài học này.
        </div>
      )}
    </div>
  );
}
