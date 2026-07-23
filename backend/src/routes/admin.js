import { Router } from "express";
import User from "../models/User.js";
import { DailyTask, FlashcardSet, Flashcard, Quiz, QuizResult, BotConfig, SystemLog, CommunityPost, BannedIP, AttackerFeedback, AITokenUsage, BotJobSchedule } from "../models/Schemas.js";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { reloadJob, triggerJob } from "../../utils/jobManager.js";
import {
  getAdminCourseTree,
  getAdminLesson,
  createAdminLesson,
  updateAdminLesson,
  deleteAdminLesson,
  reorderAdminLessons,
  aiGenerateAdminLesson,
  aiEvaluateAdminCourse,
  getUnassignedLessons,
  createUnassignedLesson,
  aiGenerateAdminTopics,
  getQuestionBank,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getWordBank,
  createCourse,
  deleteCourse,
  updateCourseOrder,
  updateCourseTiersTopics,
  aiGenerateCourseTopics,
  aiGenerateCourseTextData,
  exportCourseToText,
  createWord,
  updateWord,
  deleteWord,
  seedAdminCourse,
  handlePasteAdminCourses,
  getSampleCoursePrompt
} from "../controllers/adminCourseController.js";

const router = Router();

const authenticateAdmin = asyncHandler(async (req, res, next) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "Unauthenticated" });

  const user = await User.findById(req.user.uid).lean();
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  next();
});

router.use(verifyToken);
router.use(authenticateAdmin);

// COURSE RESOURCES CRUD
router.post("/courses/seed", seedAdminCourse);
router.get("/courses/tree", getAdminCourseTree);
router.get("/courses/lesson/:id", getAdminLesson);
router.post("/courses/tier/:tierId/lesson", createAdminLesson);
router.post("/courses/:courseId/lesson", createUnassignedLesson);
router.post("/courses/:courseId/generate-topics", aiGenerateAdminTopics);
router.put("/courses/lesson/:id", updateAdminLesson);
router.delete("/courses/lesson/:id", deleteAdminLesson);
router.put("/courses/reorder-lessons", reorderAdminLessons);
router.post("/courses/ai-generate", aiGenerateAdminLesson);
router.post("/courses/ai-evaluate", aiEvaluateAdminCourse);

// UNASSIGNED TOPICS
router.get("/courses/:courseId/unassigned-lessons", getUnassignedLessons);
router.post("/courses/:courseId/lesson", createUnassignedLesson);

// QUESTION BANK
router.get("/courses/:courseId/questions", getQuestionBank);
router.post("/courses/:courseId/questions", createQuestion);
router.put("/courses/questions/:id", updateQuestion);
router.delete("/courses/questions/:id", deleteQuestion);

// COURSE MANAGEMENT
router.post("/courses", createCourse);
router.delete("/courses/:id", deleteCourse);
router.put("/courses/reorder", updateCourseOrder);
router.put("/courses/tiers/topics", updateCourseTiersTopics);
router.get("/courses/:id/export", exportCourseToText);
router.get("/courses/ai-generate-sample-prompt", getSampleCoursePrompt);
router.post("/courses/ai-generate-course-text-data", aiGenerateCourseTextData);
router.post("/courses/ai-generate-course-topics", aiGenerateCourseTopics);
router.post("/courses/paste", handlePasteAdminCourses);

// Word Bank routes
router.get("/courses/:courseId/words", getWordBank);
router.post("/courses/:courseId/words", createWord);
router.put("/courses/words/:id", updateWord);
router.delete("/courses/words/:id", deleteWord);

// BOT JOBS CRUD
router.get("/bot-jobs", asyncHandler(async (req, res) => {
  const jobs = await BotJobSchedule.find().sort({ jobId: 1 }).lean();
  res.json(jobs);
}));

router.put("/bot-jobs/:jobId", asyncHandler(async (req, res) => {
  const { cronExpression, isActive } = req.body;
  const { jobId } = req.params;
  
  const updated = await BotJobSchedule.findOneAndUpdate(
    { jobId },
    { $set: { cronExpression, isActive } },
    { new: true }
  ).lean();
  
  if (!updated) return res.status(404).json({ error: "Job not found" });
  
  // Reload schedule in jobManager
  await reloadJob(jobId);
  
  res.json({ success: true, data: updated });
}));

