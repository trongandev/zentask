import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlarmClock, BookOpenCheck, Calculator, Clock3, Copy, Eraser, History, Languages, Pause, Play, Plus, RotateCcw, Save, Sparkles, Square, Trash2, Volume2 } from "lucide-react";
import toastService from "@/src/services/toastService";
import { voiceOptions } from "../lib/voiceOptions";
import { useEtcStore } from "../services/etcService";
import { utilitiesService, type CalculatorHistoryItem, type StudyMethodItem, type TranslationHistoryItem } from "../services/utilitiesService";
import { Button } from "@/src/components/ui/Button";
import { Select } from "@/src/components/ui/Select";
import { Textarea } from "@/src/components/ui/Textarea";
import { Input } from "@/src/components/ui/Input";

type UtilityTab = "calculator" | "clock" | "translate";
type CalcMode = "basic" | "advanced";
type AdvancedMode = "equation" | "system" | "expression";
type ClockMode = "stopwatch" | "timer" | "study";
type TimerPhase = "idle" | "study" | "break" | "finished";
type AdvancedSymbolButton = { label: string; insert: string; cursorOffset?: number; hint: string };

const basicButtons = ["C", "CE", "⌫", "÷", "7", "8", "9", "×", "4", "5", "6", "-", "1", "2", "3", "+", "±", "0", ".", "="];

const advancedSymbolGroups: Array<{ title: string; buttons: AdvancedSymbolButton[] }> = [
  {
    title: "Phép toán nhanh",
    buttons: [
      { label: "√", insert: "√()", cursorOffset: -1, hint: "Căn bậc hai" },
      { label: "x²", insert: "^2", hint: "Bình phương" },
      { label: "xʸ", insert: "^", hint: "Lũy thừa" },
      { label: "π", insert: "π", hint: "Số Pi" },
      { label: "|x|", insert: "abs()", cursorOffset: -1, hint: "Giá trị tuyệt đối" },
      { label: "( )", insert: "()", cursorOffset: -1, hint: "Dấu ngoặc" },
    ],
  },
  {
    title: "Hàm thường dùng",
    buttons: [
      { label: "sin", insert: "sin()", cursorOffset: -1, hint: "Sin" },
      { label: "cos", insert: "cos()", cursorOffset: -1, hint: "Cos" },
      { label: "tan", insert: "tan()", cursorOffset: -1, hint: "Tan" },
      { label: "log", insert: "log()", cursorOffset: -1, hint: "Log tự nhiên" },
      { label: "ln", insert: "ln()", cursorOffset: -1, hint: "Ln" },
      { label: "làm tròn", insert: "round()", cursorOffset: -1, hint: "Làm tròn" },
    ],
  },
];

const advancedTemplates: Array<{ label: string; mode: AdvancedMode; value: string; note: string }> = [
  { label: "Bậc 1", mode: "equation", value: "2x + 4 = 10", note: "Giải phương trình bậc 1" },
  { label: "Bậc 2", mode: "equation", value: "x^2 - 5x + 6 = 0", note: "Giải phương trình bậc 2" },
  { label: "Có căn", mode: "equation", value: "√(x + 9) = 5", note: "Mẫu có căn bậc hai" },
  { label: "Hệ 2 ẩn", mode: "system", value: "2x + y = 5\nx - y = 1", note: "Hai phương trình, hai dòng" },
  { label: "Biểu thức", mode: "expression", value: "√(144) + sin(π/2)", note: "Tính biểu thức nâng cao" },
];

const languageOptions = [
  { label: "Tự nhận diện", value: "auto" },
  { label: "Tiếng Việt", value: "vi" },
  { label: "English", value: "en" },
  { label: "中文", value: "zh" },
  { label: "日本語", value: "ja" },
  { label: "한국어", value: "ko" },
  { label: "Français", value: "fr" },
  { label: "Deutsch", value: "de" },
  { label: "Español", value: "es" },
  { label: "ไทย", value: "th" },
  { label: "Bahasa Indonesia", value: "id" },
];

const builtInMethods: StudyMethodItem[] = [
  { id: "builtin-pomodoro", name: "Pomodoro nhẹ", studyMinutes: 25, breakMinutes: 5, breakCount: 1, isCustom: false },
  { id: "builtin-deep", name: "Tập trung sâu", studyMinutes: 90, breakMinutes: 10, breakCount: 2, isCustom: false },
  { id: "builtin-review", name: "Ôn bài nhanh", studyMinutes: 45, breakMinutes: 5, breakCount: 2, isCustom: false },
  { id: "builtin-sprint", name: "Nước rút 60 phút", studyMinutes: 60, breakMinutes: 7, breakCount: 2, isCustom: false },
];

