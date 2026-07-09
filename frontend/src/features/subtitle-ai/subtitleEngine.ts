import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export type WhisperModelKey =
  | "tiny"
  | "tiny.en"
  | "base"
  | "small"
  | "small.en";

export const WHISPER_MODELS: Record<
  WhisperModelKey,
  { id: string; size: string; note?: string }
> = {
  tiny: {
    id: "Xenova/whisper-tiny",
    size: "~75 MB",
    note: "Nhanh nhất",
  },
  "tiny.en": {
    id: "Xenova/whisper-tiny.en",
    size: "~75 MB",
    note: "Chỉ tiếng Anh",
  },
  base: {
    id: "Xenova/whisper-base",
    size: "~145 MB",
    note: "Cân bằng",
  },
  small: {
    id: "Xenova/whisper-small",
    size: "~250 MB",
    note: "Chính xác hơn",
  },
  "small.en": {
    id: "Xenova/whisper-small.en",
    size: "~250 MB",
    note: "Chỉ tiếng Anh",
  },
};

export const WHISPER_LANGUAGES = [
  { label: "Auto detect", value: "auto" },
  { label: "English", value: "english" },
  { label: "Vietnamese", value: "vietnamese" },
  { label: "Chinese", value: "chinese" },
  { label: "Japanese", value: "japanese" },
  { label: "Korean", value: "korean" },
  { label: "French", value: "french" },
  { label: "German", value: "german" },
  { label: "Spanish", value: "spanish" },
  { label: "Thai", value: "thai" },
  { label: "Indonesian", value: "indonesian" },
];

export const TARGET_LANGUAGES = [
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

type CallbackSet = {
  onStatus?: (message: string) => void;
  onProgress?: (ratio: number) => void;
  onLog?: (message: string) => void;
  onChunk?: (text: string, ratio: number) => void;
};

const callbacks: Required<CallbackSet> = {
  onStatus: () => {},
  onProgress: () => {},
  onLog: console.log,
  onChunk: () => {},
};

let ffmpeg: FFmpeg | null = null;
let ffmpegReady = false;
let transcriber: any = null;
let loadedModel = "";

let currentVideo: File | null = null;
let currentAudio: Uint8Array | null = null;
let outputVideo: Blob | null = null;

export function setSubtitleCallbacks(next: CallbackSet) {
  callbacks.onStatus = next.onStatus || callbacks.onStatus;
  callbacks.onProgress = next.onProgress || callbacks.onProgress;
  callbacks.onLog = next.onLog || callbacks.onLog;
  callbacks.onChunk = next.onChunk || callbacks.onChunk;
}

/* Compatibility with the earlier React component */
export const setCallbacks = setSubtitleCallbacks;

function status(message: string) {
  callbacks.onStatus(message);
}

function progress(ratio: number) {
  callbacks.onProgress(Math.max(0, Math.min(1, ratio)));
}

function log(message: string) {
  callbacks.onLog(message);
}

function safeFileName(file: File) {
  const ext = file.name.split(".").pop() || "mp4";

  return `input.${ext.replace(/[^a-z0-9]/gi, "")}`;
}

export function setSubtitleVideo(file: File) {
  currentVideo = file;
  currentAudio = null;
  outputVideo = null;
}

/* Compatibility with the earlier React component */
export const setVideoFile = setSubtitleVideo;

export async function loadFFmpeg() {
  if (ffmpegReady && ffmpeg) {
    status("FFmpeg đã sẵn sàng");
    return;
  }

  status("Đang tải FFmpeg...");
  progress(0);

  const instance = new FFmpeg();

  instance.on("log", ({ message }: { message: string }) => {
    if (message) log(message);
  });

  instance.on("progress", ({ progress: ratio }: { progress: number }) => {
    progress(ratio || 0);
    status(`FFmpeg đang xử lý... ${Math.round((ratio || 0) * 100)}%`);
  });

  /*
   * Vite không cho import JS module từ /public.
   * Vì vậy @ffmpeg/ffmpeg và @ffmpeg/util được import từ node_modules.
   * Chỉ core JS/WASM được đọc như URL public và chuyển sang blob.
   */
  const coreBase = "/ffmpeg/core";

  await instance.load({
    coreURL: await toBlobURL(
      `${coreBase}/ffmpeg-core.js`,
      "text/javascript",
    ),
    wasmURL: await toBlobURL(
      `${coreBase}/ffmpeg-core.wasm`,
      "application/wasm",
    ),
  });

  ffmpeg = instance;
  ffmpegReady = true;

  progress(1);
  status("FFmpeg loaded ✓");
}

export async function extractAudio(file = currentVideo) {
  if (!file) throw new Error("Chưa chọn video.");
  if (!ffmpegReady || !ffmpeg) await loadFFmpeg();
  if (!ffmpeg) throw new Error("FFmpeg chưa sẵn sàng.");

  const inputName = safeFileName(file);
  const audioName = "audio.wav";

  status("Đang tách audio 16kHz mono...");
  progress(0);

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  await ffmpeg.exec([
    "-i",
    inputName,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-f",
    "wav",
    audioName,
  ]);

  const data = await ffmpeg.readFile(audioName);
  currentAudio = new Uint8Array(
    data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBuffer),
  );

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(audioName);
  } catch {
    // ignore cleanup errors
  }

  progress(1);
  status("Audio ready ✓");

  return currentAudio;
}

