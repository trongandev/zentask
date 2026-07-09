import { Router } from "express";
import User from "../models/User.js";
import { 
  DailyTask, 
  FlashcardSet, 
  Flashcard, 
  Quiz, 
  QuizResult 
} from "../models/Schemas.js";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

const authenticateAdmin = asyncHandler(async (req, res, next) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "Unauthenticated" });
  
  // verifyToken will run first, so we assume req.user is set if we use it, 
  // but let's just implement the logic using req.user since we'll put verifyToken before this middleware.
  const user = await User.findById(req.user.uid).lean();
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  next();
});

router.use(verifyToken);
router.use(authenticateAdmin);

// USERS CRUD
router.get("/users", asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  const total = await User.countDocuments();
  const totalPages = Math.ceil(total / limit);
  
  const users = await User.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const formattedUsers = users.map(user => ({
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
}));

router.put("/users/:uid/role", asyncHandler(async (req, res) => {
  const { uid } = req.params;
  const { role } = req.body;
  
  await User.findByIdAndUpdate(uid, { role });
  res.json({ status: "success" });
}));

// TASKS CRUD
router.get("/tasks", asyncHandler(async (req, res) => {
  const tasks = await DailyTask.find().sort({ createdAt: 1 }).lean();
  res.json({ tasks: tasks.map(t => ({ id: t._id, ...t })) });
}));

router.post("/tasks", asyncHandler(async (req, res) => {
  const taskData = req.body;
  const newTask = await DailyTask.create(taskData);
  res.json({ status: "success", id: newTask._id });
}));

router.put("/tasks/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const taskData = req.body;
  
  await DailyTask.findByIdAndUpdate(id, taskData);
  res.json({ status: "success" });
}));

router.delete("/tasks/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  await DailyTask.findByIdAndDelete(id);
  res.json({ status: "success" });
}));

// VOCAB SETS CRUD
router.get("/vocab-sets", asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  const total = await FlashcardSet.countDocuments();
  const totalPages = Math.ceil(total / limit);
  
  const sets = await FlashcardSet.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const formattedSets = sets.map(set => ({
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
}));

router.delete("/vocab-sets/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await Flashcard.deleteMany({ setId: id });
  await FlashcardSet.findByIdAndDelete(id);

  res.json({ status: "success" });
}));

// VOCAB CRUD
router.get("/vocab", asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  const total = await Flashcard.countDocuments();
  const totalPages = Math.ceil(total / limit);
  
  const cards = await Flashcard.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const formattedCards = cards.map(card => ({
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
}));

router.delete("/vocab/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const card = await Flashcard.findById(id);
  if (card) {
    const setId = card.setId;
    await Flashcard.findByIdAndDelete(id);
    await FlashcardSet.findByIdAndUpdate(setId, { $inc: { cardCount: -1 } });
  }
  
  res.json({ status: "success" });
}));

// QUIZZES CRUD
router.get("/quizzes", asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  const total = await Quiz.countDocuments();
  const totalPages = Math.ceil(total / limit);
  
  const quizzes = await Quiz.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const formattedQuizzes = quizzes.map(q => ({
    id: q._id,
    title: q.title,
    difficulty: q.difficulty,
    creatorId: q.creatorId,
    questionCount: q.questions?.length || 0,
    createdAt: q.createdAt ? q.createdAt.toISOString() : null,
  }));

  res.json({
    items: formattedQuizzes,
    total,
    page,
    totalPages,
  });
}));

router.delete("/quizzes/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  await Quiz.findByIdAndDelete(id);
  res.json({ status: "success" });
}));

// QUIZ HISTORY CRUD
router.get("/quiz-history", asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  const total = await QuizResult.countDocuments();
  const totalPages = Math.ceil(total / limit);
  
  const historyDocs = await QuizResult.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const formattedHistory = historyDocs.map(doc => ({
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
}));

export default router;
