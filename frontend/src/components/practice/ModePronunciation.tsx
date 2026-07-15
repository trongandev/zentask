import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, Loader2, Mic, MicOff, RotateCw, Volume2 } from "lucide-react";
import toastService from "@/src/services/toastService";
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
      {/* tiny underline bar for quick scan */}
      <span className={`h-0.5 w-full rounded-full ${wordResult.correct ? "bg-green-400" : "bg-red-400"}`} />
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
      toastService.error("Trình duyệt này chưa hỗ trợ ghi âm.");
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

          <p className="mt-4 text-sm text-gray-400">
            Nhấn <strong>Bắt đầu ghi âm</strong>, đọc to rõ ràng, rồi nhấn <strong>Dừng &amp; chấm điểm</strong>.
          </p>
        </div>

        {result &&
          (() => {
            const wordResults = pickWords(result);
            return (
              <div className="mt-8 rounded-3xl border border-gray-100 bg-gray-50 p-4 md:p-6 text-left">
                {/* Header: score badge + status */}
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Kết quả phát âm</h3>
                    <p className="text-sm text-gray-500">{status === "correct" ? "✅ Bạn phát âm đạt yêu cầu!" : "❌ Chưa đạt — hãy thử lại hoặc chuyển câu tiếp."}</p>
                  </div>
                  <div className={cn("rounded-2xl px-5 py-3 text-center font-black text-xl", status === "correct" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                    {mainScore != null ? `${Math.round(mainScore)}/100` : "—"}
                  </div>
                </div>

                {/* Character-level feedback */}
                {wordResults.length > 0 ? (
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Từng chữ cái</p>
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
                      {wordResults.map((w, i) => (
                        <WordHighlight key={i} wordResult={w} />
                      ))}
                    </div>
                    <div className="mt-4 flex gap-5 text-xs text-gray-400">
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
                ) : recognizedText ? (
                  <div className="rounded-2xl bg-white p-4 text-sm text-gray-600">
                    Máy nghe được: <span className="font-bold text-gray-900">{recognizedText}</span>
                  </div>
                ) : null}
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
