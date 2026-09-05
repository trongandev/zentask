import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function unique(values) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map((item) => String(item).trim())
        .filter(Boolean),
    ),
  ];
}

export function readGeminiKeys() {
  const numberedKeys = Array.from({ length: 20 }, (_, index) => process.env[`API_KEY_AI_${index + 1}`]);
  return unique([process.env.GEMINI_API_KEY, ...(process.env.GEMINI_API_KEYS || "").split(/[\n,;|]+/), ...numberedKeys]);
}

export function keyLabel(index) {
  return `key_${index + 1}`;
}

export function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((message) => ({
      role: message?.role === "assistant" || message?.role === "model" ? "model" : "user",
      content: String(message?.content || "").trim(),
    }))
    .filter((message) => message.content);
}

export function buildGeminiContents(messages, files, fallbackPrompt) {
  const normalized = normalizeMessages(messages);
  if (!normalized.length && fallbackPrompt) {
    normalized.push({ role: "user", content: String(fallbackPrompt) });
  }

  const contents = normalized.map((message) => ({
    role: message.role,
    parts: [{ text: message.content }],
  }));

  if (files?.length) {
    if (!contents.length || contents[contents.length - 1].role !== "user") {
      contents.push({ role: "user", parts: [{ text: fallbackPrompt || "Hãy phân tích hình ảnh này." }] });
    }

    const last = contents[contents.length - 1];
    for (const file of files) {
      last.parts.push({
        inlineData: {
          mimeType: file.mimetype || "image/jpeg",
          data: file.buffer.toString("base64"),
        },
      });
    }
  }

  return contents;
}

export function extractGeminiText(response) {
  if (typeof response?.text === "string") return response.text;
  if (typeof response?.text === "function") return response.text();

  const candidates = response?.candidates || response?.response?.candidates || [];
  const text = candidates
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => part?.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();

  return text;
}

export function shouldTryNextGeminiKey(error) {
  const status = Number(error?.status || error?.statusCode || error?.response?.status || 0);
  const message = String(error?.message || error || "").toLowerCase();

  if ([401, 403, 429, 500, 502, 503, 504].includes(status)) return true;
  return message.includes("api key") || message.includes("quota") || message.includes("permission") || message.includes("rate") || message.includes("overloaded") || message.includes("unavailable");
}

export async function callGeminiWithFailover({ contents, systemInstruction, model, temperature }) {
  const keys = readGeminiKeys();
  if (!keys.length) {
    const error = new Error("Thiếu Gemini API key. Hãy thêm GEMINI_API_KEY/GEMINI_API_KEYS hoặc API_KEY_AI_1.. vào .env backend.");
    error.status = 500;
    throw error;
  }

  const errors = [];

  for (let i = 0; i < keys.length; i += 1) {
    const apiKey = keys[i];
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: model || DEFAULT_GEMINI_MODEL,
        contents,
        config: {
          temperature: Number.isFinite(Number(temperature)) ? Number(temperature) : 0.7,
          ...(systemInstruction ? { systemInstruction } : {}),
        },
      });

      const text = extractGeminiText(response);
      if (!text) throw new Error("Gemini không trả về nội dung text.");

      return {
        text,
        model: model || DEFAULT_GEMINI_MODEL,
        usedKey: keyLabel(i),
      };
    } catch (error) {
      errors.push({ key: keyLabel(i), message: error?.message || String(error), status: error?.status || error?.statusCode });
      if (!shouldTryNextGeminiKey(error)) break;
    }
  }

  const finalError = new Error(`Gemini thất bại với tất cả key. ${errors.map((item) => `${item.key}: ${item.message}`).join(" | ")}`);
  finalError.status = 502;
  finalError.details = errors;
  throw finalError;
}
