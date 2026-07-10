import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Headphones, Mic, Edit3, Zap, RefreshCw, Volume2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { pronunciationService } from "../services/pronunciationService";
import { useTTSAudio } from "../hooks/useTTSAudio";

const API_URL = import.meta.env.VITE_API_BACKEND || "http://localhost:3001";

type Mode = "listening" | "speaking" | "fill_blank" | "reflex";

const MODE_META: Record<Mode, { title: string; icon: any; color: string }> = {
  listening: { title: "Luyện nghe", icon: Headphones, color: "blue" },
  speaking: { title: "Luyện nói", icon: Mic, color: "purple" },
  fill_blank: { title: "Điền từ", icon: Edit3, color: "emerald" },
  reflex: { title: "Phản xạ", icon: Zap, color: "orange" },
};

function normalizeWebmDataUrl(value: string) {
  const raw = String(value || "").trim().replace(/\s+/g, "");
  const commaIndex = raw.indexOf(",");
  if (commaIndex === -1) return raw;
  return `data:audio/webm;base64,${raw.slice(commaIndex + 1)}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Không đọc được ghi âm."));
    reader.readAsDataURL(blob);
  });
}

function normalizeAnswer(value: string) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[“”"'.,!?;:()\[\]{}]/g, "")
    .replace(/\s+/g, " ");
}

function correctAnswerOf(exercise: any) {
  return String(exercise?.targetAnswer || exercise?.correctAnswer || "").trim();
}

export default function SkillPracticeRoom() {
  const { mode: rawMode } = useParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const { playAudio, playSoundEffect, isLoading: ttsLoading } = useTTSAudio();
  const mode = (rawMode && ["listening", "speaking", "fill_blank", "reflex"].includes(rawMode) ? rawMode : "listening") as Mode;
  const meta = MODE_META[mode];
  const Icon = meta.icon;

  const [exercise, setExercise] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<any>(null);
  const [daily, setDaily] = useState<any>({ completedModes: [], bonusClaimed: false });
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [recording, setRecording] = useState(false);
  const [pickedOption, setPickedOption] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isCompletedToday = daily?.completedModes?.includes(mode);

  const fetchDaily = async () => {
    const res = await fetch(`${API_URL}/api/skill-practice/daily`, { credentials: "include", cache: "no-store" });
    if (res.ok) setDaily(await res.json());
  };

  const loadExercise = async () => {
    setLoading(true);
    setResult(null);
    setAnswer("");
    setPickedOption(null);
    try {
      const res = await fetch(`${API_URL}/api/skill-practice/random?mode=${mode}&t=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Không tạo được bài luyện tập");
      const data = await res.json();
      setExercise({ ...data, _renderKey: `${mode}_${data.id || data.variantId || "exercise"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` });
      setStartedAt(Date.now());
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải bài");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDaily();
    loadExercise();
  }, [mode]);

  const speak = (text: string) => {
    const value = String(text || "").trim();
    if (!value) return;
    void playAudio(value);
  };

  const submit = async (isCorrect: boolean, responseMs = Date.now() - startedAt, extra: any = {}) => {
    if (!exercise || result) return;
    void playSoundEffect(isCorrect ? "correct" : "wrong");
    try {
      const res = await fetch(`${API_URL}/api/skill-practice/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode, isCorrect, responseMs, exerciseId: exercise?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Không lưu được kết quả");
      setResult({ isCorrect, responseMs, correctAnswer: correctAnswerOf(exercise), ...extra, ...data });
      setDaily({ completedModes: data.completedModes, bonusClaimed: data.bonusClaimed });
      if (data.xpResult) updateUser({ xp: data.xpResult.xp, level: data.xpResult.level });
      if (data.awardedXp > 0) toast.success(`+${data.awardedXp} XP`);
      else if (isCompletedToday) toast("Hôm nay bạn đã nhận thưởng cho chế độ này rồi.");
    } catch (err: any) {
      toast.error(err.message || "Lỗi nộp bài");
    }
  };

  const checkTextAnswer = () => {
    const target = normalizeAnswer(correctAnswerOf(exercise));
    const mine = normalizeAnswer(answer);
    submit(!!target && mine === target, Date.now() - startedAt, { userAnswer: answer });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const base64Audio = normalizeWebmDataUrl(await blobToDataUrl(blob));
          const target = String(exercise?.sentence || exercise?.targetAnswer || "").trim();
          const response = await pronunciationService.assess({ title: target.toLowerCase(), base64Audio, language: "en" });
          const resultString = JSON.stringify(response.result || {}).toLowerCase();
          const scoreMatch = resultString.match(/(?:accuracy|score)[^0-9]{0,12}(\d{1,3})/i);
          const score = scoreMatch ? Math.min(100, Number(scoreMatch[1])) : 75;
          submit(score >= 60, Date.now() - startedAt, { pronunciationScore: score });
        } catch (err: any) {
          toast.error(err.message || "Không chấm được phát âm, hãy thử lại.");
        } finally {
          stream.getTracks().forEach((t) => t.stop());
          setRecording(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
    } catch (err) {
      toast.error("Không mở được micro.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
    }
  };

  const renderTtsButton = (text: string, label = "Nghe") => (
    <button
      type="button"
      onClick={() => speak(text)}
      disabled={ttsLoading || !String(text || "").trim()}
      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
    >
      {ttsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
      {label}
    </button>
  );

  const renderBody = () => {
    if (!exercise) return null;

    if (mode === "listening") {
      return (
        <div className="space-y-5" key={exercise._renderKey}>
          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
            <p className="text-sm font-bold uppercase text-blue-500">Đoạn nghe</p>
            <h2 className="mt-3 text-2xl font-black text-gray-900">Nghe câu và gõ lại chính xác</h2>
            <p className="mt-2 text-sm font-semibold text-blue-700">Nội dung cần nghe đã được ẩn để bạn luyện nghe thật sự.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => speak(exercise.targetAnswer)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700">
                <Volume2 className="h-5 w-5" /> Nghe câu cần gõ
              </button>
              {renderTtsButton(exercise.instruction || "Listen and type the sentence.", "Nghe hướng dẫn")}
            </div>
          </div>
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Gõ lại câu bạn nghe được..." className="w-full rounded-2xl border border-gray-200 p-4 font-semibold outline-none focus:border-blue-500" />
          <button onClick={checkTextAnswer} disabled={!!result} className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50">Nộp đáp án</button>
        </div>
      );
    }

    if (mode === "speaking") {
      return (
        <div className="space-y-5" key={exercise._renderKey}>
          <div className="rounded-3xl border border-purple-100 bg-purple-50 p-6 text-center">
            <p className="text-sm font-bold uppercase text-purple-500">Đọc to câu này</p>
            <h2 className="mt-3 text-3xl font-black text-gray-900">{exercise.sentence}</h2>
            <div className="mt-5 flex justify-center">{renderTtsButton(exercise.sentence, "Nghe mẫu")}</div>
          </div>
          {!recording ? (
            <button onClick={startRecording} disabled={!!result} className="w-full rounded-2xl bg-purple-600 px-6 py-4 font-black text-white hover:bg-purple-700 disabled:opacity-50">Bắt đầu ghi âm</button>
          ) : (
            <button onClick={stopRecording} className="w-full rounded-2xl bg-red-600 px-6 py-4 font-black text-white hover:bg-red-700">Dừng & chấm phát âm</button>
          )}
        </div>
      );
    }

    if (mode === "fill_blank") {
      return (
        <div className="space-y-5" key={exercise._renderKey}>
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
            <p className="text-sm font-bold uppercase text-emerald-500">Điền từ còn thiếu</p>
            <h2 className="mt-3 break-words text-2xl font-black text-gray-900">{exercise.blankSentence}</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {renderTtsButton(exercise.sentence || exercise.blankSentence, "Nghe câu")}
              {renderTtsButton(exercise.instruction || "Fill in the missing word.", "Nghe hướng dẫn")}
            </div>
          </div>
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Nhập từ còn thiếu..." className="w-full rounded-2xl border border-gray-200 p-4 font-semibold outline-none focus:border-emerald-500" />
          <button onClick={checkTextAnswer} disabled={!!result} className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white disabled:opacity-50">Nộp đáp án</button>
        </div>
      );
    }

    return (
      <div className="space-y-5" key={exercise._renderKey}>
        <div className="rounded-3xl border border-orange-100 bg-orange-50 p-6">
          <p className="text-sm font-bold uppercase text-orange-500">Chọn nhanh A/B/C/D</p>
          <h2 className="mt-3 text-2xl font-black text-gray-900">{exercise.question}</h2>
          <div className="mt-5">{renderTtsButton(exercise.question, "Nghe câu hỏi")}</div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" key={`${exercise._renderKey}_options`}>
          {(exercise.options || []).map((opt: string, idx: number) => {
            const isCorrect = normalizeAnswer(opt) === normalizeAnswer(exercise.correctAnswer);
            const isPicked = pickedOption === opt;
            const showState = !!result;
            const stateClass = showState && isCorrect
              ? "border-green-400 bg-green-50 text-green-800"
              : showState && isPicked && !isCorrect
                ? "border-red-400 bg-red-50 text-red-800"
                : "border-gray-200 bg-white hover:border-orange-400 hover:bg-orange-50";
            return (
              <button
                key={`${exercise._renderKey}_${idx}_${opt}`}
                onClick={() => {
                  if (result) return;
                  setPickedOption(opt);
                  submit(isCorrect, Date.now() - startedAt, { userAnswer: opt });
                }}
                className={`rounded-2xl border p-4 text-left font-bold transition ${stateClass}`}
              >
                <span>{String.fromCharCode(65 + idx)}. {opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button onClick={() => navigate("/beginner")} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900"><ArrowLeft className="h-4 w-4" /> Quay lại</button>
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white"><Icon className="h-7 w-7" /></div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">{meta.title}</h1>
              <p className="text-sm font-medium text-gray-500">Bài được AI tổng hợp ngẫu nhiên từ phong cách VOA English và British Council Learning English.</p>
            </div>
          </div>
          <button onClick={loadExercise} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><RefreshCw className="h-5 w-5" /> Đổi bài</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          {(["listening", "speaking", "fill_blank", "reflex"] as Mode[]).map((m) => (
            <span key={m} className={`rounded-full px-3 py-1 ${daily?.completedModes?.includes(m) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{MODE_META[m].title}</span>
          ))}
          {daily?.bonusClaimed && <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">Đã nhận +50XP hôm nay</span>}
        </div>
      </div>

      <div className="min-h-[360px] rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        {loading ? <div className="p-16 text-center font-bold text-gray-500">Đang tạo bài bằng AI...</div> : renderBody()}
        {result && (
          <div className={`mt-6 rounded-2xl p-5 ${result.isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            <div className="flex items-center gap-2 font-black">
              {result.isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              {result.isCorrect ? "Đúng rồi" : "Chưa đúng"}
            </div>
            {mode !== "speaking" && !result.isCorrect && <p className="mt-2 text-sm font-semibold">Đáp án đúng: {result.correctAnswer}</p>}
            {result.userAnswer && <p className="mt-1 text-sm font-semibold">Bạn đã chọn/nhập: {result.userAnswer}</p>}
            {typeof result.pronunciationScore === "number" && <p className="mt-1 text-sm font-semibold">Điểm phát âm: {result.pronunciationScore}/100</p>}
            <p className="mt-2 text-sm font-semibold">XP nhận được: {result.awardedXp || 0}</p>
          </div>
        )}
      </div>
    </div>
  );
}
