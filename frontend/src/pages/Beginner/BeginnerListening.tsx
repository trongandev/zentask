import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, Rewind, FastForward, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { cn } from "../../lib/utils";
import toastService from "@/src/services/toastService";

const CONVERSATION = [
  { id: 1, speaker: "School librarian", text: "Hello, what's your name?", voice: "en-US-SteffanNeural" },
  { id: 2, speaker: "Lucy", text: "My name's Lucy.", voice: "en-GB-SoniaNeural" },
  { id: 3, speaker: "School librarian", text: "And what's your surname, Lucy?", voice: "en-US-SteffanNeural" },
  { id: 4, speaker: "Lucy", text: "It's Moore.", voice: "en-GB-SoniaNeural" },
  { id: 5, speaker: "School librarian", text: "Can you spell that?", voice: "en-US-SteffanNeural" },
  { id: 6, speaker: "Lucy", text: "M-O-O-R-E.", voice: "en-GB-SoniaNeural" },
  { id: 7, speaker: "School librarian", text: "Thank you. What class are you in?", voice: "en-US-SteffanNeural" },
  { id: 8, speaker: "Lucy", text: "Class 1B.", voice: "en-GB-SoniaNeural" },
];

const QUESTIONS = [
  {
    id: 1,
    question: "What is the girl's name?",
    options: ["Lily", "Lucy", "Linda"],
    correctAnswer: "Lucy",
    explanation: "Cô gái trả lời: 'My name's Lucy'.",
  },
  {
    id: 2,
    question: "What is her surname?",
    options: ["More", "Moore", "Moor"],
    correctAnswer: "Moore",
    explanation: "Họ của cô ấy là Moore (đánh vần là M-O-O-R-E).",
  },
  {
    id: 3,
    question: "What class is she in?",
    options: ["1A", "1B", "1C"],
    correctAnswer: "1B",
    explanation: "Cô gái nói: 'Class 1B'.",
  },
];

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

export function BeginnerListening() {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const loadAudio = async () => {
      setIsLoadingAudio(true);
      try {
        // Fetch all audio chunks in parallel (Edge-TTS from Python Backend)
        const blobPromises = CONVERSATION.map(async (line) => {
          const res = await fetch(`https://python.zentask.io.vn/edge-tts-stream?text=${encodeURIComponent(line.text)}&voice=${encodeURIComponent(line.voice)}`);
          if (!res.ok) throw new Error("Audio fetch failed");
          return await res.blob();
        });

        const blobs = await Promise.all(blobPromises);
        const combinedBlob = new Blob(blobs, { type: "audio/mpeg" });
        const url = URL.createObjectURL(combinedBlob);
        setAudioUrl(url);

        // Auto-play when ready
        if (audioRef.current) {
          audioRef.current.load();
        }
      } catch (err) {
        console.error(err);
        toastService.error("Không thể tải audio.");
      } finally {
        setIsLoadingAudio(false);
      }
    };
    loadAudio();

    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

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
    if (Object.keys(answers).length < QUESTIONS.length) {
      toastService.error("Vui lòng trả lời hết tất cả câu hỏi trước khi nộp!");
      return;
    }
    setShowResults(true);
    const correctCount = QUESTIONS.filter((q) => q.correctAnswer === answers[q.id]).length;
    if (correctCount === QUESTIONS.length) {
      toastService.success("Tuyệt vời! Bạn đã trả lời đúng tất cả.");
    } else {
      toastService.info(`Bạn trả lời đúng ${correctCount}/${QUESTIONS.length} câu.`);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button
        onClick={() => navigate("/beginner/skills")}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 bg-transparent shadow-none hover:bg-slate-100 border-none"
      >
        <ArrowLeft className="w-5 h-5" /> Quay lại
      </Button>

      <div className="bg-white rounded-3xl p-8 border-2 border-indigo-100 shadow-xl w-full">
        <h1 className="text-3xl font-black text-slate-800 mb-2">Bài luyện nghe: Daily Life</h1>
        <p className="text-slate-500 mb-8">Chủ đề: Tại thư viện trường. Lắng nghe và trả lời câu hỏi bên dưới.</p>

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

          {isLoadingAudio && <p className="text-center text-sm font-bold text-indigo-500 mt-4 animate-pulse">Đang tải audio từ server (Streaming)... Vui lòng đợi.</p>}
        </div>

        {/* Transcript (Optional) */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Nội dung (Transcript)</h2>
          <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50 space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
            {CONVERSATION.map((line) => (
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
            {QUESTIONS.map((q, index) => (
              <div key={q.id} className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <h3 className="font-bold text-lg text-slate-800 mb-4">
                  Câu {index + 1}: {q.question}
                </h3>
                <div className="space-y-3">
                  {q.options.map((opt) => {
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
