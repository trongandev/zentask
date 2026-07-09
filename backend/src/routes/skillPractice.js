import { Router } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { SkillPracticeCache, SkillPracticeDaily } from "../models/Schemas.js";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { addXpToUser } from "./user.js";

const router = Router();
router.use(verifyToken);

const MODES = ["listening", "speaking", "fill_blank", "reflex"];
const SOURCES = ["VOA Learning English", "British Council LearnEnglish"];

const getToday = () => new Date().toISOString().slice(0, 10);
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const normalize = (value) => String(value || "").trim().replace(/\s+/g, " ");

const LISTENING_BANK = [
  {
    title: "A morning routine",
    passage: "Sarah wakes up at seven o'clock every morning. She drinks a glass of water and does some light stretching exercises. After that, she prepares a healthy breakfast with oatmeal and fresh fruit.",
    targetAnswer: "She drinks a glass of water and does some light stretching exercises.",
  },
  {
    title: "At the library",
    passage: "Tom visits the library twice a week. He usually reads short articles about science and borrows one novel for the weekend.",
    targetAnswer: "Tom visits the library twice a week.",
  },
  {
    title: "Learning online",
    passage: "Mina studies English online after dinner. She listens to short conversations, repeats useful phrases, and writes new words in her notebook.",
    targetAnswer: "She listens to short conversations and repeats useful phrases.",
  },
  {
    title: "A bus trip",
    passage: "David takes the bus to work when the weather is bad. He checks the route on his phone and usually arrives ten minutes early.",
    targetAnswer: "David takes the bus to work when the weather is bad.",
  },
  {
    title: "Weekend plans",
    passage: "Anna plans to visit her grandparents this weekend. She wants to bring them some fruit and help them clean the garden.",
    targetAnswer: "Anna plans to visit her grandparents this weekend.",
  },
];

const SPEAKING_BANK = [
  "I would like to improve my English pronunciation every day.",
  "Could you please tell me where the nearest bus stop is?",
  "Learning a little every day can make a big difference.",
  "I usually review new vocabulary before I go to sleep.",
  "This article explains how people can save energy at home.",
  "Good communication helps students work better in groups.",
];

const FILL_BLANK_BANK = [
  { sentence: "Learning English every day helps me build confidence.", answer: "confidence" },
  { sentence: "The teacher asked us to compare two different opinions.", answer: "compare" },
  { sentence: "Regular exercise can improve your health and mood.", answer: "improve" },
  { sentence: "Many students use podcasts to practice listening skills.", answer: "podcasts" },
  { sentence: "The company decided to reduce plastic waste this year.", answer: "reduce" },
  { sentence: "She always checks the schedule before booking a ticket.", answer: "schedule" },
  { sentence: "Reading short articles helps learners understand new vocabulary.", answer: "vocabulary" },
  { sentence: "A balanced diet gives the body enough energy.", answer: "balanced" },
  { sentence: "The museum offers free tickets for children on Sundays.", answer: "museum" },
  { sentence: "He gave a clear explanation of the problem.", answer: "explanation" },
];

const REFLEX_BANK = [
  { question: "What does 'improve' mean in Vietnamese?", correctAnswer: "cải thiện", distractors: ["quên", "mua", "đóng cửa"] },
  { question: "What does 'schedule' mean in Vietnamese?", correctAnswer: "lịch trình", distractors: ["đồ uống", "bài hát", "chiếc ghế"] },
  { question: "What does 'confident' mean in Vietnamese?", correctAnswer: "tự tin", distractors: ["lo lắng", "mệt mỏi", "im lặng"] },
  { question: "What does 'reduce' mean in Vietnamese?", correctAnswer: "giảm bớt", distractors: ["tăng lên", "quên mất", "mở ra"] },
  { question: "What does 'borrow' mean in Vietnamese?", correctAnswer: "mượn", distractors: ["bán", "nấu", "vẽ"] },
  { question: "What does 'prepare' mean in Vietnamese?", correctAnswer: "chuẩn bị", distractors: ["phàn nàn", "trốn tránh", "đóng gói"] },
  { question: "What does 'healthy' mean in Vietnamese?", correctAnswer: "khỏe mạnh", distractors: ["đắt đỏ", "ồn ào", "nguy hiểm"] },
  { question: "What does 'article' mean in Vietnamese?", correctAnswer: "bài viết", distractors: ["chiếc áo", "con đường", "bữa ăn"] },
];