router.post("/bot-jobs/:jobId/trigger", asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  try {
    const result = await triggerJob(jobId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));

// BANNED IPS CRUD
router.get("/banned-ips", asyncHandler(async (req, res) => {
  const ips = await BannedIP.find().sort({ createdAt: -1 }).lean();
  res.json(ips);
}));

router.post("/banned-ips", asyncHandler(async (req, res) => {
  const { ip, reason, isHoneypot } = req.body;
  if (!ip) return res.status(400).json({ success: false, message: "IP is required." });
  
  const existing = await BannedIP.findOne({ ip });
  if (existing) return res.status(400).json({ success: false, message: "IP already exists." });
  
  const newBan = await BannedIP.create({ ip, reason, isHoneypot: isHoneypot ?? true });
  res.json({ success: true, data: newBan });
}));

router.delete("/banned-ips/:id", asyncHandler(async (req, res) => {
  await BannedIP.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ATTACKER FEEDBACKS
router.get("/attacker-feedbacks", asyncHandler(async (req, res) => {
  const feedbacks = await AttackerFeedback.find().sort({ createdAt: -1 }).lean();
  res.json(feedbacks);
}));

router.delete("/attacker-feedbacks/:id", asyncHandler(async (req, res) => {
  await AttackerFeedback.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ANALYTICS OVERVIEW
router.get(
  "/analytics/overview",
  asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      newUsersToday,
      totalQuizzes,
      totalFlashcards,
      totalPosts,
      totalSystemLogs,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      Quiz.countDocuments(),
      Flashcard.countDocuments(),
      CommunityPost.countDocuments(),
      SystemLog.countDocuments({ createdAt: { $gte: today } }),
    ]);

    res.json({
      totalUsers,
      newUsersToday,
      totalQuizzes,
      totalFlashcards,
      totalPosts,
      systemLogsToday: totalSystemLogs,
    });
  }),
);

// USERS CRUD
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const total = await User.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedUsers = users.map((user) => ({
      id: user._id,
      ...user,
      createdAt: user.createdAt ? user.createdAt.toISOString() : null,
    }));

    res.json({
      users: formattedUsers,
      total,
      page,
      totalPages,
    });
  }),
);

router.put(
  "/users/:uid/role",
  asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const { role } = req.body;

    await User.findByIdAndUpdate(uid, { role });
    res.json({ status: "success" });
  }),
);

router.put(
  "/users/:uid/ban",
  asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const { isBanned } = req.body;

    const user = await User.findById(uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Admin cannot ban another admin
    if (user.role === "admin") {
      return res.status(403).json({ error: "Cannot ban an admin account" });
    }

    user.isBanned = isBanned;
    await user.save();
    
    res.json({ status: "success", isBanned });
  }),
);


// COMMUNITY POSTS CRUD
router.get(
  "/community-posts",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const total = await CommunityPost.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const posts = await CommunityPost.find()
      .populate("uid", "displayName photoURL email uid level")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedPosts = posts.map((post) => ({
      id: post._id,
      ...post,
      authorId: post.uid, // Map populated uid to authorId for frontend
      createdAt: post.createdAt ? post.createdAt.toISOString() : null,
    }));

    res.json({
      items: formattedPosts,
      total,
      page,
      totalPages,
    });
  }),
);

router.delete(
  "/community-posts/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await CommunityPost.findByIdAndDelete(id);
    res.json({ status: "success" });
  }),
);

// TASKS CRUD
router.get(
  "/tasks",
  asyncHandler(async (req, res) => {
    const tasks = await DailyTask.find().sort({ createdAt: 1 }).lean();
    res.json({ tasks: tasks.map((t) => ({ id: t._id, ...t })) });
  }),
);

router.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    const taskData = req.body;
    const newTask = await DailyTask.create(taskData);
    res.json({ status: "success", id: newTask._id });
  }),
);

router.put(
  "/tasks/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const taskData = req.body;

    await DailyTask.findByIdAndUpdate(id, taskData);
    res.json({ status: "success" });
  }),
);

router.delete(
  "/tasks/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await DailyTask.findByIdAndDelete(id);
    res.json({ status: "success" });
  }),
);

// VOCAB SETS CRUD
router.get(
  "/vocab-sets",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const total = await FlashcardSet.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const sets = await FlashcardSet.find()
      .populate("userId", "displayName photoURL email uid level")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedSets = sets.map((set) => ({
      id: set._id,
      ...set,
      createdAt: set.createdAt ? set.createdAt.toISOString() : null,
    }));

    res.json({
      items: formattedSets,
      total,
      page,
      totalPages,
    });
  }),
);

