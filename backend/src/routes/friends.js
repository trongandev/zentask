import { Router } from "express";
import User from "../models/User.js";
import { Friendship, FriendRequest, FriendMessage, FlashcardFolder, FlashcardSet, Flashcard, Quiz } from "../models/Schemas.js";
import { createNotification } from "../../utils/notifications.js";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(verifyToken);

function pairId(a, b) {
  return [a.toString(), b.toString()].sort().join("__");
}

function serializeDoc(doc) {
  return {
    id: doc._id,
    ...doc,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

function publicUserFromDoc(user) {
  if (!user) return null;
  return {
    uid: user._id,
    displayName: user.displayName || user.email || "Học viên",
    email: user.email || "",
    photoURL: user.photoURL || "",
    username: user.username || "",
    level: user.level || 1,
    xp: user.xp || 0,
  };
}

async function getPublicUser(uid) {
  const user = await User.findById(uid).lean();
  return publicUserFromDoc(user);
}

async function ensureFriendship(uid, friendId) {
  if (!friendId || uid === friendId) return false;
  const doc = await Friendship.findOne({ users: { $all: [uid, friendId] } }).lean();
  return !!doc;
}

async function getRequestStatus(uid, otherUid) {
  const sent = await FriendRequest.findOne({ fromId: uid, toId: otherUid, status: "pending" }).lean();
  if (sent) return "sent";

  const received = await FriendRequest.findOne({ fromId: otherUid, toId: uid, status: "pending" }).lean();
  if (received) return "received";

  const friendship = await Friendship.findOne({ users: { $all: [uid, otherUid] } }).lean();
  if (friendship) return "friend";

  return "none";
}

async function copyFlashcardFolderToUser(sourceFolderId, targetUid) {
  const folder = await FlashcardFolder.findById(sourceFolderId).lean();
  if (!folder) throw new Error("Không tìm thấy thư mục flashcard được chia sẻ.");

  const newFolder = await FlashcardFolder.create({
    userId: targetUid,
    name: `${folder.name || "Thư mục flashcard"} (đã lưu)`,
    color: folder.color || "bg-blue-500",
    sourceFolderId,
  });

  const sets = await FlashcardSet.find({ folderId: sourceFolderId }).lean();

  let copiedSets = 0;
  let copiedCards = 0;

  for (const set of sets) {
    const newSet = await FlashcardSet.create({
      userId: targetUid,
      folderId: newFolder._id,
      title: `${set.title || "Bộ thẻ"}`,
      description: set.description || "",
      cardCount: 0,
      learnedCount: 0,
      color: set.color || folder.color || "bg-blue-500",
      isNew: true,
      isPublic: false,
      sourceSetId: set._id,
    });

    copiedSets += 1;
    const cards = await Flashcard.find({ setId: set._id }).lean();

    if (cards.length > 0) {
      const newCards = cards.map((card) => ({
        setId: newSet._id,
        userId: targetUid,
        term: card.term || "",
        phonetic: card.phonetic || "",
        translation: card.translation || "",
        examples: card.examples || [],
        notes: card.notes || "",
        isLearned: false,
        sourceCardId: card._id,
      }));

      await Flashcard.insertMany(newCards);

      copiedCards += cards.length;
      newSet.cardCount = cards.length;
      await newSet.save();
    }
  }

  return { folderId: newFolder._id, copiedSets, copiedCards };
}

async function buildFlashcardFolderPreview(folderId) {
  const folder = await FlashcardFolder.findById(folderId).lean();
  if (!folder) throw new Error("Không tìm thấy thư mục flashcard.");

  const sets = await FlashcardSet.find({ folderId }).lean();
  const setsPreview = [];
  let totalCards = 0;

  for (const set of sets) {
    const cards = await Flashcard.find({ setId: set._id }).limit(50).lean();
    totalCards += cards.length;
    setsPreview.push({ id: set._id, ...set, cards: cards.map((c) => ({ id: c._id, ...c })) });
  }

  return {
    type: "flashcard_folder",
    folder: { id: folder._id, ...folder },
    sets: setsPreview,
    totalSets: setsPreview.length,
    totalCards,
  };
}

async function buildQuizPreview(quizId) {
  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz) throw new Error("Không tìm thấy quiz.");
  return { type: "quiz", quiz: { id: quiz._id, ...quiz } };
}

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const query = String(req.query.q || "")
      .trim()
      .toLowerCase();
    if (query.length < 2) return res.json([]);

    const usersDocs = await User.find({
      $or: [{ displayName: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }, { username: { $regex: query, $options: "i" } }],
    })
      .limit(20)
      .lean();

    const users = [];
    for (const user of usersDocs) {
      if (user._id.toString() === req.user.uid) continue;
      const status = await getRequestStatus(req.user.uid, user._id.toString());
      users.push({ ...publicUserFromDoc(user), friendStatus: status });
    }

    res.json(users);
  }),
);

