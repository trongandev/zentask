import { GoogleGenAI } from "@google/genai";
import { AITokenUsage } from "../models/Schemas.js";

const getAvailableKeys = () => {
  const keys = [];

  // if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);

  for (let i = 1; i <= 10; i++) {
    const k = process.env[`API_KEY_AI_${i}`];
    if (k && !keys.includes(k)) keys.push(k);
  }

  // Backup keys
  if (process.env.OPENAI_ADMIN_KEY && !keys.includes(process.env.OPENAI_ADMIN_KEY)) keys.push(process.env.OPENAI_ADMIN_KEY);
  // if (process.env.OPENAI_API_KEY && !keys.includes(process.env.OPENAI_API_KEY)) keys.push(process.env.OPENAI_API_KEY);

  return keys;
};

export const generateAIContent = async ({ prompt, systemInstruction, responseSchema, feature = "general", uid = null, model = "gemini-3.5-flash-lite" }) => {
  const keys = getAvailableKeys();
  if (keys.length === 0) {
    throw new Error("No AI keys configured");
  }

  const shuffledKeys = keys.sort(() => Math.random() - 0.5);
  let lastError = null;

  for (const key of shuffledKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });

      const config = {};
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (responseSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = responseSchema;
      }

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      let promptTokens = 0,
        completionTokens = 0,
        totalTokens = 0;
      if (response.usageMetadata) {
        promptTokens = response.usageMetadata.promptTokenCount || 0;
        completionTokens = response.usageMetadata.candidatesTokenCount || 0;
        totalTokens = response.usageMetadata.totalTokenCount || 0;
      }

      await AITokenUsage.create({
        uid,
        feature,
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        status: "success",
      }).catch((err) => console.error("Lỗi ghi log AI usage:", err));

      if (responseSchema) {
        return JSON.parse(response.text);
      }
      return response.text;
    } catch (err) {
      console.warn(`[AI Service] Key failed:`, err.message);
      lastError = err;

      await AITokenUsage.create({
        uid,
        feature,
        model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        status: "error",
        errorMessage: err.message,
      }).catch((e) => console.error("Lỗi ghi log AI usage (error case):", e));
    }
  }

  throw new Error(`All AI API keys failed. Last error: ${lastError?.message}`);
};
