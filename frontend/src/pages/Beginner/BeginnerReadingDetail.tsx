import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { cn } from "../../lib/utils";
import toastService from "@/src/services/toastService";

const READING_DATA: Record<string, { title: string; content: string; questions: any[] }> = {
  "my-daily-routine": {
    title: "My Daily Routine",
    content: "Every morning, I wake up at 7 AM. First, I brush my teeth and wash my face. Then, I have breakfast. I usually eat toast and drink a cup of coffee. After breakfast, I get dressed and leave for work at 8 AM. I take the bus to my office. My work starts at 9 AM and finishes at 5 PM. In the evening, I like to relax by watching TV or reading a book. Finally, I go to bed at 11 PM.",
    questions: [
      {
        id: 1,
        question: "What time does the person wake up?",
        options: ["6 AM", "7 AM", "8 AM"],
        correctAnswer: "7 AM",
        explanation: "Bài đọc có câu: 'I wake up at 7 AM'."
      },
      {
        id: 2,
        question: "How do they go to work?",
        options: ["By car", "By train", "By bus"],
        correctAnswer: "By bus",
        explanation: "Bài đọc ghi: 'I take the bus to my office'."
      },
      {
        id: 3,
        question: "What do they usually eat for breakfast?",
        options: ["Toast and coffee", "Eggs and milk", "Cereal"],
        correctAnswer: "Toast and coffee",
        explanation: "Bài đọc ghi: 'I usually eat toast and drink a cup of coffee'."
      }
    ]
  },
  "favorite-weekend": {
    title: "My Favorite Weekend",
    content: "Weekends are my favorite time of the week. On Saturday morning, I sleep in until 9 AM. I don't have to work, so I can relax. I usually go to the park with my dog, Buster. We walk for an hour and play fetch. In the afternoon, I meet my friends for lunch at a small cafe. On Sunday, I clean my house and do the laundry. In the evening, I prepare my clothes and bag for Monday.",
    questions: [
      {
        id: 1,
        question: "What time do they wake up on Saturday?",
        options: ["7 AM", "9 AM", "10 AM"],
        correctAnswer: "9 AM",
        explanation: "Bài đọc ghi: 'On Saturday morning, I sleep in until 9 AM'."
      },
      {
        id: 2,
        question: "Who is Buster?",
        options: ["A friend", "A cat", "A dog"],
        correctAnswer: "A dog",
        explanation: "Bài đọc ghi: 'I usually go to the park with my dog, Buster'."
      },
      {
        id: 3,
        question: "What do they do on Sunday?",
        options: ["Go to the park", "Clean the house and do laundry", "Meet friends"],
        correctAnswer: "Clean the house and do laundry",
        explanation: "Bài đọc ghi: 'On Sunday, I clean my house and do the laundry'."
      }
    ]
  },
  "the-coffee-shop": {
    title: "The Coffee Shop",
    content: "There is a small coffee shop near my house called 'Green Bean'. It is very cozy and quiet. I go there every Sunday morning. The walls are painted green, and there are many beautiful plants. I always order a hot latte and a slice of chocolate cake. I like to sit by the window and watch people walking on the street. The staff is very friendly and they always remember my name.",
    questions: [
      {
        id: 1,
        question: "What is the name of the coffee shop?",
        options: ["Red Bean", "Green Bean", "Blue Bean"],
        correctAnswer: "Green Bean",
        explanation: "Bài đọc ghi: 'called Green Bean'."
      },
      {
        id: 2,
        question: "What do they always order?",
        options: ["Hot latte and chocolate cake", "Iced coffee and a sandwich", "Tea and cookies"],
        correctAnswer: "Hot latte and chocolate cake",
        explanation: "Bài đọc ghi: 'I always order a hot latte and a slice of chocolate cake'."
      },
      {
        id: 3,
        question: "Where do they like to sit?",
        options: ["Near the door", "In the corner", "By the window"],
        correctAnswer: "By the window",
        explanation: "Bài đọc ghi: 'I like to sit by the window'."
      }
    ]
  }
};

