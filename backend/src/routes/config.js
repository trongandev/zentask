import { Router } from "express";
import { SYSTEM_LEVELS } from "../config/system.js";
import { db } from "../firebase.js";

const router = Router();

// Get system levels configuration
router.get("/levels", (req, res) => {
  res.json(SYSTEM_LEVELS);
});

// Get daily tasks configuration
router.get("/daily-tasks", async (req, res) => {
  try {
    const snapshot = await db.collection("daily_tasks").orderBy("createdAt", "asc").get();
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching daily tasks:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
