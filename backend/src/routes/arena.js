import express from "express";
import { db } from "../firebase.js";

const router = express.Router();

router.post("/stats/matchmaking", async (req, res) => {
  try {
    const { uid, durationMs, rankId, tier } = req.body;
    if (!uid) return res.status(400).json({ error: "Missing uid" });

    await db.collection("arena_matchmaking_stats").add({
      uid,
      durationMs,
      rankId: rankId || 1,
      tier: tier || 1,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Lỗi lưu stats matchmaking:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