async function importTransformers() {
  try {
    const mod = (await import("@xenova/transformers")) as any;
    const transformers = mod?.default ?? mod;

    if (transformers && typeof transformers.pipeline === "function") {
      return transformers;
    }

    log("Transformers import from @xenova/transformers loaded but did not expose pipeline.");
  } catch (error: any) {
    log(`Transformers import failed from @xenova/transformers: ${error?.message || error}`);
  }

  try {
    // @ts-ignore: dynamic transformer bundle path without declarations
    const mod = (await import("@xenova/transformers/dist/transformers.min.js")) as any;
    const transformers = mod?.default ?? mod;

    if (transformers && typeof transformers.pipeline === "function") {
      return transformers;
    }

    log("Transformers import from @xenova/transformers/dist/transformers.min.js loaded but did not expose pipeline.");
  } catch (error: any) {
    log(`Transformers import failed from @xenova/transformers/dist/transformers.min.js: ${error?.message || error}`);
  }

  try {
    // @ts-ignore: remote transformer CDN import used at runtime
    const mod = (await import(
      /* @vite-ignore */
      "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js",
    )) as any;
    const transformers = mod?.default ?? mod;

    if (transformers && typeof transformers.pipeline === "function") {
      return transformers;
    }

    throw new Error("Remote Transformers bundle loaded but did not expose pipeline.");
  } catch (error: any) {
    throw new Error(
      "Không tải được @xenova/transformers local hoặc CDN. Vui lòng kiểm tra cấu hình Vite và các aliases onnxruntime. " +
        (error?.message || error),
    );
  }
}

export async function loadWhisper(modelKey: WhisperModelKey = "small") {
  const model = WHISPER_MODELS[modelKey];

  if (!model) throw new Error("Model Whisper không hợp lệ.");

  if (transcriber && loadedModel === model.id) {
    status("Whisper đã sẵn sàng");
    return;
  }

  status(`Đang tải Whisper ${modelKey}...`);
  progress(0);

  const mod = await importTransformers();
  const pipeline = mod.pipeline || mod.default?.pipeline;
  const env = mod.env || mod.default?.env;

  if (!pipeline || !env) {
    throw new Error("Transformers module không có pipeline hoặc env.");
  }

  env.allowRemoteModels = true;
  env.allowLocalModels = false;

  transcriber = await pipeline("automatic-speech-recognition", model.id, {
    progress_callback(event: any) {
      if (event.status === "progress") {
        progress((event.progress || 0) / 100);
        status(`Tải Whisper... ${Math.round(event.progress || 0)}%`);
      }

      if (event.status === "done" && event.file) {
        log(`✓ ${event.file}`);
      }
    },
  });

  if (!transcriber) {
    throw new Error("Whisper không thể khởi tạo.");
  }

  loadedModel = model.id;
  progress(1);
  status("Whisper loaded ✓");
}

