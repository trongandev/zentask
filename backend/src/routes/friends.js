import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { auth, db } from "../firebase.js";
import { createNotification } from "../utils/notifications.js";

const router = Router();

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

function pairId(a, b) {
  return [a, b].sort().join("__");
}

function serializeDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || null,
  };
}

function publicUserFromDoc(doc) {
  const data = doc.data() || {};
  return {
    uid: doc.id,
    displayName: data.displayName || data.email || "Học viên",
    email: data.email || "",
    photoURL: data.photoURL || "",
    username: data.username || "",
    level: data.level || 1,
    xp: data.xp || 0,
  };
}

async function getPublicUser(uid) {
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists) return null;
  return publicUserFromDoc(doc);
}

async function ensureFriendship(uid, friendId) {
  if (!friendId || uid === friendId) return false;
  const doc = await db.collection("friendships").doc(pairId(uid, friendId)).get();
  return doc.exists && Array.isArray(doc.data().users) && doc.data().users.includes(uid) && doc.data().users.includes(friendId);
}

async function getRequestStatus(uid, otherUid) {
  const sent = await db.collection("friend_requests")
    .where("fromId", "==", uid)
    .where("toId", "==", otherUid)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!sent.empty) return "sent";

  const received = await db.collection("friend_requests")
    .where("fromId", "==", otherUid)
    .where("toId", "==", uid)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!received.empty) return "received";

  const friendship = await db.collection("friendships").doc(pairId(uid, otherUid)).get();
  if (friendship.exists) return "friend";
  return "none";
}

