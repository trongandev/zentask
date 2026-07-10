import { Router } from "express";
import User from "../models/User.js";
import { IpSignupCounter } from "../models/Schemas.js";
import { getClientIp, hashIp, DEFAULT_LIMITS } from "../../utils/usageLimits.js";
import { cleanAndValidatePublicText } from "../../utils/moderation.js";
import { verifyRecaptchaFromRequest } from "../../utils/recaptcha.js";
import { DailyTask, UserDailyStat, Notification, FlashcardProgress, Flashcard, LeaderboardWeekly, GrammarTest, TensesTest } from "../models/Schemas.js";
import jwt from "jsonwebtoken";
import { SYSTEM_LEVELS, SYSTEM_BADGES } from "../config/system.js";
import { getWeekString } from "../../utils/dateUtils.js";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import { verifyToken } from "../middleware/auth.js";

dotenv.config();
const router = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.BACKEND_URL + "/api/auth/google/callback");

const enforceAccountLimitForNewUser = async (req, email) => {
  const ipHash = hashIp(getClientIp(req));
  const current = await IpSignupCounter.findOne({ ipHash }).lean();
  const maxAccounts = DEFAULT_LIMITS.accounts_per_ip;
  if (current && Number(current.count || 0) >= maxAccounts) {
    const error = new Error(`IP này đã tạo tối đa ${maxAccounts} tài khoản. Vui lòng liên hệ admin nếu đây là nhầm lẫn.`);
    error.status = 429;
    error.code = "IP_SIGNUP_LIMIT_REACHED";
    throw error;
  }
  return ipHash;
};

const recordAccountSignup = async (ipHash, email) => {
  if (!ipHash) return;
  await IpSignupCounter.findOneAndUpdate(
    { ipHash },
    {
      $inc: { count: 1 },
      $addToSet: { emails: String(email || "").toLowerCase() },
      $set: { lastSignupAt: new Date() },
    },
    { upsert: true, new: true },
  );
};

// Helper to generate JWT and set cookie
const generateTokenAndSetCookie = (res, user) => {
  const payload = { uid: user._id, email: user.email, role: user.role };
  const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "5d" });

  const options = { maxAge: 60 * 60 * 24 * 5 * 1000, httpOnly: true, secure: process.env.NODE_ENV === "production" };
  res.cookie("session", token, options);

  return token;
};

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

    // Find or create user in MongoDB. New Google accounts also count toward IP anti-spam limit.
    let user = await User.findOne({ email });
    if (!user) {
      const ipHash = await enforceAccountLimitForNewUser(req, email);
      const safeName = await cleanAndValidatePublicText(name || "Học viên", "Tên người dùng", { maxLength: 60 });
      user = await User.create({
        email: email,
        displayName: safeName || "Học viên",
        photoURL: picture || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg",
      });
      await recordAccountSignup(ipHash, email);
    }

    generateTokenAndSetCookie(res, user);
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

  try {
    await verifyRecaptchaFromRequest(req);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Tài khoản không tồn tại" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Mật khẩu không chính xác" });
    }

    generateTokenAndSetCookie(res, user);
    res.status(200).json({ status: "success", uid: user._id });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || "Internal Server Error", code: error.code });
  }
});

// Register with email and password
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send("Missing email or password");
  }

  try {
    await verifyRecaptchaFromRequest(req);

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const ipHash = await enforceAccountLimitForNewUser(req, normalizedEmail);
    const user = await User.create({ email: normalizedEmail, password });
    await recordAccountSignup(ipHash, normalizedEmail);

    generateTokenAndSetCookie(res, user);
    res.status(200).json({ status: "success", uid: user._id });
  } catch (error) {
    console.error(error);
    res.status(error.status || 400).json({ error: error.message || "Error creating user", code: error.code });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("session");
  res.status(200).json({ status: "success" });
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const userProfileDoc = await User.findById(uid);

    if (!userProfileDoc) {
      return res.status(404).json({ error: "User not found" });
    }
    const userProfile = userProfileDoc.toJSON();

    // Fetch custom grammar tests
    try {
      const customGrammarTests = await GrammarTest.find({ userId: uid }).sort({ createdAt: -1 }).lean();
      userProfile.customGrammarTests = customGrammarTests.map((d) => ({ id: d._id, ...d }));
    } catch (e) {
      console.error("Error fetching grammar tests", e);
      userProfile.customGrammarTests = [];
    }

    // Fetch custom tenses tests
    try {
      const customTensesTests = await TensesTest.find({ userId: uid }).sort({ createdAt: -1 }).lean();
      userProfile.customTensesTests = customTensesTests.map((d) => ({ id: d._id, ...d }));
    } catch (e) {
      console.error("Error fetching tenses tests", e);
      userProfile.customTensesTests = [];
    }

    // Fetch Daily Tasks
    const dailyTasksDocs = await DailyTask.find().sort({ createdAt: 1 }).lean();
    const dailyTasks = dailyTasksDocs.map((d) => ({ id: d._id, ...d }));

    // Fetch Task Progress
    const today = new Date().toISOString().split("T")[0];
    const statsQuery = await UserDailyStat.findOne({ userId: uid, date: today }).lean();
    const taskProgress = statsQuery ? statsQuery.tasks || {} : {};

    // Fetch Notifications
    const notifDocs = await Notification.find({ receiverId: uid }).sort({ createdAt: -1 }).limit(50).lean();
    const notifications = notifDocs.map((d) => ({
      id: d._id,
      ...d,
      createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString(),
    }));

    // Fetch last 7 days stats
    const todayDate = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setUTCDate(todayDate.getUTCDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    const last7DaysStatsDocs = await UserDailyStat.find({
      userId: uid,
      date: { $gte: last7Days[0], $lte: last7Days[6] },
    }).lean();

    const statsMap = {};
    last7DaysStatsDocs.forEach((data) => {
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
    const progressDocs = await FlashcardProgress.find({
      userId: uid,
      dueDate: { $lte: nowISO },
    })
      .limit(5)
      .lean();

    const dueCards = [];
    if (progressDocs.length > 0) {
      for (const data of progressDocs) {
        const cardDoc = await Flashcard.findById(data.cardId).lean();
        if (cardDoc) {
          dueCards.push({ id: cardDoc._id, ...cardDoc, progress: data });
        }
      }
    }

    // Fetch weekly leaderboard
    const weekString = getWeekString();
    const leaderboardDocs = await LeaderboardWeekly.find({ period: weekString }).sort({ xp: -1 }).limit(100).lean();

    const uidsToFetch = leaderboardDocs.map((doc) => doc.uid);
    let usersMap = {};
    if (uidsToFetch.length > 0) {
      const usersDocs = await User.find({ _id: { $in: uidsToFetch } }).lean();
      usersDocs.forEach((d) => {
        usersMap[d._id.toString()] = d;
      });
    }

    let currentRank = 1;
    const weeklyLeaderboard = leaderboardDocs.map((data) => {
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

    // Provide the JWT in case frontend expects it
    const sessionCookie = req.cookies.session || req.headers.authorization?.split(" ")[1];

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
        weeklyLeaderboard: weeklyLeaderboard,
      },
      notifications: notifications,
    });
  } catch (error) {
    console.error("Error in /me:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