const VIETNAMESE_CHAR_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const COMMON_VIETNAMESE_WORDS = ["cải thiện", "quên", "mua", "đóng cửa", "lịch trình", "tự tin", "giảm bớt", "mượn", "chuẩn bị", "khỏe mạnh", "bài viết"];
const ENGLISH_REFLEX_DISTRACTORS = [
  "always", "usually", "often", "sometimes", "rarely", "never",
  "quickly", "carefully", "slowly", "clearly",
  "improve", "prepare", "reduce", "compare", "borrow", "schedule",
  "confidence", "healthy", "article", "energy", "practice", "understand",
];

function looksVietnamese(value) {
  const text = String(value || "").toLowerCase();
  return VIETNAMESE_CHAR_RE.test(text) || COMMON_VIETNAMESE_WORDS.some((word) => text.includes(word));
}

function looksEnglishOnly(value) {
  const text = String(value || "").trim();
  return /^[a-zA-Z][a-zA-Z\s'’\-]*$/.test(text) && !looksVietnamese(text);
}

function isBlankStyleQuestion(question) {
  return /_{2,}|\bblank\b|\bcomplete\b|\bchoose the best word\b/i.test(String(question || ""));
}

function uniqueNormalized(values) {
  return [...new Set((values || []).map(normalize).filter(Boolean))];
}

function buildReflexOptions({ question, correctAnswer, options }) {
  let cleanOptions = uniqueNormalized(options);
  const cleanCorrect = normalize(correctAnswer);
  if (!cleanCorrect) return [];
  cleanOptions = cleanOptions.filter((option) => option.toLowerCase() !== cleanCorrect.toLowerCase());
  cleanOptions.unshift(cleanCorrect);

  const blankQuestion = isBlankStyleQuestion(question);
  const useEnglishPool = blankQuestion || looksEnglishOnly(cleanCorrect);
  const pool = useEnglishPool
    ? ENGLISH_REFLEX_DISTRACTORS
    : REFLEX_BANK.flatMap((item) => [item.correctAnswer, ...item.distractors]);

  if (blankQuestion) {
    cleanOptions = cleanOptions.filter((option, index) => index === 0 || looksEnglishOnly(option));
  }

  const extras = shuffle(pool)
    .map(normalize)
    .filter((option) => option && option.toLowerCase() !== cleanCorrect.toLowerCase())
    .filter((option) => !cleanOptions.some((current) => current.toLowerCase() === option.toLowerCase()));

  cleanOptions = uniqueNormalized([...cleanOptions, ...extras]).slice(0, 4);
  return shuffle(cleanOptions);
}

function normalizeReflexExercise(data) {
  const question = normalize(data?.question);
  const correctAnswer = normalize(data?.correctAnswer);
  if (!question || !correctAnswer) return fallbackExercise("reflex");

  const rawOptions = Array.isArray(data?.options) ? data.options : [];
  const vietnameseOptionCount = rawOptions.map(normalize).filter(looksVietnamese).length;
  if (isBlankStyleQuestion(question) && vietnameseOptionCount >= 2) {
    return fallbackExercise("reflex");
  }

  const options = buildReflexOptions({ question, correctAnswer, options: rawOptions });
  if (options.length < 4 || !options.some((option) => option.toLowerCase() === correctAnswer.toLowerCase())) {
    return fallbackExercise("reflex");
  }

  return {
    mode: "reflex",
    title: normalize(data?.title || "Quick response"),
    instruction: normalize(data?.instruction || "Chọn đáp án đúng nhanh nhất có thể."),
    sourceHint: normalize(data?.sourceHint || randomItem(SOURCES)),
    level: normalize(data?.level || "A2-B1"),
    generatedBy: data?.generatedBy || "ai",
    variantId: data?.variantId || `reflex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    question,
    options,
    correctAnswer,
  };
}


function makeBlankSentence(sentence, answer) {
  const safeSentence = normalize(sentence);
  const safeAnswer = normalize(answer);
  if (!safeSentence || !safeAnswer) return "";
  const escaped = safeAnswer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safeSentence.replace(new RegExp(`\\b${escaped}\\b`, "i"), "________");
}

const fallbackExercise = (mode) => {
  const base = {
    sourceHint: randomItem(SOURCES),
    level: "A2-B1",
    generatedBy: "local-bank",
    variantId: `${mode}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };

  if (mode === "listening") {
    const item = randomItem(LISTENING_BANK);
    return {
      ...base,
      mode,
      title: item.title,
      passage: item.passage,
      targetAnswer: item.targetAnswer,
      instruction: "Nghe câu và gõ lại câu bạn nghe được.",
    };
  }

  if (mode === "speaking") {
    const sentence = randomItem(SPEAKING_BANK);
    return {
      ...base,
      mode,
      title: "Speaking practice",
      sentence,
      targetAnswer: sentence,
      instruction: "Đọc to câu sau và tự kiểm tra phát âm.",
    };
  }

  if (mode === "fill_blank") {
    const item = randomItem(FILL_BLANK_BANK);
    return {
      ...base,
      mode,
      title: "Fill in the blank",
      sentence: item.sentence,
      blankSentence: makeBlankSentence(item.sentence, item.answer),
      targetAnswer: item.answer,
      instruction: "Điền từ còn thiếu vào chỗ trống.",
    };
  }

  const item = randomItem(REFLEX_BANK);
  const options = shuffle([item.correctAnswer, ...item.distractors]).slice(0, 4);
  return {
    ...base,
    mode: "reflex",
    title: "Quick response",
    question: item.question,
    options,
    correctAnswer: item.correctAnswer,
    instruction: "Chọn đáp án đúng nhanh nhất có thể.",
  };
};

function validateExercise(mode, data) {
  const fallback = fallbackExercise(mode);
  const merged = { ...fallback, ...(data || {}), mode };

  merged.title = normalize(merged.title || fallback.title);
  merged.instruction = normalize(merged.instruction || fallback.instruction);
  merged.sourceHint = normalize(merged.sourceHint || fallback.sourceHint);
  merged.level = normalize(merged.level || fallback.level);
  merged.generatedBy = merged.generatedBy || (data ? "ai" : fallback.generatedBy);
  merged.variantId = merged.variantId || `${mode}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (mode === "listening") {
    merged.passage = normalize(merged.passage || fallback.passage);
    merged.targetAnswer = normalize(merged.targetAnswer || fallback.targetAnswer);
    if (!merged.targetAnswer) return fallback;
    return merged;
  }

  if (mode === "speaking") {
    merged.sentence = normalize(merged.sentence || merged.targetAnswer || fallback.sentence);
    merged.targetAnswer = merged.sentence;
    if (!merged.sentence) return fallback;
    return merged;
  }

  if (mode === "fill_blank") {
    merged.sentence = normalize(merged.sentence || fallback.sentence);
    merged.targetAnswer = normalize(merged.targetAnswer || fallback.targetAnswer);
    merged.blankSentence = normalize(merged.blankSentence || makeBlankSentence(merged.sentence, merged.targetAnswer) || fallback.blankSentence);
    if (!merged.blankSentence.includes("________") || !merged.targetAnswer) return fallback;
    return merged;
  }

  return normalizeReflexExercise(data || fallback);
}

const getAiKey = () => {
  const keys = [];
  for (let i = 1; i <= 20; i++) {
    if (process.env[`API_KEY_AI_${i}`]) keys.push(process.env[`API_KEY_AI_${i}`]);
  }
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  if (process.env.GEMINI_API_KEYS) keys.push(...process.env.GEMINI_API_KEYS.split(",").map((v) => v.trim()).filter(Boolean));
  return keys[Math.floor(Math.random() * keys.length)] || null;
};

async function generateExercise(mode) {
  const key = getAiKey();
  if (!key) return fallbackExercise(mode);

  const prompt = `Bạn là trợ lý tạo bài luyện tiếng Anh cho học viên Việt Nam. Hãy tổng hợp MỘT bài mới, không sao chép nguyên văn, lấy cảm hứng từ phong cách học tiếng Anh công khai như VOA Learning English và British Council LearnEnglish.
Mode cần tạo: ${mode}.
Yêu cầu:
- Nội dung phù hợp A2-B1.
- Mỗi lần tạo phải khác chủ đề, khác câu hỏi và khác đáp án so với ví dụ phổ biến.
- Trả JSON đúng schema, không thêm markdown.
- Không ghi nguồn giả như URL cụ thể.
- Nếu mode=listening: tạo passage ngắn và targetAnswer là 1 câu trong passage để nghe-gõ. Người học không được nhìn thấy targetAnswer.
- Nếu mode=speaking: tạo sentence là một câu để đọc phát âm.
- Nếu mode=fill_blank: tạo sentence, blankSentence có đúng một chỗ trống ________, targetAnswer là từ bị ẩn. Không dùng lại câu "Learning English every day helps me build confidence".
- Nếu mode=reflex: tạo question, 4 options mới, correctAnswer nằm trong options. Các đáp án phải khớp với câu hỏi hiện tại. Nếu question là dạng điền từ có dấu ________, options phải là các từ/cụm từ tiếng Anh phù hợp ngữ pháp. Nếu question hỏi nghĩa tiếng Việt của một từ tiếng Anh, options phải là các nghĩa tiếng Việt. Tuyệt đối không trộn câu hỏi điền từ tiếng Anh với đáp án tiếng Việt không liên quan.`;

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mode: { type: Type.STRING },
            title: { type: Type.STRING },
            instruction: { type: Type.STRING },
            sourceHint: { type: Type.STRING },
            level: { type: Type.STRING },
            passage: { type: Type.STRING },
            targetAnswer: { type: Type.STRING },
            sentence: { type: Type.STRING },
            blankSentence: { type: Type.STRING },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
          },
          required: ["mode", "title", "instruction", "sourceHint", "level"],
        },
      },
    });
    const parsed = JSON.parse(response.text || "{}");
    return validateExercise(mode, parsed);
  } catch (error) {
    console.warn("[SkillPractice] AI generation failed:", error.message);
    return fallbackExercise(mode);
  }
}

router.get("/random", asyncHandler(async (req, res) => {
  const mode = String(req.query.mode || "listening");
  if (!MODES.includes(mode)) return res.status(400).json({ error: "Mode không hợp lệ" });

  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const payload = await generateExercise(mode);
  const cache = await SkillPracticeCache.create({ mode, payload, sourceHint: payload.sourceHint || "AI tổng hợp" });
  res.json({ id: String(cache._id), ...payload });
}));

router.post("/submit", asyncHandler(async (req, res) => {
  const { mode, isCorrect, responseMs = 0, exerciseId = null } = req.body;
  if (!MODES.includes(mode)) return res.status(400).json({ error: "Mode không hợp lệ" });

  const today = getToday();
  let daily = await SkillPracticeDaily.findOne({ uid: req.user.uid, date: today });
  if (!daily) daily = await SkillPracticeDaily.create({ uid: req.user.uid, date: today, completedModes: [], bonusClaimed: false, attempts: [] });

  const completed = new Set(daily.completedModes || []);
  let awardedXp = 0;
  let reason = "no_reward";

  if (isCorrect && !completed.has(mode)) {
    completed.add(mode);
    if (mode === "reflex") {
      awardedXp += Number(responseMs || 0) <= 5000 ? 20 : 10;
      reason = Number(responseMs || 0) <= 5000 ? "reflex_fast" : "reflex_slow";
    } else {
      reason = "mode_completed";
    }
  }

  if (completed.size >= 4 && !daily.bonusClaimed) {
    awardedXp += 50;
    daily.bonusClaimed = true;
    reason = awardedXp > 50 ? `${reason}_daily_bonus` : "daily_bonus";
  }

  daily.completedModes = Array.from(completed);
  daily.attempts = [...(daily.attempts || []), { mode, isCorrect: !!isCorrect, responseMs, exerciseId, at: new Date() }].slice(-50);
  await daily.save();

  let xpResult = null;
  if (awardedXp > 0) xpResult = await addXpToUser(req.user.uid, awardedXp);

  res.json({ success: true, awardedXp, reason, completedModes: daily.completedModes, bonusClaimed: daily.bonusClaimed, xpResult });
}));

router.get("/daily", asyncHandler(async (req, res) => {
  const daily = await SkillPracticeDaily.findOne({ uid: req.user.uid, date: getToday() }).lean();
  res.json(daily || { completedModes: [], bonusClaimed: false });
}));

export default router;
