import { Router } from "express";
import { auth, db } from "../firebase.js";
import { getWeekString, getMonthString, getLastWeekString, getLastMonthString } from "../utils/dateUtils.js";
import { addXpToUser } from "./user.js";

const router = Router();

// Middleware to authenticate for rewards (leaderboard GET is public but we extract user if possible)
const authenticate = async (req, res, next) => {
  const sessionCookie = req.cookies.session || "";
  if (!sessionCookie) {
    req.uid = null;
    return next();
  }
  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    req.uid = decodedClaims.uid;
  } catch (error) {
    req.uid = null;
  }
  next();
};

const requireAuth = (req, res, next) => {
  if (!req.uid) return res.status(401).json({ error: "Unauthenticated" });
  next();
};

router.get("/", async (req, res) => {
  try {
    const type = req.query.type || "all";
    let snapshot;
    let docs = [];

    if (type === "week") {
      const weekString = getWeekString();
      snapshot = await db.collection("leaderboard_weekly")
        .where("period", "==", weekString)
        .orderBy("xp", "desc")
        .limit(100)
        .get();
    } else if (type === "month") {
      const monthString = getMonthString();
      snapshot = await db.collection("leaderboard_monthly")
        .where("period", "==", monthString)
        .orderBy("xp", "desc")
        .limit(100)
        .get();
    } else {
      snapshot = await db.collection("users")
        .orderBy("xp", "desc")
        .limit(100)
        .get();
    }

    const leaderboard = [];
    let currentRank = 1;
    
    // We need user details for weekly/monthly, so we fetch them if needed
    const uidsToFetch = [];
    if (type !== "all") {
      snapshot.docs.forEach(doc => uidsToFetch.push(doc.data().uid));
    }
    
    let usersMap = {};
    if (uidsToFetch.length > 0) {
      // Chunk array by 30 to fetch from users collection
      for (let i = 0; i < uidsToFetch.length; i += 30) {
        const chunk = uidsToFetch.slice(i, i + 30);
        const usersSnap = await db.collection("users").where("uid", "in", chunk).get();
        usersSnap.docs.forEach(d => {
          usersMap[d.data().uid] = d.data();
        });
      }
    }

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const userData = type === "all" ? data : usersMap[data.uid] || {};
      
      leaderboard.push({
        id: type === "all" ? doc.id : data.uid,
        rank: currentRank++,
        name: userData.displayName || "Học viên",
        username: userData.username || "@" + (userData.email ? userData.email.split('@')[0] : "user"),
        level: userData.level || 1,
        xp: data.xp || 0,
        avatar: userData.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop",
        rankId: userData.rankId || 1,
        tier: userData.tier || 3,
        trend: "same"
      });
    });

    res.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

router.use(authenticate);

router.get("/rewards", requireAuth, async (req, res) => {
  try {
    const lastWeek = getLastWeekString();
    const lastMonth = getLastMonthString();
    const rewards = [];

    // Check last week
    const lwQuery = await db.collection("leaderboard_weekly").doc(`${lastWeek}_${req.uid}`).get();
    if (lwQuery.exists && lwQuery.data().xp > 0) {
      const claimQuery = await db.collection("user_rewards").doc(`${lastWeek}_${req.uid}`).get();
      if (!claimQuery.exists) {
        rewards.push({ type: 'week', period: lastWeek, xp: 200 });
      }
    }

    // Check last month
    const lmQuery = await db.collection("leaderboard_monthly").doc(`${lastMonth}_${req.uid}`).get();
    if (lmQuery.exists && lmQuery.data().xp > 0) {
      const claimQuery = await db.collection("user_rewards").doc(`${lastMonth}_${req.uid}`).get();
      if (!claimQuery.exists) {
        rewards.push({ type: 'month', period: lastMonth, xp: 1000 });
      }
    }

    res.json(rewards);
  } catch (error) {
    console.error("Rewards fetch error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/claim", requireAuth, async (req, res) => {
  try {
    const { type, period } = req.body;
    if (!type || !period) return res.status(400).json({ error: "Missing parameters" });
    
    // Verify it's a valid period
    if (type === 'week' && period !== getLastWeekString()) return res.status(400).json({ error: "Invalid week period" });
    if (type === 'month' && period !== getLastMonthString()) return res.status(400).json({ error: "Invalid month period" });
    
    const xpReward = type === 'week' ? 200 : 1000;
    const rewardRef = db.collection("user_rewards").doc(`${period}_${req.uid}`);
    
    const result = await db.runTransaction(async (t) => {
      const doc = await t.get(rewardRef);
      if (doc.exists) {
        throw new Error("Already claimed");
      }
      
      // Verify user actually participated
      const coll = type === 'week' ? "leaderboard_weekly" : "leaderboard_monthly";
      const participation = await t.get(db.collection(coll).doc(`${period}_${req.uid}`));
      if (!participation.exists || participation.data().xp <= 0) {
        throw new Error("Not eligible");
      }

      t.set(rewardRef, {
        uid: req.uid,
        type,
        period,
        xpReward,
        claimedAt: new Date()
      });
      return true;
    });

    if (result) {
      const { xp, level, levelUp } = await addXpToUser(req.uid, xpReward);
      return res.json({ success: true, xp, level, levelUp });
    }
  } catch (error) {
    console.error("Claim error:", error);
    res.status(400).json({ error: error.message || "Internal error" });
  }
});

export default router;
