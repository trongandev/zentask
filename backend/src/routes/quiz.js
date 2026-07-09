import { Router } from "express";
import User from "../models/User.js";
import { Quiz, QuizResult, QuizRoom } from "../models/Schemas.js";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";
import { checkAchievements } from "../utils/achievements.js";
import { addXpToUser, incrementDailyTask } from "./user.js";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(verifyToken);

const isVipUser = (profile = {}) => {
  const role = String(profile.role || "").toLowerCase();
  const plan = String(profile.plan || profile.subscriptionPlan || profile.membership || "").toLowerCase();
  const status = String(profile.subscriptionStatus || profile.vipStatus || "").toLowerCase();
  return Boolean(profile.isVip || profile.vip || role === "admin" || role === "vip" || plan === "vip" || plan === "pro" || plan === "premium" || status === "active");
};

const isFeaturedQuiz = (quiz = {}) => {
  const type = String(quiz.type || quiz.category || quiz.source || quiz.ownerType || "").toLowerCase();
  const creatorId = quiz.creatorId;
  return Boolean(
    quiz.isFeatured ||
    quiz.featured ||
    quiz.isDefault ||
    quiz.isSystem ||
    type === "featured" ||
    type === "default" ||
    type === "system" ||
    creatorId === "system" ||
    creatorId === "default" ||
    creatorId === "admin_seed" ||
    !creatorId,
  );
};

const normalizePublicFlag = async (uid, requestedValue = true) => {
  const wantsPublic = requestedValue !== false;
  if (wantsPublic) return true;

  const profile = await User.findById(uid).lean();
  if (!isVipUser(profile)) {
    const err = new Error("Tính năng tạo quiz riêng tư chỉ dành cho tài khoản VIP.");
    err.statusCode = 402;
    throw err;
  }
  return false;
};

const attachCreators = async (quizzes) => {
  const creatorIds = [...new Set(quizzes.map((q) => q.creatorId).filter((id) => id && id.length === 24))];
  const users = await User.find({ _id: { $in: creatorIds } }).lean();

  const creatorMap = {};
  users.forEach((user) => {
    creatorMap[user._id.toString()] = {
      uid: user._id.toString(),
      displayName: user.displayName || user.email || "Người dùng ZenTask",
      photoURL: user.photoURL || "",
    };
  });

  return quizzes.map((q) => ({
    ...q,
    creator: creatorMap[q.creatorId] || null,
  }));
};

const generateRoomCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// GET /api/quiz - featured quizzes first, then quizzes created by current user
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const allQuizzes = await Quiz.find().lean();

    const processed = allQuizzes.map((q) => {
      const featured = isFeaturedQuiz(q);
      return {
        id: q._id,
        ...q,
        isFeatured: featured,
        isMine: q.creatorId === req.user.uid,
      };
    });

    const featuredQuizzes = processed.filter((q) => q.isFeatured).sort((a, b) => b.createdAt - a.createdAt);
    const myQuizzes = processed.filter((q) => q.creatorId === req.user.uid && !q.isFeatured).sort((a, b) => b.createdAt - a.createdAt);

    const seen = new Set();
    const quizzes = [...featuredQuizzes, ...myQuizzes]
      .filter((quiz) => {
        if (seen.has(quiz.id)) return false;
        seen.add(quiz.id);
        return true;
      })
      .slice(0, 80);

    res.json(quizzes);
  }),
);

// GET /api/quiz/public
router.get(
  "/public",
  asyncHandler(async (req, res) => {
    const quizzes = await Quiz.find({ isPublic: true }).sort({ createdAt: -1 }).lean();
    const formatted = await attachCreators(quizzes.map((q) => ({ id: q._id, ...q })));
    res.json(formatted);
  }),
);

// GET /api/quiz/history
router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const historyDocs = await QuizResult.find({ uid: req.user.uid }).sort({ createdAt: -1 }).limit(20).populate("quizId", "title difficulty").lean();

    const history = historyDocs.map((doc) => ({
      id: doc._id,
      ...doc,
      quizTitle: doc.quizId ? doc.quizId.title : "Unknown Quiz",
      quizDifficulty: doc.quizId ? doc.quizId.difficulty : "Medium",
      quizId: doc.quizId ? doc.quizId._id : null,
    }));

    res.json(history);
  }),
);

