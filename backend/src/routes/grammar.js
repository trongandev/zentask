import { Router } from "express";
import User from "../models/User.js";
import { GrammarTest } from "../models/Schemas.js";
import { GoogleGenAI, Type } from "@google/genai";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(verifyToken);

// Update grammar progress
router.post("/progress", asyncHandler(async (req, res) => {
  const { stageId, correct, wrong, timeSpent, exerciseLogs } = req.body;
  const user = await User.findById(req.user.uid);
  
  if (!user) return res.status(404).json({ error: "User not found" });

  let grammarProgress = user.grammarProgress || {
    maxStage: 1,
    totalCorrect: 0,
    totalWrong: 0,
    totalTimeSpent: 0,
    completedStages: [],
    recentLogs: []
  };

  grammarProgress.totalCorrect += correct || 0;
  grammarProgress.totalWrong += wrong || 0;
  grammarProgress.totalTimeSpent += timeSpent || 0;

  if (exerciseLogs && Array.isArray(exerciseLogs)) {
    const logs = grammarProgress.recentLogs || [];
    grammarProgress.recentLogs = [...logs, ...exerciseLogs].slice(-50); 
  }

  if (typeof stageId === "number") {
    if (!grammarProgress.completedStages.includes(stageId)) {
      grammarProgress.completedStages.push(stageId);
    }
    if (stageId >= grammarProgress.maxStage) {
      grammarProgress.maxStage = Math.min(4, stageId + 1);
    }
  }

  user.grammarProgress = grammarProgress;
  await user.save();

  res.json({ success: true, grammarProgress });
}));

// Generate personalized grammar test
router.post("/generate", asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.uid).lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  const grammarProgress = user.grammarProgress || { maxStage: 1, totalCorrect: 0, totalWrong: 0, completedStages: [], recentLogs: [] };

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
    const recentMistakes = grammarProgress.recentLogs.filter(log => !log.isCorrect).slice(-10);
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
                    categories: { type: Type.ARRAY, items: { type: Type.STRING } },
                    items: {
                      type: Type.ARRAY,
                      items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, category: { type: Type.STRING } } }
                    },
                    leftPairs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, text: { type: Type.STRING } } } },
                    rightPairs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, text: { type: Type.STRING } } } },
                    correctMatches: { type: Type.OBJECT, additionalProperties: { type: Type.STRING } },
                    textWithBlanks: { type: Type.STRING },
                    blanksOptions: { type: Type.OBJECT, additionalProperties: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    blanksAnswers: { type: Type.OBJECT, additionalProperties: { type: Type.STRING } },
                    hint: { type: Type.STRING },
                    correctAnswer: { type: Type.STRING },
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

  const newTest = await GrammarTest.create({
    userId: req.user.uid,
    title: testData.title,
    description: testData.description,
    exercises: testData.exercises,
  });
  
  const testObj = newTest.toObject();
  testObj.id = testObj._id; // client side compatibility
  res.json(testObj);
}));

// Delete custom grammar test
router.delete("/custom/:id", asyncHandler(async (req, res) => {
  const test = await GrammarTest.findById(req.params.id);
  
  if (!test) return res.status(404).json({ error: "Test not found" });
  if (test.userId.toString() !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

  await GrammarTest.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

export default router;
