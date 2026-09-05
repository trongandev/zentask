import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { cn } from "../../../lib/utils";
import toastService from "@/src/services/toastService";

const READING_DATA: Record<string, { title: string; content: string; questions: any[] }> = {
  "my-daily-routine": {
    title: "My Daily Routine",
    content:
      "Every morning, I wake up at 7 AM. First, I brush my teeth and wash my face. Then, I have breakfast. I usually eat toast and drink a cup of coffee. After breakfast, I get dressed and leave for work at 8 AM. I take the bus to my office. My work starts at 9 AM and finishes at 5 PM. In the evening, I like to relax by watching TV or reading a book. Finally, I go to bed at 11 PM.",
    questions: [
      {
        id: 1,
        question: "What time does the person wake up?",
        options: ["6 AM", "7 AM", "8 AM"],
        correctAnswer: "7 AM",
        explanation: "Bài đọc có câu: 'I wake up at 7 AM'.",
      },
      {
        id: 2,
        question: "How do they go to work?",
        options: ["By car", "By train", "By bus"],
        correctAnswer: "By bus",
        explanation: "Bài đọc ghi: 'I take the bus to my office'.",
      },
      {
        id: 3,
        question: "What do they usually eat for breakfast?",
        options: ["Toast and coffee", "Eggs and milk", "Cereal"],
        correctAnswer: "Toast and coffee",
        explanation: "Bài đọc ghi: 'I usually eat toast and drink a cup of coffee'.",
      },
    ],
  },
  "favorite-weekend": {
    title: "My Favorite Weekend",
    content:
      "Weekends are my favorite time of the week. On Saturday morning, I sleep in until 9 AM. I don't have to work, so I can relax. I usually go to the park with my dog, Buster. We walk for an hour and play fetch. In the afternoon, I meet my friends for lunch at a small cafe. On Sunday, I clean my house and do the laundry. In the evening, I prepare my clothes and bag for Monday.",
    questions: [
      {
        id: 1,
        question: "What time do they wake up on Saturday?",
        options: ["7 AM", "9 AM", "10 AM"],
        correctAnswer: "9 AM",
        explanation: "Bài đọc ghi: 'On Saturday morning, I sleep in until 9 AM'.",
      },
      {
        id: 2,
        question: "Who is Buster?",
        options: ["A friend", "A cat", "A dog"],
        correctAnswer: "A dog",
        explanation: "Bài đọc ghi: 'I usually go to the park with my dog, Buster'.",
      },
      {
        id: 3,
        question: "What do they do on Sunday?",
        options: ["Go to the park", "Clean the house and do laundry", "Meet friends"],
        correctAnswer: "Clean the house and do laundry",
        explanation: "Bài đọc ghi: 'On Sunday, I clean my house and do the laundry'.",
      },
    ],
  },
  "the-coffee-shop": {
    title: "The Coffee Shop",
    content:
      "There is a small coffee shop near my house called 'Green Bean'. It is very cozy and quiet. I go there every Sunday morning. The walls are painted green, and there are many beautiful plants. I always order a hot latte and a slice of chocolate cake. I like to sit by the window and watch people walking on the street. The staff is very friendly and they always remember my name.",
    questions: [
      {
        id: 1,
        question: "What is the name of the coffee shop?",
        options: ["Red Bean", "Green Bean", "Blue Bean"],
        correctAnswer: "Green Bean",
        explanation: "Bài đọc ghi: 'called Green Bean'.",
      },
      {
        id: 2,
        question: "What do they always order?",
        options: ["Hot latte and chocolate cake", "Iced coffee and a sandwich", "Tea and cookies"],
        correctAnswer: "Hot latte and chocolate cake",
        explanation: "Bài đọc ghi: 'I always order a hot latte and a slice of chocolate cake'.",
      },
      {
        id: 3,
        question: "Where do they like to sit?",
        options: ["Near the door", "In the corner", "By the window"],
        correctAnswer: "By the window",
        explanation: "Bài đọc ghi: 'I like to sit by the window'.",
      },
    ],
  },
};

