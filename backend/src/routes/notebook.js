import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { auth, db } from "../firebase.js";

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

const notebooksCollection = () => db.collection("notebooks");

function normalizeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function serializeNotebook(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    title: data.title || "Untitled notebook",
    description: data.description || "",
    coverColor: data.coverColor || "#2563eb",
    activePageId: data.activePageId || data.pages?.[0]?.id || "page-1",
    pages: Array.isArray(data.pages) ? data.pages : [],
    settings: data.settings || {},
    ownerId: data.ownerId,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

function sanitizePage(page, index = 0) {
  const pageId = typeof page?.id === "string" && page.id.trim() ? page.id.trim() : `page-${Date.now()}-${index}`;

  return {
    id: pageId,
    title: typeof page?.title === "string" && page.title.trim() ? page.title.trim().slice(0, 120) : `Trang ${index + 1}`,
    background: ["plain", "grid", "dots", "line"].includes(page?.background) ? page.background : "grid",
    strokes: Array.isArray(page?.strokes) ? page.strokes.slice(0, 4000) : [],
    items: Array.isArray(page?.items) ? page.items.slice(0, 700) : [],
  };
}

function sanitizeNotebookPayload(body) {
  const rawPages = Array.isArray(body?.pages) && body.pages.length ? body.pages : [];
  const pages = rawPages.length ? rawPages.map(sanitizePage) : [sanitizePage({ id: "page-1", title: "Trang 1", background: "grid" }, 0)];
  const activePageId = typeof body?.activePageId === "string" && pages.some((page) => page.id === body.activePageId) ? body.activePageId : pages[0].id;

  return {
    title: typeof body?.title === "string" && body.title.trim() ? body.title.trim().slice(0, 160) : "Sổ tay mới",
    description: typeof body?.description === "string" ? body.description.trim().slice(0, 500) : "",
    coverColor: typeof body?.coverColor === "string" ? body.coverColor.slice(0, 32) : "#2563eb",
    activePageId,
    pages,
    settings: typeof body?.settings === "object" && body.settings ? body.settings : {},
  };
}

async function getOwnedNotebook(uid, id) {
  const ref = notebooksCollection().doc(id);
  const doc = await ref.get();
  if (!doc.exists) return { ref, doc: null, data: null };

  const data = doc.data();
  if (data.ownerId !== uid) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }

  return { ref, doc, data };
}

router.get("/", async (req, res) => {
  try {
    const snapshot = await notebooksCollection()
      .where("ownerId", "==", req.uid)
      .orderBy("updatedAt", "desc")
      .limit(40)
      .get();

    res.json(snapshot.docs.map(serializeNotebook));
  } catch (error) {
    // Firestore may require an index during local/dev. Fallback keeps feature usable.
    if (String(error?.message || "").toLowerCase().includes("index")) {
      const snapshot = await notebooksCollection().where("ownerId", "==", req.uid).limit(40).get();
      const notebooks = snapshot.docs
        .map(serializeNotebook)
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      return res.json(notebooks);
    }
    console.error("List notebooks failed", error);
    res.status(500).json({ error: "Không tải được danh sách notebook." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { doc } = await getOwnedNotebook(req.uid, req.params.id);
    if (!doc) return res.status(404).json({ error: "Không tìm thấy notebook." });
    res.json(serializeNotebook(doc));
  } catch (error) {
    console.error("Get notebook failed", error);
    res.status(error.status || 500).json({ error: error.status === 403 ? "Bạn không có quyền truy cập notebook này." : "Không tải được notebook." });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = sanitizeNotebookPayload(req.body || {});
    const ref = notebooksCollection().doc();

    await ref.set({
      ...payload,
      ownerId: req.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const saved = await ref.get();
    res.status(201).json(serializeNotebook(saved));
  } catch (error) {
    console.error("Create notebook failed", error);
    res.status(500).json({ error: "Không tạo được notebook." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { ref, doc } = await getOwnedNotebook(req.uid, req.params.id);
    if (!doc) return res.status(404).json({ error: "Không tìm thấy notebook." });

    const payload = sanitizeNotebookPayload(req.body || {});
    await ref.set(
      {
        ...payload,
        ownerId: req.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const saved = await ref.get();
    res.json(serializeNotebook(saved));
  } catch (error) {
    console.error("Update notebook failed", error);
    res.status(error.status || 500).json({ error: error.status === 403 ? "Bạn không có quyền sửa notebook này." : "Không lưu được notebook." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { ref, doc } = await getOwnedNotebook(req.uid, req.params.id);
    if (!doc) return res.status(404).json({ error: "Không tìm thấy notebook." });

    await ref.delete();
    res.json({ ok: true });
  } catch (error) {
    console.error("Delete notebook failed", error);
    res.status(error.status || 500).json({ error: error.status === 403 ? "Bạn không có quyền xóa notebook này." : "Không xóa được notebook." });
  }
});

export default router;
