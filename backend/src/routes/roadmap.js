import express from "express";
import { verifyToken } from "../middleware/auth.js";
import User from "../models/User.js";
import LearningRoadmap from "../models/LearningRoadmap.js";
import { callGeminiWithFailover, DEFAULT_GEMINI_MODEL } from "../../utils/aiHelpers.js";

const router = express.Router();
router.use(verifyToken);

router.post("/init", async (req, res) => {
  try {
    const { preferences } = req.body;
    const uid = req.user.uid;

    if (!preferences || !preferences.language) {
      return res.status(400).json({ error: "Thiếu thông tin sở thích." });
    }

    const user = await User.findById(uid);
    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại." });
    }

    // Save preferences
    user.preferences = {
      language: preferences.language || "Tiếng Anh",
      interests: preferences.interests || [],
      goal: preferences.goal || "",
      wordsPerDay: preferences.wordsPerDay || 10,
    };

    // Check if roadmap already exists
    const existingRoadmap = await LearningRoadmap.findOne({ userId: uid });
    if (existingRoadmap) {
      // Cập nhật preferences nhưng không tạo lại roadmap
      await user.save();
      return res.json({ message: "Lộ trình đã tồn tại", days: existingRoadmap.days });
    }

    // Give welcome diamonds if they don't have a roadmap yet
    user.diamonds = (user.diamonds || 0) + 50;
    await user.save();

    // Call AI to generate 7-day roadmap
    const prompt = `You are an expert curriculum designer. Create a 7-day personalized vocabulary roadmap based on these preferences:
Target Language: ${user.preferences.language}
Interests: ${user.preferences.interests.join(", ")}
Goal: ${user.preferences.goal}
Words per day: ${user.preferences.wordsPerDay}

CRITICAL: To save tokens, output MUST be in this exact optimized plain-text format, nothing else. No markdown, no JSON, no explanations.
RULES:
1. NO markdown code blocks. Plain text only.
2. Example sentence MUST be very short, under 6 words.
3. Every #WORD or #TOPIC tag MUST be on a SINGLE LINE. Do not use newlines in the middle of a tag.
4. Separate Example and Example Translation using the | character.

#DAY|1
#TOPIC|Topic Name
#WORD|word1|meaning1|pos1|example1|example_translation1
#WORD|word2|meaning2|pos2|example2|example_translation2
...
#DAY|2
...
`;

    const result = await callGeminiWithFailover({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: "You strictly output the requested plain text format with no markdown blocks.",
      model: DEFAULT_GEMINI_MODEL,
      temperature: 0.7,
    });

    const textOutput = result.text;
    const lines = textOutput.split("\n");
    const days = [];
    let currentDay = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("#DAY|")) {
        const parts = trimmed.split("|");
        if (currentDay) {
          days.push(currentDay);
        }
        currentDay = {
          day: parseInt(parts[1]) || days.length + 1,
          topic: "Topic",
          words: [],
        };
      } else if (trimmed.startsWith("#TOPIC|") && currentDay) {
        const parts = trimmed.split("|");
        currentDay.topic = parts[1] || "Topic";
      } else if (trimmed.startsWith("#WORD|") && currentDay) {
        const parts = trimmed.split("|");
        if (parts.length >= 3) {
          currentDay.words.push({
            word: parts[1],
            meaning: parts[2],
            pos: parts[3] || "",
            example: parts[4] || "",
            example_translation: parts[5] || "",
          });
        }
      }
    }
    if (currentDay) {
      days.push(currentDay);
    }

    await LearningRoadmap.create({
      userId: uid,
      days: days,
    });

    res.json({ message: "Khởi tạo lộ trình thành công", days });
  } catch (error) {
    console.error("Roadmap init error:", error);
    res.status(500).json({ error: "Lỗi khởi tạo lộ trình." });
  }
});

router.get("/me", async (req, res) => {
  try {
    const roadmap = await LearningRoadmap.findOne({ userId: req.user.uid });
    if (!roadmap) {
      return res.status(404).json({ error: "Chưa có lộ trình." });
    }
    res.json(roadmap);
  } catch (error) {
    console.error("Fetch roadmap error:", error);
    res.status(500).json({ error: "Lỗi lấy lộ trình." });
  }
});

// GET lesson format for a specific roadmap day
router.get("/lesson/:day", async (req, res) => {
  try {
    const uid = req.user.uid;
    const { day } = req.params;
    const targetDay = parseInt(day, 10);

    const roadmap = await LearningRoadmap.findOne({ userId: uid });
    if (!roadmap) {
      return res.status(404).json({ error: "Không tìm thấy lộ trình." });
    }

    const dayData = roadmap.days.find((d) => d.day === targetDay);
    if (!dayData) {
      return res.status(404).json({ error: "Không tìm thấy ngày này trong lộ trình." });
    }

    // Convert roadmap words to BeginnerLesson format expected by frontend Practice UI
    // expected format for practice UI:
    // words = [ { id, term, meaning, pos, example: [ {en, vi} ] } ]
    const formattedWords = dayData.words.map((w, index) => ({
      id: `rm_${day}_${index}`,
      term: w.word,
      meaning: w.meaning,
      pos: w.pos,
      example: w.example ? [{ en: w.example, vi: w.example_translation }] : [],
    }));

    res.json({
      id: `roadmap_${day}`,
      title: `Ngày ${day} - ${dayData.topic}`,
      category: "roadmap",
      words: formattedWords,
    });
  } catch (error) {
    console.error("Error fetching roadmap lesson:", error);
    res.status(500).json({ error: "Lỗi tải dữ liệu bài học AI." });
  }
});

