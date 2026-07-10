import crypto from "crypto";
import User from "../models/User.js";
import { DailyUsage } from "../models/Schemas.js";

const toInt = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

export const DEFAULT_LIMITS = {
  ai_chat: toInt(process.env.LIMIT_AI_CHAT_DAILY, 30),
  ai_image: toInt(process.env.LIMIT_AI_IMAGE_DAILY, 5),
  flashcard_words: toInt(process.env.LIMIT_FLASHCARD_WORDS_DAILY, 30),
  quiz_create: toInt(process.env.LIMIT_QUIZ_DAILY, 3),
  grammar_generate: toInt(process.env.LIMIT_GRAMMAR_DAILY, 2),
  tenses_generate: toInt(process.env.LIMIT_TENSES_DAILY, 2),
  community_post: toInt(process.env.LIMIT_COMMUNITY_POST_DAILY, 2),
  accounts_per_ip: toInt(process.env.LIMIT_ACCOUNTS_PER_IP, 3),
};

export function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const real = String(req.headers["x-real-ip"] || "").trim();
  const ip = forwarded || real || req.ip || req.connection?.remoteAddress || "unknown";
  return ip.replace(/^::ffff:/, "");
}

export function hashIp(ip = "") {
  const salt = process.env.IP_HASH_SALT || process.env.ACCESS_TOKEN_SECRET || "zentask-ip-salt";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function isVipUser(user = {}) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.isVip === true) return true;
  if (user.vipUntil && new Date(user.vipUntil).getTime() > Date.now()) return true;
  const plan = String(user.subscription?.plan || user.plan || "").toLowerCase();
  return ["vip", "pro", "premium", "unlimited"].includes(plan);
}

export async function loadUserForLimit(uid) {
  return await User.findById(uid).select("role isVip vipUntil subscription plan").lean();
}

export async function enforceDailyLimit({ uid, key, amount = 1, limit, message }) {
  const safeAmount = Math.max(1, Math.floor(Number(amount) || 1));
  const safeLimit = limit ?? DEFAULT_LIMITS[key];
  const user = await loadUserForLimit(uid);
  if (isVipUser(user)) return { allowed: true, vip: true, used: 0, remaining: null, limit: null };
  if (!Number.isFinite(Number(safeLimit))) return { allowed: true, vip: false, used: 0, remaining: null, limit: null };

  const date = getTodayKey();
  const current = await DailyUsage.findOne({ uid, date, key }).lean();
  const used = Number(current?.count || 0);
  if (used + safeAmount > safeLimit) {
    const error = new Error(message || `Bạn đã dùng hết giới hạn hôm nay (${used}/${safeLimit}). Nâng VIP để dùng không giới hạn.`);
    error.status = 429;
    error.code = "DAILY_LIMIT_REACHED";
    error.limit = safeLimit;
    error.used = used;
    error.remaining = Math.max(0, safeLimit - used);
    throw error;
  }
  return { allowed: true, vip: false, used, remaining: safeLimit - used - safeAmount, limit: safeLimit };
}

export async function consumeDailyLimit({ uid, key, amount = 1, limit, message }) {
  const check = await enforceDailyLimit({ uid, key, amount, limit, message });
  if (check.vip) return check;
  const safeAmount = Math.max(1, Math.floor(Number(amount) || 1));
  const date = getTodayKey();
  const updated = await DailyUsage.findOneAndUpdate(
    { uid, date, key },
    { $inc: { count: safeAmount }, $setOnInsert: { uid, date, key } },
    { upsert: true, new: true },
  ).lean();
  return { ...check, used: Number(updated?.count || 0), remaining: check.limit === null ? null : Math.max(0, check.limit - Number(updated?.count || 0)) };
}

export function dailyLimitMiddleware(key, options = {}) {
  return async (req, res, next) => {
    try {
      const amount = typeof options.amount === "function" ? options.amount(req) : options.amount || 1;
      await consumeDailyLimit({
        uid: req.user.uid,
        key,
        amount,
        limit: options.limit,
        message: options.message,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}
