import { Router } from "express";
import { SYSTEM_LEVELS, DAILY_TASKS } from "../config/system.js";

const router = Router();

// Get system levels configuration
router.get("/levels", (req, res) => {
  res.json(SYSTEM_LEVELS);
});

// Get daily tasks configuration
router.get("/daily-tasks", (req, res) => {
  res.json(DAILY_TASKS);
});

export default router;