const extendRoadmap = async (uid, roadmap, user) => {
  try {
    const currentLength = roadmap.days.length;
    const pastTopics = roadmap.days.slice(-7).map((d) => d.topic).join(", ");

    const prompt = `You are an expert curriculum designer. The user has completed ${currentLength} days of their vocabulary learning roadmap.
Please generate the next 7 days of vocabulary learning (Day ${currentLength + 1} to Day ${currentLength + 7}).
Target Language: ${user.preferences?.language || "English"}
Interests: ${(user.preferences?.interests || []).join(", ")}
Goal: ${user.preferences?.goal || "Improve communication"}
Words per day: ${user.preferences?.wordsPerDay || 10}

CRITICAL: Increase the difficulty slightly. DO NOT repeat these topics: ${pastTopics}.
To save tokens, output MUST be in this exact optimized plain-text format, nothing else. No markdown, no JSON, no explanations.
RULES:
1. NO markdown code blocks. Plain text only.
2. Example sentence MUST be very short, under 6 words.
3. Every #WORD or #TOPIC tag MUST be on a SINGLE LINE. Do not use newlines in the middle of a tag.
4. Separate Example and Example Translation using the | character.

#DAY|${currentLength + 1}
#TOPIC|Topic Name
#WORD|word1|meaning1|pos1|example1|example_translation1
#WORD|word2|meaning2|pos2|example2|example_translation2
...
#DAY|${currentLength + 2}
...
`;

    const result = await callGeminiWithFailover({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: "You strictly output the requested plain text format with no markdown blocks.",
      model: DEFAULT_GEMINI_MODEL,
      temperature: 0.7,
    });

    const textOutput = result.text;
    const lines = textOutput.split("\n");
    let currentDay = null;
    const newDays = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("#DAY|")) {
        const parts = trimmed.split("|");
        if (currentDay) newDays.push(currentDay);
        currentDay = {
          day: parseInt(parts[1]) || currentLength + newDays.length + 1,
          topic: "Topic",
          words: [],
        };
      } else if (trimmed.startsWith("#TOPIC|") && currentDay) {
        currentDay.topic = trimmed.split("|")[1] || "Topic";
      } else if (trimmed.startsWith("#WORD|") && currentDay) {
        const parts = trimmed.split("|");
        if (parts.length >= 3) {
          currentDay.words.push({
            word: parts[1],
            meaning: parts[2],
            pos: parts[3] || "",
            example: parts[4] || "",
            example_translation: parts[5] || "",
          });
        }
      }
    }
    if (currentDay) newDays.push(currentDay);

    if (newDays.length > 0) {
      roadmap.days.push(...newDays);
      roadmap.status = "active";
      await roadmap.save();
      console.log(`[Roadmap] Extended roadmap for user ${uid} by ${newDays.length} days.`);
    }
  } catch (error) {
    console.error(`[Roadmap] Failed to extend roadmap for user ${uid}:`, error);
  }
};

// Mark a roadmap day as completed
router.post("/complete/:day", async (req, res) => {
  try {
    const uid = req.user.uid;
    const targetDay = parseInt(req.params.day, 10);

    const roadmap = await LearningRoadmap.findOne({ userId: uid });
    if (!roadmap) {
      return res.status(404).json({ error: "Không tìm thấy lộ trình." });
    }

    if (!roadmap.completedDays) {
      roadmap.completedDays = [];
    }

    let needsExtension = false;

    if (!roadmap.completedDays.includes(targetDay)) {
      roadmap.completedDays.push(targetDay);
      roadmap.lastCompletedAt = new Date();
      
      const totalDays = roadmap.days.length;
      if (roadmap.completedDays.length >= totalDays) {
        roadmap.status = "completed";
      }
      
      // Trigger background extension if the user just completed the second-to-last day (e.g. Day 6 of 7)
      if (roadmap.completedDays.length === totalDays - 1) {
        needsExtension = true;
      }
      
      await roadmap.save();
    }

    // Call background extension without blocking response
    if (needsExtension) {
      User.findById(uid).then((user) => {
        if (user) {
          extendRoadmap(uid, roadmap, user).catch(console.error);
        }
      }).catch(console.error);
    }

    res.json({ message: "Đã cập nhật lộ trình", completedDays: roadmap.completedDays });
  } catch (error) {
    console.error("Error completing roadmap day:", error);
    res.status(500).json({ error: "Lỗi hệ thống." });
  }
});

export default router;
