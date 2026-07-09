import { Router } from "express";
import User from "../models/User.js";
import { 
  FlashcardProgress, 
  FlashcardFolder, 
  FlashcardSet, 
  Flashcard, 
  Vocabulary 
} from "../models/Schemas.js";
import { addXpToUser, incrementDailyTask } from "./user.js";
import { GoogleGenAI, Type } from "@google/genai";
import { checkAchievements } from "../utils/achievements.js";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.use(verifyToken);

const isVipUser = (profile = {}) => {
  const role = String(profile.role || "").toLowerCase();
  const plan = String(profile.plan || profile.subscriptionPlan || profile.membership || "").toLowerCase();
  const status = String(profile.subscriptionStatus || profile.vipStatus || "").toLowerCase();
  return Boolean(
    profile.isVip ||
    profile.vip ||
    role === "admin" ||
    role === "vip" ||
    plan === "vip" ||
    plan === "pro" ||
    plan === "premium" ||
    status === "active"
  );
};

const normalizePublicFlag = async (uid, requestedValue = true) => {
  const wantsPublic = requestedValue !== false;
  if (wantsPublic) return true;

  const profile = await User.findById(uid).lean();
  if (!isVipUser(profile)) {
    const err = new Error("Tính năng tạo bộ thẻ riêng tư chỉ dành cho tài khoản VIP.");
    err.statusCode = 402;
    throw err;
  }
  return false;
};


// ==================== DUE CARDS ROUTES ====================

// Get due cards for Dashboard
router.get("/due", asyncHandler(async (req, res) => {
  const now = new Date();
  const progressDocs = await FlashcardProgress.find({
    userId: req.user.uid,
    dueDate: { $lte: now }
  }).limit(5).lean();

  if (progressDocs.length === 0) {
    return res.json([]);
  }

  const cards = [];
  for (const data of progressDocs) {
    const cardDoc = await Flashcard.findById(data.cardId).lean();
    if (cardDoc) {
      cards.push({ id: cardDoc._id, ...cardDoc, progress: data });
    }
  }

  res.json(cards);
}));

// ==================== FOLDER ROUTES ====================

// List folders for user
router.get("/folders", asyncHandler(async (req, res) => {
  const folders = await FlashcardFolder.find({ userId: req.user.uid }).sort({ createdAt: -1 }).lean();
  res.json(folders.map(f => ({ id: f._id, ...f })));
}));

// Create a new folder
router.post("/folder", asyncHandler(async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: "Folder name is required" });

  const newFolder = await FlashcardFolder.create({
    userId: req.user.uid,
    name,
    color: color || "bg-blue-500",
  });

  const folderObj = newFolder.toObject();
  res.json({ id: folderObj._id, ...folderObj });
}));

// Update a folder
router.patch("/folder/:folderId", asyncHandler(async (req, res) => {
  const { folderId } = req.params;
  const { name, color } = req.body;
  
  const folder = await FlashcardFolder.findById(folderId);
  if (!folder || folder.userId.toString() !== req.user.uid) {
    return res.status(404).json({ error: "Folder not found" });
  }
  
  if (name) folder.name = name;
  if (color) folder.color = color;
  await folder.save();
  
  res.json({ success: true, updates: { name, color } });
}));

// Delete a folder
router.delete("/folder/:folderId", asyncHandler(async (req, res) => {
  const { folderId } = req.params;
  const { deleteSets } = req.query;

  const folder = await FlashcardFolder.findById(folderId);
  if (!folder || folder.userId.toString() !== req.user.uid) {
    return res.status(404).json({ error: "Folder not found" });
  }

  if (deleteSets === "true") {
    const sets = await FlashcardSet.find({ folderId }).lean();
    for (const set of sets) {
      await Flashcard.deleteMany({ setId: set._id });
      await FlashcardSet.findByIdAndDelete(set._id);
    }
  } else {
    await FlashcardSet.updateMany({ folderId }, { $set: { folderId: null } });
  }

  await FlashcardFolder.findByIdAndDelete(folderId);
  res.json({ success: true });
}));

// ==================== SET ROUTES ====================

// List flashcard sets for the user
router.get("/list", asyncHandler(async (req, res) => {
  const sets = await FlashcardSet.find({ userId: req.user.uid }).sort({ createdAt: -1 }).lean();
  res.json(sets.map(s => ({ id: s._id, ...s })));
}));