function normalizeExpression(input: string) {
  return input
    .replace(/,/g, ".")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/gi, "PI")
    .replace(/√/g, "sqrt")
    .replace(/\^/g, "**")
    .replace(/(\d|\)|x|y)\s*(?=x|y|\()/gi, "$1*")
    .replace(/(\d|\)|x|y)\s*(?=(sin|cos|tan|sqrt|log|ln|abs)\()/gi, "$1*");
}

function evaluateExpression(input: string, vars: Record<string, number> = {}) {
  const expression = normalizeExpression(input.trim());
  if (!expression) throw new Error("Chưa có phép tính.");
  if (/[^0-9+\-*/().\sA-Za-z_]/.test(expression)) throw new Error("Phép tính có ký tự chưa hỗ trợ.");

  const allowedWords = ["sin", "cos", "tan", "sqrt", "log", "ln", "abs", "asin", "acos", "atan", "floor", "ceil", "round", "PI", "E", "x", "y"];
  const words = expression.match(/[A-Za-z_]+/g) || [];
  for (const word of words) {
    if (!allowedWords.includes(word)) throw new Error(`Chưa hỗ trợ từ khóa: ${word}`);
  }

  const fn = new Function("x", "y", `"use strict"; const { sin, cos, tan, sqrt, log, abs, asin, acos, atan, floor, ceil, round, PI, E } = Math; const ln = log; return (${expression});`);
  const value = Number(fn(vars.x ?? 0, vars.y ?? 0));
  if (!Number.isFinite(value)) throw new Error("Kết quả không hợp lệ.");
  return value;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "Không xác định";
  if (Math.abs(value) < 1e-10) return "0";
  return Number(value.toPrecision(12)).toString();
}

function solveEquation(raw: string) {
  const [left, right = "0"] = raw.includes("=") ? raw.split("=") : [raw, "0"];
  const f = (x: number) => evaluateExpression(`(${left})-(${right})`, { x });
  const c = f(0);
  const p = f(1);
  const m = f(-1);
  const a = (p + m - 2 * c) / 2;
  const b = (p - m) / 2;
  const check2 = f(2);
  const predicted2 = 4 * a + 2 * b + c;
  const isQuadraticLike = Math.abs(check2 - predicted2) < 1e-5;

  if (!isQuadraticLike) {
    // Numeric fallback by bisection scanning.
    const roots: number[] = [];
    let prevX = -100;
    let prevY = f(prevX);
    for (let x = -99.5; x <= 100; x += 0.5) {
      const y = f(x);
      if (Math.abs(y) < 1e-6) roots.push(x);
      if (prevY * y < 0) {
        let lo = prevX;
        let hi = x;
        for (let i = 0; i < 80; i += 1) {
          const mid = (lo + hi) / 2;
          const fm = f(mid);
          if (f(lo) * fm <= 0) hi = mid;
          else lo = mid;
        }
        roots.push((lo + hi) / 2);
      }
      prevX = x;
      prevY = y;
    }
    const unique = [...new Set(roots.map((item) => formatNumber(item)))];
    return unique.length ? `x = ${unique.join("; x = ")}` : "Chưa tìm thấy nghiệm trong khoảng -100 đến 100.";
  }

  if (Math.abs(a) < 1e-10) {
    if (Math.abs(b) < 1e-10) return Math.abs(c) < 1e-10 ? "Phương trình có vô số nghiệm." : "Phương trình vô nghiệm.";
    return `x = ${formatNumber(-c / b)}`;
  }

  const delta = b * b - 4 * a * c;
  if (delta < -1e-10) return `Vô nghiệm thực. Δ = ${formatNumber(delta)}`;
  if (Math.abs(delta) < 1e-10) return `x = ${formatNumber(-b / (2 * a))}`;
  const sqrtDelta = Math.sqrt(delta);
  return `x₁ = ${formatNumber((-b + sqrtDelta) / (2 * a))}; x₂ = ${formatNumber((-b - sqrtDelta) / (2 * a))}`;
}

function solveSystem(raw: string) {
  const lines = raw
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (lines.length < 2) throw new Error("Hãy nhập 2 phương trình, mỗi phương trình một dòng.");

  const getLinear = (equation: string) => {
    const [left, right = "0"] = equation.includes("=") ? equation.split("=") : [equation, "0"];
    const f = (x: number, y: number) => evaluateExpression(`(${left})-(${right})`, { x, y });
    const c = f(0, 0);
    const a = f(1, 0) - c;
    const b = f(0, 1) - c;
    return { a, b, c };
  };

  const e1 = getLinear(lines[0]);
  const e2 = getLinear(lines[1]);
  const det = e1.a * e2.b - e2.a * e1.b;
  if (Math.abs(det) < 1e-10) return "Hệ phương trình không có nghiệm duy nhất.";
  const x = (-e1.c * e2.b - -e2.c * e1.b) / det;
  const y = (e1.a * -e2.c - e2.a * -e1.c) / det;
  return `x = ${formatNumber(x)}; y = ${formatNumber(y)}`;
}

