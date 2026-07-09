import express from "express";
import multer from "multer";
import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

const router = express.Router();

const uploadRoot = path.join(os.tmpdir(), "zentask-subtitle-uploads");
const jobRoot = path.join(os.tmpdir(), "zentask-subtitle-jobs");

await fsp.mkdir(uploadRoot, { recursive: true });
await fsp.mkdir(jobRoot, { recursive: true });

const upload = multer({
  dest: uploadRoot,
  limits: {
    fileSize: Number(process.env.SUBTITLE_MAX_UPLOAD_MB || 800) * 1024 * 1024,
  },
});

const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE_PATH =
  process.env.FFPROBE_PATH ||
  (FFMPEG_PATH.toLowerCase().endsWith("ffmpeg.exe")
    ? `${FFMPEG_PATH.slice(0, -"ffmpeg.exe".length)}ffprobe.exe`
    : FFMPEG_PATH.toLowerCase().endsWith("ffmpeg")
      ? `${FFMPEG_PATH.slice(0, -"ffmpeg".length)}ffprobe`
      : "ffprobe");
const DEFAULT_MODEL_ID = process.env.WHISPER_MODEL_ID || "Xenova/whisper-small";
const TRANSFORMERS_CACHE =
  process.env.TRANSFORMERS_CACHE || path.join(process.cwd(), ".cache", "transformers");

const WHISPER_MODELS = {
  tiny: "Xenova/whisper-tiny",
  "tiny.en": "Xenova/whisper-tiny.en",
  base: "Xenova/whisper-base",
  "base.en": "Xenova/whisper-base.en",
  small: "Xenova/whisper-small",
  "small.en": "Xenova/whisper-small.en",
};

let transformersModulePromise = null;
let transcriberPromise = null;
let loadedModelId = "";

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function boolString(value) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function detectCjkRatio(text = "") {
  const chars = String(text).replace(/\s+/g, "");
  if (!chars.length) return 0;
  const cjkCount = Array.from(chars).filter((char) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/u.test(char)).length;
  return cjkCount / chars.length;
}

function estimateAssTextWidth(text = "", fontSize = 42) {
  let units = 0;
  for (const char of String(text)) {
    if (/\s/.test(char)) units += 0.35;
    else if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/u.test(char)) units += 1;
    else if (/[mwMW@#%&]/.test(char)) units += 0.85;
    else if (/[ilI1.,'`!|]/.test(char)) units += 0.32;
    else units += 0.58;
  }
  return units * fontSize;
}

function extFromOriginalName(name = "") {
  const ext = path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g, "");
  return ext || ".mp4";
}

function getUploadedFile(files, keys) {
  for (const key of keys) {
    const value = files?.[key];
    if (Array.isArray(value) && value[0]) return value[0];
  }
  return null;
}

async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    await fsp.unlink(filePath);
  } catch {
    // ignore cleanup errors
  }
}

async function safeRmDir(dirPath) {
  if (!dirPath) return;
  try {
    await fsp.rm(dirPath, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}

function runProcess(command, args, options = {}) {
  const timeoutMs = options.timeoutMs || 30 * 60 * 1000;
  const maxOutput = options.maxOutput || 1024 * 1024;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...(options.env || {}) },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let killedByTimeout = false;

    const timer = setTimeout(() => {
      killedByTimeout = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
      if (stdout.length > maxOutput) stdout = stdout.slice(-maxOutput);
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
      if (stderr.length > maxOutput) stderr = stderr.slice(-maxOutput);
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr, code });
        return;
      }

      const error = new Error(
        killedByTimeout
          ? `${command} timed out after ${Math.round(timeoutMs / 1000)}s`
          : `${command} exited with code ${code}`,
      );
      error.stdout = stdout;
      error.stderr = stderr;
      error.code = code;
      reject(error);
    });
  });
}

