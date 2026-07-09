import { Router } from "express";
import { Notebook } from "../models/Schemas.js";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(verifyToken);

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

function serializeNotebook(doc) {
  return {
    id: doc._id,
    title: doc.title,
    description: doc.description,
    coverColor: doc.coverColor,
    activePageId: doc.activePageId,
    pages: doc.pages,
    settings: doc.settings,
    ownerId: doc.ownerId,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

router.get("/", asyncHandler(async (req, res) => {
  const notebooks = await Notebook.find({ ownerId: req.user.uid })
    .sort({ updatedAt: -1 })
    .limit(40)
    .lean();

  res.json(notebooks.map(serializeNotebook));
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const notebook = await Notebook.findById(req.params.id).lean();
  
  if (!notebook) return res.status(404).json({ error: "Không tìm thấy notebook." });
  if (notebook.ownerId.toString() !== req.user.uid) {
    return res.status(403).json({ error: "Bạn không có quyền truy cập notebook này." });
  }

  res.json(serializeNotebook(notebook));
}));

router.post("/", asyncHandler(async (req, res) => {
  const payload = sanitizeNotebookPayload(req.body || {});
  
  const newNotebook = await Notebook.create({
    ...payload,
    ownerId: req.user.uid,
  });

  res.status(201).json(serializeNotebook(newNotebook.toObject()));
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const notebook = await Notebook.findById(req.params.id);
  
  if (!notebook) return res.status(404).json({ error: "Không tìm thấy notebook." });
  if (notebook.ownerId.toString() !== req.user.uid) {
    return res.status(403).json({ error: "Bạn không có quyền sửa notebook này." });
  }

  const payload = sanitizeNotebookPayload(req.body || {});
  
  Object.assign(notebook, payload);
  await notebook.save();

  res.json(serializeNotebook(notebook.toObject()));
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const notebook = await Notebook.findById(req.params.id);
  
  if (!notebook) return res.status(404).json({ error: "Không tìm thấy notebook." });
  if (notebook.ownerId.toString() !== req.user.uid) {
    return res.status(403).json({ error: "Bạn không có quyền xóa notebook này." });
  }

  await Notebook.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default router;
