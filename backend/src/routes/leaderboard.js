import { Router } from "express";
import User from "../models/User.js";
import { LeaderboardWeekly, LeaderboardMonthly, UserReward } from "../models/Schemas.js";
import { getWeekString, getMonthString, getLastWeekString, getLastMonthString } from "../../utils/dateUtils.js";
import { addXpToUser } from "./user.js";
import { checkAchievements } from "../../utils/achievements.js";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// Middleware to authenticate for rewards (leaderboard GET is public but we extract user if possible)
const optionalAuth = (req, res, next) => {
  const token = req.cookies.session;
  if (!token) {
    req.user = null;
    return next();
  }
  // Try to verify token manually without throwing error if invalid
  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded;
  } catch (error) {
    req.user = null;
  }
  next();
};

router.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const type = req.query.type || "all";
    let docs = [];

    if (type === "week") {
      const weekString = getWeekString();
      docs = await LeaderboardWeekly.find({ period: weekString }).sort({ xp: -1 }).limit(100).populate("uid", "displayName username email photoURL level rankId tier").lean();
    } else if (type === "month") {
      const monthString = getMonthString();
      docs = await LeaderboardMonthly.find({ period: monthString }).sort({ xp: -1 }).limit(100).populate("uid", "displayName username email photoURL level rankId tier").lean();
    } else {
      docs = await User.find().sort({ xp: -1 }).limit(100).lean();
    }

    const leaderboard = [];
    let currentRank = 1;

    docs.forEach((doc) => {
      let userData = type === "all" ? doc : doc.uid;
      if (!userData) return; // Ignore if user was deleted but leaderboard entry remains

      leaderboard.push({
        id: userData._id,
        rank: currentRank++,
        name: userData.displayName || "Học viên",
        username: userData.username || "@" + (userData.email ? userData.email.split("@")[0] : "user"),
        level: userData.level || 1,
        xp: type === "all" ? doc.xp : doc.xp,
        avatar: userData.photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg",
        rankId: userData.rankId || 1,
        tier: userData.tier || 3,
        trend: "same",
      });
    });

    // Trigger LEADERBOARD achievements for the current user if they are in top 3
    if (type === "week" && req.user) {
      const userEntry = leaderboard.find((entry) => entry.id.toString() === req.user.uid);
      if (userEntry && userEntry.rank <= 3) {
        checkAchievements(req.user.uid, "LEADERBOARD", { rank: userEntry.rank }, req.app);
      }
    }

    res.json(leaderboard);
  }),
);

router.use(verifyToken);

router.get(
  "/rewards",
  asyncHandler(async (req, res) => {
    const lastWeek = getLastWeekString();
    const lastMonth = getLastMonthString();
    const rewards = [];

    // Check last week
    const lwDoc = await LeaderboardWeekly.findOne({ period: lastWeek, uid: req.user.uid }).lean();
    if (lwDoc && lwDoc.xp > 0) {
      const claimDoc = await UserReward.findOne({ type: "week", period: lastWeek, uid: req.user.uid }).lean();
      if (!claimDoc) {
        rewards.push({ type: "week", period: lastWeek, xp: 200 });
      }
    }

    // Check last month
    const lmDoc = await LeaderboardMonthly.findOne({ period: lastMonth, uid: req.user.uid }).lean();
    if (lmDoc && lmDoc.xp > 0) {
      const claimDoc = await UserReward.findOne({ type: "month", period: lastMonth, uid: req.user.uid }).lean();
      if (!claimDoc) {
        rewards.push({ type: "month", period: lastMonth, xp: 1000 });
      }
    }

    res.json(rewards);
  }),
);

router.post(
  "/claim",
  asyncHandler(async (req, res) => {
    const { type, period } = req.body;
    if (!type || !period) return res.status(400).json({ error: "Missing parameters" });

    if (type === "week" && period !== getLastWeekString()) return res.status(400).json({ error: "Invalid week period" });
    if (type === "month" && period !== getLastMonthString()) return res.status(400).json({ error: "Invalid month period" });

    const xpReward = type === "week" ? 200 : 1000;

    // Since we want atomic operation, we can use findOneAndUpdate with upsert
    // Wait, if it exists we shouldn't claim again.
    const claimDoc = await UserReward.findOne({ uid: req.user.uid, type, period });
    if (claimDoc) {
      return res.status(400).json({ error: "Already claimed" });
    }

    // Verify participation
    let participation;
    if (type === "week") {
      participation = await LeaderboardWeekly.findOne({ period, uid: req.user.uid });
    } else {
      participation = await LeaderboardMonthly.findOne({ period, uid: req.user.uid });
    }

    if (!participation || participation.xp <= 0) {
      return res.status(400).json({ error: "Not eligible" });
    }

    // Claim
    await UserReward.create({
      uid: req.user.uid,
      type,
      period,
      xpReward,
    });

    const { xp, level, levelUp } = await addXpToUser(req.user.uid, xpReward);
    res.json({ success: true, xp, level, levelUp });
  }),
);

export default router;
