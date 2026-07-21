import User from "../models/User.js";
import { FlashcardProgress, FlashcardFolder, FlashcardCategory, FlashcardSet, Flashcard, Vocabulary, UserActivity } from "../models/Schemas.js";
import { BUILTIN_FLASHCARD_SETS, getBuiltinFlashcardSetById } from "../data/builtinLearning/index.js";
import { addXpToUser, incrementDailyTask } from "../routes/user.js";
import { Type } from "@google/genai";
import { generateAIContent } from "./ai.service.js";
import { checkAchievements } from "../../utils/achievements.js";
import { consumeDailyLimit } from "../../utils/usageLimits.js";
import { cleanAndValidatePublicText, validatePublicObject } from "../../utils/moderation.js";

const isVipUser = (profile = {}) => {
  const role = String(profile.role || "").toLowerCase();
  const plan = String(profile.plan || profile.subscriptionPlan || profile.membership || "").toLowerCase();
  const status = String(profile.subscriptionStatus || profile.vipStatus || "").toLowerCase();
  return Boolean(profile.isVip || profile.vip || role === "admin" || role === "vip" || plan === "vip" || plan === "pro" || plan === "premium" || status === "active");
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

const normalizeLearningTerm = (value = "") => {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
};

const normalizeGeneratedFlashcard = (data = {}, fallbackTerm = "") => {
  const examples = Array.isArray(data.examples)
    ? data.examples
        .slice(0, 3)
        .map((ex) => ({
          en: String(ex?.en || "")
            .trim()
            .slice(0, 500),
          vi: String(ex?.vi || "")
            .trim()
            .slice(0, 500),
        }))
        .filter((ex) => ex.en || ex.vi)
    : [];

  return {
    term: String(data.term || fallbackTerm || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 120),
    phonetic: String(data.phonetic || "")
      .trim()
      .slice(0, 120),
    translation: String(data.translation || "")
      .trim()
      .slice(0, 500),
    notes: String(data.notes || "")
      .trim()
      .slice(0, 1200),
    examples,
  };
};

const validateFlashcardOnlyWhenPublic = async (vocabData, set) => {
  if (!set?.isPublic) return;
  await validatePublicObject(vocabData, "Flashcard công khai");
};

const formatCategory = (category) => ({ id: category._id, ...category });

const formatBuiltinSetSummary = (set) => {
  const { words, ...summary } = set;
  return {
    ...summary,
    id: set.id,
    folderId: null,
    categoryId: set.category.toLowerCase(),
    categoryName: set.categoryName || set.category,
    creator: { uid: "system", displayName: "ZenTask", photoURL: "" },
    createdAt: summary.createdAt || "2026-01-01T00:00:00.000Z",
    updatedAt: summary.updatedAt || "2026-01-01T00:00:00.000Z",
  };
};

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

  return { easeFactor: newEF, interval: newInterval, repetitions: newRepetitions, dueDate, quality };
}

const DEFAULT_FLASHCARD_CATEGORIES = [
  { name: "IELTS", color: "bg-indigo-500" },
  { name: "TOEIC", color: "bg-emerald-500" },
  { name: "Giao tiếp", color: "bg-orange-500" },
  { name: "Ngữ pháp", color: "bg-purple-500" },
];

class FlashcardService {
  async getDueCards(userId) {
    const now = new Date();
    const progressDocs = await FlashcardProgress.find({ userId, dueDate: { $lte: now } })
      .limit(5)
      .lean();
    if (progressDocs.length === 0) return [];

    const cards = [];
    for (const data of progressDocs) {
      const cardDoc = await Flashcard.findById(data.cardId).lean();
      if (cardDoc) cards.push({ id: cardDoc._id, ...cardDoc, progress: data });
    }
    return cards;
  }

  async getFolders(userId) {
    const folders = await FlashcardFolder.find({ userId }).sort({ createdAt: -1 }).lean();
    return folders.map((f) => ({ id: f._id, ...f }));
  }

  async createFolder(userId, { name, color }) {
    if (!name) throw { statusCode: 400, message: "Folder name is required" };
    const safeName = await cleanAndValidatePublicText(name, "Tên thư mục flashcard", { maxLength: 80 });
    const newFolder = await FlashcardFolder.create({ userId, name: safeName, color: color || "bg-blue-500" });
    const folderObj = newFolder.toObject();
    return { id: folderObj._id, ...folderObj };
  }

