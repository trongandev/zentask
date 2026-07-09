import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, Loader2, Mic, MicOff, RotateCw, Volume2 } from "lucide-react";
import toast from "react-hot-toast";
import { Flashcard } from "../../services/flashcardService";
import { pronunciationService } from "../../services/pronunciationService";
import { cn } from "../../lib/utils";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";

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
  const raw = String(value || "").trim().replace(/\s+/g, "");
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
  const preferredKeys = [
    "pronunciationscore",
    "pronunciationscorepercent",
    "accuracyscore",
    "accuracy",
    "score",
  ];
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
function mapPhonemesToChars(
  word: string,
  phonemes: { phoneme: string; correct: boolean }[],
): CharResult[] {
  const chars = word.split("");
  if (!phonemes.length) return chars.map((c) => ({ char: c, correct: null }));
  return chars.map((c, i) => {
    const idx = Math.min(
      Math.floor((i / chars.length) * phonemes.length),
      phonemes.length - 1,
    );
    return { char: c, correct: phonemes[idx].correct };
  });
}

function pickWords(result: any): WordResult[] {
  // Try NBest[].Words[] (Azure SDK shape)
  const nBest = result?.NBest ?? result?.nBest ?? result?.nbest;
  const wordsArray =
    (Array.isArray(nBest) && nBest[0]?.Words) ||
    (Array.isArray(nBest) && nBest[0]?.words) ||
    result?.Words ||
    result?.words ||
    null;

  if (!Array.isArray(wordsArray) || wordsArray.length === 0) return [];

  return wordsArray.map((w: any) => {
    const wordText: string = w?.Word ?? w?.word ?? w?.text ?? "";
    const pa = w?.PronunciationAssessment ?? w?.pronunciationAssessment ?? w?.assessment ?? {};
    const accuracyRaw =
      pa?.AccuracyScore ?? pa?.accuracyScore ?? pa?.accuracy ?? w?.AccuracyScore ?? null;
    const score = toScoreNumber(accuracyRaw);
    const errorType: string = (pa?.ErrorType ?? pa?.errorType ?? "").toLowerCase();
    const correct =
      errorType === "none" || errorType === ""
        ? score == null || score >= PASS_SCORE
        : false;

    // Extract phoneme-level data
    const phonemesRaw = w?.Phonemes ?? w?.phonemes ?? [];
    const phonemes: { phoneme: string; correct: boolean }[] = Array.isArray(phonemesRaw)
      ? phonemesRaw.map((p: any) => {
        const ppa =
          p?.PronunciationAssessment ?? p?.pronunciationAssessment ?? p?.assessment ?? {};
        const pScore = toScoreNumber(
          ppa?.AccuracyScore ?? ppa?.accuracyScore ?? ppa?.accuracy ?? null,
        );
        const pError = (ppa?.ErrorType ?? ppa?.errorType ?? "").toLowerCase();
        const pCorrect =
          pError === "none" || pError === ""
            ? pScore == null || pScore >= PASS_SCORE
            : false;
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
      <span className="text-lg font-black tracking-wide">
        {hasPhonemeData
          ? wordResult.chars.map((c, i) => (
            <span
              key={i}
              className={
                c.correct === true
                  ? "text-emerald-600"
                  : c.correct === false
                    ? "text-rose-600"
                    : "text-slate-700"
              }
            >
              {c.char}
            </span>
          ))
          : (
            <span className={wordResult.correct ? "text-emerald-600" : "text-rose-600"}>
              {wordResult.word}
            </span>
          )}
      </span>
      <span
        className={`h-0.5 w-full rounded-full ${wordResult.correct ? "bg-emerald-400" : "bg-rose-400"
          }`}
      />
    </span>
  );
}

type CharState = "correct" | "wrong" | "neutral";

interface TargetCharFeedback {
  char: string;
  state: CharState;
  compareIndex: number | null;
}

function normalizeChar(char: string) {
  return char
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function buildComparableChars(text: string) {
  const chars: Array<{ rawIndex: number; normalized: string }> = [];
  Array.from(String(text || "")).forEach((char, rawIndex) => {
    const normalized = normalizeChar(char);
    if (normalized) chars.push({ rawIndex, normalized });
  });
  return chars;
}

function alignTargetToHeard(targetText: string, heardText: string, fallbackState: CharState): TargetCharFeedback[] {
  const rawChars = Array.from(String(targetText || ""));
  const target = buildComparableChars(targetText);
  const heard = buildComparableChars(heardText);
  const targetStates = new Array(target.length).fill(false);

  if (!target.length) return [];

  if (!heard.length) {
    return rawChars.map((char, rawIndex) => {
      const compareIndex = target.findIndex((item) => item.rawIndex === rawIndex);
      return {
        char,
        compareIndex: compareIndex >= 0 ? compareIndex : null,
        state: compareIndex >= 0 ? fallbackState : "neutral",
      };
    });
  }

  const m = target.length;
  const n = heard.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = target[i - 1].normalized === heard[j - 1].normalized ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      target[i - 1].normalized === heard[j - 1].normalized &&
      dp[i][j] === dp[i - 1][j - 1]
    ) {
      targetStates[i - 1] = true;
      i -= 1;
      j -= 1;
      continue;
    }

    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      targetStates[i - 1] = false;
      i -= 1;
      j -= 1;
      continue;
    }

    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      targetStates[i - 1] = false;
      i -= 1;
      continue;
    }

    if (j > 0) j -= 1;
    else break;
  }

  const rawToCompare = new Map<number, number>();
  target.forEach((item, index) => rawToCompare.set(item.rawIndex, index));

  return rawChars.map((char, rawIndex) => {
    const compareIndex = rawToCompare.get(rawIndex) ?? null;
    if (compareIndex == null) return { char, compareIndex, state: "neutral" };
    return {
      char,
      compareIndex,
      state: targetStates[compareIndex] ? "correct" : "wrong",
    };
  });
}

