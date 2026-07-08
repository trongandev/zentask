import { Router } from "express";
import { auth, db } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";
import { checkAchievements } from "../utils/achievements.js";

const router = Router();

// Middleware to authenticate
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

// Generate room code
const generateRoomCode = () => {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars like "A1B2C3"
};

// GET /api/quiz
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("quizzes").orderBy("createdAt", "desc").limit(20).get();
    const quizzes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(quizzes);
  } catch (error) {
    console.error("Error getting quizzes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/quiz/history
router.get("/history", async (req, res) => {
  try {
    const snapshot = await db.collection("quiz_results").where("uid", "==", req.uid).orderBy("createdAt", "desc").limit(20).get();

    const history = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const quizDoc = await db.collection("quizzes").doc(data.quizId).get();
      if (quizDoc.exists) {
        history.push({
          id: doc.id,
          ...data,
          quizTitle: quizDoc.data().title,
          quizDifficulty: quizDoc.data().difficulty,
        });
      }
    }
    res.json(history);
  } catch (error) {
    console.error("Error getting quiz history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/quiz/:id
router.get("/:id", async (req, res) => {
  try {
    const doc = await db.collection("quizzes").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    const data = doc.data();
    // In a real strict environment, we might hide correct answers here,
    // but since we need client-side evaluation for Phoenix Rebirth quickly,
    // we'll send it down.
    res.json({ id: doc.id, ...data });
  } catch (error) {
    console.error("Error getting quiz:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/quiz (Create manual)
router.post("/", async (req, res) => {
  try {
    const { title, description, difficulty, duration, questions } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ error: "Invalid quiz data" });
    }

    // Ensure questions have IDs
    const formattedQuestions = questions.map((q, idx) => ({
      ...q,
      id: q.id || `q_${Date.now()}_${idx}`,
    }));

    const newQuiz = {
      title,
      description: description || "",
      difficulty: difficulty || "Medium",
      duration: duration || 15,
      questions: formattedQuestions,
      creatorId: req.uid,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("quizzes").add(newQuiz);
    res.json({ id: docRef.id, status: "success" });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/quiz/generate (AI)
router.post("/generate", async (req, res) => {
  try {
    const { prompt, numQuestions = 5, difficulty = "Medium" } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const availableKeys = [];
    for (let i = 1; i <= 10; i++) {
      const k = process.env[`API_KEY_AI_${i}`];
      if (k) availableKeys.push({ index: i, key: k });
    }

    if (availableKeys.length === 0) {
      return res.status(500).json({ error: "No AI keys configured" });
    }

    // Shuffle keys
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
                        description: "Mảng chứa đúng 4 đáp án (VD: ['A', 'B', 'C', 'D'])",
                      },
                      correctAnswer: { type: Type.STRING, description: "Đáp án đúng chính xác (phải khớp 100% với 1 trong 4 lựa chọn)" },
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

        // Ensure options always has 4 items
        quizData.questions = quizData.questions.map((q) => {
          if (!q.options || q.options.length < 4) {
            // pad with empty strings if AI missed it somehow
            const newOpts = [...(q.options || [])];
            while (newOpts.length < 4) newOpts.push("...");
            q.options = newOpts;
          }
          return q;
        });

        break; // Success!
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

    const newQuiz = {
      title: quizData.title,
      description: quizData.description,
      difficulty,
      duration: numQuestions * 1.5, // 1.5 mins per question
      questions: formattedQuestions,
      creatorId: req.uid,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("quizzes").add(newQuiz);
    res.json({ id: docRef.id, ...newQuiz });
  } catch (error) {
    console.error("Error generating quiz:", error);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
});

// POST /api/quiz/:id/rooms
router.post("/:id/rooms", async (req, res) => {
  try {
    const quizId = req.params.id;
    const { settings } = req.body; // e.g. { allowRetry, showAnswers, phoenixRebirth, shuffleQuestions }

    const quizDoc = await db.collection("quizzes").doc(quizId).get();
    if (!quizDoc.exists) return res.status(404).json({ error: "Quiz not found" });

    const roomCode = generateRoomCode();
    const newRoom = {
      roomCode,
      quizId,
      creatorId: req.uid,
      status: "waiting", // waiting, playing, finished
      settings: settings || {
        allowRetry: false,
        showAnswers: true,
        phoenixRebirth: false,
        shuffleQuestions: false,
      },
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("quiz_rooms").add(newRoom);
    res.json({ id: docRef.id, roomCode, status: "success" });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/quiz/rooms/id/:id
router.get("/rooms/id/:id", async (req, res) => {
  try {
    const roomId = req.params.id;
    const doc = await db.collection("quiz_rooms").doc(roomId).get();
    if (!doc.exists) return res.status(404).json({ error: "Room not found" });

    const room = { id: doc.id, ...doc.data() };
    res.json(room);
  } catch (error) {
    console.error("Error getting room by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/quiz/rooms/:code
router.get("/rooms/:code", async (req, res) => {
  try {
    const code = req.params.code;
    const snapshot = await db.collection("quiz_rooms").where("roomCode", "==", code).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: "Room not found" });

    const room = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    res.json(room);
  } catch (error) {
    console.error("Error getting room:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/quiz/:id/submit
router.post("/:id/submit", async (req, res) => {
  try {
    const { answers, usedRebirth, roomId } = req.body;
    const quizId = req.params.id;

    const quizDoc = await db.collection("quizzes").doc(quizId).get();
    if (!quizDoc.exists) return res.status(404).json({ error: "Quiz not found" });

    const quiz = quizDoc.data();
    let correctCount = 0;

    // Evaluate answers
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
      try {
        const roomDoc = await db.collection("quiz_rooms").doc(roomId).get();
        if (roomDoc.exists) {
          roomSettings = roomDoc.data().settings;
        }
      } catch (e) {
        console.error("Error fetching room settings:", e);
      }
    }

    const resultData = {
      quizId,
      uid: req.uid,
      score,
      totalCorrect: correctCount,
      totalQuestions: quiz.questions.length,
      answers,
      evaluation,
      usedRebirth: !!usedRebirth,
      roomId: roomId || null,
      roomSettings,
      createdAt: FieldValue.serverTimestamp(),
    };

    const resultRef = await db.collection("quiz_results").add(resultData);

    // Update user exp based on score
    const expGain = score; // 1 exp per 1% score
    await db
      .collection("users")
      .doc(req.uid)
      .update({
        exp: FieldValue.increment(expGain),
      });

    // Trigger achievements for QUIZ_SUBMIT
    checkAchievements(req.uid, "QUIZ_SUBMIT", {}, req.app);

    res.json({ id: resultRef.id, ...resultData, expGain });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/quiz/rebirth/:resultId
router.post("/rebirth/:resultId", async (req, res) => {
  try {
    const { questionId, newAnswer } = req.body;
    const resultId = req.params.resultId;

    const resultDoc = await db.collection("quiz_results").doc(resultId).get();
    if (!resultDoc.exists) return res.status(404).json({ error: "Result not found" });

    const result = resultDoc.data();

    if (result.uid !== req.uid) return res.status(403).json({ error: "Unauthorized" });
    if (result.usedRebirth) return res.status(400).json({ error: "Rebirth already used" });

    const quizDoc = await db.collection("quizzes").doc(result.quizId).get();
    const quiz = quizDoc.data();

    const targetQuestion = quiz.questions.find((q) => q.id === questionId);
    if (!targetQuestion) return res.status(404).json({ error: "Question not found" });

    const isCorrect = newAnswer === targetQuestion.correctAnswer;

    // Update evaluation
    result.evaluation[questionId].userAnswer = newAnswer;
    result.evaluation[questionId].isCorrect = isCorrect;
    result.answers[questionId] = newAnswer;

    if (isCorrect) {
      result.totalCorrect++;
      result.score = Math.round((result.totalCorrect / result.totalQuestions) * 100);

      // Add more exp
      const expGain = Math.round(100 / result.totalQuestions);
      await db
        .collection("users")
        .doc(req.uid)
        .update({
          exp: FieldValue.increment(expGain),
        });
    }

    result.usedRebirth = true;

    await db.collection("quiz_results").doc(resultId).update({
      score: result.score,
      totalCorrect: result.totalCorrect,
      answers: result.answers,
      evaluation: result.evaluation,
      usedRebirth: true,
    });

    res.json({ success: true, isCorrect, newScore: result.score, correctAnswer: targetQuestion.correctAnswer });
  } catch (error) {
    console.error("Error rebirth:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