// List public flashcard sets across the system
router.get("/public", asyncHandler(async (req, res) => {
  const sets = await FlashcardSet.find({ isPublic: true })
    .sort({ createdAt: -1 })
    .populate('userId', 'displayName email photoURL')
    .lean();

  const formattedSets = sets.map(set => {
    const creator = set.userId ? {
      uid: set.userId._id,
      displayName: set.userId.displayName || set.userId.email || "Người dùng ZenTask",
      photoURL: set.userId.photoURL || "",
    } : null;
    return { id: set._id, ...set, creator, userId: set.userId?._id };
  });

  res.json(formattedSets);
}));

// Create a new flashcard set
router.post("/set", asyncHandler(async (req, res) => {
  const { title, description = "", color = "bg-blue-500", isPublic = true } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  const publicFlag = await normalizePublicFlag(req.user.uid, isPublic);

  const newSet = await FlashcardSet.create({
    userId: req.user.uid,
    title,
    description,
    color,
    isPublic: publicFlag,
  });

  const setObj = newSet.toObject();
  res.json({ id: setObj._id, ...setObj });
}));

// Update a flashcard set
router.patch("/set/:setId", asyncHandler(async (req, res) => {
  const { setId } = req.params;
  const { title, description, color, folderId, order, isPublic } = req.body;
  
  const set = await FlashcardSet.findById(setId);
  if (!set || set.userId.toString() !== req.user.uid) {
    return res.status(404).json({ error: "Flashcard set not found" });
  }
  
  if (title) set.title = title;
  if (description !== undefined) set.description = description;
  if (color) set.color = color;
  if (folderId !== undefined) set.folderId = folderId;
  if (order !== undefined) set.order = order;
  if (isPublic !== undefined) set.isPublic = await normalizePublicFlag(req.user.uid, isPublic);
  
  await set.save();
  res.json({ success: true });
}));

// Get a flashcard set and its cards
router.get("/set/:setId/cards", asyncHandler(async (req, res) => {
  const { setId } = req.params;
  const set = await FlashcardSet.findById(setId);
  
  if (!set) return res.status(404).json({ error: "Flashcard set not found" });

  const isOwner = set.userId.toString() === req.user.uid;
  if (!isOwner && !set.isPublic) {
    return res.status(404).json({ error: "Flashcard set not found" });
  }

  if (isOwner && set.isNew) {
    set.isNew = false;
    await set.save();
  }

  const cards = await Flashcard.find({ setId }).sort({ createdAt: -1 }).lean();
  
  const setObj = set.toObject();
  res.json({ 
    set: { id: setObj._id, ...setObj }, 
    cards: cards.map(c => ({ id: c._id, ...c }))
  });
}));

// Create a flashcard
router.post("/set/:setId/card", asyncHandler(async (req, res) => {
  const { setId } = req.params;
  const { term, phonetic, translation, examples, notes } = req.body;

  const set = await FlashcardSet.findById(setId);
  if (!set || set.userId.toString() !== req.user.uid) {
    return res.status(404).json({ error: "Flashcard set not found" });
  }

  const newCard = await Flashcard.create({
    setId,
    userId: req.user.uid,
    term,
    phonetic: phonetic || "",
    translation,
    examples: examples || [],
    notes: notes || "",
  });

  set.cardCount += 1;
  await set.save();

  const taskResult = await incrementDailyTask(req.user.uid, "create_material", 1);
  let xpResult = null;
  if (taskResult.success && taskResult.xpToAdd > 0) {
    xpResult = await addXpToUser(req.user.uid, taskResult.xpToAdd);
  }

  const cardObj = newCard.toObject();
  res.json({
    id: cardObj._id,
    ...cardObj,
    xpResult,
    taskProgress: taskResult.success ? { create_material: taskResult.progress } : {},
  });
}));

// Delete a flashcard set
router.delete("/set/:setId", asyncHandler(async (req, res) => {
  const { setId } = req.params;
  const set = await FlashcardSet.findById(setId);

  if (!set || set.userId.toString() !== req.user.uid) {
    return res.status(404).json({ error: "Flashcard set not found" });
  }

  await Flashcard.deleteMany({ setId });
  await FlashcardSet.findByIdAndDelete(setId);

  res.json({ success: true });
}));

