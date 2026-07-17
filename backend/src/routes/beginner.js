import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { getBeginnerProgress, completeGrammarTopic } from "../controllers/beginnerController.js";

const router = express.Router();

router.use(verifyToken);

router.get("/progress", getBeginnerProgress);
router.post("/grammar/complete", completeGrammarTopic);

export default router;
