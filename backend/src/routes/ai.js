import express from "express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { verifyToken } from "../middleware/auth.js";
import { consumeDailyLimit } from "../utils/usageLimits.js";
import { cleanAndValidatePublicText } from "../utils/moderation.js";

const router = express.Router();
router.use(verifyToken);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 8,
    fileSize: Number(process.env.AI_UPLOAD_MAX_MB || 8) * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      cb(new Error("Chỉ hỗ trợ upload hình ảnh."));
      return;
    }
    cb(null, true);
  },
});

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const DEFAULT_HF_IMAGE_MODEL = process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-dev";
const DEFAULT_HF_PROVIDER = process.env.HF_PROVIDER || "auto";

function unique(values) {
  return [...new Set(values.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];
}

function readGeminiKeys() {
  const numberedKeys = Array.from({ length: 20 }, (_, index) => process.env[`API_KEY_AI_${index + 1}`]);
  return unique([
    process.env.GEMINI_API_KEY,
    ...(process.env.GEMINI_API_KEYS || "").split(/[\n,;|]+/),
    ...numberedKeys,
  ]);
}

function readHfTokens() {
  return unique([
    process.env.HF_TOKEN,
    process.env.HUGGINGFACE_API_KEY,
    ...(process.env.HF_TOKENS || "").split(/[\n,;|]+/),
  ]);
}

function keyLabel(index) {
  return `key_${index + 1}`;
}

function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((message) => ({
      role: message?.role === "assistant" || message?.role === "model" ? "model" : "user",
      content: String(message?.content || "").trim(),
    }))
    .filter((message) => message.content);
}

function buildGeminiContents(messages, files, fallbackPrompt) {
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

function extractGeminiText(response) {
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

function shouldTryNextGeminiKey(error) {
  const status = Number(error?.status || error?.statusCode || error?.response?.status || 0);
  const message = String(error?.message || error || "").toLowerCase();

  if ([401, 403, 429, 500, 502, 503, 504].includes(status)) return true;
  return (
    message.includes("api key") ||
    message.includes("quota") ||
    message.includes("permission") ||
    message.includes("rate") ||
    message.includes("overloaded") ||
    message.includes("unavailable")
  );
}

async function callGeminiWithFailover({ contents, systemInstruction, model, temperature, maxOutputTokens }) {
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
          maxOutputTokens: Number(maxOutputTokens || 4096),
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

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function looksMostlyEnglish(text) {
  const value = String(text || "").trim();
  if (!value) return true;

  const latinLike = value.replace(/[\s\d\p{P}\p{S}]/gu, "");
  if (!latinLike) return true;

  const nonAsciiLetters = [...latinLike].filter((char) => char.charCodeAt(0) > 127).length;
  return nonAsciiLetters / Math.max(1, latinLike.length) < 0.08;
}

function cleanTranslatedPrompt(text, fallback) {
  const value = String(text || "")
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^English\s*prompt\s*:\s*/i, "")
    .replace(/^Translation\s*:\s*/i, "")
    .replace(/^Translated\s*prompt\s*:\s*/i, "")
    .trim()
    .replace(/^['\"]|['\"]$/g, "")
    .trim();

  return value || fallback;
}

async function translatePromptToEnglish({ text, label = "image prompt" }) {
  const original = String(text || "").trim();
  if (!original) return "";

  if (looksMostlyEnglish(original)) return original;

  const result = await callGeminiWithFailover({
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              `Translate the following ${label} into natural, vivid English for an AI image generation model. ` +
              "Keep the visual meaning, style, camera angle, colors, mood, and subject details. " +
              "Do not explain. Do not add markdown. Return only the English prompt.\n\n" +
              original,
          },
        ],
      },
    ],
    systemInstruction:
      "You are a professional image-prompt translator. Output English only. No markdown, no labels, no explanations.",
    model: process.env.GEMINI_TRANSLATE_MODEL || DEFAULT_GEMINI_MODEL,
    temperature: 0.2,
    maxOutputTokens: 900,
  });

  return cleanTranslatedPrompt(result.text, original);
}