async function copyFlashcardFolderToUser(sourceFolderId, targetUid) {
  const folderDoc = await db.collection("flashcard_folders").doc(sourceFolderId).get();
  if (!folderDoc.exists) throw new Error("Không tìm thấy thư mục flashcard được chia sẻ.");
  const folderData = folderDoc.data();

  const folderRef = await db.collection("flashcard_folders").add({
    userId: targetUid,
    name: `${folderData.name || "Thư mục flashcard"} (đã lưu)`,
    color: folderData.color || "bg-blue-500",
    sourceFolderId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const setsSnapshot = await db.collection("flashcard_sets")
    .where("folderId", "==", sourceFolderId)
    .get();

  let copiedSets = 0;
  let copiedCards = 0;

  for (const setDoc of setsSnapshot.docs) {
    const setData = setDoc.data();
    const newSetRef = await db.collection("flashcard_sets").add({
      userId: targetUid,
      folderId: folderRef.id,
      title: `${setData.title || "Bộ thẻ"}`,
      description: setData.description || "",
      cardCount: 0,
      learnedCount: 0,
      lastStudied: null,
      color: setData.color || folderData.color || "bg-blue-500",
      isNew: true,
      isPublic: false,
      sourceSetId: setDoc.id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    copiedSets += 1;
    const cardsSnapshot = await db.collection("flashcards").where("setId", "==", setDoc.id).get();
    let setCardCount = 0;
    const batch = db.batch();
    cardsSnapshot.docs.forEach((cardDoc) => {
      const card = cardDoc.data();
      const newCardRef = db.collection("flashcards").doc();
      batch.set(newCardRef, {
        setId: newSetRef.id,
        userId: targetUid,
        term: card.term || "",
        phonetic: card.phonetic || "",
        translation: card.translation || "",
        examples: card.examples || [],
        notes: card.notes || "",
        isLearned: false,
        sourceCardId: cardDoc.id,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      copiedCards += 1;
      setCardCount += 1;
    });
    if (setCardCount > 0) await batch.commit();
    await newSetRef.update({ cardCount: setCardCount, updatedAt: FieldValue.serverTimestamp() });
  }

  return { folderId: folderRef.id, copiedSets, copiedCards };
}

async function buildFlashcardFolderPreview(folderId) {
  const folderDoc = await db.collection("flashcard_folders").doc(folderId).get();
  if (!folderDoc.exists) throw new Error("Không tìm thấy thư mục flashcard.");
  const folder = { id: folderDoc.id, ...folderDoc.data() };

  const setsSnapshot = await db.collection("flashcard_sets").where("folderId", "==", folderId).get();
  const sets = [];
  let totalCards = 0;

  for (const setDoc of setsSnapshot.docs) {
    const setData = setDoc.data();
    const cardsSnapshot = await db.collection("flashcards").where("setId", "==", setDoc.id).limit(50).get();
    const cards = cardsSnapshot.docs.map((cardDoc) => ({ id: cardDoc.id, ...cardDoc.data() }));
    totalCards += cards.length;
    sets.push({ id: setDoc.id, ...setData, cards });
  }

  return { type: "flashcard_folder", folder, sets, totalSets: sets.length, totalCards };
}

async function buildQuizPreview(quizId) {
  const quizDoc = await db.collection("quizzes").doc(quizId).get();
  if (!quizDoc.exists) throw new Error("Không tìm thấy quiz.");
  const quiz = { id: quizDoc.id, ...quizDoc.data() };
  return { type: "quiz", quiz };
}

router.get("/search", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim().toLowerCase();
    if (query.length < 2) return res.json([]);

    const snapshot = await db.collection("users").limit(100).get();
    const users = [];

    for (const doc of snapshot.docs) {
      if (doc.id === req.uid) continue;
      const data = doc.data() || {};
      const haystack = `${data.displayName || ""} ${data.email || ""} ${data.username || ""}`.toLowerCase();
      if (!haystack.includes(query)) continue;
      const status = await getRequestStatus(req.uid, doc.id);
      users.push({ ...publicUserFromDoc(doc), friendStatus: status });
      if (users.length >= 20) break;
    }

    res.json(users);
  } catch (error) {
    console.error("Search friends error:", error);
    res.status(500).json({ error: "Không tìm được người dùng." });
  }
});

router.get("/list", async (req, res) => {
  try {
    const snapshot = await db.collection("friendships")
      .where("users", "array-contains", req.uid)
      .get();

    const friends = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const friendId = data.users.find((id) => id !== req.uid);
      const friend = await getPublicUser(friendId);
      if (friend) friends.push({ friendshipId: doc.id, friendId, ...friend, createdAt: data.createdAt?.toDate?.().toISOString?.() || null });
    }

    res.json(friends);
  } catch (error) {
    console.error("List friends error:", error);
    res.status(500).json({ error: "Không tải được danh sách bạn bè." });
  }
});

router.get("/requests", async (req, res) => {
  try {
    const incomingSnapshot = await db.collection("friend_requests")
      .where("toId", "==", req.uid)
      .where("status", "==", "pending")
      .get();

    const outgoingSnapshot = await db.collection("friend_requests")
      .where("fromId", "==", req.uid)
      .where("status", "==", "pending")
      .get();

    const incoming = [];
    for (const doc of incomingSnapshot.docs) {
      const item = serializeDoc(doc);
      incoming.push({ ...item, user: await getPublicUser(item.fromId) });
    }

    const outgoing = [];
    for (const doc of outgoingSnapshot.docs) {
      const item = serializeDoc(doc);
      outgoing.push({ ...item, user: await getPublicUser(item.toId) });
    }

    res.json({ incoming, outgoing });
  } catch (error) {
    console.error("Friend requests error:", error);
    res.status(500).json({ error: "Không tải được lời mời kết bạn." });
  }
});

router.post("/request", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || userId === req.uid) return res.status(400).json({ error: "Người nhận không hợp lệ." });

    const target = await getPublicUser(userId);
    const me = await getPublicUser(req.uid);
    if (!target) return res.status(404).json({ error: "Không tìm thấy người dùng." });

    if (await ensureFriendship(req.uid, userId)) return res.status(400).json({ error: "Hai bạn đã là bạn bè." });

    const reverse = await db.collection("friend_requests")
      .where("fromId", "==", userId)
      .where("toId", "==", req.uid)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!reverse.empty) {
      const requestDoc = reverse.docs[0];
      await requestDoc.ref.update({ status: "accepted", updatedAt: FieldValue.serverTimestamp() });
      await db.collection("friendships").doc(pairId(req.uid, userId)).set({ users: [req.uid, userId].sort(), createdAt: FieldValue.serverTimestamp() });
      await createNotification(req.app, userId, "friend_accept", "Đã chấp nhận kết bạn", `${me?.displayName || "Một học viên"} đã chấp nhận lời mời kết bạn.`, req.uid);
      return res.json({ status: "accepted" });
    }

    const existing = await db.collection("friend_requests")
      .where("fromId", "==", req.uid)
      .where("toId", "==", userId)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existing.empty) return res.status(400).json({ error: "Bạn đã gửi lời mời trước đó." });

    const docRef = await db.collection("friend_requests").add({
      fromId: req.uid,
      toId: userId,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await createNotification(req.app, userId, "friend_request", "Lời mời kết bạn mới", `${me?.displayName || "Một học viên"} muốn kết bạn với bạn.`, docRef.id);

    res.json({ id: docRef.id, status: "pending" });
  } catch (error) {
    console.error("Send friend request error:", error);
    res.status(500).json({ error: "Không gửi được lời mời kết bạn." });
  }
});

