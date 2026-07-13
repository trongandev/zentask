import { Router } from "express";
import User from "../models/User.js";
import { DailyTask, UserDailyStat, LeaderboardWeekly, LeaderboardMonthly, UserFollow, FlashcardProgress, QuizResult, UserActivity } from "../models/Schemas.js";
import { SYSTEM_LEVELS } from "../config/system.js";
import { getWeekString, getMonthString } from "../../utils/dateUtils.js";
import { createNotification } from "../../utils/notifications.js";
import { checkAchievements } from "../../utils/achievements.js";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { cleanAndValidatePublicText } from "../../utils/moderation.js";

const router = Router();

// Use our new JWT verify token middleware
router.use(verifyToken);

const getLocalDateString = () => {
  return new Date().toISOString().split("T")[0];
};

// Helper: add XP and calculate level
export const addXpToUser = async (uid, xpToAdd, excludeFromLeaderboard = false) => {
  const user = await User.findById(uid);
  if (!user) throw new Error("User not found");

  let { xp = 0, level = 1 } = user;
  xp += xpToAdd;

  let newLevel = 1;
  for (let i = SYSTEM_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= SYSTEM_LEVELS[i].xp) {
      newLevel = SYSTEM_LEVELS[i].level;
      break;
    }
  }

  const levelUp = newLevel > level;
  user.xp = xp;
  user.level = newLevel;
  await user.save();

  if (!excludeFromLeaderboard) {
    // Update weekly and monthly leaderboards
    const weekString = getWeekString();
    const monthString = getMonthString();

    await LeaderboardWeekly.findOneAndUpdate({ uid, period: weekString }, { $inc: { xp: xpToAdd } }, { upsert: true, new: true });

    await LeaderboardMonthly.findOneAndUpdate({ uid, period: monthString }, { $inc: { xp: xpToAdd } }, { upsert: true, new: true });
  }

  return { xp, level: newLevel, levelUp };
};

// Helper: Increment daily task progress
export const incrementDailyTask = async (uid, taskId, amount = 1) => {
  let taskConfig = await DailyTask.findOne({ type: taskId }).lean();
  if (!taskConfig && /^[0-9a-fA-F]{24}$/.test(taskId)) {
    taskConfig = await DailyTask.findById(taskId).lean();
  }
  if (!taskConfig) return { success: false, reason: "Task not found" };

  const today = getLocalDateString();
  let statDoc = await UserDailyStat.findOne({ userId: uid, date: today });

  if (!statDoc) {
    statDoc = new UserDailyStat({
      userId: uid,
      date: today,
      studyMinutes: 0,
      isCheckedIn: false,
      tasks: {},
    });
  }

  const currentTasks = statDoc.tasks || new Map();
  const currentProgress = currentTasks.get(taskId) || 0;

  // Assuming taskConfig has a 'total' or 'requirement' field
  const totalRequired = taskConfig.total || taskConfig.requirement || 1;

  if (currentProgress >= totalRequired) {
    return { success: false, reason: "Task already maxed out", progress: currentProgress, xpResult: null };
  }

  const newProgress = Math.min(currentProgress + amount, totalRequired);
  const addedAmount = newProgress - currentProgress;
  const xpToAdd = addedAmount * (taskConfig.xpPerItem || 0);

  currentTasks.set(taskId, newProgress);
  statDoc.tasks = currentTasks;
  await statDoc.save();

  return {
    success: true,
    xpToAdd,
    progress: newProgress,
    taskId,
  };
};

// Check-in logic
router.post(
  "/checkin",
  asyncHandler(async (req, res) => {
    const uid = req.user.uid;
    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const today = getLocalDateString();
    let { streak = 0, lastCheckInDate = "", maxStreak = 0 } = user.toObject();

    if (lastCheckInDate === today) {
      return res.json({ status: "already_checked_in", streak, maxStreak });
    }

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayString = yesterday.toISOString().split("T")[0];

    if (lastCheckInDate === yesterdayString) {
      streak += 1;
    } else {
      streak = 1;
    }

    lastCheckInDate = today;
    if (streak > maxStreak) {
      maxStreak = streak;
    }

    const taskResult = await incrementDailyTask(uid, "daily_checkin", 1);
    let xpResult = null;
    if (taskResult.success && taskResult.xpToAdd > 0) {
      xpResult = await addXpToUser(uid, taskResult.xpToAdd);
    }

    user.streak = streak;
    user.maxStreak = maxStreak;
    // If your model has lastCheckInDate, otherwise save in a map or add it
    // Wait, User model doesn't have maxStreak and lastCheckInDate yet, we will rely on strict mode allowing it if added, or schema updates
    await user.updateOne({ streak, maxStreak, lastCheckInDate });

    await UserDailyStat.findOneAndUpdate({ userId: uid, date: today }, { $set: { isCheckedIn: true } }, { upsert: true });

    checkAchievements(uid, "CHECK_IN", {}, req.app);

    res.json({
      status: "success",
      streak,
      maxStreak,
      lastCheckInDate,
      xpResult,
      taskProgress: taskResult.success ? { daily_checkin: taskResult.progress } : {},
    });
  }),
);