async function prepareImagePrompts({ prompt, negativePrompt }) {
  const originalPrompt = String(prompt || "").trim();
  const originalNegativePrompt = String(negativePrompt || "").trim();

  const translatedPrompt = await translatePromptToEnglish({ text: originalPrompt, label: "positive image prompt" });
  const translatedNegativePrompt = originalNegativePrompt
    ? await translatePromptToEnglish({ text: originalNegativePrompt, label: "negative image prompt" })
    : "";

  return {
    originalPrompt,
    originalNegativePrompt,
    translatedPrompt,
    translatedNegativePrompt,
    translated: translatedPrompt !== originalPrompt || translatedNegativePrompt !== originalNegativePrompt,
  };
}

async function blobLikeToBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value?.arrayBuffer === "function") {
    return Buffer.from(await value.arrayBuffer());
  }
  throw new Error("Hugging Face trả về định dạng ảnh không hỗ trợ.");
}

async function generateImageWithHfSdk({ token, prompt, model, provider, parameters }) {
  const { InferenceClient } = await import("@huggingface/inference");
  const client = new InferenceClient(token);
  const result = await client.textToImage({
    model,
    provider: provider === "auto" ? undefined : provider,
    inputs: prompt,
    parameters,
  });
  return blobLikeToBuffer(result);
}

async function generateImageWithRawHf({ token, prompt, model, parameters }) {
  const endpoint = process.env.HF_IMAGE_ENDPOINT || `https://router.huggingface.co/hf-inference/models/${model}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify({ inputs: prompt, parameters }),
  });

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    const body = contentType.includes("application/json") ? await response.json().catch(() => null) : await response.text().catch(() => "");
    const error = new Error(typeof body === "string" ? body : body?.error || `Hugging Face HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  if (contentType.includes("application/json")) {
    const data = await response.json();
    const base64 = data?.image || data?.generated_image || data?.[0]?.image || data?.[0]?.generated_image;
    if (base64) return Buffer.from(String(base64).replace(/^data:image\/\w+;base64,/, ""), "base64");
    throw new Error("Hugging Face trả JSON nhưng không thấy dữ liệu ảnh.");
  }

  return Buffer.from(await response.arrayBuffer());
}

async function generateImageWithHfFailover({ prompt, model, provider, width, height, steps, guidanceScale, negativePrompt, seed }) {
  const tokens = readHfTokens();
  if (!tokens.length) {
    const error = new Error("Thiếu Hugging Face token. Hãy thêm HF_TOKEN hoặc HUGGINGFACE_API_KEY vào .env backend.");
    error.status = 500;
    throw error;
  }

  const parameters = {
    width: clampNumber(width, 256, 1536, 1024),
    height: clampNumber(height, 256, 1536, 1024),
    num_inference_steps: clampNumber(steps, 1, 80, 28),
    guidance_scale: clampNumber(guidanceScale, 1, 20, 7),
    ...(negativePrompt ? { negative_prompt: String(negativePrompt) } : {}),
    ...(seed !== undefined && seed !== "" ? { seed: Number(seed) } : {}),
  };

  const errors = [];
  const selectedModel = model || DEFAULT_HF_IMAGE_MODEL;
  const selectedProvider = provider || DEFAULT_HF_PROVIDER;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    try {
      let buffer;
      try {
        buffer = await generateImageWithHfSdk({
          token,
          prompt,
          model: selectedModel,
          provider: selectedProvider,
          parameters,
        });
      } catch (sdkError) {
        if (selectedProvider && selectedProvider !== "hf-inference" && selectedProvider !== "auto") {
          throw sdkError;
        }
        buffer = await generateImageWithRawHf({ token, prompt, model: selectedModel, parameters });
      }

      return {
        buffer,
        mimeType: "image/png",
        model: selectedModel,
        provider: selectedProvider,
        usedToken: keyLabel(i),
        parameters,
      };
    } catch (error) {
      errors.push({ key: keyLabel(i), message: error?.message || String(error), status: error?.status || error?.statusCode });
    }
  }

  const finalError = new Error(`Hugging Face tạo ảnh thất bại. ${errors.map((item) => `${item.key}: ${item.message}`).join(" | ")}`);
  finalError.status = 502;
  finalError.details = errors;
  throw finalError;
}