router.get(
  "/list",
  asyncHandler(async (req, res) => {
    const friendships = await Friendship.find({ users: req.user.uid }).lean();

    const friends = [];
    for (const doc of friendships) {
      const friendId = doc.users.find((id) => id.toString() !== req.user.uid);
      const friend = await getPublicUser(friendId);
      if (friend) {
        friends.push({
          friendshipId: doc._id,
          friendId,
          ...friend,
          createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
        });
      }
    }

    res.json(friends);
  }),
);

router.get(
  "/online",
  asyncHandler(async (req, res) => {
    const friendships = await Friendship.find({ users: req.user.uid }).lean();
    const userSockets = req.app.get("userSockets");
    if (!userSockets) return res.json([]);

    const onlineFriends = [];
    for (const doc of friendships) {
      const friendId = doc.users.find((id) => id.toString() !== req.user.uid);
      if (friendId && userSockets.has(friendId.toString())) {
        const friend = await getPublicUser(friendId);
        if (friend) {
          onlineFriends.push({
            friendshipId: doc._id,
            friendId,
            ...friend,
          });
        }
      }
    }
    res.json(onlineFriends);
  }),
);

router.get(
  "/requests",
  asyncHandler(async (req, res) => {
    const incomingDocs = await FriendRequest.find({ toId: req.user.uid, status: "pending" }).lean();
    const outgoingDocs = await FriendRequest.find({ fromId: req.user.uid, status: "pending" }).lean();

    const incoming = [];
    for (const doc of incomingDocs) {
      const item = serializeDoc(doc);
      incoming.push({ ...item, user: await getPublicUser(item.fromId) });
    }

    const outgoing = [];
    for (const doc of outgoingDocs) {
      const item = serializeDoc(doc);
      outgoing.push({ ...item, user: await getPublicUser(item.toId) });
    }

    res.json({ incoming, outgoing });
  }),
);

router.post(
  "/request",
  asyncHandler(async (req, res) => {
    const { userId } = req.body;
    if (!userId || userId === req.user.uid) return res.status(400).json({ error: "Người nhận không hợp lệ." });

    const target = await getPublicUser(userId);
    const me = await getPublicUser(req.user.uid);
    if (!target) return res.status(404).json({ error: "Không tìm thấy người dùng." });

    if (await ensureFriendship(req.user.uid, userId)) return res.status(400).json({ error: "Hai bạn đã là bạn bè." });

    const reverse = await FriendRequest.findOne({ fromId: userId, toId: req.user.uid, status: "pending" });
    if (reverse) {
      reverse.status = "accepted";
      await reverse.save();

      await Friendship.create({ users: [req.user.uid, userId] });
      await createNotification(req.app, userId, "friend_accept", "Đã chấp nhận kết bạn", `${me?.displayName || "Một học viên"} đã chấp nhận lời mời kết bạn.`, req.user.uid);
      return res.json({ status: "accepted" });
    }

    const existing = await FriendRequest.findOne({ fromId: req.user.uid, toId: userId, status: "pending" });
    if (existing) return res.status(400).json({ error: "Bạn đã gửi lời mời trước đó." });

    const docRef = await FriendRequest.create({
      fromId: req.user.uid,
      toId: userId,
      status: "pending",
    });

    await createNotification(req.app, userId, "friend_request", "Lời mời kết bạn mới", `${me?.displayName || "Một học viên"} muốn kết bạn với bạn.`, req.user.uid);

    res.json({ id: docRef._id, status: "pending" });
  }),
);

router.post(
  "/unfriend/:friendId",
  asyncHandler(async (req, res) => {
    const { friendId } = req.params;
    if (!(await ensureFriendship(req.user.uid, friendId))) {
      return res.status(400).json({ error: "Hai bạn chưa là bạn bè." });
    }

    await Friendship.deleteOne({ users: { $all: [req.user.uid, friendId] } });
    res.json({ success: true, status: "none" });
  }),
);

