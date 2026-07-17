import { useState, useRef, useEffect, useCallback } from "react";
import { pronunciationService } from "../services/pronunciationService";
import toastService from "../services/toastService";

export type PronunciationStatus = "idle" | "recording" | "checking" | "correct" | "wrong";

interface UsePronunciationAssessmentProps {
  targetText: string;
  passScore?: number;
  onSuccess?: (score: number, result: any) => void;
  onError?: (error: any) => void;
}

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

export function pickScore(result: any) {
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

export function pickWords(result: any) {
  if (result?.is_letter_correct_all_words && result?.real_transcripts) {
    const words = String(result.real_transcripts).split(" ");
    const flags = String(result.is_letter_correct_all_words).trim().split(" ");
    
    return words.map((word, i) => {
      const flagStr = flags[i] || "";
      const chars = word.split("").map((c, j) => ({
        char: c,
        correct: flagStr[j] === "1" ? true : flagStr[j] === "0" ? false : null
      }));
      return { Word: word, chars };
    });
  }

  const nBest = result?.NBest ?? result?.nBest ?? result?.nbest;
  const wordsArray = (Array.isArray(nBest) && nBest[0]?.Words) || (Array.isArray(nBest) && nBest[0]?.words) || result?.Words || result?.words || null;
  return Array.isArray(wordsArray) ? wordsArray : [];
}

export function usePronunciationAssessment({ targetText, passScore = 70, onSuccess, onError }: UsePronunciationAssessmentProps) {
  const [status, setStatus] = useState<PronunciationStatus>("idle");
  const [result, setResult] = useState<any>(null);
  const [mainScore, setMainScore] = useState<number | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number>(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setMainScore(null);
    setRecordingSeconds(0);
    stopTimer();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }, [stopTimer]);

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  const startRecording = async () => {
    if (!targetText || status === "checking") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toastService.error("Trình duyệt này chưa hỗ trợ ghi âm.");
      return;
    }

    try {
      resetState();
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") 
        ? "audio/webm;codecs=opus" 
        : MediaRecorder.isTypeSupported("audio/webm") 
          ? "audio/webm" 
          : "";
          
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
        resetState();
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
          await sleep(120);

          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          if (!blob.size) throw new Error("Không có dữ liệu ghi âm. Hãy cho phép micro và đọc lại rõ hơn.");

          setStatus("checking");
          const dataUrl = await blobToDataUrl(blob);
          const base64Audio = normalizeWebmDataUrl(dataUrl);

          const response = await pronunciationService.assess({
            title: String(targetText).trim().toLowerCase(),
            base64Audio,
            language: "en",
          });

          const nextResult = response.result;
          const nextScore = pickScore(nextResult);
          
          setResult(nextResult);
          setMainScore(nextScore);

          const passed = (nextScore ?? 0) >= passScore;
          setStatus(passed ? "correct" : "wrong");
          
          if (onSuccess) {
            onSuccess(nextScore ?? 0, nextResult);
          }
        } catch (error: any) {
          console.error("Pronunciation check error:", error);
          setStatus("idle");
          const msg = error?.message || "Không chấm được phát âm.";
          toastService.error(msg);
          if (onError) onError(error);
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

  return {
    status,
    result,
    mainScore,
    recordingSeconds,
    startRecording,
    stopRecording,
    resetState
  };
}