router.post("/request/:id/respond", async (req, res) => {
  try {
    const { action } = req.body;
    if (!["accept", "decline"].includes(action)) return res.status(400).json({ error: "Hành động không hợp lệ." });

    const ref = db.collection("friend_requests").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Không tìm thấy lời mời." });
    const data = doc.data();
    if (data.toId !== req.uid) return res.status(403).json({ error: "Bạn không có quyền xử lý lời mời này." });
    if (data.status !== "pending") return res.status(400).json({ error: "Lời mời này đã được xử lý." });

    const me = await getPublicUser(req.uid);
    const nextStatus = action === "accept" ? "accepted" : "declined";
    await ref.update({ status: nextStatus, updatedAt: FieldValue.serverTimestamp() });

    if (action === "accept") {
      await db.collection("friendships").doc(pairId(req.uid, data.fromId)).set({ users: [req.uid, data.fromId].sort(), createdAt: FieldValue.serverTimestamp() });
      await createNotification(req.app, data.fromId, "friend_accept", "Bạn có bạn mới", `${me?.displayName || "Một học viên"} đã chấp nhận lời mời kết bạn.`, req.uid);
    }

    res.json({ status: nextStatus });
  } catch (error) {
    console.error("Respond friend request error:", error);
    res.status(500).json({ error: "Không xử lý được lời mời." });
  }
});

router.get("/messages/:friendId", async (req, res) => {
  try {
    const { friendId } = req.params;
    if (!(await ensureFriendship(req.uid, friendId))) return res.status(403).json({ error: "Hai bạn chưa là bạn bè." });

    const snapshot = await db.collection("friend_messages")
      .where("chatId", "==", pairId(req.uid, friendId))
      .limit(150)
      .get();

    const messages = snapshot.docs.map(serializeDoc).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    res.json(messages);
  } catch (error) {
    console.error("Get friend messages error:", error);
    res.status(500).json({ error: "Không tải được tin nhắn." });
  }
});

router.post("/messages/:friendId", async (req, res) => {
  try {
    const { friendId } = req.params;
    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ error: "Tin nhắn đang trống." });
    if (!(await ensureFriendship(req.uid, friendId))) return res.status(403).json({ error: "Hai bạn chưa là bạn bè." });

    const me = await getPublicUser(req.uid);
    const docRef = await db.collection("friend_messages").add({
      chatId: pairId(req.uid, friendId),
      senderId: req.uid,
      receiverId: friendId,
      type: "text",
      text,
      createdAt: FieldValue.serverTimestamp(),
    });

    await createNotification(req.app, friendId, "friend_message", "Tin nhắn mới", `${me?.displayName || "Bạn bè"}: ${text.slice(0, 80)}`, req.uid);

    res.json({ id: docRef.id, type: "text", text, senderId: req.uid, receiverId: friendId, createdAt: new Date().toISOString() });
  } catch (error) {
    console.error("Send friend message error:", error);
    res.status(500).json({ error: "Không gửi được tin nhắn." });
  }
});

router.get("/share-options", async (req, res) => {
  try {
    const foldersSnapshot = await db.collection("flashcard_folders").where("userId", "==", req.uid).get();
    const folders = [];
    for (const doc of foldersSnapshot.docs) {
      const folder = { id: doc.id, ...doc.data() };
      const setsSnapshot = await db.collection("flashcard_sets").where("folderId", "==", doc.id).get();
      folders.push({ ...folder, setCount: setsSnapshot.size });
    }

    const quizzesSnapshot = await db.collection("quizzes").where("creatorId", "==", req.uid).limit(50).get();
    const quizzes = quizzesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), questionCount: doc.data().questions?.length || 0 }));

    res.json({ folders, quizzes });
  } catch (error) {
    console.error("Share options error:", error);
    res.status(500).json({ error: "Không tải được nội dung có thể chia sẻ." });
  }
});

