import { getClientIp } from "./usageLimits.js";

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export const isRecaptchaEnabled = () => {
  const explicit = String(process.env.RECAPTCHA_ENABLED || "").toLowerCase();
  return explicit === "true" || Boolean(process.env.RECAPTCHA_SECRET_KEY);
};

export const verifyRecaptchaToken = async (token, remoteIp) => {
  if (!isRecaptchaEnabled()) {
    return { ok: true, skipped: true };
  }

  // Cho phép bỏ qua khi chạy local/dev để tránh bị kẹt nếu Google reCAPTCHA
  // bị chặn bởi mạng nội bộ, ad blocker hoặc chưa có domain localhost trong console.
  // Không bao giờ cho bypass ở production.
  const isDevBypassToken = String(token || "").trim() === "dev-recaptcha-bypass";
  const allowDevBypass =
    process.env.NODE_ENV !== "production" &&
    String(process.env.RECAPTCHA_DEV_BYPASS ?? "true").toLowerCase() !== "false";
  if (isDevBypassToken && allowDevBypass) {
    return { ok: true, skipped: true, devBypass: true };
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    const error = new Error("reCAPTCHA chưa được cấu hình trên server.");
    error.status = 500;
    error.code = "RECAPTCHA_NOT_CONFIGURED";
    throw error;
  }

  if (!token || typeof token !== "string" || token.trim().length < 20) {
    const error = new Error("Vui lòng xác minh reCAPTCHA trước khi tiếp tục.");
    error.status = 400;
    error.code = "RECAPTCHA_REQUIRED";
    throw error;
  }

  const body = new URLSearchParams();
  body.append("secret", secret);
  body.append("response", token.trim());
  if (remoteIp) body.append("remoteip", remoteIp);

  let data;
  try {
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    data = await response.json();
  } catch (err) {
    console.error("reCAPTCHA verify request failed:", err);
    const error = new Error("Không thể xác minh reCAPTCHA. Vui lòng thử lại.");
    error.status = 502;
    error.code = "RECAPTCHA_VERIFY_FAILED";
    throw error;
  }

  if (!data?.success) {
    const error = new Error("Xác minh reCAPTCHA thất bại. Vui lòng thử lại.");
    error.status = 400;
    error.code = "RECAPTCHA_INVALID";
    error.details = data?.["error-codes"] || [];
    throw error;
  }

  return { ok: true, challengeTs: data.challenge_ts, hostname: data.hostname };
};

export const verifyRecaptchaFromRequest = async (req) => {
  const token = req.body?.recaptchaToken || req.body?.captchaToken || req.headers?.["x-recaptcha-token"];
  return verifyRecaptchaToken(token, getClientIp(req));
};