// Record study time
router.post(
  "/study-time",
  asyncHandler(async (req, res) => {
    const { minutes } = req.body;
    if (!minutes || typeof minutes !== "number" || minutes <= 0) {
      return res.status(400).json({ error: "Invalid minutes" });
    }

    const uid = req.user.uid;
    const today = getLocalDateString();

    const stat = await UserDailyStat.findOneAndUpdate({ userId: uid, date: today }, { $inc: { studyMinutes: minutes } }, { upsert: true, new: true });

    if (stat.studyMinutes >= 30) {
      const taskResult = await incrementDailyTask(uid, "hard_working", 1);
      if (taskResult.success && taskResult.xpToAdd > 0) {
        await addXpToUser(uid, taskResult.xpToAdd);
        await UserActivity.create({
          uid,
          action: "Hoàn thành nhiệm vụ",
          target: "Con người của công việc",
          type: "other",
          xpEarned: taskResult.xpToAdd
        });
      }
    }

    checkAchievements(uid, "STUDY_TIME", { todayMinutes: stat.studyMinutes }, req.app);

    res.json({ status: "success" });
  }),
);

// Get study stats for a specific month
router.get(
  "/calendar-stats",
  asyncHandler(async (req, res) => {
    const { year, month } = req.query; // 1-12
    if (!year || !month) return res.status(400).json({ error: "Missing year or month" });

    const y = parseInt(year);
    const m = parseInt(month);
    
    // Create start and end date strings for the month (YYYY-MM-DD)
    const startDate = new Date(Date.UTC(y, m - 1, 1)).toISOString().split("T")[0];
    const endDate = new Date(Date.UTC(y, m, 0)).toISOString().split("T")[0];

    const stats = await UserDailyStat.find({
      userId: req.user.uid,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    const statsMap = {};
    stats.forEach((doc) => {
      statsMap[doc.date] = {
        minutes: doc.studyMinutes || 0,
        isCheckedIn: doc.isCheckedIn || false,
      };
    });

    res.json(statsMap);
  }),
);

// Get study stats for last 7 days
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setUTCDate(today.getUTCDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    const stats = await UserDailyStat.find({
      userId: req.user.uid,
      date: { $gte: last7Days[0], $lte: last7Days[6] },
    }).lean();

    const statsMap = {};
    stats.forEach((doc) => {
      statsMap[doc.date] = {
        minutes: doc.studyMinutes || 0,
        isCheckedIn: doc.isCheckedIn || false,
      };
    });

    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const formattedStats = last7Days.map((dateStr) => {
      const d = new Date(dateStr);
      return {
        date: dateStr,
        name: dayNames[d.getDay()],
        minutes: statsMap[dateStr]?.minutes || 0,
        isCheckedIn: statsMap[dateStr]?.isCheckedIn || false,
      };
    });

    res.json(formattedStats);
  }),
);

// Gain XP endpoint
router.post(
  "/gain-xp",
  asyncHandler(async (req, res) => {
    const { amount, reason } = req.body;
    if (typeof amount !== "number") {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const { xp, level, levelUp } = await addXpToUser(req.user.uid, amount);
    res.json({ status: "success", xp, level, levelUp });
  }),
);

// Update user profile
router.put(
  "/profile",
  asyncHandler(async (req, res) => {
    const { displayName, photoURL, bio, username } = req.body;

    const updates = {};
    if (displayName !== undefined) updates.displayName = await cleanAndValidatePublicText(displayName, "Tên người dùng", { maxLength: 60 });
    if (photoURL !== undefined)
      updates.photoURL = String(photoURL || "")
        .trim()
        .slice(0, 1000);
    if (bio !== undefined) updates.bio = await cleanAndValidatePublicText(bio, "Tiểu sử", { maxLength: 500 });
    if (username !== undefined) updates.username = await cleanAndValidatePublicText(username, "Username", { maxLength: 40 });

    const user = await User.findByIdAndUpdate(req.user.uid, updates, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ status: "success", user: updates });
  }),
);

