import { Router } from "express";
import { CalculatorHistory, TranslationHistory, StudyMethod } from "../models/Schemas.js";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(verifyToken);

function cleanText(value, max = 5000) {
  return String(value || "").trim().slice(0, max);
}

function serializeDoc(doc) {
  return {
    id: doc._id,
    ...doc,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

async function translateWithGoogle({ text, source = "auto", target = "en" }) {
  const query = new URLSearchParams({
    client: "gtx",
    sl: source || "auto",
    tl: target || "en",
    dt: "t",
    q: text,
  });

  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query.toString()}`);
  if (!response.ok) throw new Error(`Translate HTTP ${response.status}`);
  const data = await response.json();
  const translated = Array.isArray(data?.[0]) ? data[0].map((item) => item?.[0] || "").join("") : "";
  return translated || text;
}

router.get("/calculator-history", asyncHandler(async (req, res) => {
  const items = await CalculatorHistory.find({ uid: req.user.uid })
    .sort({ createdAt: -1 })
    .limit(60)
    .lean();
  res.json({ items: items.map(serializeDoc) });
}));

router.post("/calculator-history", asyncHandler(async (req, res) => {
  const expression = cleanText(req.body?.expression, 1000);
  const result = cleanText(req.body?.result, 2000);
  const mode = cleanText(req.body?.mode || "basic", 30);
  const type = cleanText(req.body?.type || "calculation", 30);
  if (!expression || !result) return res.status(400).json({ error: "Thiếu phép tính hoặc kết quả." });

  const newItem = await CalculatorHistory.create({
    uid: req.user.uid,
    expression,
    result,
    mode,
    type,
  });
  res.json({ item: serializeDoc(newItem.toObject()) });
}));

router.delete("/calculator-history/:id", asyncHandler(async (req, res) => {
  const item = await CalculatorHistory.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });
  if (item.uid.toString() !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

  await CalculatorHistory.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

router.delete("/calculator-history", asyncHandler(async (req, res) => {
  await CalculatorHistory.deleteMany({ uid: req.user.uid });
  res.json({ ok: true });
}));

router.post("/translate", asyncHandler(async (req, res) => {
  const text = cleanText(req.body?.text, 8000);
  const source = cleanText(req.body?.source || "auto", 20);
  const target = cleanText(req.body?.target || "en", 20);
  const save = req.body?.save !== false;
  if (!text) return res.status(400).json({ error: "Chưa có nội dung cần dịch." });

  try {
    const translatedText = await translateWithGoogle({ text, source, target });
    let item = null;
    if (save) {
      const newItem = await TranslationHistory.create({
        uid: req.user.uid,
        sourceText: text,
        translatedText,
        source,
        target,
      });
      item = serializeDoc(newItem.toObject());
    }
    res.json({ translatedText, item });
  } catch (error) {
    res.status(500).json({ error: error?.message || "Dịch thuật thất bại." });
  }
}));

router.get("/translation-history", asyncHandler(async (req, res) => {
  const items = await TranslationHistory.find({ uid: req.user.uid })
    .sort({ createdAt: -1 })
    .limit(80)
    .lean();
  res.json({ items: items.map(serializeDoc) });
}));

router.delete("/translation-history/:id", asyncHandler(async (req, res) => {
  const item = await TranslationHistory.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });
  if (item.uid.toString() !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

  await TranslationHistory.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

router.delete("/translation-history", asyncHandler(async (req, res) => {
  await TranslationHistory.deleteMany({ uid: req.user.uid });
  res.json({ ok: true });
}));

router.get("/study-methods", asyncHandler(async (req, res) => {
  const items = await StudyMethod.find({ uid: req.user.uid })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ items: items.map(serializeDoc) });
}));

router.post("/study-methods", asyncHandler(async (req, res) => {
  const name = cleanText(req.body?.name, 80) || "Phương pháp học mới";
  const studyMinutes = Math.max(1, Math.min(600, Number(req.body?.studyMinutes || 25)));
  const breakMinutes = Math.max(1, Math.min(180, Number(req.body?.breakMinutes || 5)));
  const breakCount = Math.max(0, Math.min(24, Number(req.body?.breakCount || 0)));

  const newItem = await StudyMethod.create({
    uid: req.user.uid,
    name,
    studyMinutes,
    breakMinutes,
    breakCount,
    isCustom: true,
  });
  res.json({ item: serializeDoc(newItem.toObject()) });
}));

router.put("/study-methods/:id", asyncHandler(async (req, res) => {
  const item = await StudyMethod.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });
  if (item.uid.toString() !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

  if (req.body?.name !== undefined) item.name = cleanText(req.body.name, 80) || "Phương pháp học";
  if (req.body?.studyMinutes !== undefined) item.studyMinutes = Math.max(1, Math.min(600, Number(req.body.studyMinutes)));
  if (req.body?.breakMinutes !== undefined) item.breakMinutes = Math.max(1, Math.min(180, Number(req.body.breakMinutes)));
  if (req.body?.breakCount !== undefined) item.breakCount = Math.max(0, Math.min(24, Number(req.body.breakCount)));

  await item.save();
  res.json({ item: serializeDoc(item.toObject()) });
}));

router.delete("/study-methods/:id", asyncHandler(async (req, res) => {
  const item = await StudyMethod.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });
  if (item.uid.toString() !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

  await StudyMethod.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default router;