export function BeginnerReadingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [data, setData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!id) return;
    if (id.length === 24) {
      import("@/src/services/axiosConfig").then(({ default: axiosInstance }) => {
        axiosInstance.get(`/api/beginner/skill-task/${id}`)
          .then(res => {
            const taskData = res.data.task;
            const mappedData = {
              title: taskData.content.topic?.en || taskData.topic,
              content: taskData.content.passage,
              questions: taskData.content.questions.map((q: any, i: number) => ({
                id: i + 1,
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation
              }))
            };
            setData(mappedData);
          })
          .catch(err => {
            console.error(err);
            toastService.error("Không tìm thấy bài tập");
          });
      });
    } else {
      setData(READING_DATA[id] || null);
    }
  }, [id]);

  if (!data) {
    return <div className="p-8 text-center">Đang tải dữ liệu...</div>;
  }

  const handleSelectAnswer = (qId: number, option: string) => {
    if (showResults) return;
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const submitAnswers = () => {
    if (Object.keys(answers).length < data.questions.length) {
      toastService.error("Vui lòng trả lời hết tất cả câu hỏi trước khi nộp!");
      return;
    }
    setShowResults(true);
    const correctCount = data.questions.filter(q => q.correctAnswer === answers[q.id]).length;
    if (correctCount === data.questions.length) {
      toastService.success("Tuyệt vời! Bạn đã trả lời đúng tất cả.");
    } else {
      toastService.info(`Bạn trả lời đúng ${correctCount}/${data.questions.length} câu.`);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button onClick={() => navigate("/beginner/reading")} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 bg-transparent shadow-none hover:bg-slate-100 border-none">
        <ArrowLeft className="w-5 h-5" /> Quay lại
      </Button>

      <div className="bg-white rounded-3xl p-8 border-2 border-purple-100 shadow-xl w-full">
        <h1 className="text-3xl font-black text-slate-800 mb-2">{data.title}</h1>
        <p className="text-slate-500 mb-8">Hãy đọc đoạn văn sau và trả lời các câu hỏi bên dưới.</p>

        {/* Text Content */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-10 leading-relaxed text-lg text-slate-800">
          {data.content}
        </div>

        {/* Questions */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-6">Câu hỏi trắc nghiệm</h2>
          <div className="space-y-8">
            {data.questions.map((q, index) => (
              <div key={q.id} className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <h3 className="font-bold text-lg text-slate-800 mb-4">Câu {index + 1}: {q.question}</h3>
                <div className="space-y-3">
                  {q.options.map((opt: string) => {
                    const isSelected = answers[q.id] === opt;
                    const isCorrect = q.correctAnswer === opt;
                    let stateClass = "border-slate-200 bg-white hover:border-purple-300";
                    
                    if (showResults) {
                      if (isCorrect) stateClass = "border-green-500 bg-green-50 text-green-700 font-bold";
                      else if (isSelected && !isCorrect) stateClass = "border-red-500 bg-red-50 text-red-700";
                    } else if (isSelected) {
                      stateClass = "border-purple-500 bg-purple-50 text-purple-700 font-bold";
                    }

                    return (
                      <div 
                        key={opt}
                        onClick={() => handleSelectAnswer(q.id, opt)}
                        className={cn(
                          "p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between",
                          stateClass
                        )}
                      >
                        <span>{opt}</span>
                        {showResults && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                        {showResults && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                      </div>
                    );
                  })}
                </div>
                {showResults && (
                  <div className="mt-4 p-4 bg-purple-50 text-purple-900 text-sm rounded-xl border border-purple-100">
                    <span className="font-bold">Giải thích: </span>{q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          {!showResults && (
            <Button 
              onClick={submitAnswers}
              className="w-full mt-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg text-lg"
            >
              Kiểm tra đáp án
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
