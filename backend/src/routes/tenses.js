import { Router } from "express";
import User from "../models/User.js";
import { TensesTest } from "../models/Schemas.js";
import { GoogleGenAI, Type } from "@google/genai";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(verifyToken);

// Update tenses progress
router.post("/progress", asyncHandler(async (req, res) => {
  const { stageId, correct, wrong, timeSpent, exerciseLogs } = req.body;
  const user = await User.findById(req.user.uid);
  
  if (!user) return res.status(404).json({ error: "User not found" });

  let tensesProgress = user.tensesProgress || {
    maxStage: 1,
    totalCorrect: 0,
    totalWrong: 0,
    totalTimeSpent: 0,
    completedStages: [],
    recentLogs: []
  };

  tensesProgress.totalCorrect += correct || 0;
  tensesProgress.totalWrong += wrong || 0;
  tensesProgress.totalTimeSpent += timeSpent || 0;

  if (exerciseLogs && Array.isArray(exerciseLogs)) {
    const logs = tensesProgress.recentLogs || [];
    tensesProgress.recentLogs = [...logs, ...exerciseLogs].slice(-50); 
  }

  if (typeof stageId === "number") {
    if (!tensesProgress.completedStages.includes(stageId)) {
      tensesProgress.completedStages.push(stageId);
    }
    if (stageId >= tensesProgress.maxStage) {
      tensesProgress.maxStage = Math.min(4, stageId + 1); 
    }
  }

  user.tensesProgress = tensesProgress;
  await user.save();

  res.json({ success: true, tensesProgress });
}));

// Generate personalized tenses test
router.post("/generate", asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.uid).lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  const tensesProgress = user.tensesProgress || { maxStage: 1, totalCorrect: 0, totalWrong: 0, completedStages: [], recentLogs: [] };

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
  if (tensesProgress.recentLogs && tensesProgress.recentLogs.length > 0) {
    const recentMistakes = tensesProgress.recentLogs.filter(log => !log.isCorrect).slice(-10);
    if (recentMistakes.length > 0) {
      recentMistakesStr = "\n\nDưới đây là chi tiết một số câu học viên đã làm sai gần đây:\n" + 
        recentMistakes.map(m => `- Câu hỏi (${m.type}): "${m.question}". Thời gian trả lời: ${m.timeSpent}s.\n  Đáp án học viên đã chọn: ${typeof m.userAnswer === 'object' ? JSON.stringify(m.userAnswer) : m.userAnswer}`).join("\n");
    }
  }

  let promptText = `Tạo một bài ôn tập Các Thì (Tenses Practice) cá nhân hóa cho học viên.
Học viên này đã hoàn thành các chặng: ${tensesProgress.completedStages.join(", ")} (chặng cao nhất đang học là ${tensesProgress.maxStage}).
Họ đã trả lời đúng ${tensesProgress.totalCorrect} câu, sai ${tensesProgress.totalWrong} câu.${recentMistakesStr}
Dựa vào trình độ và các lỗi sai thực tế này, hãy tạo ra đúng 5 câu hỏi về Các Thì (bao gồm ít nhất 2 dạng bài khác nhau trong các dạng: conjugation, multiple_choice, scramble, error_identification, transformation) để giúp học viên lấp lỗ hổng kiến thức.
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
                    type: { type: Type.STRING, description: "Một trong các dạng: conjugation, multiple_choice, scramble, error_identification, transformation" },
                    question: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    hint: { type: Type.STRING },
                    correctAnswerString: { type: Type.STRING, description: "Đáp án đúng dành cho conjugation, multiple_choice, error_identification, transformation" },
                    correctAnswerArray: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Đáp án đúng dạng mảng (các từ theo đúng thứ tự) dành cho scramble" }
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
      
      if (testData.exercises) {
          testData.exercises = testData.exercises.map(ex => {
              if (ex.type === "scramble" && ex.correctAnswerArray) {
                  ex.correctAnswer = ex.correctAnswerArray;
              } else if (ex.correctAnswerString) {
                  ex.correctAnswer = ex.correctAnswerString;
              }
              return ex;
          });
      }
      
      break;
    } catch (err) {
      console.warn(`[Tenses AI] Key API_KEY_AI_${index} failed:`, err.message);
    }
  }

  if (!testData) {
    return res.status(500).json({ error: "Failed to generate custom tenses test." });
  }

  const newTest = await TensesTest.create({
    userId: req.user.uid,
    title: testData.title,
    description: testData.description,
    exercises: testData.exercises,
  });

  const testObj = newTest.toObject();
  testObj.id = testObj._id;
  res.json(testObj);
}));

// Delete custom tenses test
router.delete("/custom/:id", asyncHandler(async (req, res) => {
  const test = await TensesTest.findById(req.params.id);
  
  if (!test) return res.status(404).json({ error: "Test not found" });
  if (test.userId.toString() !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

  await TensesTest.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

export default router;
