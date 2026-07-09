import express from "express";
import { ArenaMatchmakingStat } from "../models/Schemas.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();
router.use(verifyToken);

router.post("/stats/matchmaking", asyncHandler(async (req, res) => {
  const { uid, durationMs, rankId, tier } = req.body;
  if (!uid) return res.status(400).json({ error: "Missing uid" });

  await ArenaMatchmakingStat.create({
    uid: req.user.uid, // use authenticated user's id instead of from body
    durationMs,
    rankId: rankId || 1,
    tier: tier || 1,
  });

  res.json({ success: true });
}));

export default router;