  async updateFolder(userId, folderId, { name, color }) {
    const folder = await FlashcardFolder.findById(folderId);
    if (!folder || folder.userId.toString() !== userId) throw { statusCode: 404, message: "Folder not found" };

    if (name) folder.name = await cleanAndValidatePublicText(name, "Tên thư mục flashcard", { maxLength: 80 });
    if (color) folder.color = color;
    await folder.save();
    return { name, color };
  }

  async deleteFolder(userId, folderId, deleteSets) {
    const folder = await FlashcardFolder.findById(folderId);
    if (!folder || folder.userId.toString() !== userId) throw { statusCode: 404, message: "Folder not found" };

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
    return { success: true };
  }

  async getCategories(userId) {
    let categories = await FlashcardCategory.find({ userId }).sort({ createdAt: 1 }).lean();
    if (categories.length === 0) {
      const created = await FlashcardCategory.insertMany(DEFAULT_FLASHCARD_CATEGORIES.map((item) => ({ userId, ...item })));
      categories = created.map((doc) => doc.toObject());
    }
    return categories.map(formatCategory);
  }

  async createCategory(userId, { name, color = "bg-slate-500", description = "" }) {
    if (!name || !String(name).trim()) throw { statusCode: 400, message: "Tên đề mục là bắt buộc" };
    const safeName = await cleanAndValidatePublicText(name, "Tên đề mục flashcard", { maxLength: 80 });
    const safeDescription = await cleanAndValidatePublicText(description, "Mô tả đề mục flashcard", { maxLength: 300 });

    const existing = await FlashcardCategory.findOne({ userId, name: safeName });
    if (existing) return formatCategory(existing.toObject());

    const category = await FlashcardCategory.create({ userId, name: safeName, color, description: safeDescription });
    return formatCategory(category.toObject());
  }

  async updateCategory(userId, categoryId, { name, color, description }) {
    const category = await FlashcardCategory.findById(categoryId);
    if (!category || category.userId.toString() !== userId) throw { statusCode: 404, message: "Không tìm thấy đề mục" };

    if (name !== undefined) category.name = await cleanAndValidatePublicText(name, "Tên đề mục flashcard", { maxLength: 80 });
    if (color !== undefined) category.color = color;
    if (description !== undefined) category.description = await cleanAndValidatePublicText(description, "Mô tả đề mục flashcard", { maxLength: 300 });
    await category.save();
    return formatCategory(category.toObject());
  }

  async deleteCategory(userId, categoryId) {
    const category = await FlashcardCategory.findById(categoryId);
    if (!category || category.userId.toString() !== userId) throw { statusCode: 404, message: "Không tìm thấy đề mục" };

    await FlashcardSet.updateMany({ userId, categoryId }, { $set: { categoryId: null, categoryName: "" } });
    await FlashcardCategory.findByIdAndDelete(categoryId);
    return { success: true };
  }

  getBuiltinSets() {
    return BUILTIN_FLASHCARD_SETS.map(formatBuiltinSetSummary);
  }

  getBuiltinSetCards(setId) {
    const set = getBuiltinFlashcardSetById(setId);
    if (!set) throw { statusCode: 404, message: "Không tìm thấy bộ thẻ có sẵn" };
    const summary = formatBuiltinSetSummary(set);
    return {
      set: summary,
      cards: (set.words || []).map((word) => ({
        ...word,
        setId: set.id,
        userId: "system",
        isLearned: false,
        isBuiltIn: true,
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
      })),
    };
  }

  async cloneBuiltinSet(userId, setId) {
    const set = getBuiltinFlashcardSetById(setId);
    if (!set) throw { statusCode: 404, message: "Không tìm thấy bộ thẻ có sẵn" };

    const existingSet = await FlashcardSet.findOne({ userId, builtinId: set.id });
    if (existingSet) throw { statusCode: 400, message: "Bạn đã lưu bộ thẻ này rồi" };

    const newSet = await FlashcardSet.create({
      userId,
      title: `${set.title} (Bản của tôi)`,
      description: set.description || "",
      cardCount: set.words?.length || 0,
      learnedCount: 0,
      color: set.color || "bg-blue-500",
      isNew: true,
      isPublic: false,
      categoryName: set.categoryName || set.category || "",
      clonedFrom: null,
      builtinId: set.id,
    });

    const setObj = newSet.toObject();
    return { id: setObj._id, ...setObj };
  }