async function getVideoInfo(cwd, inputName) {
  try {
    const result = await runProcess(
      FFPROBE_PATH,
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height:stream_tags=rotate:stream_side_data=rotation",
        "-of",
        "json",
        inputName,
      ],
      { cwd, timeoutMs: 15_000, maxOutput: 512 * 1024 },
    );

    const parsed = JSON.parse(result.stdout || "{}");
    const stream = parsed?.streams?.[0] || {};
    let width = Number(stream.width) || 0;
    let height = Number(stream.height) || 0;
    const tagRotate = Number(stream.tags?.rotate || 0);
    const sideDataRotate = Array.isArray(stream.side_data_list)
      ? Number(stream.side_data_list.find((item) => item?.rotation !== undefined)?.rotation || 0)
      : 0;
    const rotation = Number.isFinite(tagRotate) && tagRotate ? tagRotate : sideDataRotate;

    if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
      [width, height] = [height, width];
    }

    if (width > 0 && height > 0) {
      return { width, height, rotation: rotation || 0, isPortrait: height > width };
    }
  } catch (error) {
    console.warn("[subtitle] ffprobe failed, fallback to default ASS layout:", error?.message || error);
  }

  return { width: 1280, height: 720, rotation: 0, isPortrait: false };
}

function readText(view, offset, length) {
  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += String.fromCharCode(view.getUint8(offset + i));
  }
  return output;
}

function wavToFloat32(wavBytes) {
  const view = new DataView(
    wavBytes.buffer,
    wavBytes.byteOffset,
    wavBytes.byteLength,
  );

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

function cleanText(text = "") {
  return String(text)
    .replace(/\s+/g, " ")
    .replace(/(.{2,}?)\s+\1/gi, "$1")
    .trim();
}

function secondsToSrtTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const ms = Math.floor((safe % 1) * 1000);
  const total = Math.floor(safe);
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

function secondsToAssTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const cs = Math.floor((safe % 1) * 100);
  const total = Math.floor(safe);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function srtTimeToSeconds(value = "") {
  const match = String(value).trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!match) return 0;
  const [, h, m, s, ms] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(`0.${ms}`);
}

function chunksToSrt(chunks) {
  return chunks
    .map((chunk, index) => {
      return [
        index + 1,
        `${secondsToSrtTime(chunk.start)} --> ${secondsToSrtTime(chunk.end)}`,
        chunk.text,
      ].join("\n");
    })
    .join("\n\n");
}

function parseSubtitleText(input = "") {
  const text = String(input).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const body = text.trim().replace(/^WEBVTT[^\n]*(\n|$)/i, "").trim();
  if (!body) return [];

  return body
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const timeIndex = lines.findIndex((line) => line.includes("-->"));
      if (timeIndex < 0) return null;

      const [startRaw, endAndSettings] = lines[timeIndex].split("-->").map((item) => item.trim());
      const endRaw = endAndSettings.split(/\s+/)[0];
      const textLines = lines.slice(timeIndex + 1);
      const subtitle = cleanText(textLines.join(" "));

      if (!subtitle) return null;

      const start = srtTimeToSeconds(startRaw);
      const end = srtTimeToSeconds(endRaw);

      return {
        start,
        end: end > start ? end : start + 1.5,
        text: subtitle,
      };
    })
    .filter(Boolean);
}

function splitTextIntoPhrases(text, maxWords, maxChars) {
  const normalized = cleanText(text);
  if (!normalized) return [];

  const roughParts = normalized
    .replace(/([.!?。！？])/g, "$1|")
    .replace(/([,;:，；：])/g, "$1|")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const parts = roughParts.length ? roughParts : [normalized];
  const phrases = [];

  for (const part of parts) {
    const words = part.split(/\s+/).filter(Boolean);
    let current = [];

    for (const word of words) {
      const next = [...current, word];
      if (
        current.length > 0 &&
        (next.length > maxWords || next.join(" ").length > maxChars)
      ) {
        phrases.push(current.join(" "));
        current = [word];
      } else {
        current = next;
      }
    }

    if (current.length) phrases.push(current.join(" "));
  }

  return phrases.filter(Boolean);
}