function readText(view: DataView, offset: number, length: number) {
  let output = "";

  for (let i = 0; i < length; i += 1) {
    output += String.fromCharCode(view.getUint8(offset + i));
  }

  return output;
}

function wavToFloat32(wav: Uint8Array) {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);

  if (readText(view, 0, 4) !== "RIFF" || readText(view, 8, 4) !== "WAVE") {
    throw new Error("Audio WAV không hợp lệ.");
  }

  let offset = 12;
  let channels = 1;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= view.byteLength) {
    const id = readText(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const data = offset + 8;

    if (id === "fmt ") {
      channels = view.getUint16(data + 2, true);
      bitsPerSample = view.getUint16(data + 14, true);
    }

    if (id === "data") {
      dataOffset = data;
      dataSize = size;
      break;
    }

    offset = data + size + (size % 2);
  }

  if (dataOffset < 0) throw new Error("Không tìm thấy data chunk trong WAV.");
  if (bitsPerSample !== 16) throw new Error("Chỉ hỗ trợ WAV PCM 16-bit.");

  const sampleCount = Math.floor(dataSize / 2 / channels);
  const samples = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i += 1) {
    let sum = 0;

    for (let ch = 0; ch < channels; ch += 1) {
      const sample = view.getInt16(dataOffset + (i * channels + ch) * 2, true);
      sum += sample / 32768;
    }

    samples[i] = sum / channels;
  }

  return samples;
}

function cleanText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/(.{2,}?)\s+\1/gi, "$1")
    .trim();
}

function secondsToSrt(seconds: number) {
  const ms = Math.floor((seconds % 1) * 1000);
  const total = Math.floor(seconds);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);

  return (
    `${String(h).padStart(2, "0")}:` +
    `${String(m).padStart(2, "0")}:` +
    `${String(s).padStart(2, "0")},` +
    `${String(ms).padStart(3, "0")}`
  );
}

export function chunksToSrt(
  chunks: Array<{
    start: number;
    end: number;
    text: string;
  }>,
) {
  return chunks
    .map((chunk, index) => {
      return [
        index + 1,
        `${secondsToSrt(chunk.start)} --> ${secondsToSrt(chunk.end)}`,
        chunk.text,
      ].join("\n");
    })
    .join("\n\n");
}

/* Compatibility with earlier code that imported chunksToSRT */
export const chunksToSRT = chunksToSrt;

export function mergeShortChunks(
  chunks: Array<{
    start: number;
    end: number;
    text: string;
  }>,
  maxDuration = 4,
  maxChars = 84,
) {
  const merged: Array<{
    start: number;
    end: number;
    text: string;
  }> = [];

  for (const chunk of chunks) {
    const last = merged[merged.length - 1];

    if (
      last &&
      chunk.end - last.start <= maxDuration &&
      `${last.text} ${chunk.text}`.length <= maxChars
    ) {
      last.end = chunk.end;
      last.text = `${last.text} ${chunk.text}`.trim();
      continue;
    }

    merged.push({ ...chunk });
  }

  return merged;
}


type TimedSubtitleChunk = {
  start: number;
  end: number;
  text: string;
};

const BURN_SUBTITLE_LIMITS = {
  maxChars: 38,
  maxWords: 7,
  maxDuration: 2.2,
  minDuration: 0.45,
};

function countWords(text: string) {
  return cleanText(text).split(/\s+/).filter(Boolean).length;
}

function endsWithStrongPunctuation(text: string) {
  return /[.!?。！？]$/.test(text.trim());
}

function endsWithSoftPunctuation(text: string) {
  return /[,;:，、]$/.test(text.trim());
}

function normalizeTimedChunks(chunks: TimedSubtitleChunk[]) {
  return chunks
    .map((chunk) => ({
      start: Math.max(0, Number(chunk.start) || 0),
      end: Math.max(0, Number(chunk.end) || 0),
      text: cleanText(chunk.text || ""),
    }))
    .filter((chunk) => chunk.text)
    .map((chunk) => ({
      ...chunk,
      end: chunk.end > chunk.start ? chunk.end : chunk.start + 0.8,
    }))
    .sort((a, b) => a.start - b.start);
}

