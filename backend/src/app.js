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

import connectDB from "./config/db.js";
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
import grammarRoutes from "./routes/grammar.js";
import tensesRoutes from "./routes/tenses.js";
import aiRoutes from "./routes/ai.js";
import notebookRoutes from "./routes/notebook.js";
import utilitiesRoutes from "./routes/utilities.js";
import friendsRoutes from "./routes/friends.js";
import pronunciationRoutes from "./routes/pronunciation.js";
import skillPracticeRoutes from "./routes/skillPractice.js";

import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 phút
    max: 100, // Giới hạn mỗi IP 100 requests mỗi 5 phút
    message: "Bạn đang thao tác quá nhanh, vui lòng thử lại sau ít phút.",
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

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

// Support Bearer token from Extension (map to req.cookies.session)
app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        req.cookies.session = authHeader.split(" ")[1];
    }
    next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/rank", rankRoutes);
app.use("/api/flashcard", flashcardRoutes);
app.use("/api/user", userRoutes);
app.use("/api/config", configRoutes);
app.use("/api/grammar", grammarRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/arena", arenaRoutes);
app.use("/api/tenses", tensesRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notebook", notebookRoutes);
app.use("/api/utilities", utilitiesRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/pronunciation", pronunciationRoutes);
app.use("/api/skill-practice", skillPracticeRoutes);

app.use(errorHandler);

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