// Delete a flashcard
router.delete("/card/:cardId", asyncHandler(async (req, res) => {
  const { cardId } = req.params;
  const card = await Flashcard.findById(cardId);

  if (!card || card.userId.toString() !== req.user.uid) {
    return res.status(404).json({ error: "Flashcard not found" });
  }

  const setId = card.setId;
  await Flashcard.findByIdAndDelete(cardId);
  await FlashcardSet.findByIdAndUpdate(setId, { $inc: { cardCount: -1 } });

  res.json({ success: true });
}));

// AI flashcard generation
router.post("/generate-ai", asyncHandler(async (req, res) => {
  const { term, setId, list_flashcard_id } = req.body;
  const targetSetId = setId || list_flashcard_id;
  if (!term) return res.status(400).json({ error: "Term is required" });

  const lowercaseTerm = term.trim().toLowerCase();

  const saveToUserSet = async (vocabData) => {
    if (!targetSetId) return;
    const set = await FlashcardSet.findById(targetSetId);
    if (set && set.userId.toString() === req.user.uid) {
      const existingCard = await Flashcard.findOne({ setId: targetSetId, term: vocabData.term });
      if (!existingCard) {
        await Flashcard.create({
          setId: targetSetId,
          userId: req.user.uid,
          term: vocabData.term,
          phonetic: vocabData.phonetic || "",
          translation: vocabData.translation,
          examples: vocabData.examples || [],
          notes: vocabData.notes || "",
        });
        set.cardCount += 1;
        await set.save();
      }
    }
  };

  const vocabDoc = await Vocabulary.findOne({ term: lowercaseTerm }).lean();

  if (vocabDoc) {
    await saveToUserSet(vocabDoc);
    return res.json({ source: "cache", ...vocabDoc, ok: true, message: "Lưu thành công!" });
  }

  const availableKeys = [];
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`API_KEY_AI_${i}`];
    if (k) availableKeys.push({ index: i, key: k });
  }

  if (availableKeys.length === 0) {
    return res.status(500).json({ error: "No AI API Keys configured" });
  }

  const shuffledKeys = availableKeys.sort(() => Math.random() - 0.5);
  const prompt = `Hãy đóng vai một từ điển Anh-Việt. Từ cần tra cứu là: "${term}".
Vui lòng trả về kết quả với các thông tin sau:
- term: nếu là tiếng việt thì chuyển nó về tiếng anh (viết hoa chữ cái đầu tiên nhé)
- phonetic: Phiên âm quốc tế (IPA) của từ tiếng Anh này.
- translation: Nghĩa tiếng Việt của từ này.
- notes: Ghi chú ngữ pháp hoặc cách dùng từ (viết bằng tiếng Việt).
- examples: Mảng gồm đúng 3 câu ví dụ. Mỗi ví dụ có "en" (câu tiếng Anh chứa từ đó) và "vi" (câu dịch sang tiếng Việt).`;

  let generatedData = null;
  for (const { index, key } of shuffledKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              phonetic: { type: Type.STRING },
              translation: { type: Type.STRING },
              notes: { type: Type.STRING },
              examples: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    en: { type: Type.STRING },
                    vi: { type: Type.STRING },
                  },
                  required: ["en", "vi"],
                },
              },
            },
            required: ["term", "phonetic", "translation", "examples"],
          },
        },
      });
      
      const responseText = response.text;
      generatedData = JSON.parse(responseText);
      break; 
    } catch (err) {
      console.warn(`[AI Generation] Key API_KEY_AI_${index} failed:`, err.message);
    }
  }

  if (!generatedData) {
    return res.status(500).json({ error: "All AI API keys failed to generate content or parse response." });
  }

  if (!generatedData.notes) generatedData.notes = "";

  const newVocab = {
    term: generatedData.term,
    phonetic: generatedData.phonetic,
    translation: generatedData.translation,
    notes: generatedData.notes,
    examples: generatedData.examples,
  };

  await Vocabulary.create(newVocab);
  await saveToUserSet(newVocab);

  res.json({ source: "ai", ...newVocab, ok: true, message: "Lưu thành công!" });
}));

