import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Mic, Square, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { usePronunciationAssessment } from "../../hooks/usePronunciationAssessment";
import { cn } from "../../lib/utils";
import toastService from "@/src/services/toastService";

const PASS_SCORE = 60;

function toScoreNumber(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

interface CharResult {
  char: string;
  correct: boolean | null;
}

interface WordResult {
  word: string;
  correct: boolean;
  score: number | null;
  chars: CharResult[];
}

function mapPhonemesToChars(word: string, phonemes: { phoneme: string; correct: boolean }[]): CharResult[] {
  const chars = word.split("");
  if (!phonemes.length) return chars.map((c) => ({ char: c, correct: null }));
  return chars.map((c, i) => {
    const idx = Math.min(Math.floor((i / chars.length) * phonemes.length), phonemes.length - 1);
    return { char: c, correct: phonemes[idx].correct };
  });
}

function parseWordsDetail(result: any): WordResult[] {
  if (result?.is_letter_correct_all_words && result?.real_transcripts) {
    const words = String(result.real_transcripts).split(" ");
    const flags = String(result.is_letter_correct_all_words).trim().split(" ");

    return words.map((word, i) => {
      const flagStr = flags[i] || "";
      const chars = word.split("").map((c, j) => ({
        char: c,
        correct: flagStr[j] === "1" ? true : flagStr[j] === "0" ? false : null,
      }));
      const correct = chars.every((c) => c.correct !== false);
      return { word, correct, score: null, chars };
    });
  }

  const nBest = result?.NBest ?? result?.nBest ?? result?.nbest;
  const wordsArray = (Array.isArray(nBest) && nBest[0]?.Words) || (Array.isArray(nBest) && nBest[0]?.words) || result?.Words || result?.words || null;

  if (!Array.isArray(wordsArray) || wordsArray.length === 0) return [];

  return wordsArray.map((w: any) => {
    const wordText: string = w?.Word ?? w?.word ?? w?.text ?? "";
    const pa = w?.PronunciationAssessment ?? w?.pronunciationAssessment ?? w?.assessment ?? {};
    const accuracyRaw = pa?.AccuracyScore ?? pa?.accuracyScore ?? pa?.accuracy ?? w?.AccuracyScore ?? null;
    const score = toScoreNumber(accuracyRaw);
    const errorType: string = (pa?.ErrorType ?? pa?.errorType ?? "").toLowerCase();
    const correct = errorType === "none" || errorType === "" ? score == null || score >= PASS_SCORE : false;

    const phonemesRaw = w?.Phonemes ?? w?.phonemes ?? [];
    const phonemes: { phoneme: string; correct: boolean }[] = Array.isArray(phonemesRaw)
      ? phonemesRaw.map((p: any) => {
          const ppa = p?.PronunciationAssessment ?? p?.pronunciationAssessment ?? p?.assessment ?? {};
          const pScore = toScoreNumber(ppa?.AccuracyScore ?? ppa?.accuracyScore ?? ppa?.accuracy ?? null);
          const pError = (ppa?.ErrorType ?? ppa?.errorType ?? "").toLowerCase();
          const pCorrect = pError === "none" || pError === "" ? pScore == null || pScore >= PASS_SCORE : false;
          return { phoneme: p?.Phoneme ?? p?.phoneme ?? "", correct: pCorrect };
        })
      : [];

    const chars = mapPhonemesToChars(wordText, phonemes);
    return { word: wordText, correct, score, chars };
  });
}

function WordHighlight({ wordResult }: { wordResult: WordResult }) {
  const hasPhonemeData = wordResult.chars.some((c) => c.correct !== null);

  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <span className="text-xl font-black tracking-wide">
        {hasPhonemeData ? (
          wordResult.chars.map((c, i) => (
            <span key={i} className={c.correct === true ? "text-green-500" : c.correct === false ? "text-red-500" : "text-gray-700"}>
              {c.char}
            </span>
          ))
        ) : (
          <span className={wordResult.correct ? "text-green-500" : "text-red-500"}>{wordResult.word}</span>
        )}
      </span>
      <span className={cn("h-0.5 w-full rounded-full", wordResult.correct ? "bg-green-400" : "bg-red-400")} />
    </span>
  );
}

const SPEAKING_DATA: Record<string, { title: string; sentences: string[] }> = {
  "coffee-shop": {
    title: "At the coffee shop",
    sentences: ["I would like a large cappuccino, please.", "Can I have that with oat milk?", "For here, please.", "How much is it in total?"],
  },
  "morning-routine": {
    title: "Morning Routine",
    sentences: ["I usually wake up at seven AM.", "Then I brush my teeth and wash my face.", "I like to have toast and eggs for breakfast.", "I leave for work around half past eight."],
  },
  "meeting-friend": {
    title: "Meeting a new friend",
    sentences: ["Hi, it's so nice to meet you.", "Where are you from?", "What do you like to do in your free time?", "We should hang out sometime."],
  },
  "reading-books": {
    title: "Talking about hobbies",
    sentences: ["I really enjoy reading books on weekends.", "My favorite genre is science fiction.", "What kind of music do you listen to?", "I am also learning how to play the guitar."],
  },
};