export function BeginnerReadingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!id) return;
    if (id.length === 24) {
      import("@/src/services/axiosConfig").then(({ default: axiosInstance }) => {
        axiosInstance
          .get(`/api/beginner/skill-task/${id}`)
          .then((res) => {
            const taskData = res.data.task;
            const mappedData = {
              title: taskData.content.topic?.en || taskData.topic,
              content: taskData.content.passage,
              questions: taskData.content.questions.map((q: any, i: number) => ({
                id: i + 1,
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
              })),
            };
            setData(mappedData);
          })
          .catch((err) => {
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

  const currentQuestion = data.questions?.[currentQuestionIndex];

  const handleSelectOption = (option: string) => {
    if (isAnswerChecked || isFinished) return;
    setSelectedOption(option);
  };

  const handleCheckAnswer = () => {
    if (!selectedOption) return;
    setIsAnswerChecked(true);
    if (selectedOption === currentQuestion.correctAnswer) {
      setCorrectCount((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < data.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerChecked(false);
    } else {
      setIsFinished(true);
      if (id && id.length === 24) {
        import("@/src/services/axiosConfig").then(({ default: axiosInstance }) => {
          axiosInstance.post(`/api/beginner/skill-task/${id}/complete`).catch(console.error);
        });
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button
        onClick={() => navigate("/beginner/reading")}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 bg-transparent shadow-none hover:bg-slate-100 border-none"
      >
        <ArrowLeft className="w-5 h-5" /> Quay lại
      </Button>

      <div className="bg-white rounded-3xl p-8 border-2 border-purple-100 shadow-xl w-full">
        <h1 className="text-3xl font-black text-slate-800 mb-2">{data.title}</h1>
        <p className="text-slate-500 mb-8">Hãy đọc đoạn văn sau và trả lời các câu hỏi bên dưới.</p>

        {/* Text Content */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-10 leading-relaxed text-lg text-slate-800">{data.content}</div>

        {/* Questions - Step by step */}
        <div>
          {isFinished ? (
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 text-center animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-4">Hoàn thành bài tập!</h2>
              <p className="text-xl text-slate-600 mb-8">
                Bạn đã trả lời đúng <span className="font-black text-purple-600">{correctCount}</span> / {data.questions.length} câu hỏi.
              </p>
              <Button onClick={() => navigate("/beginner/reading")} className="px-10 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg text-lg">
                Quay lại danh sách
              </Button>
            </div>
          ) : (
            currentQuestion && (
              <div className="bg-slate-50 rounded-2xl p-6 md:p-8 border border-slate-200 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800">Câu hỏi trắc nghiệm</h2>
                  <span className="text-sm font-bold text-slate-400 bg-slate-200 px-3 py-1 rounded-full">
                    Câu {currentQuestionIndex + 1} / {data.questions.length}
                  </span>
                </div>
                
                <h3 className="font-bold text-xl md:text-2xl text-slate-800 mb-6 leading-relaxed">
                  {currentQuestion.question}
                </h3>
                <div className="space-y-4 mb-8">
                  {currentQuestion.options.map((opt: string) => {
                    const isSelected = selectedOption === opt;
                    const isCorrect = currentQuestion.correctAnswer === opt;
                    let stateClass = "border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50";

                    if (isAnswerChecked) {
                      if (isCorrect) stateClass = "border-green-500 bg-green-50 text-green-700 font-bold";
                      else if (isSelected && !isCorrect) stateClass = "border-red-500 bg-red-50 text-red-700";
                    } else if (isSelected) {
                      stateClass = "border-purple-500 bg-purple-50 text-purple-700 font-bold";
                    }

                    return (
                      <div
                        key={opt}
                        onClick={() => handleSelectOption(opt)}
                        className={cn("p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group", stateClass)}
                      >
                        <span className="text-base md:text-lg">{opt}</span>
                        {isAnswerChecked && isCorrect && <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />}
                        {isAnswerChecked && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />}
                        {!isAnswerChecked && !isSelected && <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-purple-300 flex-shrink-0" />}
                        {!isAnswerChecked && isSelected && <div className="w-5 h-5 rounded-full border-[6px] border-purple-600 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
                
                {isAnswerChecked && currentQuestion.explanation && (
                  <div className="mb-8 p-5 bg-purple-50 text-purple-900 rounded-xl border border-purple-100 animate-in fade-in zoom-in-95">
                    <span className="font-black text-purple-700 block mb-1">Giải thích: </span>
                    <span className="text-sm md:text-base leading-relaxed">{currentQuestion.explanation}</span>
                  </div>
                )}

                {!isAnswerChecked ? (
                  <Button
                    disabled={!selectedOption}
                    onClick={handleCheckAnswer}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg text-lg disabled:opacity-50 transition-all"
                  >
                    Kiểm tra đáp án
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextQuestion}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg text-lg animate-bounce-slow"
                  >
                    Tiếp tục
                  </Button>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