// GET /api/quiz/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const quiz = await Quiz.findById(req.params.id).lean();
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    if (quiz.creatorId !== req.user.uid && !quiz.isPublic && !isFeaturedQuiz(quiz)) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.json({ id: quiz._id, ...quiz });
  }),
);

// POST /api/quiz (Create manual)
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { title, description, difficulty, duration, questions, isPublic = true } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ error: "Invalid quiz data" });
    }

    const formattedQuestions = questions.map((q, idx) => ({
      ...q,
      id: q.id || `q_${Date.now()}_${idx}`,
    }));

    const publicFlag = await normalizePublicFlag(req.user.uid, isPublic);

    const newQuiz = await Quiz.create({
      title,
      description: description || "",
      difficulty: difficulty || "Medium",
      duration: duration || 15,
      questions: formattedQuestions,
      creatorId: req.user.uid,
      isPublic: publicFlag,
    });

    const taskResult = await incrementDailyTask(req.user.uid, "quiz_master", 1);
    let xpResult = null;
    if (taskResult.success && taskResult.xpToAdd > 0) {
      xpResult = await addXpToUser(req.user.uid, taskResult.xpToAdd);
    }

    res.json({
      id: newQuiz._id,
      status: "success",
      xpResult,
      taskProgress: taskResult.success ? { quiz_master: taskResult.progress } : {},
    });
  }),
);

// POST /api/quiz/generate (AI)
router.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const { prompt, numQuestions = 5, difficulty = "Medium", isPublic = true } = req.body;

    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const availableKeys = [];
    for (let i = 1; i <= 10; i++) {
      const k = process.env[`API_KEY_AI_${i}`];
      if (k) availableKeys.push({ index: i, key: k });
    }

    if (availableKeys.length === 0) {
      return res.status(500).json({ error: "No AI keys configured" });
    }

    const shuffledKeys = availableKeys.sort(() => Math.random() - 0.5);

    const promptText = `Tạo một bài thi trắc nghiệm dựa trên yêu cầu sau: "${prompt}".
Số lượng câu hỏi cần tạo: đúng ${numQuestions} câu.
Độ khó: ${difficulty}.
Nội dung phải là tiếng Việt, logic, mang tính giáo dục.`;

    let quizData = null;

    for (const { index, key } of shuffledKeys) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: promptText,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: "Nội dung câu hỏi" },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Mảng chứa đúng 4 đáp án",
                      },
                      correctAnswer: { type: Type.STRING, description: "Đáp án đúng chính xác" },
                      explanation: { type: Type.STRING, description: "Giải thích ngắn gọn tại sao đúng" },
                    },
                    required: ["text", "options", "correctAnswer", "explanation"],
                  },
                },
              },
              required: ["title", "description", "questions"],
            },
          },
        });

        quizData = JSON.parse(response.text);

        quizData.questions = quizData.questions.map((q) => {
          if (!q.options || q.options.length < 4) {
            const newOpts = [...(q.options || [])];
            while (newOpts.length < 4) newOpts.push("...");
            q.options = newOpts;
          }
          return q;
        });

        break;
      } catch (err) {
        console.warn(`[Quiz AI] Key API_KEY_AI_${index} failed:`, err.message);
      }
    }

    if (!quizData) {
      return res.status(500).json({ error: "All AI API keys failed to generate content." });
    }

    const formattedQuestions = quizData.questions.map((q, idx) => ({
      id: `q_${Date.now()}_${idx}`,
      ...q,
    }));

    const publicFlag = await normalizePublicFlag(req.user.uid, isPublic);

    const newQuiz = await Quiz.create({
      title: quizData.title,
      description: quizData.description,
      difficulty,
      duration: numQuestions * 1.5,
      questions: formattedQuestions,
      creatorId: req.user.uid,
      isPublic: publicFlag,
    });

    const taskResult = await incrementDailyTask(req.user.uid, "quiz_master", 1);
    let xpResult = null;
    if (taskResult.success && taskResult.xpToAdd > 0) {
      xpResult = await addXpToUser(req.user.uid, taskResult.xpToAdd);
    }

    const quizObj = newQuiz.toObject();
    res.json({
      id: quizObj._id,
      ...quizObj,
      xpResult,
      taskProgress: taskResult.success ? { quiz_master: taskResult.progress } : {},
    });
  }),
);