function normalizeSubtitleBlocks(blocks, options = {}) {
  const maxWords = Math.max(3, toNumber(options.maxWords, 7));
  const maxChars = Math.max(20, toNumber(options.maxChars, 42));
  const maxDuration = Math.max(1, toNumber(options.maxDuration, 2.6));
  const minDuration = Math.max(0.4, toNumber(options.minDuration, 0.8));
  const output = [];

  for (const block of blocks) {
    const text = cleanText(block.text);
    if (!text) continue;

    const duration = Math.max(0.5, block.end - block.start);
    const phrases = splitTextIntoPhrases(text, maxWords, maxChars);
    const neededByDuration = Math.ceil(duration / maxDuration);
    const finalPhrases = phrases.length >= neededByDuration ? phrases : splitTextIntoPhrases(text, maxWords, Math.min(maxChars, 32));
    const totalWords = finalPhrases.reduce((sum, phrase) => sum + phrase.split(/\s+/).filter(Boolean).length, 0) || finalPhrases.length;

    let cursor = block.start;
    for (let index = 0; index < finalPhrases.length; index += 1) {
      const phrase = finalPhrases[index];
      const wordCount = phrase.split(/\s+/).filter(Boolean).length || 1;
      const isLast = index === finalPhrases.length - 1;
      let pieceDuration = isLast ? block.end - cursor : duration * (wordCount / totalWords);
      pieceDuration = Math.max(minDuration, Math.min(maxDuration, pieceDuration));

      const start = cursor;
      const end = isLast ? block.end : Math.min(block.end, start + pieceDuration);
      if (end > start) {
        output.push({ start, end, text: phrase });
      }
      cursor = end;
    }
  }

  return output;
}

function escapeAssText(text) {
  return cleanText(text)
    .replace(/[{}]/g, "")
    .replace(/\\/g, "\\\\");
}

function splitLongToken(token, maxUnits, fontSize) {
  const pieces = [];
  let current = "";

  for (const char of token) {
    const next = current + char;
    if (current && estimateAssTextWidth(next, fontSize) > maxUnits) {
      pieces.push(current);
      current = char;
    } else {
      current = next;
    }
  }

  if (current) pieces.push(current);
  return pieces;
}

function wrapAssText(text, layout) {
  const escaped = escapeAssText(text);
  const maxWidthPx = layout.maxTextWidth;
  const fontSize = layout.fontSize;
  const maxLines = layout.maxLines;
  const maxLineChars = layout.maxLineChars;
  const rawWords = escaped.split(/\s+/).filter(Boolean);
  const words = [];

  for (const word of rawWords) {
    if (estimateAssTextWidth(word, fontSize) > maxWidthPx) {
      words.push(...splitLongToken(word, maxWidthPx, fontSize));
    } else {
      words.push(word);
    }
  }

  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    const nextTooWide = estimateAssTextWidth(next, fontSize) > maxWidthPx;
    const nextTooLong = next.length > maxLineChars;

    if (current && (nextTooWide || nextTooLong)) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);

  if (lines.length <= maxLines) return lines.join("\\N");

  const safeLines = lines.slice(0, maxLines);
  const overflow = lines.slice(maxLines).join(" ").trim();
  if (overflow) {
    const lastIndex = safeLines.length - 1;
    const candidate = `${safeLines[lastIndex]} ${overflow}`.trim();
    if (estimateAssTextWidth(candidate, fontSize) <= maxWidthPx && candidate.length <= maxLineChars) {
      safeLines[lastIndex] = candidate;
    }
  }

  return safeLines.join("\\N");
}

function buildAssLayout(options = {}) {
  const playResX = Math.max(240, Math.round(toNumber(options.videoWidth, 1280)));
  const playResY = Math.max(240, Math.round(toNumber(options.videoHeight, 720)));
  const isPortrait = playResY > playResX * 1.05;
  const position = options.position === "top" ? "top" : "bottom";
  const requestedFontSize = toNumber(options.fontSize, isPortrait ? playResX * 0.055 : playResY * 0.055);
  const maxFontByWidth = playResX * (isPortrait ? 0.052 : 0.060);
  const maxFontByHeight = playResY * 0.075;
  const fontSize = Math.round(clampNumber(requestedFontSize, 18, Math.min(maxFontByWidth, maxFontByHeight, 54)));
  const marginX = Math.round(clampNumber(playResX * (isPortrait ? 0.075 : 0.055), 24, isPortrait ? 96 : 120));
  const marginV = Math.round(
    toNumber(
      options.marginV,
      clampNumber(playResY * (isPortrait ? 0.055 : 0.070), 36, isPortrait ? 128 : 96),
    ),
  );
  const maxTextWidth = Math.max(120, playResX - marginX * 2);
  const maxLineCharsAuto = Math.floor(maxTextWidth / (fontSize * (isPortrait ? 0.62 : 0.58)));
  const maxLineChars = Math.round(
    clampNumber(
      toNumber(options.maxLineChars, maxLineCharsAuto),
      isPortrait ? 14 : 18,
      isPortrait ? 32 : 46,
    ),
  );
  const maxLines = Math.round(clampNumber(toNumber(options.maxLines, isPortrait ? 3 : 2), 2, isPortrait ? 4 : 3));

  return {
    playResX,
    playResY,
    isPortrait,
    fontSize,
    marginX,
    marginV,
    maxTextWidth,
    maxLineChars,
    maxLines,
    alignment: position === "top" ? 8 : 2,
  };
}