router.get("/health", (req, res) => {
  const geminiKeys = readGeminiKeys();
  const hfTokens = readHfTokens();
  res.json({
    ok: true,
    gemini: {
      configured: geminiKeys.length > 0,
      keyCount: geminiKeys.length,
      model: DEFAULT_GEMINI_MODEL,
    },
    huggingFace: {
      configured: hfTokens.length > 0,
      tokenCount: hfTokens.length,
      model: DEFAULT_HF_IMAGE_MODEL,
      provider: DEFAULT_HF_PROVIDER,
    },
  });
});

router.post("/chat", upload.array("images", 6), async (req, res) => {
  try {
    const messages = JSON.parse(req.body.messages || "[]");
    const prompt = await cleanAndValidatePublicText(req.body.prompt || "", "Nội dung chat AI", { maxLength: 6000 });
    await consumeDailyLimit({
      uid: req.user.uid,
      key: "ai_chat",
      amount: 1,
      message: "Bạn đã dùng hết lượt chat AI hôm nay. Nâng VIP để chat không giới hạn.",
    });
    const contents = buildGeminiContents(messages, req.files || [], prompt);

    if (!contents.length) {
      return res.status(400).json({ error: "Bạn chưa nhập nội dung chat." });
    }

    const result = await callGeminiWithFailover({
      contents,
      systemInstruction:
        req.body.systemInstruction ||
        "Bạn là trợ lý AI trong ứng dụng ZenTask. Trả lời rõ ràng, ngắn gọn, ưu tiên tiếng Việt khi người dùng dùng tiếng Việt.",
      model: req.body.model || DEFAULT_GEMINI_MODEL,
      temperature: req.body.temperature,
      maxOutputTokens: req.body.maxOutputTokens,
    });

    res.json({
      ok: true,
      reply: result.text,
      model: result.model,
      usedKey: result.usedKey,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    res.status(error?.status || 500).json({
      error: error?.message || "AI chat bị lỗi.",
      details: error?.details,
    });
  }
});

router.post("/image", async (req, res) => {
  try {
    const prompt = await cleanAndValidatePublicText(req.body.prompt || "", "Mô tả ảnh AI", { maxLength: 2000 });
    if (!prompt) return res.status(400).json({ error: "Bạn chưa nhập mô tả ảnh." });
    await consumeDailyLimit({
      uid: req.user.uid,
      key: "ai_image",
      amount: 1,
      message: "Bạn đã dùng hết lượt tạo ảnh AI hôm nay. Nâng VIP để tạo ảnh không giới hạn.",
    });

    const preparedPrompts = await prepareImagePrompts({
      prompt,
      negativePrompt: req.body.negativePrompt,
    });

    const result = await generateImageWithHfFailover({
      prompt: preparedPrompts.translatedPrompt,
      model: req.body.model || DEFAULT_HF_IMAGE_MODEL,
      provider: req.body.provider || DEFAULT_HF_PROVIDER,
      width: req.body.width,
      height: req.body.height,
      steps: req.body.steps,
      guidanceScale: req.body.guidanceScale,
      negativePrompt: preparedPrompts.translatedNegativePrompt,
      seed: req.body.seed,
    });

    const base64 = result.buffer.toString("base64");
    res.json({
      ok: true,
      image: `data:${result.mimeType};base64,${base64}`,
      mimeType: result.mimeType,
      model: result.model,
      provider: result.provider,
      usedToken: result.usedToken,
      parameters: result.parameters,
      originalPrompt: preparedPrompts.originalPrompt,
      originalNegativePrompt: preparedPrompts.originalNegativePrompt,
      translatedPrompt: preparedPrompts.translatedPrompt,
      translatedNegativePrompt: preparedPrompts.translatedNegativePrompt,
      translated: preparedPrompts.translated,
    });
  } catch (error) {
    console.error("AI image error:", error);
    res.status(error?.status || 500).json({
      error: error?.message || "Tạo ảnh bị lỗi.",
      details: error?.details,
    });
  }
});

export default router;