function preventCaptionOverlap(chunks: TimedSubtitleChunk[]) {
  const output = normalizeTimedChunks(chunks);

  for (let i = 0; i < output.length; i += 1) {
    const chunk = output[i];
    const next = output[i + 1];

    if (chunk.end - chunk.start < BURN_SUBTITLE_LIMITS.minDuration) {
      chunk.end = chunk.start + BURN_SUBTITLE_LIMITS.minDuration;
    }

    if (next && chunk.end > next.start - 0.03) {
      chunk.end = Math.max(chunk.start + 0.25, next.start - 0.03);
    }
  }

  return output.filter((chunk) => chunk.end > chunk.start);
}

function isLikelyWordTimestampChunks(chunks: TimedSubtitleChunk[]) {
  if (chunks.length < 5) return false;

  const shortItems = chunks.filter((chunk) => countWords(chunk.text) <= 2).length;
  return shortItems / chunks.length > 0.65;
}

function groupWordTimestampChunks(chunks: TimedSubtitleChunk[]) {
  const output: TimedSubtitleChunk[] = [];
  let current: TimedSubtitleChunk | null = null;
  let currentWords = 0;

  const flush = () => {
    if (current && current.text.trim()) {
      output.push({ ...current, text: cleanText(current.text) });
    }
    current = null;
    currentWords = 0;
  };

  for (const chunk of chunks) {
    const text = cleanText(chunk.text);
    if (!text) continue;

    const wordCount = Math.max(1, countWords(text));

    if (current) {
      const nextText = `${current.text} ${text}`.trim();
      const nextWords = currentWords + wordCount;
      const nextDuration = chunk.end - current.start;
      const shouldSplitBefore =
        nextText.length > BURN_SUBTITLE_LIMITS.maxChars ||
        nextWords > BURN_SUBTITLE_LIMITS.maxWords ||
        nextDuration > BURN_SUBTITLE_LIMITS.maxDuration ||
        (endsWithStrongPunctuation(current.text) && currentWords >= 2) ||
        (endsWithSoftPunctuation(current.text) && currentWords >= 4);

      if (shouldSplitBefore) {
        flush();
      }
    }

    if (!current) {
      current = { start: chunk.start, end: chunk.end, text };
      currentWords = wordCount;
    } else {
      current.end = Math.max(current.end, chunk.end);
      current.text = `${current.text} ${text}`.trim();
      currentWords += wordCount;
    }
  }

  flush();
  return preventCaptionOverlap(output);
}

function splitSegmentChunk(chunk: TimedSubtitleChunk) {
  const words = cleanText(chunk.text).split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const groups: string[][] = [];
  let group: string[] = [];

  const flush = () => {
    if (group.length) groups.push(group);
    group = [];
  };

  for (const word of words) {
    const next = [...group, word];
    const nextText = next.join(" ");
    const shouldSplitBefore =
      group.length > 0 &&
      (nextText.length > BURN_SUBTITLE_LIMITS.maxChars ||
        next.length > BURN_SUBTITLE_LIMITS.maxWords);

    if (shouldSplitBefore) flush();

    group.push(word);

    if (
      (endsWithStrongPunctuation(word) && group.length >= 2) ||
      (endsWithSoftPunctuation(word) && group.length >= 4)
    ) {
      flush();
    }
  }

  flush();

  if (groups.length <= 1) {
    return [{ ...chunk, text: words.join(" ") }];
  }

  const duration = Math.max(chunk.end - chunk.start, 0.1);
  const totalWords = groups.reduce((sum, item) => sum + item.length, 0);
  let wordCursor = 0;

  return groups.map((item) => {
    const start = chunk.start + (duration * wordCursor) / totalWords;
    wordCursor += item.length;
    const end = chunk.start + (duration * wordCursor) / totalWords;

    return {
      start,
      end,
      text: item.join(" "),
    };
  });
}

function makeReadableSubtitleChunks(chunks: TimedSubtitleChunk[]) {
  const normalized = normalizeTimedChunks(chunks);

  if (isLikelyWordTimestampChunks(normalized)) {
    return groupWordTimestampChunks(normalized);
  }

  return preventCaptionOverlap(
    normalized.flatMap((chunk) => splitSegmentChunk(chunk)),
  );
}

