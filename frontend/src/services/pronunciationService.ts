import axiosInstance from "./axiosConfig";
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

        const res = await axiosInstance.post(`/api/pronunciation/assess`, body);

        if (res.status !== 200) throw new Error("Âm thanh quá nhỏ hoặc nhiều tạp âm. Hãy thử lại.");
        return res.data;
    },
};