// POST /api/quiz/:id/rooms
router.post(
  "/:id/rooms",
  asyncHandler(async (req, res) => {
    const quizId = req.params.id;
    const { settings } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const roomCode = generateRoomCode();
    const newRoom = await QuizRoom.create({
      roomCode,
      quizId,
      hostId: req.user.uid,
      status: "waiting",
      settings: settings || {
        allowRetry: false,
        showAnswers: true,
        phoenixRebirth: false,
        shuffleQuestions: false,
      },
    });

    res.json({ id: newRoom._id, roomCode, status: "success" });
  }),
);

// GET /api/quiz/rooms/id/:id
router.get(
  "/rooms/id/:id",
  asyncHandler(async (req, res) => {
    const room = await QuizRoom.findById(req.params.id).lean();
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json({ id: room._id, ...room });
  }),
);

// GET /api/quiz/rooms/:code
router.get(
  "/rooms/:code",
  asyncHandler(async (req, res) => {
    const room = await QuizRoom.findOne({ roomCode: req.params.code }).lean();
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json({ id: room._id, ...room });
  }),
);

// POST /api/quiz/:id/submit
router.post(
  "/:id/submit",
  asyncHandler(async (req, res) => {
    const { answers, usedRebirth, roomId } = req.body;
    const quizId = req.params.id;

    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    if (quiz.creatorId !== req.user.uid && !quiz.isPublic && !isFeaturedQuiz(quiz)) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    let correctCount = 0;
    const evaluation = {};
    for (const q of quiz.questions) {
      const userAnswer = answers[q.id] || "";
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) correctCount++;

      evaluation[q.id] = {
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || "",
      };
    }

    const score = Math.round((correctCount / quiz.questions.length) * 100);

    let roomSettings = null;
    if (roomId) {
      const room = await QuizRoom.findById(roomId).lean();
      if (room) roomSettings = room.settings;
    }

    const resultData = await QuizResult.create({
      quizId,
      uid: req.user.uid,
      score,
      totalCorrect: correctCount,
      totalQuestions: quiz.questions.length,
      answers,
      evaluation,
      usedRebirth: !!usedRebirth,
      roomId: roomId || null,
      roomSettings,
    });

    const expGain = score;
    const { xp, level, levelUp } = await addXpToUser(req.user.uid, expGain);

    checkAchievements(req.user.uid, "QUIZ_SUBMIT", {}, req.app);

    res.json({
      id: resultData._id,
      ...resultData.toObject(),
      expGain,
      xpResult: { xp, level, levelUp },
    });
  }),
);

// POST /api/quiz/rebirth/:resultId
router.post(
  "/rebirth/:resultId",
  asyncHandler(async (req, res) => {
    const { questionId, newAnswer } = req.body;
    const resultId = req.params.resultId;

    const result = await QuizResult.findById(resultId);
    if (!result) return res.status(404).json({ error: "Result not found" });

    if (result.uid.toString() !== req.user.uid) return res.status(403).json({ error: "Unauthorized" });
    if (result.usedRebirth) return res.status(400).json({ error: "Rebirth already used" });

    const quiz = await Quiz.findById(result.quizId).lean();
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const targetQuestion = quiz.questions.find((q) => q.id === questionId);
    if (!targetQuestion) return res.status(404).json({ error: "Question not found" });

    const isCorrect = newAnswer === targetQuestion.correctAnswer;

    result.evaluation[questionId].userAnswer = newAnswer;
    result.evaluation[questionId].isCorrect = isCorrect;
    result.answers[questionId] = newAnswer;

    if (isCorrect) {
      result.totalCorrect++;
      result.score = Math.round((result.totalCorrect / result.totalQuestions) * 100);
      const expGain = Math.round(100 / result.totalQuestions);
      await addXpToUser(req.user.uid, expGain);
    }

    result.usedRebirth = true;

    // markModified is necessary when saving nested objects/mixed types
    result.markModified("evaluation");
    result.markModified("answers");
    await result.save();

    res.json({ success: true, isCorrect, newScore: result.score, correctAnswer: targetQuestion.correctAnswer });
  }),
);

export default router;
