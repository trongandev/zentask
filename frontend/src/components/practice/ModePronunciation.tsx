import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, Loader2, Mic, MicOff, Play, RotateCw, Volume2, ArrowLeft } from "lucide-react";
import toastService from "@/src/services/toastService";
import { Flashcard } from "../../services/flashcardService";
import { pronunciationService } from "../../services/pronunciationService";
import { cn } from "../../lib/utils";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";
import { Button } from "@/src/components/ui/Button";
import { useNavigate } from "react-router-dom";

interface ModePronunciationProps {
  cards: Flashcard[];
  setId: string;
  onComplete?: (wrongCardIds: string[]) => void;
  completionActions?: React.ReactNode;
}

type PronunciationStatus = "idle" | "recording" | "checking" | "correct" | "wrong";

const PASS_SCORE = 70;
const MIN_RECORDING_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeWebmDataUrl(value: string) {
  const raw = String(value || "")
    .trim()
    .replace(/\s+/g, "");
  const commaIndex = raw.indexOf(",");
  if (commaIndex === -1) return raw;
  const body = raw.slice(commaIndex + 1);
  return `data:audio/webm;base64,${body}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Không đọc được ghi âm."));
    reader.readAsDataURL(blob);
  });
}

function walkValues(value: any, visit: (key: string, value: any) => void, key = "") {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkValues(item, visit, `${key}.${index}`));
    return;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) => {
      visit(childKey, childValue);
      walkValues(childValue, visit, childKey);
    });
  }
}

function toScoreNumber(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function pickScore(result: any) {
  const preferredKeys = ["pronunciationscore", "pronunciationscorepercent", "accuracyscore", "accuracy", "score"];
  const found: Array<{ key: string; value: number }> = [];

  walkValues(result, (key, value) => {
    const num = toScoreNumber(value);
    if (num == null) return;
    const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
    if (preferredKeys.some((candidate) => normalized.includes(candidate))) {
      found.push({ key: normalized, value: Math.max(0, Math.min(100, num)) });
    }
  });

  for (const candidate of preferredKeys) {
    const matched = found.find((item) => item.key.includes(candidate));
    if (matched) return matched.value;
  }
  return null;
}

function pickMetric(result: any, names: string[]) {
  let answer: number | null = null;
  walkValues(result, (key, value) => {
    if (answer != null) return;
    const num = toScoreNumber(value);
    if (num == null) return;
    const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
    if (names.some((name) => normalized.includes(name))) {
      answer = Math.max(0, Math.min(100, num));
    }
  });
  return answer;
}

function pickText(result: any, names: string[]) {
  let answer = "";
  walkValues(result, (key, value) => {
    if (answer || typeof value !== "string") return;
    const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
    if (names.some((name) => normalized.includes(name))) {
      answer = value;
    }
  });
  return answer;
}

interface CharResult {
  char: string;
  correct: boolean | null; // null = no phoneme data
}

interface WordResult {
  word: string;
  correct: boolean;
  score: number | null;
  chars: CharResult[];
}

/** Map phoneme scores proportionally onto each character of the word. */
function mapPhonemesToChars(word: string, phonemes: { phoneme: string; correct: boolean }[]): CharResult[] {
  const chars = word.split("");
  if (!phonemes.length) return chars.map((c) => ({ char: c, correct: null }));
  return chars.map((c, i) => {
    const idx = Math.min(Math.floor((i / chars.length) * phonemes.length), phonemes.length - 1);
    return { char: c, correct: phonemes[idx].correct };
  });
}

function pickWords(result: any): WordResult[] {
  // Support custom backend format
  if (result?.is_letter_correct_all_words && result?.real_transcripts) {
    const words = String(result.real_transcripts).split(" ");
    const flags = String(result.is_letter_correct_all_words).trim().split(" ");
    
    return words.map((word, i) => {
      const flagStr = flags[i] || "";
      const chars = word.split("").map((c, j) => ({
        char: c,
        correct: flagStr[j] === "1" ? true : flagStr[j] === "0" ? false : null
      }));
      const correct = chars.every(c => c.correct !== false);
      return { word, correct, score: null, chars };
    });
  }

  // Try NBest[].Words[] (Azure SDK shape)
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

    // Extract phoneme-level data
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

/** Renders a word with each character colored by its phoneme correctness. */
function WordHighlight({ wordResult }: { wordResult: WordResult }) {
  const hasPhonemeData = wordResult.chars.some((c) => c.correct !== null);

  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <span className="text-2xl font-black tracking-wide">
        {hasPhonemeData ? (
          wordResult.chars.map((c, i) => (
            <span key={i} className={c.correct === true ? "text-green-500" : c.correct === false ? "text-red-500" : "text-slate-700"}>
              {c.char}
            </span>
          ))
        ) : (
          <span className={wordResult.correct ? "text-green-500" : "text-red-500"}>{wordResult.word}</span>
        )}
      </span>
      {/* tiny underline bar for quick scan */}
      <span className={`h-1 w-full rounded-full ${wordResult.correct ? "bg-green-400" : "bg-red-400"}`} />
    </span>
  );
}

export function ModePronunciation({ cards, setId, onComplete, completionActions }: ModePronunciationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [status, setStatus] = useState<PronunciationStatus>("idle");
  const [result, setResult] = useState<any>(null);
  const [mainScore, setMainScore] = useState<number | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (audioUrl) {
      return () => URL.revokeObjectURL(audioUrl);
    }
  }, [audioUrl]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number>(0);
  const cardStartTime = useRef<number>(Date.now());
  const wrongCardIdsRef = useRef<string[]>([]);

  const { playAudio, playSoundEffect, isLoading: ttsLoading } = useTTSAudio();
  const { reportCorrect, reportWrong, flushProgress } = useSM2(setId);

  const currentCard = cards[currentIndex];
  const accuracy = pickMetric(result, ["accuracyscore", "accuracy"]);
  const fluency = pickMetric(result, ["fluencyscore", "fluency"]);
  const completeness = pickMetric(result, ["completenessscore", "completeness"]);
  const recognizedText = pickText(result, ["recognizedtext", "displaytext", "transcript", "text"]);

  useEffect(() => {
    cardStartTime.current = Date.now();
    setResult(null);
    setMainScore(null);
    setStatus("idle");
    setRecordingSeconds(0);
    setAudioUrl(null);
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!currentCard || status === "checking") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toastService.error("Trình duyệt này chưa hỗ trợ ghi âm.");
      return;
    }

    try {
      setResult(null);
      setMainScore(null);
      setRecordingSeconds(0);
      setAudioUrl(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      if (!mimeType) {
        stream.getTracks().forEach((track) => track.stop());
        toastService.error("Trình duyệt này chưa hỗ trợ ghi âm WebM. Hãy dùng Chrome hoặc Edge.");
        return;
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        toastService.error("Micro bị lỗi khi ghi âm. Hãy thử ghi âm lại.");
        stopTimer();
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        setStatus("idle");
      };

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stopTimer();
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;

        try {
          // Give the browser a tiny moment to flush the last dataavailable chunk.
          await sleep(120);

          // Force Data URL prefix to match the required API payload: data:audio/webm;base64,...
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          if (!blob.size) throw new Error("Không có dữ liệu ghi âm. Hãy cho phép micro và đọc lại rõ hơn.");

          setStatus("checking");
          const dataUrl = await blobToDataUrl(blob);
          const base64Audio = normalizeWebmDataUrl(dataUrl);

          const response = await pronunciationService.assess({
            title: String(currentCard.term || "")
              .trim()
              .toLowerCase(),
            base64Audio,
            language: "en",
          });

          const nextResult = response.result;
          const nextScore = pickScore(nextResult);
          setResult(nextResult);
          setMainScore(nextScore);

          const passed = (nextScore ?? 0) >= PASS_SCORE;
          setStatus(passed ? "correct" : "wrong");
          playSoundEffect(passed ? "correct" : "wrong");
          setAudioUrl(URL.createObjectURL(blob));
        } catch (error: any) {
          console.error("Pronunciation check error:", error);
          setStatus("idle");
          toastService.error(error?.message || "Không chấm được phát âm.");
        }
      };

      recordingStartedAtRef.current = Date.now();
      recorder.start(250);
      setStatus("recording");
      timerRef.current = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    } catch (error: any) {
      console.error("Start recording error:", error);
      setStatus("idle");
      toastService.error("Không mở được micro. Hãy kiểm tra quyền truy cập micro của trình duyệt.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    const elapsedMs = Date.now() - recordingStartedAtRef.current;
    if (elapsedMs < MIN_RECORDING_MS) {
      toastService.error("Hãy ghi âm tối thiểu 0.5 giây rồi mới chấm điểm.");
      return;
    }
    try {
      recorder.requestData();
    } catch {}
    recorder.stop();
  };

  const retryCurrent = () => {
    if (status === "recording") stopRecording();
    setResult(null);
    setMainScore(null);
    setRecordingSeconds(0);
    setAudioUrl(null);
    setStatus("idle");
  };

  const goNext = () => {
    if (!currentCard || (status !== "correct" && status !== "wrong")) return;
    const responseMs = Date.now() - cardStartTime.current;
    const passed = status === "correct";
    let nextWrongIds = wrongCardIdsRef.current;

    if (passed) {
      reportCorrect(currentCard.id, "pronunciation", currentCard.term, responseMs);
    } else {
      reportWrong(currentCard.id, "pronunciation");
      nextWrongIds = nextWrongIds.includes(currentCard.id) ? nextWrongIds : [...nextWrongIds, currentCard.id];
      wrongCardIdsRef.current = nextWrongIds;
      setWrongCardIds(nextWrongIds);
    }

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((value) => value + 1);
    } else {
      flushProgress();
      onComplete?.(nextWrongIds);
      setCompleted(true);
    }
  };

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 w-full">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] border-2 border-slate-200/60 shadow-xl shadow-slate-200/50 flex flex-col items-center max-w-lg w-full">
          <div className="w-24 h-24 bg-green-100 rounded-[2rem] flex items-center justify-center mb-6 rotate-3 border-2 border-green-200">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Phát âm rất tốt!</h2>
          <p className="text-slate-500 mb-8 font-bold">Bạn đã hoàn thành bài luyện phát âm.</p>
          <Button
            onClick={() => {
              setCompleted(false);
              setCurrentIndex(0);
              setWrongCardIds([]);
              wrongCardIdsRef.current = [];
              setResult(null);
              setMainScore(null);
              setAudioUrl(null);
              setStatus("idle");
            }}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl border-2 border-blue-600 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2 mb-3"
          >
            <RotateCw className="w-5 h-5" />
            Luyện phát âm lại
          </Button>
          <Button 
            onClick={() => navigate(-1)}
            className="w-full py-4 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-2xl border-2 border-slate-200 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay về
          </Button>
          {completionActions && <div className="mt-4 w-full">{completionActions}</div>}
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="w-full max-w-3xl flex flex-col items-center justify-center">
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <span className="text-slate-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border-2 border-slate-100">
          Câu {currentIndex + 1} / {cards.length}
        </span>
        <div className="flex-1 ml-6 mr-6 h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-200/50">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}></div>
        </div>
        <span className="rounded-xl bg-blue-50 border-2 border-blue-100 px-4 py-2 text-sm font-bold text-blue-600 whitespace-nowrap">Đạt từ {PASS_SCORE} điểm</span>
      </div>

      <div
        className={cn(
          "w-full bg-white rounded-[2rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border-2 mb-8 relative transition-colors duration-300",
          status === "correct" ? "border-green-500 bg-green-50/50" : status === "wrong" ? "border-red-500 bg-red-50/50" : "border-slate-200/60",
        )}
      >
        <div className="text-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">Hãy phát âm từ này</p>
          <h2 className="break-words text-5xl md:text-6xl font-black text-slate-900 tracking-tight">{currentCard.term}</h2>
          {currentCard.phonetic && <p className="mt-4 text-2xl font-mono font-bold text-blue-500">{currentCard.phonetic}</p>}
          <p className="mt-4 text-xl font-bold text-slate-500">{currentCard.translation}</p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              onClick={() => playAudio(currentCard.term)}
              disabled={ttsLoading || status === "recording" || status === "checking"}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-50 border-2 border-blue-100 border-b-4 active:border-b-2 active:translate-y-[2px] px-6 py-4 font-bold text-blue-600 transition-all hover:bg-blue-100 disabled:opacity-50"
            >
              {ttsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Volume2 className="h-6 w-6" />}
              {ttsLoading ? "Đang phát..." : "Nghe mẫu"}
            </Button>

            {status === "recording" ? (
              <Button
                onClick={stopRecording}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 border-2 border-red-600 border-b-4 active:border-b-2 active:translate-y-[2px] px-8 py-4 font-bold text-white transition-all hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/30"
              >
                <MicOff className="h-6 w-6" />
                Dừng & chấm điểm {recordingSeconds}s
              </Button>
            ) : (
              <Button
                onClick={startRecording}
                disabled={status === "checking"}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 border-2 border-blue-700 border-b-4 active:border-b-2 active:translate-y-[2px] px-8 py-4 font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {status === "checking" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Mic className="h-6 w-6" />}
                {status === "checking" ? "Đang chấm điểm..." : result ? "Ghi âm lại" : "Bắt đầu ghi âm"}
              </Button>
            )}
          </div>

          <p className="mt-6 text-sm text-slate-400 font-medium">
            Nhấn <strong className="text-slate-600">Bắt đầu ghi âm</strong>, đọc to rõ ràng, rồi nhấn <strong className="text-slate-600">Dừng & chấm điểm</strong>.
          </p>
        </div>

        {result &&
          (() => {
            const wordResults = pickWords(result);
            return (
              <div className="mt-10 rounded-3xl border-2 border-slate-100 bg-slate-50 p-6 md:p-8 text-left shadow-inner">
                {/* Header: score badge + status */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b-2 border-slate-200/50 pb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Kết quả phát âm</h3>
                    <p className="text-sm font-bold mt-1 text-slate-500">{status === "correct" ? "✅ Bạn phát âm đạt yêu cầu!" : "❌ Chưa đạt — hãy thử lại hoặc chuyển câu tiếp."}</p>
                  </div>
                  <div className={cn("rounded-2xl px-6 py-4 text-center font-black text-3xl border-2 shadow-sm", status === "correct" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200")}>
                    {mainScore != null ? `${Math.round(mainScore)}` : "—"}<span className="text-lg opacity-70">/100</span>
                  </div>
                </div>

                {/* Character-level feedback */}
                {wordResults.length > 0 ? (
                  <div>
                    <p className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Đánh giá từng chữ cái</p>
                    <div className="flex flex-wrap items-end gap-x-4 gap-y-6">
                      {wordResults.map((w, i) => (
                        <WordHighlight key={i} wordResult={w} />
                      ))}
                    </div>
                    <div className="mt-6 flex gap-6 text-sm font-bold text-slate-500 bg-white p-4 rounded-xl border-2 border-slate-100 inline-flex">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                        Phát âm đúng
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
                        Phát âm sai
                      </span>
                    </div>
                  </div>
                ) : recognizedText ? (
                  <div className="rounded-2xl bg-white p-5 border-2 border-slate-200 font-medium text-slate-600 shadow-sm">
                    Máy nghe được: <span className="font-black text-slate-900 text-lg ml-2">{recognizedText}</span>
                  </div>
                ) : null}
              </div>
            );
          })()}
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-4 sm:flex-row sm:justify-center px-4">
        {(status === "correct" || status === "wrong") && (
          <>
            <Button onClick={retryCurrent} className="flex-1 rounded-2xl bg-white border-2 border-slate-200 border-b-4 active:border-b-2 active:translate-y-[2px] px-6 py-4 font-bold text-slate-600 transition-all hover:bg-slate-50">
              Thử lại lần nữa
            </Button>
            {audioUrl && (
              <Button
                onClick={() => {
                  const audio = new Audio(audioUrl);
                  audio.play().catch(console.error);
                }}
                className="flex-1 rounded-2xl bg-blue-50 border-2 border-blue-200 border-b-4 active:border-b-2 active:translate-y-[2px] px-6 py-4 font-bold text-blue-700 transition-all hover:bg-blue-100 flex items-center justify-center gap-2"
              >
                <Play className="h-5 w-5" />
                Nghe lại ghi âm
              </Button>
            )}
            <Button onClick={goNext} className="flex-1 rounded-2xl bg-blue-600 border-2 border-blue-700 border-b-4 active:border-b-2 active:translate-y-[2px] px-6 py-4 font-bold text-white transition-all hover:bg-blue-700">
              {currentIndex < cards.length - 1 ? "Câu tiếp theo" : "Hoàn thành"}
            </Button>
          </>
        )}
      </div>

      {status === "wrong" && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-orange-50 border-2 border-orange-100 px-6 py-4 text-base font-bold text-orange-700 shadow-sm animate-in slide-in-from-bottom-2">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
          Điểm dưới {PASS_SCORE}. Bạn có thể ghi âm lại để cải thiện phát âm.
        </div>
      )}
    </div>
  );
}
