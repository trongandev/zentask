import { Router } from "express";
import { auth, db } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { SYSTEM_LEVELS } from "../config/system.js";
import { getWeekString, getMonthString } from "../utils/dateUtils.js";
import { createNotification } from "../utils/notifications.js";
import { checkAchievements } from "../utils/achievements.js";

const router = Router();

// Middleware to authenticate
const authenticate = async (req, res, next) => {
  const sessionCookie = req.cookies.session || "";
  if (!sessionCookie) return res.status(401).json({ error: "Unauthenticated" });
  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    req.uid = decodedClaims.uid;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthenticated" });
  }
};

router.use(authenticate);

const getLocalDateString = () => {
  // Return UTC date string, which rolls over at 00:00 UTC (exactly 7:00 AM GMT+7)
  return new Date().toISOString().split("T")[0];
};

// Helper: add XP and calculate level
export const addXpToUser = async (uid, xpToAdd) => {
  const userRef = db.collection("users").doc(uid);
  return await db.runTransaction(async (t) => {
    const doc = await t.get(userRef);
    if (!doc.exists) throw new Error("User not found");

    let { xp = 0, level = 1 } = doc.data();
    xp += xpToAdd;

    let newLevel = 1;
    // Find the max level where xp >= required XP
    for (let i = SYSTEM_LEVELS.length - 1; i >= 0; i--) {
      if (xp >= SYSTEM_LEVELS[i].xp) {
        newLevel = SYSTEM_LEVELS[i].level;
        break;
      }
    }

    const levelUp = newLevel > level;

    t.update(userRef, { xp, level: newLevel });

    // Update weekly and monthly leaderboards
    const weekString = getWeekString();
    const monthString = getMonthString();

    const weeklyRef = db.collection("leaderboard_weekly").doc(`${weekString}_${uid}`);
    const monthlyRef = db.collection("leaderboard_monthly").doc(`${monthString}_${uid}`);

    t.set(
      weeklyRef,
      {
        uid,
        period: weekString,
        xp: FieldValue.increment(xpToAdd),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    t.set(
      monthlyRef,
      {
        uid,
        period: monthString,
        xp: FieldValue.increment(xpToAdd),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { xp, level: newLevel, levelUp };
  });
};

// Helper: Increment daily task progress
export const incrementDailyTask = async (uid, taskId, amount = 1) => {
  // Fetch taskConfig from Firestore
  const taskQuery = await db.collection("daily_tasks").where("id", "==", taskId).limit(1).get();
  if (taskQuery.empty) return { success: false, reason: "Task not found" };
  const taskConfig = taskQuery.docs[0].data();

  const today = getLocalDateString();
  const statsQuery = await db.collection("user_daily_stats").where("userId", "==", uid).where("date", "==", today).limit(1).get();

  return await db.runTransaction(async (t) => {
    let statRef;
    let currentTasks = {};
    let isNew = false;

    if (statsQuery.empty) {
      statRef = db.collection("user_daily_stats").doc(); // generate new ref
      isNew = true;
    } else {
      statRef = statsQuery.docs[0].ref;
      const doc = await t.get(statRef);
      currentTasks = doc.data().tasks || {};
    }

    const currentProgress = currentTasks[taskId] || 0;

    // Check if reached max
    if (currentProgress >= taskConfig.total) {
      return { success: false, reason: "Task already maxed out", progress: currentProgress, xpResult: null };
    }

    const newProgress = Math.min(currentProgress + amount, taskConfig.total);
    const addedAmount = newProgress - currentProgress;

    const xpToAdd = addedAmount * (taskConfig.xpPerItem || taskConfig.point || taskConfig.xpReward || 0);

    currentTasks[taskId] = newProgress;

    if (isNew) {
      t.set(statRef, {
        userId: uid,
        date: today,
        studyMinutes: 0,
        isCheckedIn: false,
        tasksCompleted: 0,
        tasks: currentTasks,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      t.update(statRef, {
        tasks: currentTasks,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return {
      success: true,
      xpToAdd, // Return how much xp to add so caller can invoke addXpToUser
      progress: newProgress,
      taskId,
    };
  });
};

// Check-in logic
router.post("/checkin", async (req, res) => {
  try {
    const userRef = db.collection("users").doc(req.uid);
    const doc = await userRef.get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });

    const today = getLocalDateString();
    let { streak = 0, lastCheckInDate = "", maxStreak = 0 } = doc.data();

    // If already checked in today
    if (lastCheckInDate === today) {
      return res.json({ status: "already_checked_in", streak, maxStreak });
    }

    // Check if streak is broken (did not check in yesterday)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayString = yesterday.toISOString().split("T")[0];

    if (lastCheckInDate === yesterdayString) {
      streak += 1;
    } else {
      streak = 1; // Broken streak, reset to 1
    }

    lastCheckInDate = today;
    if (streak > maxStreak) {
      maxStreak = streak;
    }

    // Process daily task logic for 'daily_checkin'
    const taskResult = await incrementDailyTask(req.uid, "daily_checkin", 1);

    let xpResult = null;
    if (taskResult.success && taskResult.xpToAdd > 0) {
      xpResult = await addXpToUser(req.uid, taskResult.xpToAdd);
    }

    // Update user
    await userRef.update({ streak, maxStreak, lastCheckInDate });

    // Update daily stats for today to mark isCheckedIn
    const statsQuery = await db.collection("user_daily_stats").where("userId", "==", req.uid).where("date", "==", today).limit(1).get();

    if (!statsQuery.empty) {
      await statsQuery.docs[0].ref.update({
        isCheckedIn: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Trigger achievements for CHECK_IN
    checkAchievements(req.uid, "CHECK_IN", {}, req.app);

    res.json({
      status: "success",
      streak,
      maxStreak,
      lastCheckInDate,
      xpResult,
      taskProgress: taskResult.success ? { daily_checkin: taskResult.progress } : {},
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// Record study time
router.post("/study-time", async (req, res) => {
  try {
    const { minutes } = req.body;
    if (!minutes || typeof minutes !== "number" || minutes <= 0) {
      return res.status(400).json({ error: "Invalid minutes" });
    }

    const today = getLocalDateString();
    const statsQuery = await db.collection("user_daily_stats").where("userId", "==", req.uid).where("date", "==", today).limit(1).get();

    if (statsQuery.empty) {
      await db.collection("user_daily_stats").add({
        userId: req.uid,
        date: today,
        studyMinutes: minutes,
        isCheckedIn: false,
        tasksCompleted: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await statsQuery.docs[0].ref.update({
        studyMinutes: FieldValue.increment(minutes),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Trigger achievements for STUDY_TIME
    const updatedQuery = await db.collection("user_daily_stats").where("userId", "==", req.uid).where("date", "==", today).limit(1).get();

    let totalMins = minutes;
    if (!updatedQuery.empty) {
      totalMins = updatedQuery.docs[0].data().studyMinutes || minutes;
    }

    checkAchievements(req.uid, "STUDY_TIME", { todayMinutes: totalMins }, req.app);

    res.json({ status: "success" });
  } catch (error) {
    console.error("Study time error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// Get study stats for last 7 days
router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    // Generate last 7 days array based on UTC date
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setUTCDate(today.getUTCDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    const snapshot = await db.collection("user_daily_stats").where("userId", "==", req.uid).where("date", ">=", last7Days[0]).where("date", "<=", last7Days[6]).get();

    const statsMap = {};
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      statsMap[data.date] = {
        minutes: data.studyMinutes || 0,
        isCheckedIn: data.isCheckedIn || false,
      };
    });

    // Format output
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
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// Gain XP endpoint
router.post("/gain-xp", async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (typeof amount !== "number") {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const { xp, level, levelUp } = await addXpToUser(req.uid, amount);

    res.json({ status: "success", xp, level, levelUp });
  } catch (error) {
    console.error("Gain XP error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// Update user profile
router.put("/profile", async (req, res) => {
  try {
    const { displayName, photoURL, bio, username } = req.body;

    // Update Firebase Auth if needed (optional, we mainly rely on Firestore for this app's profile)
    if (displayName || photoURL) {
      await auth.updateUser(req.uid, {
        ...(displayName && { displayName }),
        ...(photoURL && { photoURL }),
      });
    }

    // Update Firestore
    const userRef = db.collection("users").doc(req.uid);
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (photoURL !== undefined) updates.photoURL = photoURL;
    if (bio !== undefined) updates.bio = bio;
    if (username !== undefined) updates.username = username;

    updates.updatedAt = FieldValue.serverTimestamp();

    await userRef.update(updates);

    res.json({ status: "success", user: updates });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// Get user profile by UID
router.get("/profile/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const userRef = db.collection("users").doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const data = doc.data();

    // Return safe public data
    res.json({
      uid: data.uid,
      name: data.displayName || "Người dùng",
      username: data.username || "@" + (data.email ? data.email.split("@")[0] : "user"),
      avatar: data.photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg",
      cover: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1200&auto=format&fit=crop",
      bio: data.bio || "Chưa có thông tin",
      level: data.level || 1,
      xp: data.xp || 0,
      streak: data.streak || 0,
      rankId: data.rankId || 1,
      tier: data.tier || 3,
      stars: data.stars || 0,
      achievedBadges: data.achievedBadges || [],
      followers: data.followers || 0,
      following: data.following || 0,
      joined: data.createdAt ? new Date(data.createdAt._seconds * 1000).toLocaleDateString("vi-VN") : "Gần đây",
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// Get daily task progress
router.get("/daily-tasks/progress", async (req, res) => {
  try {
    const today = getLocalDateString();
    const statsQuery = await db.collection("user_daily_stats").where("userId", "==", req.uid).where("date", "==", today).limit(1).get();

    if (statsQuery.empty) {
      return res.json({});
    }

    const doc = statsQuery.docs[0].data();
    res.json(doc.tasks || {});
  } catch (error) {
    console.error("Get tasks progress error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// Follow / Unfollow User
router.post("/follow/:uid", async (req, res) => {
  try {
    const { uid: targetUid } = req.params;
    const currentUid = req.uid;

    if (currentUid === targetUid) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const currentRef = db.collection("users").doc(currentUid);
    const targetRef = db.collection("users").doc(targetUid);
    const followRef = db.collection("user_follows").doc(`${currentUid}_${targetUid}`);

    let isFollowing = false;

    await db.runTransaction(async (t) => {
      const followDoc = await t.get(followRef);
      const currentUserDoc = await t.get(currentRef);
      const targetUserDoc = await t.get(targetRef);

      if (!targetUserDoc.exists) throw new Error("Target user not found");

      if (followDoc.exists) {
        // Unfollow
        t.delete(followRef);
        t.update(currentRef, { following: FieldValue.increment(-1) });
        t.update(targetRef, { followers: FieldValue.increment(-1) });
        isFollowing = false;
      } else {
        // Follow
        t.set(followRef, {
          followerId: currentUid,
          followingId: targetUid,
          createdAt: FieldValue.serverTimestamp(),
        });
        t.update(currentRef, { following: FieldValue.increment(1) });
        t.update(targetRef, { followers: FieldValue.increment(1) });
        isFollowing = true;
      }
    });

    if (isFollowing) {
      const currentUser = await currentRef.get();
      const name = currentUser.data()?.displayName || "Một người dùng";
      await createNotification(req.app, targetUid, "follow", "Có người theo dõi mới", `${name} đã bắt đầu theo dõi bạn.`, currentUid);
    }

    res.json({ status: "success", isFollowing });
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// Check if following
router.get("/follow/:uid", async (req, res) => {
  try {
    const { uid: targetUid } = req.params;
    const followDoc = await db.collection("user_follows").doc(`${req.uid}_${targetUid}`).get();
    res.json({ isFollowing: followDoc.exists });
  } catch (error) {
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
