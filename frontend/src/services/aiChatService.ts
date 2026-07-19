import axiosInstance from "./axiosConfig";

const API_BASE = import.meta.env.VITE_API_BACKEND || "http://localhost:3001";

export type AIChatRole = "user" | "assistant" | "model";

export type AIChatMessagePayload = {
    role: AIChatRole;
    content: string;
};

export type AIChatOptions = {
    messages: AIChatMessagePayload[];
    images?: File[];
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    systemInstruction?: string;
};

export type AIImageOptions = {
    prompt: string;
    model?: string;
    provider?: string;
    width?: number;
    height?: number;
    steps?: number;
    guidanceScale?: number;
    negativePrompt?: string;
    seed?: string | number;
};

async function readJsonOrThrow(response: Response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
    }
    return data;
}

export async function checkAIBackend() {
    const response = await axiosInstance.get(`/api/ai/health`);
    return response.data;
}

export async function chatWithGemini(options: AIChatOptions) {
    const formData = new FormData();
    formData.append("messages", JSON.stringify(options.messages));

    if (options.model) formData.append("model", options.model);
    if (options.temperature !== undefined) formData.append("temperature", String(options.temperature));
    if (options.maxOutputTokens !== undefined) formData.append("maxOutputTokens", String(options.maxOutputTokens));
    if (options.systemInstruction) formData.append("systemInstruction", options.systemInstruction);

    for (const image of options.images || []) {
        formData.append("images", image);
    }

    const response = await axiosInstance.post(`/api/ai/chat`, formData);

    return response.data as {
        ok: boolean;
        reply: string;
        model: string;
        usedKey?: string;
    };
}

export async function generateImageWithHuggingFace(options: AIImageOptions) {
    const response = await axiosInstance.post(`/api/ai/image`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
    });

    return response.data as {
        ok: boolean;
        image: string;
        mimeType: string;
        model: string;
        provider: string;
        usedToken?: string;
        parameters?: Record<string, unknown>;
        originalPrompt?: string;
        originalNegativePrompt?: string;
        translatedPrompt?: string;
        translatedNegativePrompt?: string;
        translated?: boolean;
    };
}