  async getUserSets(userId) {
    const sets = await FlashcardSet.find({ userId }).sort({ createdAt: -1 }).lean();
    const setIds = sets.map((s) => s._id);
    const progressDocs = await FlashcardProgress.find({ userId, setId: { $in: setIds } }).lean();

    const progressBySet = {};
    for (const doc of progressDocs) {
      if (!progressBySet[doc.setId]) progressBySet[doc.setId] = { known: 0, almost: 0 };
      if (doc.easeFactor >= 2.5 && doc.repetitions >= 2) progressBySet[doc.setId].known += 1;
      else if (doc.repetitions >= 1 || doc.easeFactor >= 1.8) progressBySet[doc.setId].almost += 1;
    }

    return sets.map((s) => {
      const p = progressBySet[s._id] || { known: 0, almost: 0 };
      const unknownCount = Math.max(0, (s.cardCount || 0) - p.known - p.almost);
      return { id: s._id, ...s, knownCount: p.known, almostCount: p.almost, unknownCount };
    });
  }

  async getPublicSets() {
    const sets = await FlashcardSet.find({ isPublic: true }).sort({ createdAt: -1 }).populate("userId", "displayName email photoURL").lean();
    return sets.map((set) => {
      const creator = set.userId
        ? {
            uid: set.userId._id,
            displayName: set.userId.displayName || set.userId.email || "Người dùng ZenTask",
            photoURL: set.userId.photoURL || "",
          }
        : null;
      return { id: set._id, ...set, creator, userId: set.userId?._id };
    });
  }

  async createSet(userId, data) {
    const { title, description = "", color = "bg-blue-500", isPublic = true, categoryId = null, language = "en" } = data;
    if (!title) throw { statusCode: 400, message: "Title is required" };

    const VALID_LANGUAGES = ["en", "zh", "ko", "ja", "de", "fr", "es", "th"];
    const safeLanguage = VALID_LANGUAGES.includes(language) ? language : "en";

    const safeTitle = await cleanAndValidatePublicText(title, "Tên bộ flashcard", { maxLength: 120 });
    const safeDescription = await cleanAndValidatePublicText(description || "", "Mô tả bộ flashcard", { maxLength: 600 });
    const publicFlag = await normalizePublicFlag(userId, isPublic);

    let categoryName = "";
    let safeCategoryId = null;
    if (categoryId) {
      const category = await FlashcardCategory.findById(categoryId).lean();
      if (category && category.userId.toString() === userId) {
        safeCategoryId = category._id;
        categoryName = category.name || "";
      }
    }

    const newSet = await FlashcardSet.create({
      userId,
      title: safeTitle,
      description: safeDescription,
      color,
      language: safeLanguage,
      categoryId: safeCategoryId,
      categoryName,
      isPublic: publicFlag,
    });

    await UserActivity.create({
      uid: userId,
      action: "Tạo bộ thẻ",
      target: safeTitle,
      type: "flashcard",
      xpEarned: 0,
    });

    const setObj = newSet.toObject();
    return { id: setObj._id, ...setObj };
  }