router.post("/share", async (req, res) => {
  try {
    const { friendId, type, itemId, text = "" } = req.body;
    if (!["flashcard_folder", "quiz"].includes(type)) return res.status(400).json({ error: "Loại chia sẻ không hợp lệ." });
    if (!(await ensureFriendship(req.uid, friendId))) return res.status(403).json({ error: "Hai bạn chưa là bạn bè." });

    let share;
    if (type === "flashcard_folder") {
      const folderDoc = await db.collection("flashcard_folders").doc(itemId).get();
      if (!folderDoc.exists || folderDoc.data().userId !== req.uid) return res.status(404).json({ error: "Không tìm thấy thư mục flashcard." });
      const preview = await buildFlashcardFolderPreview(itemId);
      share = {
        type,
        itemId,
        ownerId: req.uid,
        title: folderDoc.data().name || "Thư mục flashcard",
        summary: `${preview.totalSets} bộ thẻ • ${preview.totalCards} thẻ`,
      };
    } else {
      const quizDoc = await db.collection("quizzes").doc(itemId).get();
      if (!quizDoc.exists || quizDoc.data().creatorId !== req.uid) return res.status(404).json({ error: "Không tìm thấy quiz của bạn." });
      const quiz = quizDoc.data();
      share = {
        type,
        itemId,
        ownerId: req.uid,
        title: quiz.title || "Quiz",
        summary: `${quiz.questions?.length || 0} câu hỏi • ${quiz.difficulty || "Medium"}`,
      };
    }

    const me = await getPublicUser(req.uid);
    const docRef = await db.collection("friend_messages").add({
      chatId: pairId(req.uid, friendId),
      senderId: req.uid,
      receiverId: friendId,
      type: "share",
      text: String(text || ""),
      share,
      savedBy: [],
      createdAt: FieldValue.serverTimestamp(),
    });

    await createNotification(req.app, friendId, "friend_share", "Bạn nhận được nội dung học tập", `${me?.displayName || "Bạn bè"} đã chia sẻ ${type === "flashcard_folder" ? "thư mục flashcard" : "quiz"}: ${share.title}`, docRef.id);

    res.json({ id: docRef.id, type: "share", text, share, senderId: req.uid, receiverId: friendId, createdAt: new Date().toISOString() });
  } catch (error) {
    console.error("Share content error:", error);
    res.status(500).json({ error: error.message || "Không chia sẻ được nội dung." });
  }
});

router.get("/share/:messageId/preview", async (req, res) => {
  try {
    const msgDoc = await db.collection("friend_messages").doc(req.params.messageId).get();
    if (!msgDoc.exists) return res.status(404).json({ error: "Không tìm thấy nội dung chia sẻ." });
    const msg = msgDoc.data();
    if (![msg.senderId, msg.receiverId].includes(req.uid)) return res.status(403).json({ error: "Bạn không có quyền xem nội dung này." });
    if (msg.type !== "share" || !msg.share) return res.status(400).json({ error: "Tin nhắn này không phải nội dung chia sẻ." });

    const preview = msg.share.type === "flashcard_folder"
      ? await buildFlashcardFolderPreview(msg.share.itemId)
      : await buildQuizPreview(msg.share.itemId);

    res.json({ messageId: msgDoc.id, share: msg.share, preview, saved: Array.isArray(msg.savedBy) && msg.savedBy.includes(req.uid) });
  } catch (error) {
    console.error("Preview share error:", error);
    res.status(500).json({ error: error.message || "Không xem trước được nội dung." });
  }
});

router.post("/share/:messageId/save", async (req, res) => {
  try {
    const msgRef = db.collection("friend_messages").doc(req.params.messageId);
    const msgDoc = await msgRef.get();
    if (!msgDoc.exists) return res.status(404).json({ error: "Không tìm thấy nội dung chia sẻ." });
    const msg = msgDoc.data();
    if (![msg.senderId, msg.receiverId].includes(req.uid)) return res.status(403).json({ error: "Bạn không có quyền lưu nội dung này." });
    if (msg.type !== "share" || !msg.share) return res.status(400).json({ error: "Tin nhắn này không phải nội dung chia sẻ." });
    if (Array.isArray(msg.savedBy) && msg.savedBy.includes(req.uid)) return res.status(400).json({ error: "Bạn đã lưu nội dung này rồi." });

    let result;
    if (msg.share.type === "flashcard_folder") {
      result = await copyFlashcardFolderToUser(msg.share.itemId, req.uid);
    } else {
      const quizDoc = await db.collection("quizzes").doc(msg.share.itemId).get();
      if (!quizDoc.exists) throw new Error("Không tìm thấy quiz được chia sẻ.");
      const quiz = quizDoc.data();
      const newQuizRef = await db.collection("quizzes").add({
        title: `${quiz.title || "Quiz"} (đã lưu)`,
        description: quiz.description || "",
        difficulty: quiz.difficulty || "Medium",
        duration: quiz.duration || 15,
        questions: quiz.questions || [],
        creatorId: req.uid,
        sourceQuizId: msg.share.itemId,
        createdAt: FieldValue.serverTimestamp(),
      });
      result = { quizId: newQuizRef.id, copiedQuestions: quiz.questions?.length || 0 };
    }

    await msgRef.update({ savedBy: FieldValue.arrayUnion(req.uid), updatedAt: FieldValue.serverTimestamp() });
    res.json({ success: true, result });
  } catch (error) {
    console.error("Save share error:", error);
    res.status(500).json({ error: error.message || "Không lưu được nội dung." });
  }
});

export default router;