router.post(
  "/request/:id/respond",
  asyncHandler(async (req, res) => {
    const { action } = req.body;
    if (!["accept", "decline"].includes(action)) return res.status(400).json({ error: "Hành động không hợp lệ." });

    const request = await FriendRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Không tìm thấy lời mời." });

    if (request.toId.toString() !== req.user.uid) return res.status(403).json({ error: "Bạn không có quyền xử lý lời mời này." });
    if (request.status !== "pending") return res.status(400).json({ error: "Lời mời này đã được xử lý." });

    const me = await getPublicUser(req.user.uid);
    const nextStatus = action === "accept" ? "accepted" : "declined";

    request.status = nextStatus;
    await request.save();

    if (action === "accept") {
      await Friendship.create({ users: [req.user.uid, request.fromId] });
      await createNotification(req.app, request.fromId.toString(), "friend_accept", "Bạn có bạn mới", `${me?.displayName || "Một học viên"} đã chấp nhận lời mời kết bạn.`, req.user.uid);
    }

    res.json({ status: nextStatus });
  }),
);

router.get(
  "/messages/:friendId",
  asyncHandler(async (req, res) => {
    const { friendId } = req.params;
    if (!(await ensureFriendship(req.user.uid, friendId))) return res.status(403).json({ error: "Hai bạn chưa là bạn bè." });

    const chatId = pairId(req.user.uid, friendId);
    const messagesDocs = await FriendMessage.find({ chatId }).sort({ createdAt: 1 }).limit(150).lean();

    res.json(messagesDocs.map(serializeDoc));
  }),
);

router.post(
  "/messages/:friendId",
  asyncHandler(async (req, res) => {
    const { friendId } = req.params;
    const text = String(req.body.text || "").trim();

    if (!text) return res.status(400).json({ error: "Tin nhắn đang trống." });
    if (!(await ensureFriendship(req.user.uid, friendId))) return res.status(403).json({ error: "Hai bạn chưa là bạn bè." });

    const me = await getPublicUser(req.user.uid);
    const docRef = await FriendMessage.create({
      chatId: pairId(req.user.uid, friendId),
      senderId: req.user.uid,
      receiverId: friendId,
      type: "text",
      text,
    });

    // await createNotification(req.app, friendId, "friend_message", "Tin nhắn mới", `${me?.displayName || "Bạn bè"}: ${text.slice(0, 80)}`, req.user.uid);

    const payload = {
      id: docRef._id,
      type: "text",
      text,
      senderId: req.user.uid,
      receiverId: friendId,
      createdAt: docRef.createdAt.toISOString(),
    };

    const io = req.app.get("io");
    const userSockets = req.app.get("userSockets");
    if (io && userSockets) {
      const friendSocketId = userSockets.get(friendId);
      if (friendSocketId) {
        io.to(friendSocketId).emit("receive_message", payload);
      }
    }

    res.json(payload);
  }),
);

router.get(
  "/share-options",
  asyncHandler(async (req, res) => {
    const folders = await FlashcardFolder.find({ userId: req.user.uid }).lean();
    const foldersWithCount = [];

    for (const folder of folders) {
      const setCount = await FlashcardSet.countDocuments({ folderId: folder._id });
      foldersWithCount.push({ id: folder._id, ...folder, setCount });
    }

    const quizzes = await Quiz.find({ creatorId: req.user.uid }).limit(50).lean();
    const quizzesFormatted = quizzes.map((q) => ({
      id: q._id,
      ...q,
      questionCount: q.questions?.length || 0,
    }));

    res.json({ folders: foldersWithCount, quizzes: quizzesFormatted });
  }),
);

