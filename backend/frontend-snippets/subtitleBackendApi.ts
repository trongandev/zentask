export type SubtitleBackendOptions = {
  baseUrl?: string;
  modelKey?: "tiny" | "tiny.en" | "base" | "base.en" | "small" | "small.en";
  language?: string;
  fontSize?: number;
  position?: "bottom" | "top";
  maxWords?: number;
  maxChars?: number;
  maxDuration?: number;
};

const DEFAULT_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

function appendOptions(form: FormData, options: SubtitleBackendOptions = {}) {
  if (options.modelKey) form.append("modelKey", options.modelKey);
  if (options.language) form.append("language", options.language);
  if (options.fontSize) form.append("fontSize", String(options.fontSize));
  if (options.position) form.append("position", options.position);
  if (options.maxWords) form.append("maxWords", String(options.maxWords));
  if (options.maxChars) form.append("maxChars", String(options.maxChars));
  if (options.maxDuration) form.append("maxDuration", String(options.maxDuration));
}

export async function transcribeOnBackend(video: File, options: SubtitleBackendOptions = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const form = new FormData();
  form.append("video", video);
  appendOptions(form, options);

  const response = await fetch(`${baseUrl}/api/subtitle/transcribe`, {
    method: "POST",
    body: form,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `Transcribe HTTP ${response.status}`);
  }

  return response.json() as Promise<{
    ok: true;
    text: string;
    rawText: string;
    srt: string;
    chunks: Array<{ start: number; end: number; text: string }>;
  }>;
}

export async function burnSubtitleOnBackend(
  video: File,
  srt: string,
  options: SubtitleBackendOptions = {},
) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const form = new FormData();
  form.append("video", video);
  form.append("srt", srt);
  appendOptions(form, options);

  const response = await fetch(`${baseUrl}/api/subtitle/burn`, {
    method: "POST",
    body: form,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `Burn HTTP ${response.status}`);
  }

  return response.blob();
}

export async function transcribeAndBurnOnBackend(video: File, options: SubtitleBackendOptions = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const form = new FormData();
  form.append("video", video);
  appendOptions(form, options);

  const response = await fetch(`${baseUrl}/api/subtitle/transcribe-burn`, {
    method: "POST",
    body: form,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `Transcribe burn HTTP ${response.status}`);
  }

  return response.blob();
}
