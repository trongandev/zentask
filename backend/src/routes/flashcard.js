import { Router } from "express";
import { auth, db } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { addXpToUser, incrementDailyTask } from "./user.js";

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

// List flashcard sets for the user
router.get("/list", async (req, res) => {
  try {
    const snapshot = await db.collection("flashcard_sets")
      .where("userId", "==", req.uid)
      .orderBy("createdAt", "desc")
      .get();
    
    const sets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(sets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch flashcard sets" });
  }
});

// Create a new flashcard set
router.post("/set", async (req, res) => {
  try {
    const { title, description = "", color = "bg-blue-500" } = req.body;
    
    if (!title) return res.status(400).json({ error: "Title is required" });
    
    const newSet = {
      userId: req.uid,
      title,
      description,
      cardCount: 0,
      learnedCount: 0,
      lastStudied: null,
      color,
      isNew: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection("flashcard_sets").add(newSet);
    res.json({ id: docRef.id, ...newSet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create flashcard set" });
  }
});

// Get a flashcard set and its cards
router.get("/set/:setId/cards", async (req, res) => {
  try {
    const { setId } = req.params;
    
    // Check if set belongs to user
    const setDoc = await db.collection("flashcard_sets").doc(setId).get();
    if (!setDoc.exists || setDoc.data().userId !== req.uid) {
      return res.status(404).json({ error: "Flashcard set not found" });
    }
    
    const snapshot = await db.collection("flashcards")
      .where("setId", "==", setId)
      .orderBy("createdAt", "desc")
      .get();
      
    const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ set: { id: setDoc.id, ...setDoc.data() }, cards });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch flashcards" });
  }
});

// Create a flashcard
router.post("/set/:setId/card", async (req, res) => {
  try {
    const { setId } = req.params;
    const { term, phonetic, translation, examples, notes } = req.body;
    
    // Verify ownership
    const setRef = db.collection("flashcard_sets").doc(setId);
    const setDoc = await setRef.get();
    if (!setDoc.exists || setDoc.data().userId !== req.uid) {
      return res.status(404).json({ error: "Flashcard set not found" });
    }
    
    const newCard = {
      setId,
      userId: req.uid,
      term,
      phonetic: phonetic || "",
      translation,
      examples: examples || [],
      notes: notes || "",
      isLearned: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection("flashcards").add(newCard);
    
    // Update card count
    await setRef.update({ 
      cardCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    // Add XP for creating flashcard via Daily Task
    const taskResult = await incrementDailyTask(req.uid, 'create_material', 1);
    
    let xpResult = null;
    if (taskResult.success && taskResult.xpToAdd > 0) {
      xpResult = await addXpToUser(req.uid, taskResult.xpToAdd);
    }

    res.json({ 
      id: docRef.id, 
      ...newCard, 
      xpResult,
      taskProgress: taskResult.success ? { create_material: taskResult.progress } : {}
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create flashcard" });
  }
});

// Delete a flashcard set
router.delete("/set/:setId", async (req, res) => {
  try {
    const { setId } = req.params;
    const setRef = db.collection("flashcard_sets").doc(setId);
    const setDoc = await setRef.get();
    
    if (!setDoc.exists || setDoc.data().userId !== req.uid) {
      return res.status(404).json({ error: "Flashcard set not found" });
    }
    
    // Delete all cards in the set
    const cardsSnapshot = await db.collection("flashcards").where("setId", "==", setId).get();
    const batch = db.batch();
    cardsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the set
    batch.delete(setRef);
    await batch.commit();
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete flashcard set" });
  }
});

// Delete a flashcard
router.delete("/card/:cardId", async (req, res) => {
  try {
    const { cardId } = req.params;
    const cardRef = db.collection("flashcards").doc(cardId);
    const cardDoc = await cardRef.get();
    
    if (!cardDoc.exists || cardDoc.data().userId !== req.uid) {
      return res.status(404).json({ error: "Flashcard not found" });
    }
    
    const setId = cardDoc.data().setId;
    const setRef = db.collection("flashcard_sets").doc(setId);
    
    const batch = db.batch();
    batch.delete(cardRef);
    batch.update(setRef, {
      cardCount: FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete flashcard" });
  }
});

export default router;