// Update app appearance/settings
router.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const { appSettings } = req.body || {};
    const allowedThemes = ["light", "dark", "system"];
    const allowedAccentColors = ["blue", "purple", "green", "orange", "pink", "slate"];

    const user = await User.findById(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const currentSettings = user.appSettings || {};
    const nextSettings = {
      ...currentSettings,
      ...(appSettings || {}),
    };

    nextSettings.theme = allowedThemes.includes(nextSettings.theme) ? nextSettings.theme : "light";
    nextSettings.accentColor = allowedAccentColors.includes(nextSettings.accentColor) ? nextSettings.accentColor : "blue";

    user.appSettings = nextSettings;
    await user.save();

    res.json({ status: "success", appSettings: nextSettings });
  }),
);

// First-login onboarding status. Saved in MongoDB so it follows the user's account across devices.
router.get(
  "/onboarding",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.uid).select("onboarding").lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const onboarding = user.onboarding || {};
    res.json({
      status: "success",
      onboarding: {
        completed: Boolean(onboarding.completed),
        completedAt: onboarding.completedAt || null,
        skipped: Boolean(onboarding.skipped),
        skippedAt: onboarding.skippedAt || null,
        lastStep: Number(onboarding.lastStep || 0),
        version: onboarding.version || "zentask-onboarding-v1",
      },
    });
  }),
);

// Save progress, skip, or completion for the first-login guide.
router.put(
  "/onboarding",
  asyncHandler(async (req, res) => {
    const { completed, skipped, lastStep } = req.body || {};
    const now = new Date();
    const updates = {
      "onboarding.version": "zentask-onboarding-v1",
    };

    if (typeof lastStep === "number" && Number.isFinite(lastStep)) {
      updates["onboarding.lastStep"] = Math.max(0, Math.min(99, Math.floor(lastStep)));
    }

    if (completed === true) {
      updates["onboarding.completed"] = true;
      updates["onboarding.completedAt"] = now;
      updates["onboarding.skipped"] = false;
    }

    if (skipped === true) {
      updates["onboarding.skipped"] = true;
      updates["onboarding.skippedAt"] = now;
      // Skipping also hides the first-login popup, but keeps a clear skipped audit field.
      updates["onboarding.completed"] = true;
      updates["onboarding.completedAt"] = now;
    }

    const user = await User.findByIdAndUpdate(req.user.uid, { $set: updates }, { new: true }).select("onboarding");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ status: "success", onboarding: user.onboarding });
  }),
);

// Optional helper for QA/support: show the guide again on the same account.
router.post(
  "/onboarding/reset",
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.user.uid,
      {
        $set: {
          "onboarding.completed": false,
          "onboarding.completedAt": null,
          "onboarding.skipped": false,
          "onboarding.skippedAt": null,
          "onboarding.lastStep": 0,
          "onboarding.version": "zentask-onboarding-v1",
        },
      },
      { new: true },
    ).select("onboarding");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ status: "success", onboarding: user.onboarding });
  }),
);

// Get user profile by UID
router.get(
  "/profile/:uid",
  asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const user = await User.findById(uid).lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const [flashcardsCount, quizzesCount, studyStats, activities] = await Promise.all([
      FlashcardProgress.countDocuments({ userId: uid }),
      QuizResult.countDocuments({ uid: uid }),
      UserDailyStat.aggregate([
        { $match: { userId: user._id } },
        { $group: { _id: null, totalMinutes: { $sum: "$studyMinutes" } } }
      ]),
      UserActivity.find({ uid: uid }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    const totalStudyHours = studyStats.length > 0 ? Math.round(studyStats[0].totalMinutes / 60) : 0;

    res.json({
      uid: user._id,
      name: user.displayName || "Người dùng",
      username: user.username || "@" + (user.email ? user.email.split("@")[0] : "user"),
      avatar: user.photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg",
      cover: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1200&auto=format&fit=crop",
      bio: user.bio || "Chưa có thông tin",
      level: user.level || 1,
      xp: user.xp || 0,
      streak: user.streak || 0,
      rankId: user.rankId || 1,
      tier: user.tier || 3,
      stars: user.stars || 0,
      achievedBadges: user.achievedBadges || [],
      followers: user.followers || 0,
      following: user.following || 0,
      joined: user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "Gần đây",
      stats: {
        flashcardsLearned: flashcardsCount,
        quizzesCompleted: quizzesCount,
        studyHours: totalStudyHours
      },
      recentActivities: activities.map(a => ({
        id: a._id,
        action: a.action,
        target: a.target,
        type: a.type,
        time: a.createdAt ? a.createdAt.toISOString() : new Date().toISOString(),
        xpEarned: a.xpEarned
      }))
    });
  }),
);

// Get daily task progress
router.get(
  "/daily-tasks/progress",
  asyncHandler(async (req, res) => {
    const today = getLocalDateString();
    const stat = await UserDailyStat.findOne({ userId: req.user.uid, date: today }).lean();

    if (!stat) {
      return res.json({});
    }

    res.json(stat.tasks || {});
  }),
);

// Get learned beginner words
router.get(
  "/beginner-progress",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.uid).lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ learnedWords: user.learnedBeginnerWords || [] });
  }),
);