function getHeardText(result: any, wordResults: WordResult[]) {
  const direct = pickText(result, [
    "recognizedtext",
    "displaytext",
    "display",
    "transcript",
    "recognized",
    "text",
    "lexical",
  ]);
  if (direct) return direct;
  const fromWords = wordResults.map((item) => item.word).filter(Boolean).join(" ").trim();
  return fromWords;
}

function scoreTone(score: number | null, status: PronunciationStatus) {
  if ((score ?? 0) >= 85 || status === "correct") {
    return {
      label: "Tốt",
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      ring: "#10b981",
      soft: "from-emerald-50 to-green-50",
    };
  }
  if ((score ?? 0) >= PASS_SCORE) {
    return {
      label: "Đạt",
      text: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      ring: "#2563eb",
      soft: "from-blue-50 to-cyan-50",
    };
  }
  return {
    label: "Cần luyện thêm",
    text: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    ring: "#e11d48",
    soft: "from-rose-50 to-orange-50",
  };
}

function CharacterFeedback({
  target,
  heard,
  status,
}: {
  target: string;
  heard: string;
  status: PronunciationStatus;
}) {
  const fallbackState: CharState = status === "correct" ? "correct" : "wrong";
  const feedback = alignTargetToHeard(target, heard, fallbackState);
  const comparable = feedback.filter((item) => item.state !== "neutral");
  const correctCount = comparable.filter((item) => item.state === "correct").length;
  const wrongCount = comparable.filter((item) => item.state === "wrong").length;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Phân tích từng ký tự</p>
          <h4 className="mt-1 text-lg font-black text-slate-900">Chữ xanh là đúng, chữ đỏ là cần luyện lại</h4>
        </div>
        <div className="flex gap-2 text-xs font-bold">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Đúng {correctCount}</span>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">Sai {wrongCount}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 rounded-[1.5rem] bg-slate-50 p-4">
        {feedback.map((item, index) => {
          if (item.state === "neutral") {
            return (
              <span key={`${item.char}-${index}`} className="mx-1 min-w-2 text-3xl font-black text-slate-300">
                {item.char.trim() ? item.char : " "}
              </span>
            );
          }

          const cls = item.state === "correct"
            ? "border-emerald-200 bg-emerald-100 text-emerald-700 shadow-emerald-100"
            : "border-rose-200 bg-rose-100 text-rose-700 shadow-rose-100";

          return (
            <span
              key={`${item.char}-${index}`}
              className={`inline-flex h-12 min-w-10 items-center justify-center rounded-2xl border px-2 text-2xl font-black shadow-sm transition-transform ${cls}`}
              title={item.state === "correct" ? "Ký tự này khớp với phần máy nghe được" : "Ký tự này chưa khớp"}
            >
              {item.char}
            </span>
          );
        })}
      </div>

      {heard ? (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Máy nghe được: <span className="font-black text-slate-900">{heard}</span>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          API không trả transcript chi tiết, nên hệ thống tô theo kết quả tổng thể. Hãy ghi âm rõ hơn để có phân tích chính xác hơn.
        </div>
      )}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const tone = value >= PASS_SCORE ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${tone}`}>
      {label}: {Math.round(value)}
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
      toast.error("Trình duyệt này chưa hỗ trợ ghi âm.");
      return;
    }

    try {
      setResult(null);
      setMainScore(null);
      setRecordingSeconds(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      if (!mimeType) {
        stream.getTracks().forEach((track) => track.stop());
        toast.error("Trình duyệt này chưa hỗ trợ ghi âm WebM. Hãy dùng Chrome hoặc Edge.");
        return;
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        toast.error("Micro bị lỗi khi ghi âm. Hãy thử ghi âm lại.");
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

          console.log("Pronunciation payload preview", {
            title: String(currentCard.term || "").trim().toLowerCase(),
            language: "en",
            base64AudioPrefix: base64Audio.slice(0, 32),
            base64AudioLength: base64Audio.length,
            blobSize: blob.size,
          });

          const response = await pronunciationService.assess({
            title: String(currentCard.term || "").trim().toLowerCase(),
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
        } catch (error: any) {
          console.error("Pronunciation check error:", error);
          setStatus("idle");
          toast.error(error?.message || "Không chấm được phát âm.");
        }
      };

      recordingStartedAtRef.current = Date.now();
      recorder.start(250);
      setStatus("recording");
      timerRef.current = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    } catch (error: any) {
      console.error("Start recording error:", error);
      setStatus("idle");
      toast.error("Không mở được micro. Hãy kiểm tra quyền truy cập micro của trình duyệt.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    const elapsedMs = Date.now() - recordingStartedAtRef.current;
    if (elapsedMs < MIN_RECORDING_MS) {
      toast.error("Hãy ghi âm tối thiểu 0.5 giây rồi mới chấm điểm.");
      return;
    }
    try {
      recorder.requestData();
    } catch { }
    recorder.stop();
  };

  const retryCurrent = () => {
    if (status === "recording") stopRecording();
    setResult(null);
    setMainScore(null);
    setRecordingSeconds(0);
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
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Phát âm rất tốt!</h2>
        <p className="text-gray-500 mb-8">Bạn đã hoàn thành bài luyện phát âm.</p>
        <button
          onClick={() => {
            setCompleted(false);
            setCurrentIndex(0);
            setWrongCardIds([]);
            wrongCardIdsRef.current = [];
            setResult(null);
            setMainScore(null);
            setStatus("idle");
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all active:scale-95"
        >
          <RotateCw className="w-5 h-5" />
          Luyện phát âm lại
        </button>
        {completionActions}
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="w-full max-w-3xl flex flex-col items-center justify-center">
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <span className="text-gray-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          Câu {currentIndex + 1} / {cards.length}
        </span>
        <span className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600">Đạt từ {PASS_SCORE} điểm</span>
      </div>

      <div
        className={cn(
          "w-full bg-white rounded-3xl p-6 md:p-10 shadow-lg border-2 mb-8 relative transition-colors duration-300",
          status === "correct" ? "border-green-500 bg-green-50/40" : status === "wrong" ? "border-red-500 bg-red-50/40" : "border-transparent",
        )}
      >
        <div className="text-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-gray-400">Hãy phát âm từ này</p>
          <h2 className="break-words text-4xl md:text-5xl font-black text-gray-900">{currentCard.term}</h2>
          {currentCard.phonetic && <p className="mt-2 text-lg font-semibold text-blue-500">{currentCard.phonetic}</p>}
          <p className="mt-3 text-lg font-bold text-gray-500">{currentCard.translation}</p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => playAudio(currentCard.term)}
              disabled={ttsLoading || status === "recording" || status === "checking"}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-50 px-5 py-3 font-bold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
            >
              <Volume2 className="h-5 w-5" />
              Nghe mẫu
            </button>

            {status === "recording" ? (
              <button
                onClick={stopRecording}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3 font-bold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700"
              >
                <MicOff className="h-5 w-5" />
                Dừng & chấm điểm {recordingSeconds}s
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={status === "checking"}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50"
              >
                {status === "checking" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
                {status === "checking" ? "Đang chấm điểm..." : result ? "Ghi âm lại" : "Bắt đầu ghi âm"}
              </button>
            )}
          </div>

          <p className="mt-4 text-sm text-gray-400">Nhấn <strong>Bắt đầu ghi âm</strong>, đọc to rõ ràng, rồi nhấn <strong>Dừng &amp; chấm điểm</strong>.</p>
        </div>

        {result && (() => {
          const wordResults = pickWords(result);
          const heardText = recognizedText || getHeardText(result, wordResults);
          const tone = scoreTone(mainScore, status);
          const scoreForRing = Math.max(0, Math.min(100, mainScore ?? (status === "correct" ? PASS_SCORE : 0)));
          return (
            <div className={cn("mt-8 overflow-hidden rounded-[2rem] border p-4 text-left shadow-sm md:p-6", tone.bg, tone.border)}>
              <div className={cn("mb-5 rounded-[1.75rem] bg-gradient-to-br p-4 md:p-5", tone.soft)}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Kết quả phát âm</p>
                    <h3 className="mt-1 text-2xl font-black text-slate-900">
                      {status === "correct" ? "Bạn phát âm đạt yêu cầu" : "Cần luyện lại vài âm"}
                    </h3>
                    <p className="mt-2 max-w-xl text-sm font-medium text-slate-500">
                      Hệ thống sẽ tô <span className="font-black text-emerald-600">xanh</span> những ký tự đã khớp và tô <span className="font-black text-rose-600">đỏ</span> những ký tự cần đọc rõ hơn.
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div
                      className="grid h-24 w-24 place-items-center rounded-full p-2 shadow-inner"
                      style={{
                        background: `conic-gradient(${tone.ring} ${scoreForRing * 3.6}deg, #e5e7eb 0deg)`,
                      }}
                    >
                      <div className="grid h-full w-full place-items-center rounded-full bg-white text-center">
                        <span className={cn("text-2xl font-black leading-none", tone.text)}>
                          {mainScore != null ? Math.round(mainScore) : "—"}
                        </span>
                        <span className="-mt-1 text-[10px] font-black uppercase text-slate-400">/100</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-black", tone.bg, tone.text)}>{tone.label}</span>
                      <div className="flex flex-wrap gap-2">
                        <MetricPill label="Độ chính xác" value={accuracy} />
                        <MetricPill label="Độ trôi chảy" value={fluency} />
                        <MetricPill label="Đầy đủ" value={completeness} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <CharacterFeedback target={currentCard.term} heard={heardText} status={status} />

              {wordResults.length > 0 && (
                <details className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-black text-slate-700">Xem phân tích theo từ/âm từ API</summary>
                  <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-4">
                    {wordResults.map((w, i) => (
                      <WordHighlight key={i} wordResult={w} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })()}
      </div>

      <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
        {(status === "correct" || status === "wrong") && (
          <>
            <button onClick={retryCurrent} className="flex-1 rounded-2xl bg-gray-100 px-6 py-4 font-bold text-gray-700 transition hover:bg-gray-200">
              Ghi âm lại
            </button>
            <button onClick={goNext} className="flex-1 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white transition hover:bg-blue-700">
              {currentIndex < cards.length - 1 ? "Câu tiếp theo" : "Hoàn thành"}
            </button>
          </>
        )}
      </div>

      {status === "wrong" && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-600">
          <AlertTriangle className="h-4 w-4" />
          Điểm dưới {PASS_SCORE}. Bạn có thể ghi âm lại để cải thiện phát âm.
        </div>
      )}
    </div>
  );
}