  async updateSet(userId, setId, data) {
    const { title, description, color, folderId, categoryId, order, isPublic, language } = data;
    const set = await FlashcardSet.findById(setId);
    if (!set || set.userId.toString() !== userId) throw { statusCode: 404, message: "Flashcard set not found" };

    if (title) set.title = await cleanAndValidatePublicText(title, "Tên bộ flashcard", { maxLength: 120 });
    if (description !== undefined) set.description = await cleanAndValidatePublicText(description, "Mô tả bộ flashcard", { maxLength: 600 });
    if (color) set.color = color;
    if (folderId !== undefined) set.folderId = folderId;

    if (categoryId !== undefined) {
      if (!categoryId) {
        set.categoryId = null;
        set.categoryName = "";
      } else {
        const category = await FlashcardCategory.findById(categoryId).lean();
        if (category && category.userId.toString() === userId) {
          set.categoryId = category._id;
          set.categoryName = category.name || "";
        }
      }
    }
    if (order !== undefined) set.order = order;
    if (isPublic !== undefined) set.isPublic = await normalizePublicFlag(userId, isPublic);
    if (language !== undefined) {
      const VALID_LANGUAGES = ["en", "zh", "ko", "ja", "de", "fr", "es", "th"];
      if (VALID_LANGUAGES.includes(language)) set.language = language;
    }

    await set.save();
    return {
      title: set.title,
      description: set.description,
      color: set.color,
      folderId: set.folderId,
      categoryId: set.categoryId,
      categoryName: set.categoryName,
      order: set.order,
      isPublic: set.isPublic,
      language: set.language,
    };
  }

  async getSetDetails(userId, setId) {
    const set = await FlashcardSet.findById(setId);
    if (!set) throw { statusCode: 404, message: "Flashcard set not found" };

    const isOwner = set.userId.toString() === userId;
    if (!isOwner && !set.isPublic) throw { statusCode: 404, message: "Flashcard set not found" };

    if (isOwner && set.isNew) {
      set.isNew = false;
      await set.save();
    }

    let cards = [];
    if (set.builtinId) {
      const builtinData = getBuiltinFlashcardSetById(set.builtinId);
      if (builtinData && builtinData.words) {
        cards = builtinData.words.map((word) => ({
          _id: word.id || word.term,
          setId: set._id,
          userId: set.userId,
          term: word.term,
          phonetic: word.phonetic || "",
          translation: word.translation || "",
          examples: word.examples || [],
          notes: word.notes || "",
          isLearned: false,
          isBuiltIn: true,
        }));
      }
    } else {
      cards = await Flashcard.find({ setId }).sort({ createdAt: -1 }).lean();
    }

    const setObj = set.toObject();
    return {
      set: { id: setObj._id, ...setObj },
      cards: cards.map((c) => ({ id: c._id, ...c })),
    };
  }

  async createCard(userId, setId, data) {
    const { term, phonetic, translation, examples, notes } = data;
    const set = await FlashcardSet.findById(setId);
    if (!set || set.userId.toString() !== userId) throw { statusCode: 404, message: "Flashcard set not found" };
    if (set.builtinId) throw { statusCode: 403, message: "Cannot add cards to a built-in set" };

    await validatePublicObject({ term, translation, examples, notes }, "Nội dung flashcard");
    await consumeDailyLimit({
      uid: userId,
      key: "flashcard_words",
      amount: 1,
      message: "Bạn đã tạo đủ 30 từ flashcard hôm nay. Nâng VIP để tạo không giới hạn.",
    });

    const newCard = await Flashcard.create({
      setId,
      userId,
      term: String(term || "").trim(),
      phonetic: phonetic || "",
      translation: String(translation || "").trim(),
      examples: examples || [],
      notes: notes || "",
    });

    set.cardCount += 1;
    await set.save();

    const taskResult = await incrementDailyTask(userId, "create_material", 1);
    let xpResult = null;
    if (taskResult.success && taskResult.xpToAdd > 0) {
      xpResult = await addXpToUser(userId, taskResult.xpToAdd);
    }

    const cardObj = newCard.toObject();
    return {
      id: cardObj._id,
      ...cardObj,
      xpResult,
      taskProgress: taskResult.success ? { create_material: taskResult.progress } : {},
    };
  }

  async deleteSet(userId, setId) {
    const set = await FlashcardSet.findById(setId);
    if (!set || set.userId.toString() !== userId) throw { statusCode: 404, message: "Flashcard set not found" };
    await Flashcard.deleteMany({ setId });
    await FlashcardSet.findByIdAndDelete(setId);
    return { success: true };
  }

  async deleteCard(userId, cardId) {
    const card = await Flashcard.findById(cardId);
    if (!card || card.userId.toString() !== userId) throw { statusCode: 404, message: "Flashcard not found" };

    const setId = card.setId;
    await Flashcard.findByIdAndDelete(cardId);
    await FlashcardSet.findByIdAndUpdate(setId, { $inc: { cardCount: -1 } });
    return { success: true };
  }

