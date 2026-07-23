import crypto from "crypto";
if (!global.crypto) {
  global.crypto = crypto.webcrypto || crypto;
}

import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import compression from "compression";
import morgan from "morgan";
import http from "http";
import jwt from "jsonwebtoken";

import connectDB from "./config/db.js";
import { SystemLog, BannedIP } from "./models/Schemas.js";
import { initializeSocket } from "./socket/index.js";

// Route imports
import authRoutes from "./routes/auth.js";
import rankRoutes from "./routes/rank.js";
import flashcardRoutes from "./routes/flashcard.js";
import userRoutes from "./routes/user.js";
import configRoutes from "./routes/config.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import communityRoutes from "./routes/community.js";
import notificationRoutes from "./routes/notifications.js";
import quizRoutes from "./routes/quiz.js";
import adminRoutes from "./routes/admin.js";
import arenaRoutes from "./routes/arena.js";
import aiRoutes from "./routes/ai.js";
import notebookRoutes from "./routes/notebook.js";
import friendsRoutes from "./routes/friends.js";
import pronunciationRoutes from "./routes/pronunciation.js";
import skillPracticeRoutes from "./routes/skillPractice.js";
import publicRoutes from "./routes/public.js";
import chatbotRoutes from "./routes/chatbot.js";
import beginnerRoutes from "./routes/beginner.js";
import chatbotAuthRoutes from "./routes/chatbotAuth.js";

import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

const port = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server, app);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(compression());
app.use(morgan("dev"));
app.use(express.json({ limit: "25mb" }));
app.use(cookieParser());

// Global Token Decoding Middleware
app.use((req, res, next) => {
  let token = req.headers.authorization;
  if (token && token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  } else if (req.cookies && req.cookies.session) {
    token = req.cookies.session;
  }

  if (token) {
    req.cookies = req.cookies || {};
    req.cookies.session = token;
    try {
      req.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (e) {
      req.tokenError = e;
    }
  }
  next();
});

// Honeypot Middleware
app.use(async (req, res, next) => {
  // Bỏ qua đường dẫn gửi feedback
  if (req.path === "/api/public/banned-feedback") {
    return next();
  }

  let clientIp = req.headers["cf-connecting-ip"] || req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress || "";
  if (typeof clientIp === "string") {
    clientIp = clientIp.split(",")[0].trim();
    if (clientIp.startsWith("::ffff:")) {
      clientIp = clientIp.substring(7);
    }
  }

  try {
    const banned = await BannedIP.findOne({ ip: clientIp }).lean();
    if (banned && banned.isHoneypot) {
      return res.status(403).json({
        success: false,
        error: "IP_BANNED_HONEYPOT",
        message:
          "Hệ thống nhận thấy một số truy cập bất thường từ địa chỉ IP của bạn. Có vẻ như bạn đang cố gắng tìm hiểu cách hệ thống hoạt động hoặc kiểm tra các lỗ hổng bảo mật. Thay vì mất thời gian để tấn công một hệ thống học tập dành cho cộng đồng, tại sao chúng ta không hợp tác? Nếu bạn tìm thấy bất kỳ lỗi hoặc lỗ hổng nào, xin vui lòng đóng góp ý kiến để chúng tôi cải thiện.",
      });
    } else if (banned) {
      return res.status(403).json({ success: false, error: "IP_BANNED", message: "IP has been blocked." });
    }
  } catch (e) {
    console.error("Honeypot middleware error:", e);
  }
  next();
});

const alertThrottle = new Map();

const limiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 phút
  max: 100, // Giới hạn mỗi IP 100 requests mỗi 2 phút
  message: "Bạn đang thao tác quá nhanh, vui lòng thử lại sau ít phút.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    return req.user?.role === "admin";
  },
  handler: async (req, res, next, options) => {
    try {
      let clientIp = req.headers["cf-connecting-ip"] || req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress || "";
      if (typeof clientIp === "string") {
        clientIp = clientIp.split(",")[0].trim();
        if (clientIp.startsWith("::ffff:")) {
          clientIp = clientIp.substring(7);
        }
      }

      const { getApi } = await import("./routes/chatbot.js");
      const User = (await import("./models/User.js")).default;
      const api = getApi();

      if (api) {
        const now = Date.now();
        const lastAlert = alertThrottle.get(clientIp) || 0;
        // Gửi thông báo tối đa 1 lần mỗi 15 phút cho cùng 1 IP
        if (now - lastAlert > 15 * 60 * 1000) {
          alertThrottle.set(clientIp, now);

          const admins = await User.find({ role: "admin", zaloId: { $ne: null } });
          const alertMsg = `🚨 **CẢNH BÁO HỆ THỐNG** 🚨\n\nPhát hiện spam/DDoS API.\n- IP: ${clientIp}\n- Endpoint: ${req.method} ${req.originalUrl}\n\nGõ \`/ban-ip ${clientIp}\` để cấm IP này.`;
          for (const admin of admins) {
            api.sendMessage({ msg: alertMsg }, admin.zaloId, 0).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error("Lỗi khi gửi cảnh báo spam/DDOS qua Zalo:", e);
    }
    return res.status(options.statusCode).json({ error: options.message });
  },
});
app.use(limiter);

// System logs middleware
app.use((req, res, next) => {
  if (req.method !== "GET") {
    const bodyClone = { ...req.body };
    if (bodyClone.password) delete bodyClone.password;
    if (bodyClone.oldPassword) delete bodyClone.oldPassword;
    if (bodyClone.newPassword) delete bodyClone.newPassword;

    const requestUrl = req.originalUrl || req.url;
    if (requestUrl && requestUrl.includes("/api/pronunciation/assess") && bodyClone.base64Audio) {
      bodyClone.base64Audio = "Hệ thống đã tự động xóa trường này";
    }

    let clientIp = req.headers["cf-connecting-ip"] || req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress || "";
    if (typeof clientIp === "string") {
      clientIp = clientIp.split(",")[0].trim();
      if (clientIp.startsWith("::ffff:")) {
        clientIp = clientIp.substring(7);
      }
    }

    SystemLog.create({
      method: req.method,
      url: req.originalUrl || req.url,
      body: bodyClone,
      ip: clientIp,
      uid: req.user?.uid || null,
    }).catch((err) => console.error("Error saving SystemLog:", err));
  }
  next();
});

// API Routes
app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/rank", rankRoutes);
app.use("/api/flashcard", flashcardRoutes);
app.use("/api/user", userRoutes);
app.use("/api/config", configRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/arena", arenaRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notebook", notebookRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/pronunciation", pronunciationRoutes);
app.use("/api/skill-practice", skillPracticeRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/chatbot-auth", chatbotAuthRoutes);
app.use("/api/beginner", beginnerRoutes);

app.use(errorHandler);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
