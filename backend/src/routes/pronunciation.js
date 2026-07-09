import { Router } from "express";
import { auth } from "../firebase.js";

const router = Router();

const DEFAULT_PRONUNCIATION_API_URL =
  "https://wrg7ayuv7i.execute-api.eu-central-1.amazonaws.com/Prod/GetAccuracyFromRecordedAudio";

const authenticate = async (req, res, next) => {
  const sessionCookie = req.cookies.session || "";
  if (!sessionCookie) return res.status(401).json({ error: "Unauthenticated" });
  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    req.uid = decodedClaims.uid;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthenticated" });
  }
};

router.use(authenticate);

const cleanText = (value, max = 200) => String(value || "").trim().slice(0, max);
function cleanEnv(value) {
  return String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

function canonicalizeBase64Audio(value) {
  const raw = String(value || "").trim().replace(/\s+/g, "");
  if (!raw) return "";

  // Required upstream shape is exactly: data:audio/webm;base64,....
  // Some browsers may produce data:audio/webm;codecs=opus;base64,....
  // Normalize it here before forwarding to the external API.
  const commaIndex = raw.indexOf(",");
  if (commaIndex === -1) return raw;
  const prefix = raw.slice(0, commaIndex).toLowerCase();
  const body = raw.slice(commaIndex + 1);

  if (prefix.startsWith("data:audio/webm") && prefix.includes(";base64")) {
    return `data:audio/webm;base64,${body}`;
  }

  return raw;
}

function validateBase64Audio(value) {
  const text = String(value || "");
  if (!text.startsWith("data:audio/webm;base64,")) {
    return {
      ok: false,
      status: 400,
      error: "File ghi âm không hợp lệ. Payload bắt buộc phải có base64Audio dạng data:audio/webm;base64,...",
    };
  }
  // Prevent accidentally sending extremely large recordings to the upstream service.
  // Express already has a JSON limit, this keeps the pronunciation feature responsive.
  if (text.length > 18_000_000) {
    return {
      ok: false,
      status: 413,
      error: "File ghi âm quá lớn. Hãy ghi âm ngắn hơn rồi thử lại.",
    };
  }
  return { ok: true };
}

function buildSafeDebug(payload) {
  const audio = String(payload.base64Audio || "");
  return {
    title: payload.title,
    language: payload.language,
    base64AudioPrefix: audio.slice(0, 32),
    base64AudioLength: audio.length,
  };
}

async function readUpstreamBody(upstreamRes) {
  const text = await upstreamRes.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

router.post("/assess", async (req, res) => {
  try {
    const title = cleanText(req.body?.title, 200).toLowerCase();
    const language = cleanText(req.body?.language || "en", 12) || "en";
    const base64Audio = canonicalizeBase64Audio(req.body?.base64Audio);

    if (!title) return res.status(400).json({ error: "Thiếu từ cần chấm phát âm." });
    const audioValidation = validateBase64Audio(base64Audio);
    if (!audioValidation.ok) {
      return res.status(audioValidation.status || 400).json({
        error: audioValidation.error,
        payloadDebug: buildSafeDebug({ title, base64Audio, language }),
      });
    }

    const apiKey = cleanEnv(process.env.PRONUNCIATION_API_KEY || process.env.AWS_PRONUNCIATION_API_KEY);
    if (!apiKey) {
      return res.status(500).json({ error: "Backend chưa cấu hình PRONUNCIATION_API_KEY trong file .env." });
    }

    const apiUrl = cleanEnv(process.env.PRONUNCIATION_API_URL) || DEFAULT_PRONUNCIATION_API_URL;

    // IMPORTANT: upstream payload must match the required API shape exactly.
    // Do not add uid, cardId, setId, apiKey, bearer, or any extra fields here.
    // Key order is kept as shown in the required screenshot.
    const payload = {
      title,
      base64Audio,
      language,
    };

    if (process.env.PRONUNCIATION_DEBUG === "1") {
      console.log("Pronunciation payload debug:", buildSafeDebug(payload));
    }

    const upstreamRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // API Gateway REST API key. This is NOT Bearer auth.
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await readUpstreamBody(upstreamRes);

    if (!upstreamRes.ok) {
      console.error("Pronunciation upstream error:", {
        status: upstreamRes.status,
        body: data,
        payload: buildSafeDebug(payload),
      });

      const upstreamMessage = data?.message || data?.error || data?.raw || "Không chấm được phát âm.";
      const userMessage =
        upstreamRes.status >= 500
          ? "API chấm phát âm bên ngoài đang trả lỗi. Backend đã gửi đúng payload data:audio/webm;base64. Hãy kiểm tra API key hoặc log Lambda/API Gateway."
          : upstreamMessage;

      return res.status(upstreamRes.status >= 500 ? 502 : upstreamRes.status).json({
        error: userMessage,
        upstreamStatus: upstreamRes.status,
        details: data,
        payloadDebug: buildSafeDebug(payload),
      });
    }

    res.json({
      ok: true,
      result: data,
    });
  } catch (error) {
    console.error("Pronunciation assess error:", error);
    res.status(500).json({ error: "Lỗi server khi chấm phát âm.", details: { message: error?.message || String(error) } });
  }
});

export default router;
