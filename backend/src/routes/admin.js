import { Router } from "express";
import { auth, db } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";

const router = Router();

// Middleware to authenticate and check for admin role
const authenticateAdmin = async (req, res, next) => {
  const sessionCookie = req.cookies.session || "";
  if (!sessionCookie) return res.status(401).json({ error: "Unauthenticated" });
  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const uid = decodedClaims.uid;
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
    req.uid = uid;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthenticated" });
  }
};

router.use(authenticateAdmin);

// USERS CRUD
router.get("/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // In a real production app with a large number of users, 
    // you would use pagination with startAfter. 
    // For simplicity, we fetch all and slice, or implement basic query.
    // Fetch all for now to implement manual pagination.
    const snapshot = await db.collection("users").orderBy("createdAt", "desc").get();
    
    const allUsers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    });

    const total = allUsers.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedUsers = allUsers.slice((page - 1) * limit, page * limit);

    res.json({
      users: paginatedUsers,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Get admin users error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

router.put("/users/:uid/role", async (req, res) => {
  try {
    const { uid } = req.params;
    const { role } = req.body; // 'admin' or 'user'
    
    await db.collection("users").doc(uid).update({ role });
    res.json({ status: "success" });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// TASKS CRUD
router.get("/tasks", async (req, res) => {
  try {
    const snapshot = await db.collection("daily_tasks").orderBy("createdAt", "asc").get();
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json({ tasks });
  } catch (error) {
    console.error("Get admin tasks error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/tasks", async (req, res) => {
  try {
    const taskData = req.body;
    const docRef = await db.collection("daily_tasks").add({
      ...taskData,
      createdAt: FieldValue.serverTimestamp(),
    });
    res.json({ status: "success", id: docRef.id });
  } catch (error) {
    console.error("Add task error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

router.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const taskData = req.body;
    await db.collection("daily_tasks").doc(id).update({
      ...taskData,
      updatedAt: FieldValue.serverTimestamp(),
    });
    res.json({ status: "success" });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("daily_tasks").doc(id).delete();
    res.json({ status: "success" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// VOCAB SETS CRUD
router.get("/vocab-sets", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const snapshot = await db.collection("flashcard_sets").orderBy("createdAt", "desc").get();
    const allSets = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    });

    const total = allSets.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedSets = allSets.slice((page - 1) * limit, page * limit);

    res.json({
      items: paginatedSets,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Get admin vocab-sets error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

router.delete("/vocab-sets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete all cards in the set
    const cardsSnapshot = await db.collection("flashcards").where("setId", "==", id).get();
    const batch = db.batch();
    cardsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete the set
    const setRef = db.collection("flashcard_sets").doc(id);
    batch.delete(setRef);
    await batch.commit();

    res.json({ status: "success" });
  } catch (error) {
    console.error("Delete admin vocab-set error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// VOCAB CRUD
router.get("/vocab", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const snapshot = await db.collection("flashcards").orderBy("createdAt", "desc").get();
    const allCards = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    });

    const total = allCards.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedCards = allCards.slice((page - 1) * limit, page * limit);

    res.json({
      items: paginatedCards,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Get admin vocab error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

router.delete("/vocab/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const cardRef = db.collection("flashcards").doc(id);
    const cardDoc = await cardRef.get();

    if (cardDoc.exists) {
      const setId = cardDoc.data().setId;
      const setRef = db.collection("flashcard_sets").doc(setId);

      const batch = db.batch();
      batch.delete(cardRef);
      batch.update(setRef, {
        cardCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await batch.commit();
    }
    
    res.json({ status: "success" });
  } catch (error) {
    console.error("Delete admin vocab error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// QUIZZES CRUD
router.get("/quizzes", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const snapshot = await db.collection("quizzes").orderBy("createdAt", "desc").get();
    const allQuizzes = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        difficulty: data.difficulty,
        creatorId: data.creatorId,
        questionCount: data.questions?.length || 0,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    });

    const total = allQuizzes.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedQuizzes = allQuizzes.slice((page - 1) * limit, page * limit);

    res.json({
      items: paginatedQuizzes,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Get admin quizzes error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

router.delete("/quizzes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("quizzes").doc(id).delete();
    res.json({ status: "success" });
  } catch (error) {
    console.error("Delete admin quiz error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// QUIZ HISTORY CRUD
router.get("/quiz-history", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const snapshot = await db.collection("quiz_results").orderBy("createdAt", "desc").get();
    const allHistory = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid,
        quizId: data.quizId,
        score: data.score,
        totalCorrect: data.totalCorrect,
        totalQuestions: data.totalQuestions,
        usedRebirth: data.usedRebirth,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    });

    const total = allHistory.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedHistory = allHistory.slice((page - 1) * limit, page * limit);

    res.json({
      items: paginatedHistory,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Get admin quiz history error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
