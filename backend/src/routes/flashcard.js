import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import FlashcardService from "../services/flashcard.service.js";

const router = Router();

router.get(
  "/builtin",
  asyncHandler(async (req, res) => res.json(FlashcardService.getBuiltinSets())),
);
router.get(
  "/builtin/:setId/cards",
  asyncHandler(async (req, res) => res.json(FlashcardService.getBuiltinSetCards(req.params.setId))),
);
router.post(
  "/builtin/:setId/clone",
  asyncHandler(async (req, res) => res.json(await FlashcardService.cloneBuiltinSet(req.user.uid, req.params.setId))),
);

router.get(
  "/public",
  asyncHandler(async (req, res) => res.json(await FlashcardService.getPublicSets())),
);

router.use(verifyToken);

router.get(
  "/due",
  asyncHandler(async (req, res) => res.json(await FlashcardService.getDueCards(req.user.uid))),
);

router.get(
  "/folders",
  asyncHandler(async (req, res) => res.json(await FlashcardService.getFolders(req.user.uid))),
);
router.post(
  "/folder",
  asyncHandler(async (req, res) => res.json(await FlashcardService.createFolder(req.user.uid, req.body))),
);
router.patch(
  "/folder/:folderId",
  asyncHandler(async (req, res) => res.json(await FlashcardService.updateFolder(req.user.uid, req.params.folderId, req.body))),
);
router.delete(
  "/folder/:folderId",
  asyncHandler(async (req, res) => res.json(await FlashcardService.deleteFolder(req.user.uid, req.params.folderId, req.query.deleteSets))),
);

router.get(
  "/categories",
  asyncHandler(async (req, res) => res.json(await FlashcardService.getCategories(req.user.uid))),
);
router.post(
  "/category",
  asyncHandler(async (req, res) => res.json(await FlashcardService.createCategory(req.user.uid, req.body))),
);
router.patch(
  "/category/:categoryId",
  asyncHandler(async (req, res) => res.json(await FlashcardService.updateCategory(req.user.uid, req.params.categoryId, req.body))),
);
router.delete(
  "/category/:categoryId",
  asyncHandler(async (req, res) => res.json(await FlashcardService.deleteCategory(req.user.uid, req.params.categoryId))),
);

router.get(
  "/list",
  asyncHandler(async (req, res) => res.json(await FlashcardService.getUserSets(req.user.uid))),
);

router.post(
  "/set",
  asyncHandler(async (req, res) => res.json(await FlashcardService.createSet(req.user.uid, req.body))),
);
router.patch(
  "/set/:setId",
  asyncHandler(async (req, res) => res.json(await FlashcardService.updateSet(req.user.uid, req.params.setId, req.body))),
);
router.get(
  "/set/:setId/cards",
  asyncHandler(async (req, res) => res.json(await FlashcardService.getSetDetails(req.user.uid, req.params.setId))),
);
router.post(
  "/set/:setId/card",
  asyncHandler(async (req, res) => res.json(await FlashcardService.createCard(req.user.uid, req.params.setId, req.body))),
);
router.delete(
  "/set/:setId",
  asyncHandler(async (req, res) => res.json(await FlashcardService.deleteSet(req.user.uid, req.params.setId))),
);
router.delete(
  "/card/:cardId",
  asyncHandler(async (req, res) => res.json(await FlashcardService.deleteCard(req.user.uid, req.params.cardId))),
);

router.post(
  "/generate-ai",
  asyncHandler(async (req, res) => res.json(await FlashcardService.generateAiFlashcards(req.user.uid, req.body))),
);

router.post(
  "/set/:setId/clone",
  asyncHandler(async (req, res) => res.json(await FlashcardService.clonePublicSet(req.user.uid, req.params.setId))),
);
router.patch(
  "/set/:setId/privacy",
  asyncHandler(async (req, res) => res.json(await FlashcardService.updateSetPrivacy(req.user.uid, req.params.setId, req.body.isPublic))),
);

router.post(
  "/progress/batch",
  asyncHandler(async (req, res) => res.json(await FlashcardService.batchUpdateProgress(req.user.uid, req.body.updates, req.app))),
);

router.get(
  "/set/:setId/progress",
  asyncHandler(async (req, res) => res.json(await FlashcardService.getProgressSet(req.user.uid, req.params.setId))),
);

export default router;