function parseSrtToTimedChunks(srt: string) {
  return makeReadableSubtitleChunks(
    parseSrt(srt).map((block) => {
      const [startRaw, endRaw] = block.time.split("-->").map((item) => item.trim());

      return {
        start: srtTimeToSeconds(startRaw),
        end: srtTimeToSeconds(endRaw),
        text: block.text,
      };
    }),
  );
}

function findSubtitleByTime(
  blocks: TimedSubtitleChunk[],
  currentTime: number,
) {
  let low = 0;
  let high = blocks.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const block = blocks[mid];

    if (currentTime < block.start) {
      high = mid - 1;
    } else if (currentTime > block.end) {
      low = mid + 1;
    } else {
      return block;
    }
  }

  return null;
}

function createProgressThrottle() {
  let lastStatusAt = 0;
  let lastPercent = -1;

  return (ratio: number, force = false) => {
    const now = performance.now();
    const percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);

    if (force || percent !== lastPercent || now - lastStatusAt > 500) {
      lastStatusAt = now;
      lastPercent = percent;
      progress(ratio);
      status(`Burn video... ${percent}%`);
    }
  };
}

export async function transcribeToSrt(options: {
  modelKey?: WhisperModelKey;
  language?: string;
  chunkLengthS?: number;
  strideLengthS?: number;
}) {
  if (!currentAudio) {
    throw new Error("Chưa có audio. Hãy bấm Extract Audio trước.");
  }

  await loadWhisper(options.modelKey || "small");

  status("Đang nhận dạng giọng nói...");
  progress(0);

  const audio = wavToFloat32(currentAudio);

  const result = await transcriber(audio, {
    language:
      options.language && options.language !== "auto"
        ? options.language
        : undefined,
    task: "transcribe",
    // Word timestamps giúp chia phụ đề theo câu ngắn hơn, tránh dồn cả đoạn vào một frame.
    // Nếu browser/model không trả word timestamp, makeReadableSubtitleChunks() sẽ fallback chia theo segment.
    return_timestamps: "word" as any,
    chunk_length_s: options.chunkLengthS || 30,
    stride_length_s: options.strideLengthS || 2,
  });

  const chunks = Array.isArray(result.chunks)
    ? result.chunks
        .map((chunk: any) => {
          const timestamp = Array.isArray(chunk.timestamp)
            ? chunk.timestamp
            : [0, 2];

          const start = Number(timestamp[0] || 0);
          const end = Number(timestamp[1] || start + 2);

          return {
            start,
            end: end > start ? end : start + 2,
            text: cleanText(chunk.text || ""),
          };
        })
        .filter((chunk: any) => chunk.text)
    : [];

  const readableChunks = makeReadableSubtitleChunks(chunks);
  const srt = chunksToSrt(readableChunks);

  progress(1);
  status("Đã tạo subtitle ✓");

  return srt;
}

/* Compatibility with earlier component that expected a detailed result */
export async function transcribeAudio(options: {
  modelKey?: WhisperModelKey;
  language?: string;
  chunkLengthS?: number;
  strideLengthS?: number;
}) {
  const srt = await transcribeToSrt(options);

  const chunks = parseSrt(srt).map((block) => {
    const [startRaw, endRaw] = block.time.split("-->").map((item) => item.trim());

    return {
      start: srtTimeToSeconds(startRaw),
      end: srtTimeToSeconds(endRaw),
      text: block.text,
    };
  });

  return {
    text: chunks.map((chunk) => chunk.text).join(" "),
    language: options.language || "auto",
    chunks,
  };
}

type SrtBlock = {
  index: number;
  time: string;
  text: string;
};

function parseSrt(srt: string): SrtBlock[] {
  return srt
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n");

      if (lines.length < 3 || !lines[1].includes("-->")) {
        return null;
      }

      return {
        index: Number(lines[0]),
        time: lines[1],
        text: lines.slice(2).join("\n"),
      };
    })
    .filter(Boolean) as SrtBlock[];
}