// Mark word as learned
router.post(
  "/beginner-progress",
  asyncHandler(async (req, res) => {
    const { wordId, wordIds } = req.body;
    if (!wordId && (!wordIds || !Array.isArray(wordIds) || wordIds.length === 0)) {
      return res.status(400).json({ error: "wordId or valid wordIds array is required" });
    }

    const updates = wordIds ? wordIds : [wordId];

    const user = await User.findById(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const currentLearned = user.learnedBeginnerWords || [];
    let newWordsCount = 0;

    for (const word of updates) {
      if (!currentLearned.includes(word)) {
        newWordsCount++;
        currentLearned.push(word);
      }
    }

    let xpResult = null;
    if (newWordsCount > 0) {
      user.learnedBeginnerWords = currentLearned;
      await user.save();

      const xpToAdd = newWordsCount * 1; // 1 XP per word
      xpResult = await addXpToUser(req.user.uid, xpToAdd);
    }

    res.json({ status: "success", xpResult, newWordsAdded: newWordsCount });
  }),
);

// Complete beginner topic
router.post(
  "/beginner-topic-complete",
  asyncHandler(async (req, res) => {
    const { topicId } = req.body;
    if (!topicId || typeof topicId !== "string") {
      return res.status(400).json({ error: "topicId is required" });
    }

    const xpToAdd = 20;
    const user = await User.findById(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const completedTopics = user.completedBeginnerTopics || [];
    if (completedTopics.includes(topicId)) {
      return res.json({
        status: "success",
        alreadyAwarded: true,
        awardedXp: 0,
        xp: user.xp || 0,
        level: user.level || 1,
        levelUp: false,
      });
    }

    // Update logic
    user.completedBeginnerTopics = [...completedTopics, topicId];
    await user.save();

    const { xp, level, levelUp } = await addXpToUser(req.user.uid, xpToAdd);

    res.json({
      status: "success",
      alreadyAwarded: false,
      awardedXp: xpToAdd,
      xp,
      level,
      levelUp,
    });
  }),
);

// Follow / Unfollow User
router.post(
  "/follow/:uid",
  asyncHandler(async (req, res) => {
    const { uid: targetUid } = req.params;
    const currentUid = req.user.uid;

    if (currentUid === targetUid) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const existingFollow = await UserFollow.findOne({ followerId: currentUid, followingId: targetUid });
    let isFollowing = false;

    if (existingFollow) {
      // Unfollow
      await UserFollow.findByIdAndDelete(existingFollow._id);
      await User.findByIdAndUpdate(currentUid, { $inc: { following: -1 } });
      await User.findByIdAndUpdate(targetUid, { $inc: { followers: -1 } });
    } else {
      // Follow
      await UserFollow.create({ followerId: currentUid, followingId: targetUid });
      await User.findByIdAndUpdate(currentUid, { $inc: { following: 1 } });
      await User.findByIdAndUpdate(targetUid, { $inc: { followers: 1 } });
      isFollowing = true;
    }

    if (isFollowing) {
      const currentUser = await User.findById(currentUid).lean();
      const name = currentUser?.displayName || "Một người dùng";
      await createNotification(req.app, targetUid, "follow", "Có người theo dõi mới", `${name} đã bắt đầu theo dõi bạn.`, currentUid);
    }

    res.json({ status: "success", isFollowing });
  }),
);

// Check if following
router.get(
  "/follow/:uid",
  asyncHandler(async (req, res) => {
    const { uid: targetUid } = req.params;
    const follow = await UserFollow.findOne({ followerId: req.user.uid, followingId: targetUid });
    res.json({ isFollowing: !!follow });
  }),
);

export default router;
