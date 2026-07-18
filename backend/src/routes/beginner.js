import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { getBeginnerProgress, completeGrammarTopic, seedBeginnerData, getBeginnerRanks, getBeginnerLesson } from "../controllers/beginnerController.js";

const router = express.Router();

// Allow public access to seed endpoint for one-time migration, or you can secure it.
// Actually, let's just make it public for now since it's a dev migration, or keep it inside verifyToken.
// Since verifyToken is used on router.use, we will put the seed route BEFORE verifyToken so it can be called easily from a script.
router.post("/seed", seedBeginnerData);

import jwt from "jsonwebtoken";

const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {}
  }
  next();
};

router.get("/ranks", optionalAuth, getBeginnerRanks);
router.get("/lesson/:lessonId", getBeginnerLesson);

router.use(verifyToken);

router.get("/progress", getBeginnerProgress);
router.post("/grammar/complete", completeGrammarTopic);

export default router;