function buildSrt(blocks: SrtBlock[]) {
  return blocks
    .map((block, index) => [index + 1, block.time, block.text].join("\n"))
    .join("\n\n");
}

function srtTimeToSeconds(value: string) {
  const match = value.match(/(\d+):(\d+):(\d+),(\d+)/);

  if (!match) return 0;

  const [, h, m, s, ms] = match;

  return (
    Number(h) * 3600 +
    Number(m) * 60 +
    Number(s) +
    Number(ms) / 1000
  );
}

async function translateText(text: string, target: string) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx" +
    "&sl=auto" +
    `&tl=${encodeURIComponent(target)}` +
    "&dt=t&q=" +
    encodeURIComponent(text);

  const response = await fetch(url);

  if (!response.ok) throw new Error(`Translate HTTP ${response.status}`);

  const data = await response.json();

  return Array.isArray(data?.[0])
    ? data[0].map((item: any[]) => item[0]).join("")
    : text;
}

export async function translateSrt(srt: string, target: string) {
  const blocks = parseSrt(srt);

  if (!blocks.length) throw new Error("SRT rỗng hoặc không hợp lệ.");

  status("Đang dịch subtitle...");
  progress(0);

  const translated: SrtBlock[] = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];

    translated.push({
      ...block,
      text: await translateText(block.text, target),
    });

    progress((i + 1) / blocks.length);
    status(`Dịch ${i + 1}/${blocks.length}`);
  }

  status("Đã dịch xong ✓");

  return buildSrt(translated);
}

/* Compatibility with earlier component that imported translateSRT */
export const translateSRT = translateSrt;

function getCurrentSubtitle(
  blocks: Array<{ start: number; end: number; text: string }>,
  currentTime: number,
) {
  return blocks.find(
    (block) => currentTime >= block.start && currentTime <= block.end,
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function drawSubtitleOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  block: { text: string } | null,
  options: { fontSize: number; position: "bottom" | "top" },
) {
  if (!block || !block.text) return;

  const fontSize = options.fontSize;
  const lineHeight = fontSize * 1.25;
  const padding = 18;
  const maxWidth = width - padding * 2;

  ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";

  const lines = wrapText(ctx, block.text, maxWidth);
  const textMetrics = lines.map((line) => ctx.measureText(line).width);
  const boxWidth = Math.min(maxWidth, Math.max(...textMetrics) + 24);
  const boxHeight = lines.length * lineHeight + 18;
  const x = width / 2;
  const y =
    options.position === "top"
      ? padding + boxHeight / 2
      : height - padding - boxHeight / 2;

  ctx.fillRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);

  ctx.fillStyle = "#ffffff";
  for (let index = 0; index < lines.length; index += 1) {
    ctx.fillText(
      lines[index],
      x,
      y - boxHeight / 2 + padding / 2 + index * lineHeight + lineHeight / 2,
    );
  }
}

