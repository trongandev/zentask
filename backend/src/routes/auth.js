import { Router } from "express";
import { auth, db } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { SYSTEM_LEVELS, SYSTEM_BADGES } from "../config/system.js";
import { getWeekString } from "../utils/dateUtils.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
dotenv.config();
const router = Router();

// Retrieve Web API key for Identity Toolkit calls
let firebaseApiKey = process.env.FIREBASE_API_KEY;
console.log(firebaseApiKey);

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.BACKEND_URL + "/api/auth/google/callback", // Redirect URI
);

// Initiate Google Login
router.get("/google", (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).send("Google Client ID or Secret is missing in backend.");
  }
  const authorizeUrl = googleClient.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
    prompt: "consent",
  });
  res.redirect(authorizeUrl);
});

// Google Login Callback
router.get("/google/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/auth?error=NoCode`);
  }

  try {
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Verify Google ID Token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=NoEmail`);
    }

    // Find or create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (e) {
      if (e.code === "auth/user-not-found") {
        userRecord = await auth.createUser({
          email: email,
          displayName: name || "Học viên",
          photoURL: picture || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg",
        });
      } else {
        throw e;
      }
    }

    const uid = userRecord.uid;

    // Generate Custom Token
    const customToken = await auth.createCustomToken(uid);

    // Exchange Custom Token for Firebase ID Token
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("Firebase signInWithCustomToken error:", data.error);
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=${data.error.message}`);
    }

    const firebaseIdToken = data.idToken;

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await auth.createSessionCookie(firebaseIdToken, { expiresIn });
    const options = { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === "production" };
    res.cookie("session", sessionCookie, options);

    // Initialize user in Firestore if not exists
    const userDocRef = db.collection("users").doc(uid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      await userDocRef.set({
        uid: userRecord.uid,
        email: userRecord.email || "",
        displayName: userRecord.displayName || "Học viên",
        photoURL: userRecord.photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg",
        role: "user",
        level: 1,
        xp: 0,
        streak: 0,
        rankId: 1,
        tier: 3,
        stars: 0,
        achievedBadges: [],
        appSettings: {
          theme: "light",
          accentColor: "blue",
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    res.redirect(`${process.env.FRONTEND_URL}/`);
  } catch (error) {
    console.error("Google auth callback error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/auth?error=CallbackFailed`);
  }
});

// Login with email and password
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send("Missing email or password");
  }

  if (!firebaseApiKey) {
    return res.status(500).send("Firebase API Key not configured on backend.");
  }

  try {
    // We use the Identity Toolkit REST API to verify password
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(401).json({ error: data.error.message });
    }

    const idToken = data.idToken;
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const options = { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === "production" };
    res.cookie("session", sessionCookie, options);

    res.status(200).json({ status: "success", uid: data.localId });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Register with email and password
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send("Missing email or password");
  }

  try {
    const userRecord = await auth.createUser({
      email,
      password,
    });

    // After creating user, sign in to get idToken for session cookie
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(401).json({ error: data.error.message });
    }

    const idToken = data.idToken;
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const options = { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === "production" };
    res.cookie("session", sessionCookie, options);

    res.status(200).json({ status: "success", uid: userRecord.uid });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || "Error creating user" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("session");
  res.status(200).json({ status: "success" });
});

