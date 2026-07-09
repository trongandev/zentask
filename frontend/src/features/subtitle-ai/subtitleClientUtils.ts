export type WhisperModelKey =
  | "tiny"
  | "tiny.en"
  | "base"
  | "base.en"
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
  "base.en": {
    id: "Xenova/whisper-base.en",
    size: "~145 MB",
    note: "Chỉ tiếng Anh",
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

export async function translateSRT(
  srt: string,
  sourceLanguageOrTarget: string,
  maybeTarget?: string,
) {
  const target = maybeTarget || sourceLanguageOrTarget;
  const blocks = parseSrt(srt);

  if (!blocks.length) throw new Error("SRT rỗng hoặc không hợp lệ.");

  const translated: SrtBlock[] = [];

  for (const block of blocks) {
    translated.push({
      ...block,
      text: await translateText(block.text, target),
    });
  }

  return buildSrt(translated);
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

export const createDownload = downloadBlob;

export function downloadSRT(srt: string, filename = "zentask-subtitle.srt") {
  downloadBlob(
    new Blob([srt], {
      type: "text/plain;charset=utf-8",
    }),
    filename,
  );
}
