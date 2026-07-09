import { Router } from "express";
import { auth, db } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";

const router = Router();

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

const userRef = (uid) => db.collection("users").doc(uid);
const calcRef = (uid) => userRef(uid).collection("calculatorHistory");
const transRef = (uid) => userRef(uid).collection("translationHistory");
const methodsRef = (uid) => userRef(uid).collection("studyMethods");

function cleanText(value, max = 5000) {
  return String(value || "").trim().slice(0, max);
}

function serializeDoc(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || null,
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

router.get("/calculator-history", async (req, res) => {
  const snap = await calcRef(req.uid).orderBy("createdAt", "desc").limit(60).get();
  res.json({ items: snap.docs.map(serializeDoc) });
});

router.post("/calculator-history", async (req, res) => {
  const expression = cleanText(req.body?.expression, 1000);
  const result = cleanText(req.body?.result, 2000);
  const mode = cleanText(req.body?.mode || "basic", 30);
  const type = cleanText(req.body?.type || "calculation", 30);
  if (!expression || !result) return res.status(400).json({ error: "Thiếu phép tính hoặc kết quả." });

  const docRef = await calcRef(req.uid).add({
    expression,
    result,
    mode,
    type,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const doc = await docRef.get();
  res.json({ item: serializeDoc(doc) });
});

router.delete("/calculator-history/:id", async (req, res) => {
  await calcRef(req.uid).doc(req.params.id).delete();
  res.json({ ok: true });
});

router.delete("/calculator-history", async (req, res) => {
  const snap = await calcRef(req.uid).limit(200).get();
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  res.json({ ok: true });
});

router.post("/translate", async (req, res) => {
  const text = cleanText(req.body?.text, 8000);
  const source = cleanText(req.body?.source || "auto", 20);
  const target = cleanText(req.body?.target || "en", 20);
  const save = req.body?.save !== false;
  if (!text) return res.status(400).json({ error: "Chưa có nội dung cần dịch." });

  try {
    const translatedText = await translateWithGoogle({ text, source, target });
    let item = null;
    if (save) {
      const docRef = await transRef(req.uid).add({
        sourceText: text,
        translatedText,
        source,
        target,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      item = serializeDoc(await docRef.get());
    }
    res.json({ translatedText, item });
  } catch (error) {
    res.status(500).json({ error: error?.message || "Dịch thuật thất bại." });
  }
});

router.get("/translation-history", async (req, res) => {
  const snap = await transRef(req.uid).orderBy("createdAt", "desc").limit(80).get();
  res.json({ items: snap.docs.map(serializeDoc) });
});

router.delete("/translation-history/:id", async (req, res) => {
  await transRef(req.uid).doc(req.params.id).delete();
  res.json({ ok: true });
});

router.delete("/translation-history", async (req, res) => {
  const snap = await transRef(req.uid).limit(200).get();
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  res.json({ ok: true });
});

router.get("/study-methods", async (req, res) => {
  const snap = await methodsRef(req.uid).orderBy("createdAt", "desc").limit(50).get();
  res.json({ items: snap.docs.map(serializeDoc) });
});

router.post("/study-methods", async (req, res) => {
  const name = cleanText(req.body?.name, 80) || "Phương pháp học mới";
  const studyMinutes = Math.max(1, Math.min(600, Number(req.body?.studyMinutes || 25)));
  const breakMinutes = Math.max(1, Math.min(180, Number(req.body?.breakMinutes || 5)));
  const breakCount = Math.max(0, Math.min(24, Number(req.body?.breakCount || 0)));

  const docRef = await methodsRef(req.uid).add({
    name,
    studyMinutes,
    breakMinutes,
    breakCount,
    isCustom: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  res.json({ item: serializeDoc(await docRef.get()) });
});

router.put("/study-methods/:id", async (req, res) => {
  const payload = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (req.body?.name !== undefined) payload.name = cleanText(req.body.name, 80) || "Phương pháp học";
  if (req.body?.studyMinutes !== undefined) payload.studyMinutes = Math.max(1, Math.min(600, Number(req.body.studyMinutes)));
  if (req.body?.breakMinutes !== undefined) payload.breakMinutes = Math.max(1, Math.min(180, Number(req.body.breakMinutes)));
  if (req.body?.breakCount !== undefined) payload.breakCount = Math.max(0, Math.min(24, Number(req.body.breakCount)));

  await methodsRef(req.uid).doc(req.params.id).set(payload, { merge: true });
  res.json({ item: serializeDoc(await methodsRef(req.uid).doc(req.params.id).get()) });
});

router.delete("/study-methods/:id", async (req, res) => {
  await methodsRef(req.uid).doc(req.params.id).delete();
  res.json({ ok: true });
});

export default router;
