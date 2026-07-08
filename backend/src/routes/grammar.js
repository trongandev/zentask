import express from "express";
import { db, auth } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";

const router = express.Router();

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

// Update grammar progress
router.post("/progress", async (req, res) => {
  try {
    const { stageId, correct, wrong, timeSpent, exerciseLogs } = req.body;
    const uid = req.uid;

    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });

    const userData = userSnap.data();
    let grammarProgress = userData.grammarProgress || {
      maxStage: 1,
      totalCorrect: 0,
      totalWrong: 0,
      totalTimeSpent: 0,
      completedStages: [],
      recentLogs: []
    };

    // Update stats
    grammarProgress.totalCorrect += correct || 0;
    grammarProgress.totalWrong += wrong || 0;
    grammarProgress.totalTimeSpent += timeSpent || 0;

    if (exerciseLogs && Array.isArray(exerciseLogs)) {
      const logs = grammarProgress.recentLogs || [];
      grammarProgress.recentLogs = [...logs, ...exerciseLogs].slice(-50); // Keep last 50 logs
    }

    // Update stage progress if it's a numeric standard stage
    if (typeof stageId === "number") {
      if (!grammarProgress.completedStages.includes(stageId)) {
        grammarProgress.completedStages.push(stageId);
      }
      if (stageId >= grammarProgress.maxStage) {
        grammarProgress.maxStage = Math.min(4, stageId + 1); // max 4 stages
      }
    }

    await userRef.update({ grammarProgress });

    res.json({ success: true, grammarProgress });
  } catch (error) {
    console.error("Error updating grammar progress:", error);
    res.status(500).json({ error: "Failed to update progress" });
  }
});

// Generate personalized grammar test
router.post("/generate", async (req, res) => {
  try {
    const uid = req.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });

    const userData = userSnap.data();
    const grammarProgress = userData.grammarProgress || { maxStage: 1, totalCorrect: 0, totalWrong: 0, completedStages: [], recentLogs: [] };

    const availableKeys = [];
    for (let i = 1; i <= 10; i++) {
      const k = process.env[`API_KEY_AI_${i}`];
      if (k) availableKeys.push({ index: i, key: k });
    }

    if (availableKeys.length === 0) {
      return res.status(500).json({ error: "No AI keys configured" });
    }
    const shuffledKeys = availableKeys.sort(() => Math.random() - 0.5);

    let recentMistakesStr = "";
    if (grammarProgress.recentLogs && grammarProgress.recentLogs.length > 0) {
      const recentMistakes = grammarProgress.recentLogs.filter(log => !log.isCorrect).slice(-10); // get up to 10 recent mistakes
      if (recentMistakes.length > 0) {
        recentMistakesStr = "\n\nDưới đây là chi tiết một số câu học viên đã làm sai gần đây:\n" + 
          recentMistakes.map(m => `- Câu hỏi (${m.type}): "${m.question}". Thời gian trả lời: ${m.timeSpent}s.\n  Đáp án học viên đã chọn: ${typeof m.userAnswer === 'object' ? JSON.stringify(m.userAnswer) : m.userAnswer}`).join("\n");
      }
    }

    let promptText = `Tạo một bài ôn tập ngữ pháp (Grammar Practice) cá nhân hóa cho học viên.
Học viên này đã hoàn thành các chặng: ${grammarProgress.completedStages.join(", ")} (chặng cao nhất đang học là ${grammarProgress.maxStage}).
Họ đã trả lời đúng ${grammarProgress.totalCorrect} câu, sai ${grammarProgress.totalWrong} câu.${recentMistakesStr}
Dựa vào trình độ và các lỗi sai thực tế này, hãy tạo ra đúng 5 câu hỏi ngữ pháp (bao gồm ít nhất 2 dạng bài khác nhau trong các dạng: classification, matching, cloze, transformation) để giúp học viên lấp lỗ hổng kiến thức.
Nội dung bằng tiếng Việt, hướng dẫn rõ ràng.`;

    let testData = null;

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
                title: { type: Type.STRING, description: "Tiêu đề bài kiểm tra cá nhân hóa" },
                description: { type: Type.STRING, description: "Mô tả ngắn gọn" },
                exercises: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      type: { type: Type.STRING, description: "Một trong các dạng: classification, matching, cloze, transformation" },
                      question: { type: Type.STRING },
                      explanation: { type: Type.STRING },

                      categories: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Dành cho classification" },
                      items: {
                        type: Type.ARRAY,
                        items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, category: { type: Type.STRING } } },
                        description: "Dành cho classification",
                      },

                      leftPairs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, text: { type: Type.STRING } } }, description: "Dành cho matching" },
                      rightPairs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, text: { type: Type.STRING } } }, description: "Dành cho matching" },
                      correctMatches: { type: Type.OBJECT, additionalProperties: { type: Type.STRING }, description: "Dành cho matching" },

                      textWithBlanks: { type: Type.STRING, description: "Dành cho cloze, VD: 'I have [1] apple'" },
                      blanksOptions: { type: Type.OBJECT, additionalProperties: { type: Type.ARRAY, items: { type: Type.STRING } }, description: "Dành cho cloze" },
                      blanksAnswers: { type: Type.OBJECT, additionalProperties: { type: Type.STRING }, description: "Dành cho cloze" },

                      hint: { type: Type.STRING, description: "Dành cho transformation" },
                      correctAnswer: { type: Type.STRING, description: "Dành cho transformation" },
                    },
                    required: ["id", "type", "question"],
                  },
                },
              },
              required: ["title", "description", "exercises"],
            },
          },
        });

        testData = JSON.parse(response.text);
        break;
      } catch (err) {
        console.warn(`[Grammar AI] Key API_KEY_AI_${index} failed:`, err.message);
      }
    }

    if (!testData) {
      return res.status(500).json({ error: "Failed to generate custom grammar test." });
    }

    const newTest = {
      id: `custom_${Date.now()}`,
      title: testData.title,
      description: testData.description,
      exercises: testData.exercises,
      createdAt: FieldValue.serverTimestamp(),
    };

    await userRef.collection("grammar_tests").doc(newTest.id).set(newTest);
    res.json(newTest);
  } catch (error) {
    console.error("Error generating custom grammar:", error);
    res.status(500).json({ error: "Failed to generate custom grammar" });
  }
});

// Delete custom grammar test
router.delete("/custom/:id", async (req, res) => {
  try {
    const uid = req.uid;
    const testId = req.params.id;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const testRef = db.collection("users").doc(uid).collection("grammar_tests").doc(testId);
    await testRef.delete();
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting custom grammar:", error);
    res.status(500).json({ error: "Failed to delete custom grammar" });
  }
});

export default router;