router.delete(
  "/vocab-sets/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await Flashcard.deleteMany({ setId: id });
    await FlashcardSet.findByIdAndDelete(id);

    res.json({ status: "success" });
  }),
);

// VOCAB CRUD
router.get(
  "/vocab",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const total = await Flashcard.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const cards = await Flashcard.find()
      .populate("userId", "displayName photoURL email uid level")
      .populate("setId", "title")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedCards = cards.map((card) => ({
      id: card._id,
      ...card,
      createdAt: card.createdAt ? card.createdAt.toISOString() : null,
    }));

    res.json({
      items: formattedCards,
      total,
      page,
      totalPages,
    });
  }),
);

router.delete(
  "/vocab/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const card = await Flashcard.findById(id);
    if (card) {
      const setId = card.setId;
      await Flashcard.findByIdAndDelete(id);
      await FlashcardSet.findByIdAndUpdate(setId, { $inc: { cardCount: -1 } });
    }

    res.json({ status: "success" });
  }),
);

// QUIZZES CRUD
router.get(
  "/quizzes",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const total = await Quiz.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const quizzes = await Quiz.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
    const userIds = quizzes.map((q) => q.creatorId).filter((id) => id && isValidObjectId(id));
    const users = await User.find({ _id: { $in: userIds } }, "displayName photoURL email uid level").lean();
    
    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u;
    });

    const formattedQuizzes = quizzes.map((q) => ({
      id: q._id,
      title: q.title,
      difficulty: q.difficulty,
      creatorId: (q.creatorId && isValidObjectId(q.creatorId)) ? (userMap[q.creatorId] || q.creatorId) : q.creatorId,
      questionCount: q.questions?.length || 0,
      createdAt: q.createdAt ? q.createdAt.toISOString() : null,
    }));

    res.json({
      items: formattedQuizzes,
      total,
      page,
      totalPages,
    });
  }),
);

router.delete(
  "/quizzes/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await Quiz.findByIdAndDelete(id);
    res.json({ status: "success" });
  }),
);

// QUIZ HISTORY CRUD
router.get(
  "/quiz-history",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const total = await QuizResult.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const historyDocs = await QuizResult.find()
      .populate("uid", "displayName photoURL email uid level")
      .populate("quizId", "title difficulty")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedHistory = historyDocs.map((doc) => ({
      id: doc._id,
      uid: doc.uid,
      quizId: doc.quizId,
      score: doc.score,
      totalCorrect: doc.totalCorrect,
      totalQuestions: doc.totalQuestions,
      usedRebirth: doc.usedRebirth,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    }));

    res.json({
      items: formattedHistory,
      total,
      page,
      totalPages,
    });
  }),
);

// BOT CONFIG CRUD
router.get(
  "/bot-config",
  asyncHandler(async (req, res) => {
    const configs = await BotConfig.find().sort({ rankId: 1 }).lean();
    res.json({ items: configs.map(c => ({ id: c._id, ...c })) });
  }),
);

router.post(
  "/bot-config",
  asyncHandler(async (req, res) => {
    const configData = req.body;
    const existing = await BotConfig.findOne({ rankId: configData.rankId });
    if (existing) {
      return res.status(400).json({ error: "Config for this Rank ID already exists" });
    }
    const newConfig = await BotConfig.create(configData);
    res.json({ status: "success", id: newConfig._id });
  }),
);

router.put(
  "/bot-config/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const configData = req.body;

    await BotConfig.findByIdAndUpdate(id, configData);
    res.json({ status: "success" });
  }),
);

router.delete(
  "/bot-config/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await BotConfig.findByIdAndDelete(id);
    res.json({ status: "success" });
  }),
);

// SYSTEM LOGS CRUD
router.get(
  "/system-logs",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const total = await SystemLog.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const logs = await SystemLog.find()
      .populate("uid", "displayName email photoURL")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedLogs = logs.map(log => ({
      ...log,
      id: log._id,
      createdAt: log.createdAt ? log.createdAt.toISOString() : null,
    }));

    res.json({
      items: formattedLogs,
      total,
      page,
      totalPages,
    });
  }),
);

router.get(
  "/ai-usage",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await AITokenUsage.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const usages = await AITokenUsage.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("uid", "displayName zaloId email")
      .lean();

    const formattedUsages = usages.map(u => ({
      ...u,
      id: u._id,
      createdAt: u.createdAt ? u.createdAt.toISOString() : null,
    }));

    res.json({
      items: formattedUsages,
      total,
      page,
      totalPages,
    });
  })
);

export default router;