router.get("/me", async (req, res) => {
  const sessionCookie = req.cookies.session || "";

  if (!sessionCookie) {
    return res.status(401).send("Unauthenticated");
  }

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const userRecord = await auth.getUser(decodedClaims.uid);

    const userDocRef = db.collection("users").doc(userRecord.uid);
    const userDocSnap = await userDocRef.get();

    let userProfile;
    if (userDocSnap.exists) {
      userProfile = userDocSnap.data();
    } else {
      userProfile = {
        uid: userRecord.uid,
        email: userRecord.email || "",
        displayName: userRecord.displayName || "Học viên",
        photoURL: userRecord.photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg",
        role: "user",
        level: 1,
        xp: 0,
        streak: 0,
        rankId: 1,
        tier: 3,
        stars: 0,
        achievedBadges: [],
        appSettings: {
          theme: "light",
          accentColor: "blue",
        },
      };

      await userDocRef.set({
        ...userProfile,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Fetch custom grammar tests
    try {
      const grammarTestsSnap = await userDocRef.collection("grammar_tests").orderBy("createdAt", "desc").get();
      const customGrammarTests = grammarTestsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      userProfile.customGrammarTests = customGrammarTests;
    } catch (e) {
      console.error("Error fetching grammar tests", e);
      userProfile.customGrammarTests = [];
    }

    // Fetch custom tenses tests
    try {
      const tensesTestsSnap = await userDocRef.collection("tenses_tests").orderBy("createdAt", "desc").get();
      const customTensesTests = tensesTestsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      userProfile.customTensesTests = customTensesTests;
    } catch (e) {
      console.error("Error fetching tenses tests", e);
      userProfile.customTensesTests = [];
    }

    // Initialize grammarProgress if not exists
    if (!userProfile.grammarProgress) {
      userProfile.grammarProgress = {
        maxStage: 1,
        totalCorrect: 0,
        totalWrong: 0,
        totalTimeSpent: 0,
        completedStages: [],
      };
    }

    // Initialize tensesProgress if not exists
    if (!userProfile.tensesProgress) {
      userProfile.tensesProgress = {
        maxStage: 1,
        totalCorrect: 0,
        totalWrong: 0,
        totalTimeSpent: 0,
        completedStages: [],
      };
    }

    // Fetch Daily Tasks
    const dailyTasksSnap = await db.collection("daily_tasks").orderBy("createdAt", "asc").get();
    const dailyTasks = dailyTasksSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Fetch Task Progress
    const today = new Date().toISOString().split("T")[0];
    const statsQuery = await db.collection("user_daily_stats").where("userId", "==", userProfile.uid).where("date", "==", today).limit(1).get();
    const taskProgress = statsQuery.empty ? {} : statsQuery.docs[0].data().tasks || {};

    // Fetch Notifications
    const notifSnap = await db.collection("notifications").where("receiverId", "==", userProfile.uid).orderBy("createdAt", "desc").limit(50).get();

    const notifications = notifSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt._seconds * 1000).toISOString() : new Date().toISOString(),
    }));

    // Fetch last 7 days stats
    const todayDate = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setUTCDate(todayDate.getUTCDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });
    const last7DaysStatsSnap = await db.collection("user_daily_stats")
      .where("userId", "==", userProfile.uid)
      .where("date", ">=", last7Days[0])
      .where("date", "<=", last7Days[6])
      .get();
    const statsMap = {};
    last7DaysStatsSnap.docs.forEach((doc) => {
      const data = doc.data();
      statsMap[data.date] = { minutes: data.studyMinutes || 0, isCheckedIn: data.isCheckedIn || false };
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

    // Fetch due flashcards
    const nowISO = new Date().toISOString();
    const progressSnapshot = await db.collection("flashcard_progress")
      .where("userId", "==", userProfile.uid)
      .where("dueDate", "<=", nowISO)
      .limit(5)
      .get();
    const dueCards = [];
    if (!progressSnapshot.empty) {
      for (const doc of progressSnapshot.docs) {
        const data = doc.data();
        const cardRef = db.collection("flashcards").doc(data.cardId);
        const cardDoc = await cardRef.get();
        if (cardDoc.exists) {
          dueCards.push({ id: cardDoc.id, ...cardDoc.data(), progress: data });
        }
      }
    }

    // Fetch weekly leaderboard
    const weekString = getWeekString();
    const leaderboardSnap = await db.collection("leaderboard_weekly")
      .where("period", "==", weekString)
      .orderBy("xp", "desc")
      .limit(100)
      .get();
    
    const uidsToFetch = leaderboardSnap.docs.map(doc => doc.data().uid);
    let usersMap = {};
    if (uidsToFetch.length > 0) {
      for (let i = 0; i < uidsToFetch.length; i += 30) {
        const chunk = uidsToFetch.slice(i, i + 30);
        const usersSnap = await db.collection("users").where("uid", "in", chunk).get();
        usersSnap.docs.forEach((d) => {
          usersMap[d.data().uid] = d.data();
        });
      }
    }
    
    let currentRank = 1;
    const weeklyLeaderboard = leaderboardSnap.docs.map(doc => {
      const data = doc.data();
      const userData = usersMap[data.uid] || {};
      return {
        id: data.uid,
        rank: currentRank++,
        name: userData.displayName || "Học viên",
        username: userData.username || "@" + (userData.email ? userData.email.split("@")[0] : "user"),
        level: userData.level || 1,
        xp: data.xp || 0,
        avatar: userData.photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg",
        rankId: userData.rankId || 1,
        tier: userData.tier || 3,
        trend: "same",
      };
    });

    res.status(200).json({
      user: userProfile,
      extensionToken: sessionCookie,
      config: {
        levels: SYSTEM_LEVELS,
        dailyTasks: dailyTasks,
        badges: SYSTEM_BADGES,
      },
      userProgress: {
        taskProgress: taskProgress,
        stats: formattedStats,
        dueCards: dueCards,
        weeklyLeaderboard: weeklyLeaderboard
      },
      notifications: notifications,
    });
  } catch (error) {
    res.clearCookie("session");
    res.status(401).send("Unauthenticated");
  }
});

export default router;
