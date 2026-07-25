import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, Rewind, FastForward, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { cn } from "../../lib/utils";
import toastService from "@/src/services/toastService";

const LISTENING_DATA: Record<string, { title: string; desc: string; conversation: any[]; questions: any[] }> = {
  "school-library": {
    title: "At the School Library",
    desc: "Chủ đề: Tại thư viện trường. Lắng nghe và trả lời câu hỏi bên dưới.",
    conversation: [
      { id: 1, speaker: "School librarian", text: "Hello, what's your name?", voice: "en-US-SteffanNeural" },
      { id: 2, speaker: "Lucy", text: "My name's Lucy.", voice: "en-GB-SoniaNeural" },
      { id: 3, speaker: "School librarian", text: "And what's your surname, Lucy?", voice: "en-US-SteffanNeural" },
      { id: 4, speaker: "Lucy", text: "It's Moore.", voice: "en-GB-SoniaNeural" },
      { id: 5, speaker: "School librarian", text: "Can you spell that?", voice: "en-US-SteffanNeural" },
      { id: 6, speaker: "Lucy", text: "M-O-O-R-E.", voice: "en-GB-SoniaNeural" },
      { id: 7, speaker: "School librarian", text: "Thank you. What class are you in?", voice: "en-US-SteffanNeural" },
      { id: 8, speaker: "Lucy", text: "Class 1B.", voice: "en-GB-SoniaNeural" },
    ],
    questions: [
      { id: 1, question: "What is the girl's name?", options: ["Lily", "Lucy", "Linda"], correctAnswer: "Lucy", explanation: "Cô gái trả lời: 'My name's Lucy'." },
      { id: 2, question: "What is her surname?", options: ["More", "Moore", "Moor"], correctAnswer: "Moore", explanation: "Họ của cô ấy là Moore (đánh vần là M-O-O-R-E)." },
      { id: 3, question: "What class is she in?", options: ["1A", "1B", "1C"], correctAnswer: "1B", explanation: "Cô gái nói: 'Class 1B'." },
    ],
  },
  "cafe-order": {
    title: "Ordering Coffee",
    desc: "Chủ đề: Tại quán cà phê. Lắng nghe và trả lời câu hỏi bên dưới.",
    conversation: [
      { id: 1, speaker: "Barista", text: "Hi, what can I get for you today?", voice: "en-US-SteffanNeural" },
      { id: 2, speaker: "Customer", text: "I'd like a medium iced latte, please.", voice: "en-GB-SoniaNeural" },
      { id: 3, speaker: "Barista", text: "Sure. Would you like any syrup in that?", voice: "en-US-SteffanNeural" },
      { id: 4, speaker: "Customer", text: "Yes, vanilla syrup, please.", voice: "en-GB-SoniaNeural" },
      { id: 5, speaker: "Barista", text: "That will be $4.50. Cash or card?", voice: "en-US-SteffanNeural" },
      { id: 6, speaker: "Customer", text: "Card, please.", voice: "en-GB-SoniaNeural" },
    ],
    questions: [
      {
        id: 1,
        question: "What does the customer order?",
        options: ["A hot latte", "A medium iced latte", "A hot tea"],
        correctAnswer: "A medium iced latte",
        explanation: "Khách hàng nói: 'I'd like a medium iced latte, please.'",
      },
      { id: 2, question: "What syrup do they want?", options: ["Caramel", "Vanilla", "Hazelnut"], correctAnswer: "Vanilla", explanation: "Khách hàng chọn 'vanilla syrup'." },
      { id: 3, question: "How will they pay?", options: ["Cash", "Card", "Apple Pay"], correctAnswer: "Card", explanation: "Khách hàng trả bằng 'Card'." },
    ],
  },
  "new-student": {
    title: "The New Student",
    desc: "Chủ đề: Học sinh mới trong lớp. Lắng nghe và trả lời câu hỏi bên dưới.",
    conversation: [
      { id: 1, speaker: "Tom", text: "Hi, are you new here?", voice: "en-US-SteffanNeural" },
      { id: 2, speaker: "Anna", text: "Yes, I just moved here last week.", voice: "en-GB-SoniaNeural" },
      { id: 3, speaker: "Tom", text: "Nice to meet you. I'm Tom. What's your name?", voice: "en-US-SteffanNeural" },
      { id: 4, speaker: "Anna", text: "I'm Anna. Where is the science lab?", voice: "en-GB-SoniaNeural" },
      { id: 5, speaker: "Tom", text: "It's on the second floor, next to the library. I can show you.", voice: "en-US-SteffanNeural" },
      { id: 6, speaker: "Anna", text: "Thank you so much!", voice: "en-GB-SoniaNeural" },
    ],
    questions: [
      { id: 1, question: "When did Anna move here?", options: ["Last month", "Yesterday", "Last week"], correctAnswer: "Last week", explanation: "Anna nói: 'I just moved here last week.'" },
      { id: 2, question: "Where is the science lab?", options: ["First floor", "Second floor", "Third floor"], correctAnswer: "Second floor", explanation: "Tom nói: 'It's on the second floor'." },
      { id: 3, question: "What is next to the science lab?", options: ["Library", "Cafeteria", "Gym"], correctAnswer: "Library", explanation: "Tom mô tả lab nằm 'next to the library'." },
    ],
  },
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

export function BeginnerListeningDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const data = id ? LISTENING_DATA[id] : null;

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!data) return;
    let isActive = true;

    const loadAudio = async () => {
      setIsLoadingAudio(true);
      try {
        const blobPromises = data.conversation.map(async (line) => {
          const res = await fetch(`https://python.zentask.io.vn/edge-tts-stream?text=${encodeURIComponent(line.text)}&voice=${encodeURIComponent(line.voice)}`);
          if (!res.ok) throw new Error("Audio fetch failed");
          return await res.blob();
        });

        const blobs = await Promise.all(blobPromises);
        if (!isActive) return;

        const combinedBlob = new Blob(blobs, { type: "audio/mpeg" });
        const url = URL.createObjectURL(combinedBlob);
        setAudioUrl(url);

        if (audioRef.current) {
          audioRef.current.load();
        }
      } catch (err) {
        console.error(err);
        if (isActive) toastService.error("Không thể tải audio.");
      } finally {
        if (isActive) setIsLoadingAudio(false);
      }
    };
    loadAudio();

    return () => {
      isActive = false;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [id]);

  if (!data) {
    return <div className="p-8 text-center">Không tìm thấy bài luyện tập.</div>;
  }

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (amount: number) => {
    if (!audioRef.current || !audioUrl) return;
    audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + amount, duration));
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioUrl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pos * duration;
  };

  const handleSelectAnswer = (qId: number, option: string) => {
    if (showResults) return;
    setAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  const submitAnswers = () => {
    if (Object.keys(answers).length < data.questions.length) {
      toastService.error("Vui lòng trả lời hết tất cả câu hỏi trước khi nộp!");
      return;
    }
    setShowResults(true);
    const correctCount = data.questions.filter((q) => q.correctAnswer === answers[q.id]).length;
    if (correctCount === data.questions.length) {
      toastService.success("Tuyệt vời! Bạn đã trả lời đúng tất cả.");
    } else {
      toastService.info(`Bạn trả lời đúng ${correctCount}/${data.questions.length} câu.`);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button
        onClick={() => navigate("/beginner/listening")}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 bg-transparent shadow-none hover:bg-slate-100 border-none"
      >
        <ArrowLeft className="w-5 h-5" /> Quay lại
      </Button>

      <div className="bg-white rounded-3xl p-8 border-2 border-indigo-100 shadow-xl w-full">
        <h1 className="text-3xl font-black text-slate-800 mb-2">Bài luyện nghe: {data.title}</h1>
        <p className="text-slate-500 mb-8">{data.desc}</p>

        {/* Audio Player */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-8">
          <audio
            ref={audioRef}
            src={audioUrl || ""}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onEnded={() => setIsPlaying(false)}
          />

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-4">
              <Button
                disabled={isLoadingAudio}
                onClick={() => handleSeek(-5)}
                className="w-12 h-12 rounded-full bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-all disabled:opacity-50"
              >
                <Rewind className="w-5 h-5" />
              </Button>

              <Button
                disabled={isLoadingAudio}
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl flex items-center justify-center transition-all disabled:opacity-50"
              >
                {isLoadingAudio ? <Loader2 className="w-6 h-6 animate-spin" /> : isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </Button>

              <Button
                disabled={isLoadingAudio}
                onClick={() => handleSeek(5)}
                className="w-12 h-12 rounded-full bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-all disabled:opacity-50"
              >
                <FastForward className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 w-full flex flex-col gap-2">
              <div className="w-full h-3 bg-slate-200 rounded-full cursor-pointer overflow-hidden" onClick={handleProgressClick}>
                <div className="h-full bg-indigo-500 transition-all duration-100 ease-linear" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {isLoadingAudio && <p className="text-center text-sm font-bold text-indigo-500 mt-4 animate-pulse">Đang tải audio... Vui lòng đợi.</p>}
        </div>

        {/* Transcript */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Nội dung (Transcript)</h2>
          <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50 space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
            {data.conversation.map((line) => (
              <div key={line.id} className="flex gap-3">
                <span className="font-bold text-indigo-900 whitespace-nowrap">{line.speaker}:</span>
                <span className="text-slate-700">{line.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Questions */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-6">Câu hỏi trắc nghiệm</h2>
          <div className="space-y-8">
            {data.questions.map((q, index) => (
              <div key={q.id} className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <h3 className="font-bold text-lg text-slate-800 mb-4">
                  Câu {index + 1}: {q.question}
                </h3>
                <div className="space-y-3">
                  {q.options.map((opt: string) => {
                    const isSelected = answers[q.id] === opt;
                    const isCorrect = q.correctAnswer === opt;
                    let stateClass = "border-slate-200 bg-white hover:border-indigo-300";

                    if (showResults) {
                      if (isCorrect) stateClass = "border-green-500 bg-green-50 text-green-700 font-bold";
                      else if (isSelected && !isCorrect) stateClass = "border-red-500 bg-red-50 text-red-700";
                    } else if (isSelected) {
                      stateClass = "border-indigo-500 bg-indigo-50 text-indigo-700 font-bold";
                    }

                    return (
                      <div
                        key={opt}
                        onClick={() => handleSelectAnswer(q.id, opt)}
                        className={cn("p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between", stateClass)}
                      >
                        <span>{opt}</span>
                        {showResults && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                        {showResults && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                      </div>
                    );
                  })}
                </div>
                {showResults && (
                  <div className="mt-4 p-4 bg-indigo-50 text-indigo-900 text-sm rounded-xl border border-indigo-100">
                    <span className="font-bold">Giải thích: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          {!showResults && (
            <Button onClick={submitAnswers} className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg text-lg">
              Kiểm tra đáp án
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
