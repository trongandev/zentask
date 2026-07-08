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

// Update tenses progress
router.post("/progress", async (req, res) => {
  try {
    const { stageId, correct, wrong, timeSpent, exerciseLogs } = req.body;
    const uid = req.uid;

    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });

    const userData = userSnap.data();
    let tensesProgress = userData.tensesProgress || {
      maxStage: 1,
      totalCorrect: 0,
      totalWrong: 0,
      totalTimeSpent: 0,
      completedStages: [],
      recentLogs: []
    };

    // Update stats
    tensesProgress.totalCorrect += correct || 0;
    tensesProgress.totalWrong += wrong || 0;
    tensesProgress.totalTimeSpent += timeSpent || 0;

    if (exerciseLogs && Array.isArray(exerciseLogs)) {
      const logs = tensesProgress.recentLogs || [];
      tensesProgress.recentLogs = [...logs, ...exerciseLogs].slice(-50); // Keep last 50 logs
    }

    // Update stage progress if it's a numeric standard stage
    if (typeof stageId === "number") {
      if (!tensesProgress.completedStages.includes(stageId)) {
        tensesProgress.completedStages.push(stageId);
      }
      if (stageId >= tensesProgress.maxStage) {
        tensesProgress.maxStage = Math.min(4, stageId + 1); // max 4 stages for tenses
      }
    }

    await userRef.update({ tensesProgress });

    res.json({ success: true, tensesProgress });
  } catch (error) {
    console.error("Error updating tenses progress:", error);
    res.status(500).json({ error: "Failed to update progress" });
  }
});

// Generate personalized tenses test
router.post("/generate", async (req, res) => {
  try {
    const uid = req.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });

    const userData = userSnap.data();
    const tensesProgress = userData.tensesProgress || { maxStage: 1, totalCorrect: 0, totalWrong: 0, completedStages: [], recentLogs: [] };

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
      const recentMistakes = tensesProgress.recentLogs.filter(log => !log.isCorrect).slice(-10); // get up to 10 recent mistakes
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
                      
                      options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Dành cho multiple_choice, scramble, error_identification" },
                      hint: { type: Type.STRING, description: "Dành cho transformation" },
                      
                      // For correctAnswer, it can be string or array of strings (for scramble), but Gemini might struggle with union types in responseSchema. We will tell it to use a string for all, except for scramble where it should be a comma-separated string or just string. Wait, TensesPractice scramble expects an array of strings. We can ask Gemini to return an array of strings in 'correctAnswerScramble' and string in 'correctAnswerString'. Or just define it as any. In GenAI schema, we can't easily do union. Let's make it an array for scramble, string for others. 
                      // Workaround: 
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
        
        // Post-process the testData to fix correctAnswer format
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

    const newTest = {
      id: `custom_${Date.now()}`,
      title: testData.title,
      description: testData.description,
      exercises: testData.exercises,
      createdAt: FieldValue.serverTimestamp(),
    };

    await userRef.collection("tenses_tests").doc(newTest.id).set(newTest);
    res.json(newTest);
  } catch (error) {
    console.error("Error generating custom tenses:", error);
    res.status(500).json({ error: "Failed to generate custom tenses" });
  }
});

// Delete custom tenses test
router.delete("/custom/:id", async (req, res) => {
  try {
    const uid = req.uid;
    const testId = req.params.id;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const testRef = db.collection("users").doc(uid).collection("tenses_tests").doc(testId);
    await testRef.delete();
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting custom tenses:", error);
    res.status(500).json({ error: "Failed to delete custom tenses" });
  }
});

export default router;
