import axiosInstance from "./axiosConfig";
const API_URL = import.meta.env.VITE_API_BACKEND;
export interface PronunciationAssessPayload {
  title: string;
  base64Audio: string;
  language?: string;
}

export interface PronunciationAssessResponse {
  ok: boolean;
  result: any;
}

async function readApiError(res: Response, fallback: string) {
  const data = await res.json().catch(() => null);
  const main = data?.error || data?.message || fallback;
  const upstream = data?.details?.message || data?.details?.error || data?.details?.raw;
  if (upstream && upstream !== main) return `${main} (${upstream})`;
  return main;
}

export const pronunciationService = {
  async assess(payload: PronunciationAssessPayload): Promise<PronunciationAssessResponse> {
    // Payload intentionally follows the required upstream shape:
    // { title, base64Audio, language }
    const body = {
      title: payload.title,
      base64Audio: payload.base64Audio,
      language: payload.language || "en",
    };

    const res = await fetch(`${API_URL}/api/pronunciation/assess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(await readApiError(res, "Không chấm được phát âm."));
    return res.json();
  },
};