  async generateAiFlashcards(userId, { term, setId }) {
    if (!term) throw { statusCode: 400, message: "Term is required" };
    const safeTerm = normalizeLearningTerm(term);
    if (!safeTerm) throw { statusCode: 400, message: "Term is required" };
    await consumeDailyLimit({
      uid: userId,
      key: "flashcard_words",
      amount: 1,
      message: "Bạn đã tạo đủ 30 từ flashcard hôm nay. Nâng VIP để tạo không giới hạn.",
    });

    let targetLang = "en";
    let targetSet = null;
    if (setId) {
      targetSet = await FlashcardSet.findById(setId).lean();
      if (targetSet && targetSet.language) targetLang = targetSet.language;
    }

    const lowercaseTerm = safeTerm.trim().toLowerCase();
    const saveToUserSet = async (vocabData) => {
      if (!setId) return;
      const set = await FlashcardSet.findById(setId);
      if (set && set.userId.toString() === userId) {
        const existingCard = await Flashcard.findOne({ setId: setId, term: vocabData.term });
        if (!existingCard) {
          await validateFlashcardOnlyWhenPublic(vocabData, set);
          await Flashcard.create({
            setId: setId,
            userId,
            language: targetLang,
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

    const vocabDoc = await Vocabulary.findOne({ term: lowercaseTerm, language: targetLang }).lean();
    if (vocabDoc) {
      await saveToUserSet(vocabDoc);
      return { source: "cache", ...vocabDoc, ok: true, message: "Lưu thành công!" };
    }

    const LANGUAGE_PROMPTS = {
      en: {
        dict: "Anh-Việt",
        termInstruction: "nếu là tiếng việt thì chuyển nó về tiếng anh (viết hoa chữ cái đầu tiên nhé)",
        phoneticInstruction: "Phiên âm quốc tế (IPA)",
        notesInstruction: "Ghi chú ngữ pháp (viết bằng tiếng Việt)",
        exampleInstruction: 'Mảng 3 ví dụ, mỗi cái có "en" và "vi".',
      },
      zh: {
        dict: "Trung-Việt",
        termInstruction: "từ/cụm từ tiếng Trung (cả Pinyin nếu cần)",
        phoneticInstruction: "Phiên âm Pinyin",
        notesInstruction: "Ghi chú",
        exampleInstruction: 'Mảng 3 ví dụ, "en" (tiếng Trung) và "vi".',
      },
      ko: { dict: "Hàn-Việt", termInstruction: "từ tiếng Hàn", phoneticInstruction: "Romanization", notesInstruction: "Ghi chú", exampleInstruction: 'Mảng 3 ví dụ, "en" (tiếng Hàn) và "vi".' },
      ja: { dict: "Nhật-Việt", termInstruction: "từ tiếng Nhật", phoneticInstruction: "Romaji", notesInstruction: "Ghi chú", exampleInstruction: 'Mảng 3 ví dụ, "en" (tiếng Nhật) và "vi".' },
      de: { dict: "Đức-Việt", termInstruction: "từ tiếng Đức", phoneticInstruction: "IPA", notesInstruction: "Ghi chú", exampleInstruction: 'Mảng 3 ví dụ, "en" (tiếng Đức) và "vi".' },
      fr: { dict: "Pháp-Việt", termInstruction: "từ tiếng Pháp", phoneticInstruction: "IPA", notesInstruction: "Ghi chú", exampleInstruction: 'Mảng 3 ví dụ, "en" (tiếng Pháp) và "vi".' },
      es: {
        dict: "Tây Ban Nha-Việt",
        termInstruction: "từ tiếng Tây Ban Nha",
        phoneticInstruction: "IPA",
        notesInstruction: "Ghi chú",
        exampleInstruction: 'Mảng 3 ví dụ, "en" (tiếng Tây Ban Nha) và "vi".',
      },
      th: { dict: "Thái-Việt", termInstruction: "từ tiếng Thái", phoneticInstruction: "Romanization", notesInstruction: "Ghi chú", exampleInstruction: 'Mảng 3 ví dụ, "en" (tiếng Thái) và "vi".' },
    };

    const langConfig = LANGUAGE_PROMPTS[targetLang] || LANGUAGE_PROMPTS.en;
    const prompt = `Hãy đóng vai một từ điển ${langConfig.dict}. Từ/cụm từ cần tra cứu là: "${safeTerm}".
Vui lòng trả về kết quả JSON với các thông tin sau:
- term: ${langConfig.termInstruction}
- phonetic: ${langConfig.phoneticInstruction}
- translation: Nghĩa tiếng Việt của từ này.
- notes: ${langConfig.notesInstruction}
- examples: ${langConfig.exampleInstruction}`;

    let generatedData = null;
    try {
      generatedData = await generateAIContent({
        prompt,
        feature: "flashcard_generate",
        uid: userId,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            translation: { type: Type.STRING },
            notes: { type: Type.STRING },
            examples: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { en: { type: Type.STRING }, vi: { type: Type.STRING } }, required: ["en", "vi"] } },
          },
          required: ["term", "phonetic", "translation", "examples"],
        },
      });
    } catch (err) {
      console.warn(`[AI Generation] failed:`, err.message);
    }

    if (!generatedData) throw { statusCode: 500, message: "All AI API keys failed to generate content or parse response." };

    const newVocab = normalizeGeneratedFlashcard(generatedData, safeTerm);
    if (!newVocab.term || !newVocab.translation) {
      throw { statusCode: 502, message: "AI trả dữ liệu flashcard chưa đủ thông tin. Vui lòng thử lại.", code: "AI_FLASHCARD_INCOMPLETE" };
    }

    await Vocabulary.findOneAndUpdate({ term: lowercaseTerm, language: targetLang }, { $setOnInsert: { ...newVocab, language: targetLang } }, { upsert: true, new: true });
    await saveToUserSet(newVocab);

    const taskResult = await incrementDailyTask(userId, "flashcard_master", 1);
    let xpResult = null;
    if (taskResult.success && taskResult.xpToAdd > 0) {
      xpResult = await addXpToUser(userId, taskResult.xpToAdd);
    }

    await UserActivity.create({
      uid: userId,
      action: "Tạo Flashcard bằng AI",
      target: newVocab.term,
      type: "flashcard",
      xpEarned: taskResult.success ? taskResult.xpToAdd : 0,
    });

    return { source: "ai", ...newVocab, ok: true, message: "Lưu thành công!", xpResult, taskProgress: taskResult.success ? { flashcard_master: taskResult.progress } : {} };
  }

  async generateAiFlashcardList(userId, { words, setId }) {
    if (!words || !Array.isArray(words)) throw { statusCode: 400, message: "Danh sách từ là bắt buộc và phải là một mảng" };
    if (words.length > 10) throw { statusCode: 400, message: "Tối đa 10 từ mỗi lần" };

    const safeTerms = words.map((term) => normalizeLearningTerm(term)).filter(Boolean);
    if (safeTerms.length === 0) throw { statusCode: 400, message: "Không có từ hợp lệ" };

    await consumeDailyLimit({
      uid: userId,
      key: "flashcard_words",
      amount: safeTerms.length,
      message: "Bạn đã tạo đủ lượt flashcard hôm nay. Nâng VIP để tạo không giới hạn.",
    });

    let targetLang = "en";
    let targetSet = null;
    if (setId) {
      targetSet = await FlashcardSet.findById(setId).lean();
      if (targetSet && targetSet.language) targetLang = targetSet.language;
    }

    const saveToUserSet = async (vocabData) => {
      if (!setId) return;
      const set = await FlashcardSet.findById(setId);
      if (set && set.userId.toString() === userId) {
        const existingCard = await Flashcard.findOne({ setId: setId, term: vocabData.term });
        if (!existingCard) {
          await validateFlashcardOnlyWhenPublic(vocabData, set);
          await Flashcard.create({
            setId: setId,
            userId,
            language: targetLang,
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

    const results = [];
    const missingTerms = [];

    // Check cache
    for (const term of safeTerms) {
      const lowercaseTerm = term.trim().toLowerCase();
      const vocabDoc = await Vocabulary.findOne({ term: lowercaseTerm, language: targetLang }).lean();
      if (vocabDoc) {
        await saveToUserSet(vocabDoc);
        results.push({ source: "cache", ...vocabDoc, ok: true });
      } else {
        missingTerms.push(term);
      }
    }

    if (missingTerms.length > 0) {
      const LANGUAGE_PROMPTS = {
        en: {
          dict: "Anh-Việt",
          termInstruction: "nếu là tiếng việt thì chuyển nó về tiếng anh (viết hoa chữ cái đầu tiên nhé)",
          phoneticInstruction: "Phiên âm quốc tế (IPA)",
          notesInstruction: "Ghi chú ngữ pháp (viết bằng tiếng Việt)",
          exampleInstruction: 'Mảng 3 ví dụ, mỗi cái có "en" và "vi".',
        },
        zh: {
          dict: "Trung-Việt",
          termInstruction: "từ/cụm từ tiếng Trung (cả Pinyin nếu cần)",
          phoneticInstruction: "Phiên âm Pinyin",
          notesInstruction: "Ghi chú",
          exampleInstruction: 'Mảng 3 ví dụ, "en" (tiếng Trung) và "vi".',
        },
        ko: { dict: "Hàn-Việt", termInstruction: "từ tiếng Hàn", phoneticInstruction: "Romanization", notesInstruction: "Ghi chú", exampleInstruction: 'Mảng 3 ví dụ, "en" (tiếng Hàn) và "vi".' },
        ja: { dict: "Nhật-Việt", termInstruction: "từ tiếng Nhật", phoneticInstruction: "Romaji", notesInstruction: "Ghi chú", exampleInstruction: 'Mảng 3 ví dụ, "en" (tiếng Nhật) và "vi".' },
        de: { dict: "Đức-Việt", termInstruction: "từ tiếng Đức", phoneticInstruction: "IPA", notesInstruction: "Ghi chú", exampleInstruction: 'Mảng 3 ví dụ, "en" (tiếng Đức) và "vi".' },
        fr: { dict: "Pháp-Việt", termInstruction: "từ tiếng Pháp", phoneticInstruction: "IPA", notesInstruction: "Ghi chú", exampleInstruction: 'Mảng 3 ví dụ, "en" (tiếng Pháp) và "vi".' },
        es: {
          dict: "Tây Ban Nha-Việt",
          termInstruction: "từ tiếng Tây Ban Nha",
          phoneticInstruction: "IPA",
          notesInstruction: "Ghi chú",
          exampleInstruction: 'Mảng 3 ví dụ, "en" (tiếng Tây Ban Nha) và "vi".',
        },
        th: { dict: "Thái-Việt", termInstruction: "từ tiếng Thái", phoneticInstruction: "Romanization", notesInstruction: "Ghi chú", exampleInstruction: 'Mảng 3 ví dụ, "en" (tiếng Thái) và "vi".' },
      };

      const langConfig = LANGUAGE_PROMPTS[targetLang] || LANGUAGE_PROMPTS.en;
      const termsString = missingTerms.map((t) => `"${t}"`).join(", ");
      const prompt = `Hãy đóng vai một từ điển ${langConfig.dict}. Các từ/cụm từ cần tra cứu là: [${termsString}].
Vui lòng trả về kết quả là một mảng JSON các đối tượng (mỗi đối tượng cho một từ/cụm từ). Mỗi đối tượng cần có:
- term: ${langConfig.termInstruction}
- phonetic: ${langConfig.phoneticInstruction}
- translation: Nghĩa tiếng Việt của từ này.
- notes: ${langConfig.notesInstruction}
- examples: ${langConfig.exampleInstruction}`;

      let generatedData = null;
      try {
        generatedData = await generateAIContent({
          prompt,
          feature: "flashcard_generate",
          uid: userId,
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                translation: { type: Type.STRING },
                notes: { type: Type.STRING },
                examples: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { en: { type: Type.STRING }, vi: { type: Type.STRING } }, required: ["en", "vi"] } },
              },
              required: ["term", "phonetic", "translation", "examples"],
            },
          },
        });
      } catch (err) {
        console.warn(`[AI Generation List] failed:`, err.message);
      }

      if (generatedData && Array.isArray(generatedData)) {
        for (const data of generatedData) {
          const newVocab = normalizeGeneratedFlashcard(data, data.term);
          if (newVocab.term && newVocab.translation) {
            const lowercaseTerm = newVocab.term.trim().toLowerCase();
            await Vocabulary.findOneAndUpdate({ term: lowercaseTerm, language: targetLang }, { $setOnInsert: { ...newVocab, language: targetLang } }, { upsert: true, new: true });
            await saveToUserSet(newVocab);
            results.push({ source: "ai", ...newVocab, ok: true });
          }
        }
      }
    }

    const taskResult = await incrementDailyTask(userId, "flashcard_master", safeTerms.length);
    let xpResult = null;
    if (taskResult.success && taskResult.xpToAdd > 0) {
      xpResult = await addXpToUser(userId, taskResult.xpToAdd);
    }

    if (missingTerms.length > 0) {
      await UserActivity.create({
        uid: userId,
        action: "Tạo danh sách Flashcard bằng AI",
        target: `Tạo ${missingTerms.length} từ mới`,
        type: "flashcard",
        xpEarned: taskResult.success ? taskResult.xpToAdd : 0,
      });
    }

    return {
      success: true,
      results,
      ok: true,
      xpResult,
      taskProgress: taskResult.success ? { flashcard_master: taskResult.progress } : {},
    };
  }

  async clonePublicSet(userId, setId) {
    const set = await FlashcardSet.findById(setId).lean();
    if (!set) throw { statusCode: 404, message: "Flashcard set not found" };
    if (!set.isPublic && set.userId.toString() !== userId) throw { statusCode: 403, message: "This set is not public" };

    const newSet = await FlashcardSet.create({
      userId,
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
      await Flashcard.insertMany(
        cards.map((c) => ({
          setId: newSet._id,
          userId,
          term: c.term,
          phonetic: c.phonetic || "",
          translation: c.translation,
          examples: c.examples || [],
          notes: c.notes || "",
        })),
      );
    }
    const setObj = newSet.toObject();
    return { id: setObj._id, ...setObj };
  }

  async updateSetPrivacy(userId, setId, isPublic) {
    const set = await FlashcardSet.findById(setId);
    if (!set || set.userId.toString() !== userId) throw { statusCode: 404, message: "Flashcard set not found" };

    const publicFlag = await normalizePublicFlag(userId, isPublic);
    set.isPublic = publicFlag;
    await set.save();
    return { success: true, isPublic: publicFlag };
  }

  async getProgressSet(userId, setId) {
    return await FlashcardProgress.find({ userId, setId }).lean();
  }

  async batchUpdateProgress(userId, updates, reqApp) {
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      throw { statusCode: 400, message: "updates array is required" };
    }
    const results = [];
    for (const update of updates) {
      const { cardId, setId, quality } = update;
      if (!cardId || !setId || quality === undefined) continue;

      const current = (await FlashcardProgress.findOne({ userId, cardId }).lean()) || {};
      const sm2 = calculateSM2(quality, current);

      const progressData = {
        userId,
        cardId,
        setId,
        easeFactor: sm2.easeFactor,
        interval: sm2.interval,
        repetitions: sm2.repetitions,
        dueDate: sm2.dueDate,
        quality: sm2.quality,
        lastStudied: new Date(),
      };

      await FlashcardProgress.findOneAndUpdate({ userId, cardId }, { $set: progressData }, { upsert: true });
      await Flashcard.findByIdAndUpdate(cardId, { isLearned: true });
      results.push({ cardId, ...progressData });
    }

    const taskResult = await incrementDailyTask(userId, "learn_past", updates.length);
    let xpResult = null;
    if (taskResult.success && taskResult.xpToAdd > 0) {
      xpResult = await addXpToUser(userId, taskResult.xpToAdd);
    }
    checkAchievements(userId, "FLASHCARD_LEARNED", {}, reqApp);
    await UserActivity.create({
      uid: userId,
      action: "Học Flashcard",
      target: `Học ${updates.length} thẻ`,
      type: "flashcard",
      xpEarned: taskResult.success ? taskResult.xpToAdd : 0,
    });

    return {
      success: true,
      results,
      xpResult,
      taskProgress: taskResult.success ? { learn_past: taskResult.progress } : {},
    };
  }
}

export default new FlashcardService();
