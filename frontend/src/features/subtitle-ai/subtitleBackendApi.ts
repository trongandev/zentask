import type { WhisperModelKey } from "./subtitleClientUtils";

export type SubtitleBackendOptions = {
  baseUrl?: string;
  modelKey?: WhisperModelKey;
  language?: string;
  fontSize?: number;
  position?: "bottom" | "top";
  maxWords?: number;
  maxChars?: number;
  maxDuration?: number;
  maxLineChars?: number;
  maxLines?: number;
  onUploadProgress?: (ratio: number) => void;
};

export type SubtitleBackendHealth = {
  ok: boolean;
  ffmpeg?: boolean;
  ffmpegPath?: string;
  hasAss?: boolean;
  hasSubtitles?: boolean;
  version?: string;
  whisperDefaultModel?: string;
  message?: string;
  error?: string;
};

const DEFAULT_BASE_URL =
  import.meta.env.VITE_API_BACKEND ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:3001";

function getBaseUrl(baseUrl?: string) {
  return (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function appendOptions(form: FormData, options: SubtitleBackendOptions = {}) {
  if (options.modelKey) form.append("modelKey", options.modelKey);
  if (options.language) form.append("language", options.language);
  if (options.fontSize) form.append("fontSize", String(options.fontSize));
  if (options.position) form.append("position", options.position);
  if (options.maxWords) form.append("maxWords", String(options.maxWords));
  if (options.maxChars) form.append("maxChars", String(options.maxChars));
  if (options.maxDuration) form.append("maxDuration", String(options.maxDuration));
  if (options.maxLineChars) form.append("maxLineChars", String(options.maxLineChars));
  if (options.maxLines) form.append("maxLines", String(options.maxLines));
}

function parseError(xhr: XMLHttpRequest, fallback: string) {
  let text = "";

  try {
    text = xhr.responseText || "";
  } catch {
    text = "";
  }

  try {
    const data = JSON.parse(text || "{}");
    return data.message || data.error || fallback;
  } catch {
    return text || fallback;
  }
}

function xhrRequest<T>(
  url: string,
  form: FormData,
  responseType: XMLHttpRequestResponseType,
  options: SubtitleBackendOptions = {},
) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.responseType = responseType;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && options.onUploadProgress) {
        options.onUploadProgress(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (responseType === "json") {
          resolve(xhr.response as T);
          return;
        }

        resolve(xhr.response as T);
        return;
      }

      reject(new Error(parseError(xhr, `HTTP ${xhr.status}`)));
    };

    xhr.onerror = () => reject(new Error("Không kết nối được subtitle backend."));
    xhr.ontimeout = () => reject(new Error("Subtitle backend xử lý quá lâu."));
    xhr.timeout = 60 * 60 * 1000;
    xhr.send(form);
  });
}

export async function checkSubtitleBackendHealth(baseUrl?: string) {
  const response = await fetch(`${getBaseUrl(baseUrl)}/api/subtitle/health`, {
    credentials: "include",
  });

  const data = (await response.json().catch(() => ({}))) as SubtitleBackendHealth;

  if (!response.ok) {
    throw new Error(data.message || data.error || `Health HTTP ${response.status}`);
  }

  return data;
}

export async function transcribeOnBackend(
  video: File,
  options: SubtitleBackendOptions = {},
) {
  const form = new FormData();
  form.append("video", video);
  appendOptions(form, options);

  return xhrRequest<{
    ok: true;
    text: string;
    rawText: string;
    srt: string;
    chunks: Array<{ start: number; end: number; text: string }>;
  }>(
    `${getBaseUrl(options.baseUrl)}/api/subtitle/transcribe`,
    form,
    "json",
    options,
  );
}

export async function burnSubtitleOnBackend(
  video: File,
  srt: string,
  options: SubtitleBackendOptions = {},
) {
  const form = new FormData();
  form.append("video", video);
  form.append("srt", srt);
  appendOptions(form, options);

  return xhrRequest<Blob>(
    `${getBaseUrl(options.baseUrl)}/api/subtitle/burn`,
    form,
    "blob",
    options,
  );
}

export async function transcribeAndBurnOnBackend(
  video: File,
  options: SubtitleBackendOptions = {},
) {
  const form = new FormData();
  form.append("video", video);
  appendOptions(form, options);

  return xhrRequest<Blob>(
    `${getBaseUrl(options.baseUrl)}/api/subtitle/transcribe-burn`,
    form,
    "blob",
    options,
  );
}
