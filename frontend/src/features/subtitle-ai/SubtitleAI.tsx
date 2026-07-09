import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AudioWaveform,
  CheckCircle2,
  Clapperboard,
  Cpu,
  Download,
  FileText,
  Languages,
  Loader2,
  RefreshCcw,
  Settings2,
  Sparkles,
  UploadCloud,
  Video,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import "./SubtitleAI.css";
import {
  TARGET_LANGUAGES,
  WHISPER_LANGUAGES,
  WHISPER_MODELS,
  WhisperModelKey,
  createDownload,
  downloadSRT,
  translateSRT,
} from "./subtitleClientUtils";
import {
  burnSubtitleOnBackend,
  checkSubtitleBackendHealth,
  transcribeAndBurnOnBackend,
  transcribeOnBackend,
} from "./subtitleBackendApi";
import type { SubtitleBackendHealth } from "./subtitleBackendApi";

type WorkflowStep =
  | "upload"
  | "engine"
  | "subtitle"
  | "translate"
  | "export";

const STEP_LABELS: Record<WorkflowStep, string> = {
  upload: "Upload",
  engine: "Backend",
  subtitle: "Subtitle",
  translate: "Dịch",
  export: "Export",
};

function formatSize(bytes: number) {
  if (!bytes) return "-";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "-";

  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export default function SubtitleAI() {
  const [videoFileState, setVideoFileState] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState("-");
  const [videoResolution, setVideoResolution] = useState("-");
  const [modelKey, setModelKey] = useState<WhisperModelKey>("small");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("vi");
  const [subtitleText, setSubtitleText] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState("Sẵn sàng");
  const [progress, setProgress] = useState(0);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<WorkflowStep>("upload");
  const [completedSteps, setCompletedSteps] = useState<Set<WorkflowStep>>(
    () => new Set(),
  );
  const [backendHealth, setBackendHealth] = useState<SubtitleBackendHealth | null>(null);
  const [outputVideoBlob, setOutputVideoBlob] = useState<Blob | null>(null);
  const [outputVideoUrl, setOutputVideoUrl] = useState("");
  const [fontSize, setFontSize] = useState(42);
  const [subtitlePosition, setSubtitlePosition] = useState<"bottom" | "top">(
    "bottom",
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  const subtitleStats = useMemo(() => {
    const lines = subtitleText
      .split(/\n+/)
      .filter((line) => line.trim() && !line.includes("-->"));

    const blocks = subtitleText.trim()
      ? subtitleText.trim().split(/\n{2,}/).length
      : 0;

    return {
      blocks,
      lines: lines.length,
      chars: subtitleText.length,
    };
  }, [subtitleText]);

  useEffect(() => {
    consoleRef.current?.scrollTo({
      top: consoleRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [logs]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    return () => {
      if (outputVideoUrl) URL.revokeObjectURL(outputVideoUrl);
    };
  }, [outputVideoUrl]);

  function markDone(step: WorkflowStep) {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }

  function appendLog(message: string) {
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ].slice(-120));
  }

  function resetOutputOnly() {
    setSubtitleText("");
    setPartialTranscript("");
    setOutputVideoBlob(null);
    if (outputVideoUrl) URL.revokeObjectURL(outputVideoUrl);
    setOutputVideoUrl("");
    setProgress(0);
    setStatus("Sẵn sàng");
    setActiveStep(videoFileState ? "engine" : "upload");
    setCompletedSteps(new Set(videoFileState ? ["upload"] : []));
  }

  function handleVideo(file?: File | null) {
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Vui lòng chọn file video.");
      return;
    }

    if (videoUrl) URL.revokeObjectURL(videoUrl);

    setVideoFileState(file);
    setVideoUrl(URL.createObjectURL(file));
    setVideoDuration("-");
    setVideoResolution("-");
    resetOutputOnly();
    markDone("upload");
    setActiveStep("engine");

    toast.success("Đã chọn video.");
    appendLog(`Video: ${file.name} · ${formatSize(file.size)}`);
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    handleVideo(event.dataTransfer.files?.[0]);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    handleVideo(event.target.files?.[0]);
    event.target.value = "";
  }

  async function runAction(actionName: string, fn: () => Promise<void>) {
    if (busyAction) return;

    setBusyAction(actionName);
    setProgress(0);

    try {
      await fn();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Có lỗi xảy ra.");
      setStatus("Lỗi");
      appendLog(`❌ ${error?.message || error}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLoadEngines() {
    await runAction("engine", async () => {
      setActiveStep("engine");
      setStatus("Đang kiểm tra subtitle backend...");
      setProgress(0.2);

      const health = await checkSubtitleBackendHealth();
      setBackendHealth(health);
      setProgress(1);

      if (!health.ffmpeg) {
        throw new Error(health.message || "Backend chưa tìm thấy FFmpeg native.");
      }

      if (!health.hasAss && !health.hasSubtitles) {
        throw new Error("FFmpeg backend chưa có filter ass/subtitles để burn phụ đề.");
      }

      markDone("engine");
      setActiveStep("subtitle");
      setStatus("Backend sẵn sàng ✓");
      appendLog(`Backend subtitle OK · ${health.version || "FFmpeg ready"}`);
      toast.success("Backend FFmpeg + Whisper đã sẵn sàng.");
    });
  }

  async function handleGenerateSubtitle() {
    await runAction("subtitle", async () => {
      if (!videoFileState) throw new Error("Chưa chọn video.");

      setSubtitleText("");
      setPartialTranscript("");
      setOutputVideoBlob(null);
      if (outputVideoUrl) URL.revokeObjectURL(outputVideoUrl);
      setOutputVideoUrl("");
      setActiveStep("subtitle");
      setStatus("Đang upload video lên backend để nhận dạng...");

      const result = await transcribeOnBackend(videoFileState, {
        modelKey,
        language: sourceLanguage,
        maxWords: 7,
        maxChars: 42,
        maxDuration: 2.6,
        onUploadProgress(ratio) {
          setProgress(Math.min(0.35, ratio * 0.35));
          setStatus(`Đang upload video... ${Math.round(ratio * 100)}%`);
        },
      });

      setProgress(1);
      setSubtitleText(result.srt);
      setPartialTranscript(result.rawText || result.text || "");
      markDone("subtitle");
      setActiveStep("translate");
      setStatus("Đã tạo subtitle ✓");
      toast.success(`Đã tạo ${result.chunks?.length || 0} dòng phụ đề.`);
    });
  }

  async function handleTranslateSubtitle() {
    await runAction("translate", async () => {
      if (!subtitleText.trim()) throw new Error("Chưa có subtitle để dịch.");

      setActiveStep("translate");

      const translated = await translateSRT(
        subtitleText,
        sourceLanguage,
        targetLanguage,
      );

      setSubtitleText(translated);
      markDone("translate");
      setActiveStep("export");
      toast.success("Đã dịch subtitle.");
    });
  }

  async function handleBurnSubtitle() {
    await runAction("export", async () => {
      if (!videoFileState) throw new Error("Chưa chọn video.");
      if (!subtitleText.trim()) throw new Error("Chưa có subtitle.");

      setActiveStep("export");
      setStatus("Đang upload video + SRT lên backend để burn...");

      const blob = await burnSubtitleOnBackend(videoFileState, subtitleText, {
        fontSize,
        position: subtitlePosition,
        maxWords: 7,
        maxChars: 42,
        maxDuration: 2.6,
        onUploadProgress(ratio) {
          setProgress(Math.min(0.35, ratio * 0.35));
          setStatus(`Đang upload video + subtitle... ${Math.round(ratio * 100)}%`);
        },
      });

      if (outputVideoUrl) URL.revokeObjectURL(outputVideoUrl);
      const nextUrl = URL.createObjectURL(blob);
      setOutputVideoBlob(blob);
      setOutputVideoUrl(nextUrl);
      setProgress(1);
      setStatus("Đã xuất MP4 có phụ đề ✓");
      markDone("export");
      toast.success("Đã xuất video MP4 có phụ đề.");
    });
  }

  async function handleTranscribeAndBurn() {
    await runAction("export", async () => {
      if (!videoFileState) throw new Error("Chưa chọn video.");

      setSubtitleText("");
      setPartialTranscript("");
      setActiveStep("export");
      setStatus("Đang upload video để tạo subtitle và burn trên backend...");

      const blob = await transcribeAndBurnOnBackend(videoFileState, {
        modelKey,
        language: sourceLanguage,
        fontSize,
        position: subtitlePosition,
        maxWords: 7,
        maxChars: 42,
        maxDuration: 2.6,
        onUploadProgress(ratio) {
          setProgress(Math.min(0.35, ratio * 0.35));
          setStatus(`Đang upload video... ${Math.round(ratio * 100)}%`);
        },
      });

      if (outputVideoUrl) URL.revokeObjectURL(outputVideoUrl);
      const nextUrl = URL.createObjectURL(blob);
      setOutputVideoBlob(blob);
      setOutputVideoUrl(nextUrl);
      setProgress(1);
      setStatus("Đã tạo và burn video ✓");
      markDone("subtitle");
      markDone("export");
      toast.success("Đã tạo phụ đề và xuất video MP4.");
    });
  }

  function handleDownloadSRT() {
    if (!subtitleText.trim()) {
      toast.error("Chưa có subtitle để tải.");
      return;
    }

    downloadSRT(subtitleText, "zentask-subtitle.srt");
  }

  function handleDownloadVideo() {
    if (!outputVideoBlob) {
      toast.error("Chưa có video export.");
      return;
    }

    createDownload(outputVideoBlob, "zentask-video-subtitled.mp4");
  }

  const isBusy = Boolean(busyAction);

  return (
    <div className="subtitle-ai-shell custom-scrollbar" aria-busy={isBusy}>
      {isBusy && (
        <div className="subtitle-ai-loading-overlay">
          <div className="subtitle-ai-loading-card">
            <Loader2 className="animate-spin" size={32} />
            <div>
              <strong>Đang xử lý...</strong>
              <p>{status}</p>
            </div>
          </div>
        </div>
      )}
      <section className="subtitle-ai-hero">
        <div>
          <span className="subtitle-ai-kicker">ZenTask Subtitle Studio</span>
          <h2>Subtitle AI</h2>
          <p>
            Tạo phụ đề tự động bằng Whisper backend, dịch SRT và burn phụ đề bằng
            FFmpeg native trên server để tránh freeze khung hình.
          </p>
        </div>

        <div className="subtitle-ai-status">
          {isBusy ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          <span>{status}</span>
        </div>
      </section>

      <section className="subtitle-ai-steps">
        {(Object.keys(STEP_LABELS) as WorkflowStep[]).map((step) => (
          <div
            key={step}
            className={[
              "subtitle-ai-step",
              activeStep === step ? "is-active" : "",
              completedSteps.has(step) ? "is-done" : "",
            ].join(" ")}
          >
            {completedSteps.has(step) ? <CheckCircle2 size={14} /> : <span />}
            {STEP_LABELS[step]}
          </div>
        ))}
      </section>

      <div className="subtitle-ai-progress">
        <div style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>

      <section className="subtitle-ai-grid">
        <div className="subtitle-ai-card subtitle-ai-upload-card">
          <div className="subtitle-ai-card-title">
            <Video size={18} />
            <span>Video</span>
          </div>

          {!videoUrl ? (
            <div
              className="subtitle-ai-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
            >
              <UploadCloud size={34} />
              <strong>Kéo video vào đây</strong>
              <span>Hoặc bấm để chọn file MP4/WebM/MOV</span>
            </div>
          ) : (
            <div className="subtitle-ai-video-wrap">
              <video
                src={outputVideoUrl || videoUrl}
                controls
                className="subtitle-ai-video"
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget;
                  setVideoDuration(formatTime(video.duration));
                  setVideoResolution(
                    video.videoWidth
                      ? `${video.videoWidth}×${video.videoHeight}`
                      : "-",
                  );
                }}
              />

              <button
                type="button"
                className="subtitle-ai-link-button"
                onClick={() => fileInputRef.current?.click()}
              >
                Đổi video
              </button>

              {outputVideoUrl && (
                <p className="subtitle-ai-output-note">
                  Đang preview bản MP4 đã burn subtitle từ backend.
                </p>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={onFileChange}
          />

          <div className="subtitle-ai-video-info">
            <div>
              <span>File</span>
              <strong>{videoFileState?.name || "-"}</strong>
            </div>
            <div>
              <span>Dung lượng</span>
              <strong>{videoFileState ? formatSize(videoFileState.size) : "-"}</strong>
            </div>
            <div>
              <span>Thời lượng</span>
              <strong>{videoDuration}</strong>
            </div>
            <div>
              <span>Độ phân giải</span>
              <strong>{videoResolution}</strong>
            </div>
          </div>
        </div>

        <div className="subtitle-ai-card">
          <div className="subtitle-ai-card-title">
            <Settings2 size={18} />
            <span>Cấu hình</span>
          </div>

          <div className="subtitle-ai-form-grid">
            <label>
              <span>Whisper model</span>
              <select
                value={modelKey}
                onChange={(event) => setModelKey(event.target.value as WhisperModelKey)}
              >
                {(Object.keys(WHISPER_MODELS) as WhisperModelKey[]).map((key) => (
                  <option key={key} value={key}>
                    {key} · {WHISPER_MODELS[key].size}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Ngôn ngữ nguồn</span>
              <select
                value={sourceLanguage}
                onChange={(event) => setSourceLanguage(event.target.value)}
              >
                {WHISPER_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Dịch sang</span>
              <select
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
              >
                {TARGET_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Vị trí phụ đề</span>
              <select
                value={subtitlePosition}
                onChange={(event) => setSubtitlePosition(event.target.value as "bottom" | "top")}
              >
                <option value="bottom">Dưới video</option>
                <option value="top">Trên video</option>
              </select>
            </label>

            <label>
              <span>Cỡ chữ burn</span>
              <input
                type="number"
                min={14}
                max={44}
                value={fontSize}
                onChange={(event) => setFontSize(Number(event.target.value) || 22)}
              />
            </label>
          </div>

          <div className="subtitle-ai-engine-state">
            <span className={backendHealth?.ok ? "is-ok" : ""}>
              <Cpu size={14} /> Backend {backendHealth?.ok ? "online" : "not checked"}
            </span>
            <span className={backendHealth?.ffmpeg ? "is-ok" : ""}>
              <Clapperboard size={14} /> FFmpeg {backendHealth?.ffmpeg ? "native" : "unknown"}
            </span>
            <span className={backendHealth?.hasAss || backendHealth?.hasSubtitles ? "is-ok" : ""}>
              <Wand2 size={14} /> ASS/Subtitles {backendHealth?.hasAss || backendHealth?.hasSubtitles ? "ready" : "unknown"}
            </span>
            <span className={outputVideoBlob ? "is-ok" : ""}>
              <AudioWaveform size={14} /> Output {outputVideoBlob ? "ready" : "empty"}
            </span>
          </div>
        </div>
      </section>

      <section className="subtitle-ai-actions">
        <button
          type="button"
          onClick={handleLoadEngines}
          disabled={isBusy}
          className="subtitle-ai-primary"
        >
          {busyAction === "engine" ? <Loader2 className="animate-spin" size={16} /> : <Cpu size={16} />}
          Kiểm tra Backend
        </button>

        <button
          type="button"
          onClick={handleGenerateSubtitle}
          disabled={isBusy || !videoFileState}
        >
          {busyAction === "subtitle" ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
          Tạo Subtitle Backend
        </button>

        <button
          type="button"
          onClick={handleTranslateSubtitle}
          disabled={isBusy || !subtitleText.trim()}
        >
          {busyAction === "translate" ? <Loader2 className="animate-spin" size={16} /> : <Languages size={16} />}
          Dịch SRT
        </button>

        <button
          type="button"
          onClick={handleBurnSubtitle}
          disabled={isBusy || !subtitleText.trim() || !videoFileState}
        >
          {busyAction === "export" ? <Loader2 className="animate-spin" size={16} /> : <Clapperboard size={16} />}
          Burn Video Backend
        </button>

        <button
          type="button"
          onClick={handleTranscribeAndBurn}
          disabled={isBusy || !videoFileState}
        >
          {busyAction === "export" ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          Tạo + Burn 1 bước
        </button>
      </section>

      <section className="subtitle-ai-card">
        <div className="subtitle-ai-editor-head">
          <div className="subtitle-ai-card-title">
            <FileText size={18} />
            <span>SRT Editor</span>
          </div>

          <div className="subtitle-ai-editor-stats">
            <span>{subtitleStats.blocks} block</span>
            <span>{subtitleStats.chars} ký tự</span>
          </div>
        </div>

        {partialTranscript && !subtitleText && (
          <div className="subtitle-ai-partial">
            <strong>Realtime transcript</strong>
            <p>{partialTranscript}</p>
          </div>
        )}

        <textarea
          value={subtitleText}
          onChange={(event) => setSubtitleText(event.target.value)}
          placeholder="Subtitle SRT sẽ xuất hiện ở đây..."
          className="subtitle-ai-editor"
        />

        <div className="subtitle-ai-downloads">
          <button type="button" onClick={handleDownloadSRT}>
            <Download size={16} />
            Tải SRT
          </button>

          <button type="button" onClick={handleDownloadVideo}>
            <Download size={16} />
            Tải video
          </button>

          <button type="button" onClick={resetOutputOnly}>
            <RefreshCcw size={16} />
            Reset
          </button>
        </div>
      </section>

      <section className="subtitle-ai-card">
        <div className="subtitle-ai-card-title">
          <Sparkles size={18} />
          <span>Console</span>
        </div>

        <div ref={consoleRef} className="subtitle-ai-console">
          {logs.length ? (
            logs.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)
          ) : (
            <p>Chưa có log.</p>
          )}
        </div>
      </section>
    </div>
  );
}