async function burnSubtitleUsingCanvas(
  srt: string,
  options: { fontSize?: number; position?: "bottom" | "top"; fps?: number },
  file: File,
) {
  if (!file) throw new Error("Chưa chọn video.");
  if (!srt.trim()) throw new Error("Chưa có subtitle.");

  if (typeof MediaRecorder === "undefined") {
    throw new Error("MediaRecorder không được hỗ trợ trên trình duyệt này.");
  }

  status("Đang tạo video với subtitle bằng canvas...");
  progress(0);

  const videoUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = videoUrl;
  video.muted = false;
  video.volume = 0;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  video.style.position = "fixed";
  video.style.left = "-9999px";
  video.style.top = "0";
  video.style.width = "1px";
  video.style.height = "1px";
  video.style.opacity = "0";
  video.style.pointerEvents = "none";

  document.body.appendChild(video);

  let audioContext: AudioContext | null = null;
  let outputStream: MediaStream | null = null;
  let animationFrameId = 0;
  let ended = false;

  const cleanup = async () => {
    ended = true;

    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    try {
      outputStream?.getTracks().forEach((track) => track.stop());
    } catch {
      // ignore cleanup errors
    }

    try {
      await audioContext?.close();
    } catch {
      // ignore cleanup errors
    }

    video.pause();
    video.removeAttribute("src");
    video.load();

    if (video.parentNode) document.body.removeChild(video);
    URL.revokeObjectURL(videoUrl);
  };

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Không thể tải video để burn."));
    });

    await new Promise<void>((resolve) => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        resolve();
        return;
      }
      video.oncanplay = () => resolve();
    });

    if (document.fonts?.ready) {
      await document.fonts.ready.catch(() => undefined);
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;
    const targetFps = Math.max(24, Math.min(60, options.fps || 30));
    const frameInterval = 1000 / targetFps;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas không được hỗ trợ.");

    const blocks = parseSrtToTimedChunks(srt);

    /*
     * Quan trọng: dùng captureStream(targetFps), không dùng captureStream(0) + chỉ requestVideoFrameCallback.
     * Một số video gốc có đoạn ít frame / frame tĩnh. Nếu chỉ capture theo frame decode thật,
     * video track có thể dừng sớm trong khi audio vẫn chạy -> file xuất ra bị freeze.
     * Ở đây canvas luôn có clock 24/30/60fps riêng, nên video track dài bằng quá trình playback.
     */
    const canvasStream = canvas.captureStream(targetFps);

    let audioTracks: MediaStreamTrack[] = [];
    try {
      audioContext = new AudioContext();
      const sourceNode = audioContext.createMediaElementSource(video);
      const destination = audioContext.createMediaStreamDestination();
      sourceNode.connect(destination);
      audioTracks = destination.stream.getAudioTracks();
      await audioContext.resume();
    } catch (error) {
      log(`AudioContext capture failed, fallback to video capture stream: ${
        (error as any)?.message || error
      }`);
      const capturedVideoStream = (video as any).captureStream?.() ?? null;
      audioTracks = capturedVideoStream?.getAudioTracks?.() ?? [];
    }

    outputStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    const mimeTypeCandidates = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    const mimeType = mimeTypeCandidates.find((candidate) =>
      MediaRecorder.isTypeSupported(candidate),
    );

    if (!mimeType) {
      throw new Error("Trình duyệt không hỗ trợ ghi video trên canvas.");
    }

    const recorder = new MediaRecorder(outputStream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
      audioBitsPerSecond: 160_000,
    });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };

    const stopPromise = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = (event) =>
        reject(event.error ?? new Error("Ghi video bị lỗi."));
    });

    const updateProgress = createProgressThrottle();
    let lastDrawAt = 0;

    const drawFrame = (mediaTime = video.currentTime, forceProgress = false) => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        ctx.drawImage(video, 0, 0, width, height);
      } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
      }

      const subtitleBlock = findSubtitleByTime(blocks, mediaTime);
      drawSubtitleOverlay(ctx, width, height, subtitleBlock, {
        fontSize: options.fontSize || Math.max(16, Math.round(width * 0.065)),
        position: options.position || "bottom",
      });

      const ratio = Math.min(1, mediaTime / Math.max(1, video.duration || 1));
      updateProgress(ratio, forceProgress);
    };

    drawFrame(0, true);
    recorder.start(1000);

    await video.play().catch((error) => {
      throw new Error(`Không thể phát video: ${error?.message || error}`);
    });

    await new Promise<void>((resolve, reject) => {
      video.onerror = () => {
        ended = true;
        reject(new Error("Video bị lỗi khi chạy export."));
      };

      video.onended = () => {
        ended = true;
        drawFrame(video.duration || video.currentTime, true);
        resolve();
      };

      const renderLoop = (now: number) => {
        if (ended) return;

        if (now - lastDrawAt >= frameInterval) {
          lastDrawAt = now;
          drawFrame(video.currentTime);
        }

        if (video.ended) {
          ended = true;
          drawFrame(video.duration || video.currentTime, true);
          resolve();
          return;
        }

        animationFrameId = requestAnimationFrame(renderLoop);
      };

      animationFrameId = requestAnimationFrame(renderLoop);
    });

    if (recorder.state !== "inactive") recorder.stop();
    await stopPromise;

    const blob = new Blob(chunks, { type: mimeType });
    outputVideo = blob;

    progress(1);
    status("Export video xong ✓");

    return blob;
  } finally {
    await cleanup();
  }
}