export function BeginnerSpeakingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [data, setData] = useState<any>(null);

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
              sentences: taskData.content.dialogues.map((d: any) => d.text),
            };
            setData(mappedData);
          })
          .catch((err) => {
            console.error(err);
            toastService.error("Không tìm thấy bài tập");
          });
      });
    } else {
      setData(SPEAKING_DATA[id] || null);
    }
  }, [id]);

  const currentSentence = data?.sentences?.[currentIndex] || "";

  // Hook for playing reference audio
  const { playAudio: playTTS, isPlaying: isTTSPlaying, isLoading: isTTSLoading } = useTTSAudio();

  // Hook for recording and assessing pronunciation
  const { status, result, mainScore, recordingSeconds, startRecording, stopRecording, resetState } = usePronunciationAssessment({
    targetText: currentSentence,
    passScore: 60,
    onSuccess: (score) => {
      toastService.success(`Bạn đạt ${score} điểm!`);
    },
    onError: (err) => {
      toastService.error("Có lỗi xảy ra khi phân tích: " + err);
    },
  });

  useEffect(() => {
    // Reset assessment state when changing sentence
    resetState();
  }, [currentIndex, resetState]);

  if (!data) {
    return <div className="p-8 text-center">Không tìm thấy bài luyện tập.</div>;
  }

  const handleNext = () => {
    if (currentIndex < data.sentences.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toastService.success("Chúc mừng bạn đã hoàn thành bài luyện nói!");
      navigate("/beginner/speaking");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button
        onClick={() => navigate("/beginner/speaking")}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 bg-transparent shadow-none hover:bg-slate-100 border-none"
      >
        <ArrowLeft className="w-5 h-5" /> Quay lại
      </Button>

      <div className="bg-white rounded-3xl p-8 border-2 border-green-100 shadow-xl w-full text-center">
        <div className="text-sm font-bold text-green-600 uppercase tracking-wider mb-2">{data.title}</div>
        <div className="text-slate-400 text-sm font-medium mb-8">
          Câu {currentIndex + 1} / {data.sentences.length}
        </div>

        <div className="bg-slate-50 rounded-2xl p-8 mb-8 border border-slate-100 min-h-[160px] flex items-center justify-center">
          <h2 className="text-3xl font-black text-slate-800 leading-tight">{currentSentence}</h2>
        </div>

        {/* Results */}
        {(status === "correct" || status === "wrong") && result && (
          <div className="mb-8 p-6 bg-green-50 rounded-2xl border border-green-200 animate-in zoom-in-95">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <span className="text-2xl font-black text-green-700">Điểm: {mainScore}/100</span>
            </div>
            <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-4 px-4 py-6">
              {parseWordsDetail(result).map((wordResult, i) => (
                <WordHighlight key={i} wordResult={wordResult} />
              ))}
            </div>

            <div className="mt-4 flex justify-center gap-5 text-xs text-slate-500 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400" />
                Phát âm đúng
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400" />
                Phát âm sai
              </span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <Button
            disabled={isTTSLoading || isTTSPlaying || status === "recording" || status === "checking"}
            onClick={() => playTTS(currentSentence)}
            className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 border-none flex flex-col items-center justify-center gap-1 transition-all"
          >
            {isTTSLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
          </Button>

          {status === "recording" ? (
            <div className="flex flex-col items-center gap-2">
              <Button
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-red-100 text-red-600 hover:bg-red-200 border-none flex items-center justify-center transition-all animate-pulse shadow-lg shadow-red-200"
              >
                <Square className="w-8 h-8 fill-current" />
              </Button>
              <span className="text-sm font-bold text-red-500">Đang thu: 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
            </div>
          ) : (
            <Button
              disabled={isTTSPlaying || status === "checking"}
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-green-600 text-white hover:bg-green-700 shadow-xl hover:shadow-2xl flex items-center justify-center transition-all disabled:opacity-50"
            >
              <Mic className="w-8 h-8" />
            </Button>
          )}

          <Button
            disabled={!(status === "correct" || status === "wrong")}
            onClick={handleNext}
            className={cn(
              "w-16 h-16 rounded-full flex flex-col items-center justify-center gap-1 transition-all",
              status === "correct" || status === "wrong" ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg" : "bg-slate-100 text-slate-400 cursor-not-allowed",
            )}
          >
            <ArrowLeft className="w-6 h-6 rotate-180" />
          </Button>
        </div>

        {status === "checking" && <p className="text-sm font-bold text-blue-500 mt-6 animate-pulse">Đang phân tích giọng nói...</p>}
      </div>
    </div>
  );
}