function formatTime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function createStudySegments(method: StudyMethodItem) {
  const studyChunks = Math.max(1, Number(method.breakCount || 0) + 1);
  const chunkSeconds = Math.max(1, Math.round((Number(method.studyMinutes || 25) * 60) / studyChunks));
  const breakSeconds = Math.max(1, Number(method.breakMinutes || 5) * 60);
  const segments: Array<{ phase: TimerPhase; seconds: number; label: string }> = [];

  for (let index = 0; index < studyChunks; index += 1) {
    segments.push({ phase: "study", seconds: chunkSeconds, label: `Học phần ${index + 1}/${studyChunks}` });
    if (index < Number(method.breakCount || 0)) {
      segments.push({ phase: "break", seconds: breakSeconds, label: `Nghỉ lần ${index + 1}/${method.breakCount}` });
    }
  }

  return segments;
}

export function Utilities() {
  const [activeTab, setActiveTab] = useState<UtilityTab>("calculator");

  // Calculator state
  const [calcMode, setCalcMode] = useState<CalcMode>("basic");
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("0");
  const [advancedMode, setAdvancedMode] = useState<AdvancedMode>("equation");
  const [advancedInput, setAdvancedInput] = useState("x^2 - 5x + 6 = 0");
  const [calcHistory, setCalcHistory] = useState<CalculatorHistoryItem[]>([]);
  const advancedInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Clock state
  const [clockMode, setClockMode] = useState<ClockMode>("stopwatch");
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [studyMethods, setStudyMethods] = useState<StudyMethodItem[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState("builtin-pomodoro");
  const [customMethod, setCustomMethod] = useState({ name: "Phương pháp của tôi", studyMinutes: 50, breakMinutes: 5, breakCount: 2 });
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [studySegments, setStudySegments] = useState(createStudySegments(builtInMethods[0]));
  const [studySegmentIndex, setStudySegmentIndex] = useState(0);
  const [studySecondsLeft, setStudySecondsLeft] = useState(studySegments[0]?.seconds || 25 * 60);
  const [studyRunning, setStudyRunning] = useState(false);
  const [phase, setPhase] = useState<TimerPhase>("idle");

  // Translation state
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationHistory, setTranslationHistory] = useState<TranslationHistoryItem[]>([]);
  const [sourceVoice, setSourceVoice] = useState("en-US-JennyNeural");
  const [targetVoice, setTargetVoice] = useState("en-GB-SoniaNeural");
  const [playingAudio, setPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { textToSpeech } = useEtcStore();

  const allMethods = useMemo(() => [...builtInMethods, ...studyMethods], [studyMethods]);
  const selectedMethod = useMemo(() => allMethods.find((item) => item.id === selectedMethodId) || allMethods[0], [allMethods, selectedMethodId]);

  const loadUtilityData = useCallback(async () => {
    try {
      const [calculatorItems, translationItems, methodItems] = await Promise.all([
        utilitiesService.getCalculatorHistory(),
        utilitiesService.getTranslationHistory(),
        utilitiesService.getStudyMethods(),
      ]);
      setCalcHistory(calculatorItems);
      setTranslationHistory(translationItems);
      setStudyMethods(methodItems);
    } catch (error: any) {
      toastService.error(error.message || "Không tải được dữ liệu tiện ích.");
    }
  }, []);

  useEffect(() => {
    void loadUtilityData();
  }, [loadUtilityData]);

  useEffect(() => {
    let timer: number | undefined;
    if (stopwatchRunning) {
      timer = window.setInterval(() => setStopwatchSeconds((value) => value + 1), 1000);
    }
    return () => window.clearInterval(timer);
  }, [stopwatchRunning]);

  useEffect(() => {
    let timer: number | undefined;
    if (timerRunning) {
      timer = window.setInterval(() => {
        setTimerSecondsLeft((value) => {
          if (value <= 1) {
            window.clearInterval(timer);
            setTimerRunning(false);
            notifyWeb("Hết giờ", "Đồng hồ đếm ngược đã hoàn thành.");
            return 0;
          }
          return value - 1;
        });
      }, 1000);
    }
    return () => window.clearInterval(timer);
  }, [timerRunning]);

  useEffect(() => {
    let timer: number | undefined;
    if (studyRunning) {
      timer = window.setInterval(() => {
        setStudySecondsLeft((value) => {
          if (value > 1) return value - 1;
          const nextIndex = studySegmentIndex + 1;
          if (nextIndex < studySegments.length) {
            const next = studySegments[nextIndex];
            setStudySegmentIndex(nextIndex);
            setPhase(next.phase);
            notifyWeb(next.phase === "break" ? "Đến giờ nghỉ" : "Quay lại học", next.label);
            return next.seconds;
          }
          window.clearInterval(timer);
          setStudyRunning(false);
          setPhase("finished");
          notifyWeb("Hoàn thành phiên học", "Bạn đã hoàn thành phương pháp học hôm nay.");
          return 0;
        });
      }, 1000);
    }
    return () => window.clearInterval(timer);
  }, [studyRunning, studySegmentIndex, studySegments]);

  function notifyWeb(title: string, body: string) {
    toastService.success(`${title}: ${body}`);
    if ("Notification" in window) {
      if (Notification.permission === "granted") new Notification(title, { body });
      else if (Notification.permission !== "denied") void Notification.requestPermission();
    }
  }

  async function saveCalculation(nextExpression: string, nextResult: string, mode = calcMode, type = "calculation") {
    try {
      const item = await utilitiesService.saveCalculatorHistory({ expression: nextExpression, result: nextResult, mode, type });
      setCalcHistory((current) => [item, ...current].slice(0, 60));
    } catch (error: any) {
      toastService.error(error.message || "Không lưu được lịch sử tính.");
    }
  }

  function calculateBasic(raw = expression) {
    try {
      const value = evaluateExpression(raw.replace(/%/g, "/100"));
      const next = formatNumber(value);
      setResult(next);
      setExpression(raw);
      void saveCalculation(raw, next, "basic");
    } catch (error: any) {
      setResult("Lỗi");
      toastService.error(error.message || "Phép tính chưa hợp lệ.");
    }
  }

  function handleBasicButton(value: string) {
    if (value === "C") {
      setExpression("");
      setResult("0");
      return;
    }
    if (value === "CE") {
      setResult("0");
      return;
    }
    if (value === "⌫") {
      setExpression((current) => current.slice(0, -1));
      return;
    }
    if (value === "±") {
      setExpression((current) => (current.startsWith("-") ? current.slice(1) : `-${current}`));
      return;
    }
    if (value === "=") {
      calculateBasic();
      return;
    }
    setExpression((current) => `${current}${value}`);
  }

  function insertAdvancedText(insert: string, cursorOffset = 0) {
    const textarea = advancedInputRef.current;

    if (!textarea) {
      setAdvancedInput((current) => `${current}${insert}`);
      return;
    }

    const start = textarea.selectionStart ?? advancedInput.length;
    const end = textarea.selectionEnd ?? advancedInput.length;
    const next = `${advancedInput.slice(0, start)}${insert}${advancedInput.slice(end)}`;
    const cursor = Math.max(0, start + insert.length + cursorOffset);

    setAdvancedInput(next);
    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    }, 0);
  }

  function applyAdvancedTemplate(template: (typeof advancedTemplates)[number]) {
    setAdvancedMode(template.mode);
    setAdvancedInput(template.value);
    setResult("0");
    window.setTimeout(() => advancedInputRef.current?.focus(), 0);
  }

  function calculateAdvanced() {
    try {
      let next = "";
      if (advancedMode === "equation") next = solveEquation(advancedInput);
      if (advancedMode === "system") next = solveSystem(advancedInput);
      if (advancedMode === "expression") next = formatNumber(evaluateExpression(advancedInput));
      setResult(next);
      void saveCalculation(advancedInput, next, "advanced", advancedMode);
    } catch (error: any) {
      setResult("Lỗi");
      toastService.error(error.message || "Chưa tính được nội dung này.");
    }
  }

  function recallCalculation(item: CalculatorHistoryItem) {
    setCalcMode(item.mode === "advanced" ? "advanced" : "basic");
    if (item.mode === "advanced") setAdvancedInput(item.expression);
    else setExpression(item.expression);
    setResult(item.result);
  }

  function startTimer() {
    if (timerSecondsLeft <= 0) setTimerSecondsLeft(timerMinutes * 60);
    setTimerRunning(true);
  }

  function resetTimer() {
    setTimerRunning(false);
    setTimerSecondsLeft(timerMinutes * 60);
  }

  function prepareStudy(method = selectedMethod) {
    const segments = createStudySegments(method);
    setStudySegments(segments);
    setStudySegmentIndex(0);
    setStudySecondsLeft(segments[0]?.seconds || method.studyMinutes * 60);
    setPhase(segments[0]?.phase || "study");
    return segments;
  }

  function startStudy() {
    const segments = studySegments.length ? studySegments : prepareStudy();
    if (phase === "idle" || phase === "finished") {
      setPhase(segments[0]?.phase || "study");
      setStudySecondsLeft(segments[0]?.seconds || selectedMethod.studyMinutes * 60);
      setStudySegmentIndex(0);
    }
    setStudyRunning(true);
  }

  function resetStudy() {
    setStudyRunning(false);
    prepareStudy();
  }

  function selectStudyMethod(method: StudyMethodItem) {
    setSelectedMethodId(method.id);
    const segments = createStudySegments(method);
    setStudySegments(segments);
    setStudySegmentIndex(0);
    setStudySecondsLeft(segments[0]?.seconds || 0);
    setPhase("idle");
    setStudyRunning(false);
  }

  function startEditStudyMethod(method: StudyMethodItem) {
    if (!method.isCustom) return;
    setEditingMethodId(method.id);
    setCustomMethod({
      name: method.name,
      studyMinutes: method.studyMinutes,
      breakMinutes: method.breakMinutes,
      breakCount: method.breakCount,
    });
  }

  function resetStudyMethodForm() {
    setEditingMethodId(null);
    setCustomMethod({ name: "Phương pháp của tôi", studyMinutes: 50, breakMinutes: 5, breakCount: 2 });
  }

  async function saveCustomStudyMethod() {
    try {
      if (!customMethod.name.trim()) return toastService.error("Hãy nhập tên phương pháp học.");

      if (editingMethodId) {
        const item = await utilitiesService.updateStudyMethod(editingMethodId, customMethod);
        setStudyMethods((current) => current.map((method) => (method.id === item.id ? item : method)));
        if (selectedMethodId === item.id) selectStudyMethod(item);
        toastService.success("Đã cập nhật phương pháp học.");
        resetStudyMethodForm();
        return;
      }

      const item = await utilitiesService.createStudyMethod(customMethod);
      setStudyMethods((current) => [item, ...current]);
      selectStudyMethod(item);
      toastService.success("Đã lưu phương pháp học mới.");
      resetStudyMethodForm();
    } catch (error: any) {
      toastService.error(error.message || "Không lưu được phương pháp học.");
    }
  }

  async function deleteCustomStudyMethod(method: StudyMethodItem) {
    if (!method.isCustom) return toastService.error("Phương pháp có sẵn không thể xóa.");
    const ok = window.confirm(`Xóa phương pháp "${method.name}"?`);
    if (!ok) return;

    try {
      await utilitiesService.deleteStudyMethod(method.id);
      setStudyMethods((current) => current.filter((item) => item.id !== method.id));
      if (selectedMethodId === method.id) selectStudyMethod(builtInMethods[0]);
      if (editingMethodId === method.id) resetStudyMethodForm();
      toastService.success("Đã xóa phương pháp học.");
    } catch (error: any) {
      toastService.error(error.message || "Không xóa được phương pháp học.");
    }
  }

  async function handleTranslate() {
    if (!sourceText.trim()) return toastService.error("Hãy nhập nội dung cần dịch.");
    setIsTranslating(true);
    try {
      const data = await utilitiesService.translate({ text: sourceText, source: sourceLang, target: targetLang, save: true });
      setTranslatedText(data.translatedText);
      if (data.item) setTranslationHistory((current) => [data.item!, ...current].slice(0, 80));
    } catch (error: any) {
      toastService.error(error.message || "Dịch thuật thất bại.");
    } finally {
      setIsTranslating(false);
    }
  }

  async function playText(text: string, voice: string) {
    if (!text.trim() || playingAudio) return;
    setPlayingAudio(true);
    try {
      const url = await textToSpeech(text, voice);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPlayingAudio(false);
      };
      audio.onerror = () => setPlayingAudio(false);
      await audio.play();
    } catch {
      setPlayingAudio(false);
    }
  }

  function recallTranslation(item: TranslationHistoryItem) {
    setSourceText(item.sourceText);
    setTranslatedText(item.translatedText);
    setSourceLang(item.source || "auto");
    setTargetLang(item.target || "en");
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-6 text-white shadow-xl md:p-8">
        <div className="absolute right-8 top-8 opacity-20">
          <Sparkles className="h-32 w-32" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-sm font-semibold">Bộ công cụ học tập</div>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight md:text-4xl">Tiện ích ZenTask</h1>
          <p className="leading-relaxed text-blue-50">Máy tính, đồng hồ học tập và dịch thuật nằm chung một nơi, có lưu lịch sử theo tài khoản.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-[1.5rem] border border-slate-100 bg-white p-2 shadow-sm">
        {(
          [
            ["calculator", Calculator, "Máy tính"],
            ["clock", Clock3, "Đồng hồ"],
            ["translate", Languages, "Dịch thuật"],
          ] as const
        ).map(([id, Icon, label]) => (
          <Button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${activeTab === id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <Icon className="h-5 w-5" /> {label}
          </Button>
        ))}
      </div>

      {activeTab === "calculator" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Máy tính</h2>
                <p className="text-sm text-slate-500">Tính nhanh hoặc giải các bài toán nâng cao.</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-1">
                <Button onClick={() => setCalcMode("basic")} className={`rounded-xl px-4 py-2 text-sm font-bold ${calcMode === "basic" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>
                  Cơ bản
                </Button>
                <Button onClick={() => setCalcMode("advanced")} className={`rounded-xl px-4 py-2 text-sm font-bold ${calcMode === "advanced" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>
                  Nâng cao
                </Button>
              </div>
            </div>

            {calcMode === "basic" ? (
              <div className="mx-auto max-w-xl rounded-[2rem] bg-slate-950 p-4 shadow-xl">
                <div className="mb-4 rounded-3xl bg-slate-900 p-5 text-right text-white">
                  <div className="min-h-[32px] break-all text-lg text-slate-300">{expression || "0"}</div>
                  <div className="mt-2 break-all text-4xl font-black">{result}</div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {basicButtons.map((button) => (
                    <Button
                      key={button}
                      onClick={() => handleBasicButton(button)}
                      className={`h-14 rounded-2xl text-lg font-black transition ${button === "=" ? "bg-blue-500 text-white hover:bg-blue-400" : ["C", "CE", "⌫"].includes(button) ? "bg-slate-700 text-white hover:bg-slate-600" : ["÷", "×", "-", "+"].includes(button) ? "bg-orange-500 text-white hover:bg-orange-400" : "bg-white text-slate-900 hover:bg-slate-100"}`}
                    >
                      {button}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["equation", "Giải phương trình"],
                      ["system", "Hệ phương trình"],
                      ["expression", "Tính biểu thức"],
                    ] as const
                  ).map(([id, label]) => (
                    <Button
                      key={id}
                      onClick={() => {
                        const template = advancedTemplates.find((item) => item.mode === id);
                        if (template) applyAdvancedTemplate(template);
                        else setAdvancedMode(id);
                      }}
                      className={`rounded-2xl px-4 py-2 text-sm font-bold ${advancedMode === id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/70 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-blue-900">Bấm nút để chèn công thức</h3>
                      <p className="text-xs text-blue-700/80">Không cần nhớ cú pháp như sqrt hoặc ^. Bạn chỉ cần chọn nút phù hợp rồi nhập số vào chỗ trống.</p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        setAdvancedInput("");
                        setResult("0");
                        advancedInputRef.current?.focus();
                      }}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm hover:text-red-600"
                    >
                      Xóa nội dung
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {advancedSymbolGroups.map((group) => (
                      <div key={group.title}>
                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-700/70">{group.title}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.buttons.map((button) => (
                            <Button
                              key={`${group.title}-${button.label}`}
                              type="button"
                              title={button.hint}
                              onClick={() => insertAdvancedText(button.insert, button.cursorOffset || 0)}
                              className="rounded-2xl border border-blue-100 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm hover:border-blue-300 hover:text-blue-700"
                            >
                              {button.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Mẫu có sẵn</div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {advancedTemplates.map((template) => (
                      <Button
                        key={template.label}
                        type="button"
                        onClick={() => applyAdvancedTemplate(template)}
                        className={`rounded-2xl border p-3 text-left transition ${advancedMode === template.mode ? "border-blue-200 bg-white" : "border-slate-100 bg-white hover:border-blue-200"}`}
                      >
                        <div className="text-sm font-extrabold text-slate-800">{template.label}</div>
                        <div className="mt-1 text-xs text-slate-500">{template.note}</div>
                        <div className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-blue-700">{template.value}</div>
                      </Button>
                    ))}
                  </div>
                </div>

                <Textarea
                  ref={advancedInputRef}
                  value={advancedInput}
                  onChange={(event) => setAdvancedInput(event.target.value)}
                  className="min-h-[160px] w-full rounded-3xl border border-slate-200 bg-slate-50 p-5 text-lg font-semibold text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
                  placeholder="Bấm các nút phía trên để chèn công thức, hoặc nhập trực tiếp tại đây..."
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={calculateAdvanced} className="rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
                    Tính kết quả
                  </Button>
                  <div className="rounded-2xl bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700">Kết quả: {result}</div>
                </div>
                <p className="text-sm text-slate-500">
                  Gợi ý: với hệ phương trình, hãy để mỗi phương trình trên một dòng. Ví dụ: <b>2x + y = 5</b> và <b>x - y = 1</b>.
                </p>
              </div>
            )}
          </section>

          <aside className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <History className="h-5 w-5 text-blue-600" /> Lịch sử tính
              </h3>
              <Button
                onClick={async () => {
                  await utilitiesService.clearCalculatorHistory();
                  setCalcHistory([]);
                }}
                className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[600px] space-y-2 overflow-y-auto pr-1">
              {calcHistory.length === 0 && <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Chưa có phép tính nào.</div>}
              {calcHistory.map((item) => (
                <Button key={item.id} onClick={() => recallCalculation(item)} className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left hover:border-blue-200 hover:bg-blue-50">
                  <div className="break-all text-sm font-bold text-slate-800">{item.expression}</div>
                  <div className="mt-1 break-all text-sm text-blue-700">= {item.result}</div>
                </Button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {activeTab === "clock" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1">
              {(
                [
                  ["stopwatch", "Đếm xuôi"],
                  ["timer", "Đếm ngược"],
                  ["study", "Phương pháp học"],
                ] as const
              ).map(([id, label]) => (
                <Button key={id} onClick={() => setClockMode(id)} className={`rounded-xl px-4 py-2 text-sm font-bold ${clockMode === id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>
                  {label}
                </Button>
              ))}
            </div>

            {clockMode === "stopwatch" && (
              <div className="flex flex-col items-center justify-center rounded-[2rem] bg-slate-950 p-8 text-white">
                <div className="mb-8 text-6xl font-black tracking-tight md:text-7xl">{formatTime(stopwatchSeconds)}</div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button onClick={() => setStopwatchRunning(true)} className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 font-bold text-white">
                    <Play className="h-5 w-5" /> Bắt đầu
                  </Button>
                  <Button onClick={() => setStopwatchRunning(false)} className="flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 font-bold text-white">
                    <Pause className="h-5 w-5" /> Tạm dừng
                  </Button>
                  <Button
                    onClick={() => {
                      setStopwatchRunning(false);
                      setStopwatchSeconds(0);
                    }}
                    className="flex items-center gap-2 rounded-2xl bg-slate-700 px-6 py-3 font-bold text-white"
                  >
                    <RotateCcw className="h-5 w-5" /> Đặt lại
                  </Button>
                </div>
              </div>
            )}

            {clockMode === "timer" && (
              <div className="rounded-[2rem] bg-blue-50 p-6 text-center">
                <div className="mb-5 flex justify-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    value={timerMinutes}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setTimerMinutes(next);
                      setTimerSecondsLeft(next * 60);
                    }}
                    className="w-28 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-center text-xl font-black text-blue-700 outline-none"
                  />
                  <span className="self-center font-bold text-blue-700">phút</span>
                </div>
                <div className="mb-8 text-6xl font-black text-blue-700 md:text-7xl">{formatTime(timerSecondsLeft)}</div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button onClick={startTimer} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white">
                    <Play className="h-5 w-5" /> Bắt đầu
                  </Button>
                  <Button onClick={() => setTimerRunning(false)} className="flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 font-bold text-white">
                    <Pause className="h-5 w-5" /> Tạm dừng
                  </Button>
                  <Button onClick={resetTimer} className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-bold text-blue-700">
                    <RotateCcw className="h-5 w-5" /> Đặt lại
                  </Button>
                </div>
              </div>
            )}

            {clockMode === "study" && (
              <div className="space-y-5">
                <div className="rounded-[2rem] bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-center text-white">
                  <div className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-blue-100">{selectedMethod?.name}</div>
                  <div className="mb-2 text-6xl font-black md:text-7xl">{formatTime(studySecondsLeft)}</div>
                  <div className="mb-6 text-blue-100">{phase === "break" ? "Đang nghỉ" : phase === "finished" ? "Đã hoàn thành" : studySegments[studySegmentIndex]?.label || "Sẵn sàng học"}</div>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button onClick={startStudy} className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-bold text-blue-700">
                      <Play className="h-5 w-5" /> Bắt đầu
                    </Button>
                    <Button onClick={() => setStudyRunning(false)} className="flex items-center gap-2 rounded-2xl bg-white/15 px-6 py-3 font-bold text-white">
                      <Pause className="h-5 w-5" /> Tạm dừng
                    </Button>
                    <Button onClick={resetStudy} className="flex items-center gap-2 rounded-2xl bg-white/15 px-6 py-3 font-bold text-white">
                      <RotateCcw className="h-5 w-5" /> Đặt lại
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {studySegments.map((segment, index) => (
                    <div key={`${segment.label}-${index}`} className={`rounded-2xl border p-3 ${index === studySegmentIndex ? "border-blue-300 bg-blue-50" : "border-slate-100 bg-slate-50"}`}>
                      <div className="text-sm font-bold text-slate-800">{segment.label}</div>
                      <div className="text-xs text-slate-500">
                        {segment.phase === "break" ? "Nghỉ" : "Học"} · {Math.round(segment.seconds / 60)} phút
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <BookOpenCheck className="h-5 w-5 text-blue-600" /> Phương pháp học
              </h3>
              <div className="space-y-2">
                {allMethods.map((method) => (
                  <div key={method.id} className={`rounded-2xl border p-3 transition ${selectedMethodId === method.id ? "border-blue-300 bg-blue-50" : "border-slate-100 bg-slate-50 hover:bg-white"}`}>
                    <Button type="button" onClick={() => selectStudyMethod(method)} className="w-full text-left">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-bold text-slate-800">{method.name}</div>
                          <div className="text-xs text-slate-500">
                            Học {method.studyMinutes} phút · nghỉ {method.breakMinutes} phút/lần · {method.breakCount} lần nghỉ
                          </div>
                        </div>
                        {!method.isCustom && <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-400">Có sẵn</span>}
                      </div>
                    </Button>
                    {method.isCustom && (
                      <div className="mt-3 flex gap-2">
                        <Button type="button" onClick={() => startEditStudyMethod(method)} className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50">
                          Sửa
                        </Button>
                        <Button type="button" onClick={() => void deleteCustomStudyMethod(method)} className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                          Xóa
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <Plus className="h-5 w-5 text-blue-600" /> {editingMethodId ? "Chỉnh sửa phương pháp" : "Tạo phương pháp riêng"}
              </h3>
              <div className="space-y-3">
                <Input
                  value={customMethod.name}
                  onChange={(e) => setCustomMethod((v) => ({ ...v, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300"
                  placeholder="Tên phương pháp"
                />
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-xs font-bold text-slate-500">
                    Học
                    <Input
                      type="number"
                      min={1}
                      value={customMethod.studyMinutes}
                      onChange={(e) => setCustomMethod((v) => ({ ...v, studyMinutes: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-500">
                    Nghỉ
                    <Input
                      type="number"
                      min={1}
                      value={customMethod.breakMinutes}
                      onChange={(e) => setCustomMethod((v) => ({ ...v, breakMinutes: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-500">
                    Số lần
                    <Input
                      type="number"
                      min={0}
                      value={customMethod.breakCount}
                      onChange={(e) => setCustomMethod((v) => ({ ...v, breakCount: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  {editingMethodId && (
                    <Button type="button" onClick={resetStudyMethodForm} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 font-bold text-slate-600 hover:bg-slate-200">
                      Hủy
                    </Button>
                  )}
                  <Button
                    onClick={() => void saveCustomStudyMethod()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4" /> {editingMethodId ? "Cập nhật" : "Lưu phương pháp"}
                  </Button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      )}

      {activeTab === "translate" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Dịch thuật</h2>
                <p className="text-sm text-slate-500">Dịch văn bản, lưu lịch sử và nghe giọng đọc hai phía.</p>
              </div>
              <Button onClick={handleTranslate} disabled={isTranslating} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">
                {isTranslating ? <RotateCcw className="h-5 w-5 animate-spin" /> : <Languages className="h-5 w-5" />} Dịch ngay
              </Button>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                    {languageOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={sourceVoice}
                    onChange={(e) => setSourceVoice(e.target.value)}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                  >
                    {voiceOptions.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} · {voice.country}
                      </option>
                    ))}
                  </Select>
                </div>
                <Textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  className="h-72 w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 p-5 text-base outline-none focus:border-blue-300 focus:bg-white"
                  placeholder="Nhập nội dung cần dịch..."
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => void playText(sourceText, sourceVoice)}
                    className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                  >
                    <Volume2 className="h-4 w-4" /> Đọc bên trái
                  </Button>
                  <Button onClick={() => setSourceText("")} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500 hover:text-red-600">
                    <Eraser className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                    {languageOptions
                      .filter((item) => item.value !== "auto")
                      .map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                  </Select>
                  <Select
                    value={targetVoice}
                    onChange={(e) => setTargetVoice(e.target.value)}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                  >
                    {voiceOptions.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} · {voice.country}
                      </option>
                    ))}
                  </Select>
                </div>
                <Textarea
                  value={translatedText}
                  onChange={(e) => setTranslatedText(e.target.value)}
                  className="h-72 w-full resize-none rounded-3xl border border-blue-100 bg-blue-50/70 p-5 text-base text-blue-950 outline-none focus:border-blue-300"
                  placeholder="Bản dịch sẽ xuất hiện ở đây..."
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void playText(translatedText, targetVoice)}
                    disabled={playingAudio}
                    className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    <Volume2 className="h-4 w-4" /> Đọc bản dịch
                  </Button>
                  <Button onClick={() => navigator.clipboard.writeText(translatedText)} className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                    <Copy className="h-4 w-4" /> Sao chép
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <History className="h-5 w-5 text-blue-600" /> Lịch sử dịch
              </h3>
              <Button
                onClick={async () => {
                  await utilitiesService.clearTranslationHistory();
                  setTranslationHistory([]);
                }}
                className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
              {translationHistory.length === 0 && <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Chưa có lịch sử dịch.</div>}
              {translationHistory.map((item) => (
                <Button key={item.id} onClick={() => recallTranslation(item)} className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left hover:border-blue-200 hover:bg-blue-50">
                  <div className="line-clamp-2 text-sm font-bold text-slate-800">{item.sourceText}</div>
                  <div className="mt-1 line-clamp-2 text-sm text-blue-700">{item.translatedText}</div>
                  <div className="mt-2 text-[11px] font-bold uppercase text-slate-400">
                    {item.source} → {item.target}
                  </div>
                </Button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default Utilities;