// Clone a public set
router.post("/set/:setId/clone", asyncHandler(async (req, res) => {
  const { setId } = req.params;
  const set = await FlashcardSet.findById(setId).lean();

  if (!set) return res.status(404).json({ error: "Flashcard set not found" });

  if (!set.isPublic && set.userId.toString() !== req.user.uid) {
    return res.status(403).json({ error: "This set is not public" });
  }

  const newSet = await FlashcardSet.create({
    userId: req.user.uid,
    title: `${set.title} (Clone)`,
    description: set.description || "",
    cardCount: set.cardCount || 0,
    color: set.color || "bg-blue-500",
    isNew: true,
    isPublic: false,
    clonedFrom: setId,
  });

  const cards = await Flashcard.find({ setId }).lean();
  
  if (cards.length > 0) {
    const newCards = cards.map(c => ({
      setId: newSet._id,
      userId: req.user.uid,
      term: c.term,
      phonetic: c.phonetic || "",
      translation: c.translation,
      examples: c.examples || [],
      notes: c.notes || "",
    }));
    await Flashcard.insertMany(newCards);
  }

  const setObj = newSet.toObject();
  res.json({ id: setObj._id, ...setObj });
}));

// Update set privacy
router.patch("/set/:setId/privacy", asyncHandler(async (req, res) => {
  const { setId } = req.params;
  const { isPublic } = req.body;

  const set = await FlashcardSet.findById(setId);
  if (!set || set.userId.toString() !== req.user.uid) {
    return res.status(404).json({ error: "Flashcard set not found" });
  }

  const publicFlag = await normalizePublicFlag(req.user.uid, isPublic);
  set.isPublic = publicFlag;
  await set.save();

  res.json({ success: true, isPublic: publicFlag });
}));

// ==================== SM-2 SPACED REPETITION ROUTES ====================

function calculateSM2(quality, current = {}) {
  const EF_MIN = 1.3;
  const easeFactor = current.easeFactor ?? 2.5;
  const interval = current.interval ?? 1;
  const repetitions = current.repetitions ?? 0;

  let newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEF = Math.max(EF_MIN, newEF);

  let newInterval;
  let newRepetitions;

  if (quality < 3) {
    newRepetitions = 0;
    newInterval = 1;
  } else {
    newRepetitions = repetitions + 1;
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEF);
    }
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + newInterval);

  return {
    easeFactor: newEF,
    interval: newInterval,
    repetitions: newRepetitions,
    dueDate,
    quality,
  };
}

// Batch update progress (called after every 5 cards or session end)
router.post("/progress/batch", asyncHandler(async (req, res) => {
  const { updates } = req.body;
  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: "updates array is required" });
  }

  const results = [];
  
  for (const update of updates) {
    const { cardId, setId, quality, mode } = update;
    if (!cardId || !setId || quality === undefined) continue;

    const current = await FlashcardProgress.findOne({ userId: req.user.uid, cardId }).lean() || {};
    const sm2 = calculateSM2(quality, current);

    const progressData = {
      userId: req.user.uid,
      cardId,
      setId,
      easeFactor: sm2.easeFactor,
      interval: sm2.interval,
      repetitions: sm2.repetitions,
      dueDate: sm2.dueDate,
      quality: sm2.quality,
      lastStudied: new Date(),
    };

    await FlashcardProgress.findOneAndUpdate(
      { userId: req.user.uid, cardId },
      { $set: progressData },
      { upsert: true }
    );

    await Flashcard.findByIdAndUpdate(cardId, { isLearned: true });
    
    // We can run an update on FlashcardSet learnedCount safely using $inc or a separate script later.
    // Assuming learnedCount just tracks how many are learned, doing it incrementally is tricky since
    // isLearned could already be true. For this simplified logic, we omit exact learnedCount tracking here.

    results.push({ cardId, ...progressData });
  }

  const taskResult = await incrementDailyTask(req.user.uid, "learn_flashcards", updates.length);
  let xpResult = null;
  if (taskResult.success && taskResult.xpToAdd > 0) {
    xpResult = await addXpToUser(req.user.uid, taskResult.xpToAdd);
  }

  checkAchievements(req.user.uid, "FLASHCARD_LEARNED", {}, req.app);

  res.json({ 
    success: true, 
    results,
    xpResult,
    taskProgress: taskResult.success ? { learn_flashcards: taskResult.progress } : {}
  });
}));

export default router;