function subtitleToAss(subtitleText, options = {}) {
  const layout = buildAssLayout(options);
  const allText = parseSubtitleText(subtitleText).map((block) => block.text).join(" ");
  const cjkRatio = detectCjkRatio(allText);
  const requestedMaxWords = toNumber(options.maxWords, layout.isPortrait ? 5 : 7);
  const requestedMaxChars = toNumber(options.maxChars, layout.isPortrait ? Math.min(32, layout.maxLineChars * 2) : 42);
  const normalizedOptions = {
    ...options,
    maxWords: layout.isPortrait ? Math.min(requestedMaxWords, 5) : requestedMaxWords,
    maxChars: layout.isPortrait
      ? Math.min(requestedMaxChars, Math.max(22, Math.min(32, layout.maxLineChars * 2)))
      : requestedMaxChars,
    maxDuration: toNumber(options.maxDuration, layout.isPortrait ? 2.2 : 2.6),
  };
  if (cjkRatio > 0.35) {
    const cjkRequestedMaxWords = toNumber(options.maxWords, layout.isPortrait ? 10 : 14);
    const cjkRequestedMaxChars = toNumber(options.maxChars, layout.isPortrait ? Math.min(24, layout.maxLineChars) : 32);
    normalizedOptions.maxWords = layout.isPortrait ? Math.min(cjkRequestedMaxWords, 10) : cjkRequestedMaxWords;
    normalizedOptions.maxChars = layout.isPortrait
      ? Math.min(cjkRequestedMaxChars, Math.min(24, layout.maxLineChars))
      : cjkRequestedMaxChars;
  }

  const blocks = normalizeSubtitleBlocks(parseSubtitleText(subtitleText), normalizedOptions);
  const fontName = String(options.fontName || process.env.SUBTITLE_FONT || "Arial").replace(/[,\n\r]/g, "");

  const header = `[Script Info]
ScriptType: v4.00+
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: ${layout.playResX}
PlayResY: ${layout.playResY}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${layout.fontSize},&H00FFFFFF,&H000000FF,&HAA000000,&H88000000,-1,0,0,0,100,100,0,0,3,1,0,${layout.alignment},${layout.marginX},${layout.marginX},${layout.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const events = blocks.map((block) => {
    return `Dialogue: 0,${secondsToAssTime(block.start)},${secondsToAssTime(block.end)},Default,,0,0,0,,${wrapAssText(block.text, layout)}`;
  });

  return {
    ass: [header, ...events].join("\n"),
    blocks,
    srt: chunksToSrt(blocks),
    layout,
  };
}

async function extractWav(inputName, outputName, cwd) {
  await runProcess(
    FFMPEG_PATH,
    [
      "-hide_banner",
      "-y",
      "-i",
      inputName,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-f",
      "wav",
      outputName,
    ],
    { cwd, timeoutMs: 20 * 60 * 1000 },
  );
}

async function getTransformersModule() {
  if (!transformersModulePromise) {
    transformersModulePromise = import("@xenova/transformers").then((mod) => {
      const transformers = mod?.default ?? mod;
      if (!transformers?.pipeline) {
        throw new Error("@xenova/transformers không expose pipeline.");
      }
      if (transformers.env) {
        transformers.env.allowRemoteModels = true;
        transformers.env.allowLocalModels = true;
        transformers.env.cacheDir = TRANSFORMERS_CACHE;
      }
      return transformers;
    });
  }
  return transformersModulePromise;
}

async function getTranscriber(modelId) {
  const resolvedModelId = WHISPER_MODELS[modelId] || modelId || DEFAULT_MODEL_ID;

  if (transcriberPromise && loadedModelId === resolvedModelId) {
    return transcriberPromise;
  }

  const transformers = await getTransformersModule();
  loadedModelId = resolvedModelId;
  transcriberPromise = transformers.pipeline("automatic-speech-recognition", resolvedModelId, {
    progress_callback(event) {
      if (event?.status === "done" && event?.file) {
        console.log(`[subtitle] model file ready: ${event.file}`);
      }
    },
  });

  return transcriberPromise;
}

async function transcribeWavFile(wavPath, options = {}) {
  const wavBytes = await fsp.readFile(wavPath);
  const samples = wavToFloat32(wavBytes);
  const model = options.model || options.modelKey || DEFAULT_MODEL_ID;
  const transcriber = await getTranscriber(model);

  const result = await transcriber(samples, {
    language: options.language && options.language !== "auto" ? options.language : undefined,
    task: "transcribe",
    return_timestamps: true,
    chunk_length_s: toNumber(options.chunkLengthS, 30),
    stride_length_s: toNumber(options.strideLengthS, 2),
  });

  const chunks = Array.isArray(result?.chunks)
    ? result.chunks
        .map((chunk) => {
          const timestamp = Array.isArray(chunk.timestamp) ? chunk.timestamp : [0, 2];
          const start = Number(timestamp[0] || 0);
          const end = Number(timestamp[1] || start + 2);
          return {
            start,
            end: end > start ? end : start + 2,
            text: cleanText(chunk.text || ""),
          };
        })
        .filter((chunk) => chunk.text)
    : [];

  const normalized = normalizeSubtitleBlocks(chunks, {
    maxWords: toNumber(options.maxWords, 7),
    maxChars: toNumber(options.maxChars, 42),
    maxDuration: toNumber(options.maxDuration, 2.6),
  });

  return {
    text: normalized.map((chunk) => chunk.text).join(" "),
    chunks: normalized,
    srt: chunksToSrt(normalized),
    rawText: cleanText(result?.text || ""),
  };
}

async function burnWithFfmpeg(cwd, inputName, assName, outputName, options = {}) {
  const preset = String(options.preset || process.env.FFMPEG_PRESET || "veryfast");
  const crf = String(options.crf || process.env.FFMPEG_CRF || "22");

  const baseArgs = [
    "-hide_banner",
    "-y",
    "-fflags",
    "+genpts",
    "-i",
    inputName,
    "-map",
    "0:v:0",
    "-map",
    "0:a?",
    "-vf",
    `ass=${assName}`,
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    crf,
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-avoid_negative_ts",
    "make_zero",
  ];

  const copyAudioArgs = [...baseArgs, "-c:a", "copy", outputName];
  try {
    await runProcess(FFMPEG_PATH, copyAudioArgs, {
      cwd,
      timeoutMs: 60 * 60 * 1000,
      maxOutput: 2 * 1024 * 1024,
    });
    return { audio: "copy" };
  } catch (copyError) {
    await safeUnlink(path.join(cwd, outputName));
    console.warn("[subtitle] audio copy failed, fallback to AAC:", copyError?.stderr || copyError?.message || copyError);

    const aacArgs = [
      ...baseArgs,
      "-c:a",
      "aac",
      "-b:a",
      String(options.audioBitrate || "160k"),
      "-ar",
      "48000",
      outputName,
    ];

    await runProcess(FFMPEG_PATH, aacArgs, {
      cwd,
      timeoutMs: 60 * 60 * 1000,
      maxOutput: 2 * 1024 * 1024,
    });
    return { audio: "aac" };
  }
}

async function readSubtitleFromRequest(req) {
  if (typeof req.body?.srt === "string" && req.body.srt.trim()) return req.body.srt;
  if (typeof req.body?.subtitle === "string" && req.body.subtitle.trim()) return req.body.subtitle;
  if (typeof req.body?.vtt === "string" && req.body.vtt.trim()) return req.body.vtt;

  const subtitleFile = getUploadedFile(req.files, ["subtitle", "srt", "vtt"]);
  if (subtitleFile) {
    return fsp.readFile(subtitleFile.path, "utf8");
  }

  throw new Error("Thiếu subtitle. Gửi field srt/subtitle/vtt hoặc file subtitle.");
}

async function copyUploadToJob(uploadedFile, jobDir, targetName) {
  await fsp.mkdir(jobDir, { recursive: true });
  await fsp.copyFile(uploadedFile.path, path.join(jobDir, targetName));
}

router.get("/health", async (req, res) => {
  try {
    const version = await runProcess(FFMPEG_PATH, ["-version"], { timeoutMs: 10_000 });
    const filters = await runProcess(FFMPEG_PATH, ["-hide_banner", "-filters"], { timeoutMs: 10_000 });
    const filterText = `${filters.stdout}\n${filters.stderr}`;

    res.json({
      ok: true,
      ffmpeg: true,
      ffmpegPath: FFMPEG_PATH,
      ffprobePath: FFPROBE_PATH,
      hasAss: /\bass\b/i.test(filterText),
      hasSubtitles: /\bsubtitles\b/i.test(filterText),
      version: version.stdout.split("\n")[0] || version.stderr.split("\n")[0] || "ffmpeg found",
      whisperDefaultModel: DEFAULT_MODEL_ID,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      ffmpeg: false,
      ffmpegPath: FFMPEG_PATH,
      ffprobePath: FFPROBE_PATH,
      message: "Không tìm thấy FFmpeg native. Hãy cài FFmpeg và thêm vào PATH hoặc set FFMPEG_PATH.",
      error: error?.message || String(error),
    });
  }
});

router.post(
  "/transcribe",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "audio", maxCount: 1 },
    { name: "file", maxCount: 1 },
    { name: "media", maxCount: 1 },
  ]),
  async (req, res) => {
    const uploadedFile = getUploadedFile(req.files, ["video", "audio", "file", "media"]);
    if (!uploadedFile) {
      res.status(400).json({ ok: false, message: "Thiếu file video/audio. Gửi field video, audio, file hoặc media." });
      return;
    }

    const jobDir = path.join(jobRoot, randomUUID());
    const inputName = `input${extFromOriginalName(uploadedFile.originalname)}`;
    const wavName = "audio.wav";

    try {
      await copyUploadToJob(uploadedFile, jobDir, inputName);
      await extractWav(inputName, wavName, jobDir);

      const result = await transcribeWavFile(path.join(jobDir, wavName), {
        model: req.body?.model || req.body?.modelKey,
        language: req.body?.language || "auto",
        chunkLengthS: req.body?.chunkLengthS,
        strideLengthS: req.body?.strideLengthS,
        maxWords: req.body?.maxWords,
        maxChars: req.body?.maxChars,
        maxDuration: req.body?.maxDuration,
      });

      res.json({
        ok: true,
        model: WHISPER_MODELS[req.body?.model || req.body?.modelKey] || req.body?.model || req.body?.modelKey || DEFAULT_MODEL_ID,
        language: req.body?.language || "auto",
        ...result,
      });
    } catch (error) {
      console.error("[subtitle/transcribe]", error?.stderr || error);
      res.status(500).json({
        ok: false,
        message: "Transcribe thất bại.",
        error: error?.message || String(error),
        ffmpeg: error?.stderr,
      });
    } finally {
      await safeUnlink(uploadedFile.path);
      await safeRmDir(jobDir);
    }
  },
);

router.post(
  "/burn",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "file", maxCount: 1 },
    { name: "subtitle", maxCount: 1 },
    { name: "srt", maxCount: 1 },
    { name: "vtt", maxCount: 1 },
  ]),
  async (req, res) => {
    const uploadedVideo = getUploadedFile(req.files, ["video", "file"]);
    if (!uploadedVideo) {
      res.status(400).json({ ok: false, message: "Thiếu video. Gửi field video hoặc file." });
      return;
    }

    const jobDir = path.join(jobRoot, randomUUID());
    const inputName = `input${extFromOriginalName(uploadedVideo.originalname)}`;
    const assName = "subtitle.ass";
    const outputName = "zentask-subtitled.mp4";

    try {
      const subtitleText = await readSubtitleFromRequest(req);
      await copyUploadToJob(uploadedVideo, jobDir, inputName);
      const videoInfo = await getVideoInfo(jobDir, inputName);
      const { ass, blocks, layout } = subtitleToAss(subtitleText, {
        fontName: req.body?.fontName,
        fontSize: req.body?.fontSize,
        position: req.body?.position,
        marginV: req.body?.marginV,
        maxWords: req.body?.maxWords,
        maxChars: req.body?.maxChars,
        maxDuration: req.body?.maxDuration,
        maxLineChars: req.body?.maxLineChars,
        maxLines: req.body?.maxLines,
        videoWidth: videoInfo.width,
        videoHeight: videoInfo.height,
      });

      if (!blocks.length) throw new Error("Subtitle rỗng hoặc sai định dạng SRT/VTT.");

      await fsp.writeFile(path.join(jobDir, assName), ass, "utf8");

      const burnInfo = await burnWithFfmpeg(jobDir, inputName, assName, outputName, {
        preset: req.body?.preset,
        crf: req.body?.crf,
        audioBitrate: req.body?.audioBitrate,
      });

      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="zentask-subtitled.mp4"');
      res.setHeader("X-Zentask-Subtitle-Blocks", String(blocks.length));
      res.setHeader("X-Zentask-Subtitle-Layout", encodeURIComponent(JSON.stringify(layout)));
      res.setHeader("X-Zentask-Audio-Mode", burnInfo.audio);

      const outputPath = path.join(jobDir, outputName);
      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);
      res.on("finish", async () => {
        await safeUnlink(uploadedVideo.path);
        await safeRmDir(jobDir);
      });
    } catch (error) {
      await safeUnlink(uploadedVideo.path);
      await safeRmDir(jobDir);
      console.error("[subtitle/burn]", error?.stderr || error);
      res.status(500).json({
        ok: false,
        message: "Burn subtitle thất bại.",
        error: error?.message || String(error),
        ffmpeg: error?.stderr,
      });
    }
  },
);

router.post(
  "/transcribe-burn",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  async (req, res) => {
    const uploadedVideo = getUploadedFile(req.files, ["video", "file"]);
    if (!uploadedVideo) {
      res.status(400).json({ ok: false, message: "Thiếu video. Gửi field video hoặc file." });
      return;
    }

    const jobDir = path.join(jobRoot, randomUUID());
    const inputName = `input${extFromOriginalName(uploadedVideo.originalname)}`;
    const wavName = "audio.wav";
    const assName = "subtitle.ass";
    const outputName = "zentask-subtitled.mp4";

    try {
      await copyUploadToJob(uploadedVideo, jobDir, inputName);
      const videoInfo = await getVideoInfo(jobDir, inputName);
      await extractWav(inputName, wavName, jobDir);

      const transcript = await transcribeWavFile(path.join(jobDir, wavName), {
        model: req.body?.model || req.body?.modelKey,
        language: req.body?.language || "auto",
        chunkLengthS: req.body?.chunkLengthS,
        strideLengthS: req.body?.strideLengthS,
        maxWords: req.body?.maxWords,
        maxChars: req.body?.maxChars,
        maxDuration: req.body?.maxDuration,
      });

      const { ass, blocks, layout } = subtitleToAss(transcript.srt, {
        fontName: req.body?.fontName,
        fontSize: req.body?.fontSize,
        position: req.body?.position,
        marginV: req.body?.marginV,
        maxWords: req.body?.maxWords,
        maxChars: req.body?.maxChars,
        maxDuration: req.body?.maxDuration,
        maxLineChars: req.body?.maxLineChars,
        maxLines: req.body?.maxLines,
        videoWidth: videoInfo.width,
        videoHeight: videoInfo.height,
      });

      await fsp.writeFile(path.join(jobDir, assName), ass, "utf8");

      const burnInfo = await burnWithFfmpeg(jobDir, inputName, assName, outputName, {
        preset: req.body?.preset,
        crf: req.body?.crf,
        audioBitrate: req.body?.audioBitrate,
      });

      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="zentask-subtitled.mp4"');
      res.setHeader("X-Zentask-Subtitle-Blocks", String(blocks.length));
      res.setHeader("X-Zentask-Subtitle-Layout", encodeURIComponent(JSON.stringify(layout)));
      res.setHeader("X-Zentask-Audio-Mode", burnInfo.audio);
      res.setHeader("X-Zentask-Transcript-Text", encodeURIComponent(transcript.text.slice(0, 1000)));

      const outputPath = path.join(jobDir, outputName);
      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);
      res.on("finish", async () => {
        await safeUnlink(uploadedVideo.path);
        await safeRmDir(jobDir);
      });
    } catch (error) {
      await safeUnlink(uploadedVideo.path);
      await safeRmDir(jobDir);
      console.error("[subtitle/transcribe-burn]", error?.stderr || error);
      res.status(500).json({
        ok: false,
        message: "Transcribe + burn thất bại.",
        error: error?.message || String(error),
        ffmpeg: error?.stderr,
      });
    }
  },
);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    res.status(400).json({ ok: false, message: error.message, code: error.code });
    return;
  }
  next(error);
});

export default router;