router.post(
  "/share",
  asyncHandler(async (req, res) => {
    const { friendId, type, itemId, text = "" } = req.body;

    if (!["flashcard_folder", "quiz"].includes(type)) return res.status(400).json({ error: "Loại chia sẻ không hợp lệ." });
    if (!(await ensureFriendship(req.user.uid, friendId))) return res.status(403).json({ error: "Hai bạn chưa là bạn bè." });

    let share;
    if (type === "flashcard_folder") {
      const folder = await FlashcardFolder.findById(itemId).lean();
      if (!folder || folder.userId.toString() !== req.user.uid) return res.status(404).json({ error: "Không tìm thấy thư mục flashcard." });

      const preview = await buildFlashcardFolderPreview(itemId);
      share = {
        type,
        itemId,
        ownerId: req.user.uid,
        title: folder.name || "Thư mục flashcard",
        summary: `${preview.totalSets} bộ thẻ • ${preview.totalCards} thẻ`,
      };
    } else {
      const quiz = await Quiz.findById(itemId).lean();
      if (!quiz || quiz.creatorId !== req.user.uid) return res.status(404).json({ error: "Không tìm thấy quiz của bạn." });

      share = {
        type,
        itemId,
        ownerId: req.user.uid,
        title: quiz.title || "Quiz",
        summary: `${quiz.questions?.length || 0} câu hỏi • ${quiz.difficulty || "Medium"}`,
      };
    }

    const me = await getPublicUser(req.user.uid);
    const docRef = await FriendMessage.create({
      chatId: pairId(req.user.uid, friendId),
      senderId: req.user.uid,
      receiverId: friendId,
      type: "share",
      text: String(text || ""),
      share,
      savedBy: [],
    });

    await createNotification(
      req.app,
      friendId,
      "friend_share",
      "Bạn nhận được nội dung học tập",
      `${me?.displayName || "Bạn bè"} đã chia sẻ ${type === "flashcard_folder" ? "thư mục flashcard" : "quiz"}: ${share.title}`,
      docRef._id.toString(),
    );

    const payload = {
      id: docRef._id,
      type: "share",
      text,
      share,
      senderId: req.user.uid,
      receiverId: friendId,
      createdAt: docRef.createdAt.toISOString(),
    };

    const io = req.app.get("io");
    const userSockets = req.app.get("userSockets");
    if (io && userSockets) {
      const friendSocketId = userSockets.get(friendId);
      if (friendSocketId) {
        io.to(friendSocketId).emit("receive_message", payload);
      }
    }

    res.json(payload);
  }),
);

router.get(
  "/share/:messageId/preview",
  asyncHandler(async (req, res) => {
    const msg = await FriendMessage.findById(req.params.messageId).lean();
    if (!msg) return res.status(404).json({ error: "Không tìm thấy nội dung chia sẻ." });

    if (![msg.senderId.toString(), msg.receiverId.toString()].includes(req.user.uid)) {
      return res.status(403).json({ error: "Bạn không có quyền xem nội dung này." });
    }

    if (msg.type !== "share" || !msg.share) {
      return res.status(400).json({ error: "Tin nhắn này không phải nội dung chia sẻ." });
    }

    const preview = msg.share.type === "flashcard_folder" ? await buildFlashcardFolderPreview(msg.share.itemId) : await buildQuizPreview(msg.share.itemId);

    const saved = Array.isArray(msg.savedBy) && msg.savedBy.some((id) => id.toString() === req.user.uid);
    res.json({ messageId: msg._id, share: msg.share, preview, saved });
  }),
);

router.post(
  "/share/:messageId/save",
  asyncHandler(async (req, res) => {
    const msg = await FriendMessage.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ error: "Không tìm thấy nội dung chia sẻ." });

    if (![msg.senderId.toString(), msg.receiverId.toString()].includes(req.user.uid)) {
      return res.status(403).json({ error: "Bạn không có quyền lưu nội dung này." });
    }

    if (msg.type !== "share" || !msg.share) {
      return res.status(400).json({ error: "Tin nhắn này không phải nội dung chia sẻ." });
    }

    if (Array.isArray(msg.savedBy) && msg.savedBy.some((id) => id.toString() === req.user.uid)) {
      return res.status(400).json({ error: "Bạn đã lưu nội dung này rồi." });
    }

    let result;
    if (msg.share.type === "flashcard_folder") {
      result = await copyFlashcardFolderToUser(msg.share.itemId, req.user.uid);
    } else {
      const quiz = await Quiz.findById(msg.share.itemId).lean();
      if (!quiz) throw new Error("Không tìm thấy quiz được chia sẻ.");

      const newQuiz = await Quiz.create({
        title: `${quiz.title || "Quiz"} (đã lưu)`,
        description: quiz.description || "",
        difficulty: quiz.difficulty || "Medium",
        duration: quiz.duration || 15,
        questions: quiz.questions || [],
        creatorId: req.user.uid,
        sourceQuizId: msg.share.itemId,
      });
      result = { quizId: newQuiz._id, copiedQuestions: quiz.questions?.length || 0 };
    }

    msg.savedBy.push(req.user.uid);
    await msg.save();

    res.json({ success: true, result });
  }),
);

export default router;