async function burnSubtitleWithFfmpeg(
  srt: string,
  options: { fontSize?: number; position?: "bottom" | "top"; fps?: number },
  file: File,
) {
  if (!ffmpegReady || !ffmpeg) await loadFFmpeg();
  if (!ffmpeg) throw new Error("FFmpeg chưa sẵn sàng.");

  const inputName = safeFileName(file);
  const srtName = "subtitle.srt";
  const outputName = "output.mp4";
  const alignment = options.position === "top" ? 8 : 2;
  const fontSize = options.fontSize || 22;

  const style =
    `FontName=Arial,FontSize=${fontSize},` +
    "PrimaryColour=&H00FFFFFF,OutlineColour=&HAA000000," +
    "BackColour=&H80000000,BorderStyle=3,Outline=1,Shadow=0," +
    `Alignment=${alignment},MarginV=44`;

  status("Đang burn phụ đề vào video bằng FFmpeg...");
  progress(0);

  await ffmpeg.writeFile(inputName, await fetchFile(file));
  await ffmpeg.writeFile(srtName, new TextEncoder().encode(srt));

  await ffmpeg.exec([
    "-i",
    inputName,
    "-vf",
    `subtitles=${srtName}:force_style='${style}'`,
    "-r",
    "30",
    "-c:a",
    "copy",
    "-movflags",
    "+faststart",
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);
  const bytes = new Uint8Array(
    data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBuffer),
  );

  outputVideo = new Blob([bytes], { type: "video/mp4" });

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(srtName);
    await ffmpeg.deleteFile(outputName);
  } catch {
    // ignore cleanup errors
  }

  progress(1);
  status("Export video xong ✓");

  return outputVideo;
}

export async function burnSubtitleToVideo(
  srt: string,
  options: {
    fontSize?: number;
    position?: "bottom" | "top";
    fps?: number;
  } = {},
  file = currentVideo,
) {
  if (!file) throw new Error("Chưa chọn video.");
  if (!srt.trim()) throw new Error("Chưa có subtitle.");

  try {
    return await burnSubtitleUsingCanvas(srt, options, file);
  } catch (canvasError) {
    const message =
      (canvasError as any)?.message ?? String(canvasError ?? "Unknown error");
    log(`Canvas burn failed: ${message}`);
    if (!ffmpegReady || !ffmpeg) await loadFFmpeg();
    if (ffmpeg) {
      return burnSubtitleWithFfmpeg(srt, options, file);
    }
    throw canvasError;
  }
}

/* Compatibility with the component currently importing burnSubtitle */
export async function burnSubtitle(
  srt: string,
  fileOrOptions?: File | { fontSize?: number; position?: "bottom" | "top"; fps?: number },
  maybeOptions?: { fontSize?: number; position?: "bottom" | "top"; fps?: number },
) {
  if (fileOrOptions instanceof File) {
    return burnSubtitleToVideo(srt, maybeOptions || {}, fileOrOptions);
  }

  return burnSubtitleToVideo(srt, fileOrOptions || {}, currentVideo);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* Compatibility with earlier component */
export const createDownload = downloadBlob;

export function downloadSrtFile(srt: string) {
  downloadBlob(
    new Blob([srt], {
      type: "text/plain;charset=utf-8",
    }),
    "zentask-subtitle.srt",
  );
}

/* Compatibility with earlier component */
export const downloadSRT = downloadSrtFile;

export function getOutputVideo() {
  return outputVideo;
}

export function getOutputVideoExtension(blob = outputVideo) {
  if (!blob) return "webm";
  if (blob.type.includes("mp4")) return "mp4";
  if (blob.type.includes("webm")) return "webm";
  return "webm";
}

export function getEngineState() {
  return {
    ffmpeg: ffmpegReady,
    whisper: Boolean(transcriber),
    audio: Boolean(currentAudio),
    video: Boolean(currentVideo),
  };
}

/* Compatibility with earlier component */
export const isEngineReady = getEngineState;
