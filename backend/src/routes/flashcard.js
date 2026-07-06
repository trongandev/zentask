import { Router } from "express";
import { auth, db } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { addXpToUser, incrementDailyTask } from "./user.js";
import { GoogleGenAI, Type } from "@google/genai";

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

// ==================== FOLDER ROUTES ====================

// List folders for user
router.get("/folders", async (req, res) => {
  try {
    const snapshot = await db.collection("flashcard_folders").where("userId", "==", req.uid).orderBy("createdAt", "desc").get();
    const folders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(folders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch folders" });
  }
});

// Create a new folder
router.post("/folder", async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: "Folder name is required" });

    const newFolder = {
      userId: req.uid,
      name,
      color: color || "bg-blue-500",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("flashcard_folders").add(newFolder);
    res.json({ id: docRef.id, ...newFolder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create folder" });
  }
});

// Update a folder
router.patch("/folder/:folderId", async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name, color } = req.body;
    
    const folderRef = db.collection("flashcard_folders").doc(folderId);
    const folderDoc = await folderRef.get();
    
    if (!folderDoc.exists || folderDoc.data().userId !== req.uid) {
      return res.status(404).json({ error: "Folder not found" });
    }
    
    const updates = { updatedAt: FieldValue.serverTimestamp() };
    if (name) updates.name = name;
    if (color) updates.color = color;
    
    await folderRef.update(updates);
    
    res.json({ success: true, updates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update folder" });
  }
});

// Delete a folder
router.delete("/folder/:folderId", async (req, res) => {
  try {
    const { folderId } = req.params;
    const { deleteSets } = req.query; // ?deleteSets=true

    const folderRef = db.collection("flashcard_folders").doc(folderId);
    const folderDoc = await folderRef.get();
    
    if (!folderDoc.exists || folderDoc.data().userId !== req.uid) {
      return res.status(404).json({ error: "Folder not found" });
    }

    const batch = db.batch();

    // Handle sets in this folder
    const setsSnapshot = await db.collection("flashcard_sets").where("folderId", "==", folderId).get();
    
    if (deleteSets === "true") {
      // Delete all sets and their flashcards
      for (const setDoc of setsSnapshot.docs) {
        // Delete flashcards in this set
        const cardsSnapshot = await db.collection("flashcards").where("setId", "==", setDoc.id).get();
        cardsSnapshot.docs.forEach((card) => {
          batch.delete(card.ref);
        });
        // Delete the set
        batch.delete(setDoc.ref);
      }
    } else {
      // Unassign sets (move to root)
      setsSnapshot.docs.forEach((setDoc) => {
        batch.update(setDoc.ref, { folderId: null, updatedAt: FieldValue.serverTimestamp() });
      });
    }

    // Delete the folder itself
    batch.delete(folderRef);
    await batch.commit();

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete folder" });
  }
});

// ==================== SET ROUTES ====================

// List flashcard sets for the user
router.get("/list", async (req, res) => {
  try {
    const snapshot = await db.collection("flashcard_sets").where("userId", "==", req.uid).orderBy("createdAt", "desc").get();

    const sets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("flashcard_sets").add(newSet);
    res.json({ id: docRef.id, ...newSet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create flashcard set" });
  }
});

// Update a flashcard set
router.patch("/set/:setId", async (req, res) => {
  try {
    const { setId } = req.params;
    const { title, description, color, folderId, order } = req.body;
    
    const setRef = db.collection("flashcard_sets").doc(setId);
    const setDoc = await setRef.get();
    
    if (!setDoc.exists || setDoc.data().userId !== req.uid) {
      return res.status(404).json({ error: "Flashcard set not found" });
    }
    
    const updates = { updatedAt: FieldValue.serverTimestamp() };
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (color) updates.color = color;
    if (folderId !== undefined) updates.folderId = folderId; // allows null for root
    if (order !== undefined) updates.order = order;
    
    await setRef.update(updates);
    
    res.json({ success: true, updates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update flashcard set" });
  }
});

// Get a flashcard set and its cards
router.get("/set/:setId/cards", async (req, res) => {
  try {
    const { setId } = req.params;

    // Check if set belongs to user
    const setRef = db.collection("flashcard_sets").doc(setId);
    const setDoc = await setRef.get();
    
    if (!setDoc.exists || setDoc.data().userId !== req.uid) {
      return res.status(404).json({ error: "Flashcard set not found" });
    }

    const setData = setDoc.data();

    // Mark as not new after being viewed
    if (setData.isNew) {
      await setRef.update({ 
        isNew: false,
        updatedAt: FieldValue.serverTimestamp() 
      });
      setData.isNew = false;
    }

    const snapshot = await db.collection("flashcards").where("setId", "==", setId).orderBy("createdAt", "desc").get();

    const cards = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ set: { id: setDoc.id, ...setData }, cards });
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
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("flashcards").add(newCard);

    // Update card count
    await setRef.update({
      cardCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Add XP for creating flashcard via Daily Task
    const taskResult = await incrementDailyTask(req.uid, "create_material", 1);

    let xpResult = null;
    if (taskResult.success && taskResult.xpToAdd > 0) {
      xpResult = await addXpToUser(req.uid, taskResult.xpToAdd);
    }

    res.json({
      id: docRef.id,
      ...newCard,
      xpResult,
      taskProgress: taskResult.success ? { create_material: taskResult.progress } : {},
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
    cardsSnapshot.docs.forEach((doc) => {
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
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete flashcard" });
  }
});

// AI flashcard generation
router.post("/generate-ai", async (req, res) => {
  try {
    const { term } = req.body;
    if (!term) return res.status(400).json({ error: "Term is required" });

    const lowercaseTerm = term.trim().toLowerCase();

    // Check if it exists in vocabulary
    const vocabRef = db.collection("vocabulary").doc(lowercaseTerm);
    const vocabDoc = await vocabRef.get();

    if (vocabDoc.exists) {
      return res.json({ source: "cache", ...vocabDoc.data() });
    }

    // Generate with AI
    // Get all available API keys
    const availableKeys = [];
    for (let i = 1; i <= 10; i++) {
      const k = process.env[`API_KEY_AI_${i}`];
      if (k) availableKeys.push({ index: i, key: k });
    }

    if (availableKeys.length === 0) {
      return res.status(500).json({ error: "No AI API Keys configured" });
    }

    // Shuffle the keys to distribute the load evenly
    const shuffledKeys = availableKeys.sort(() => Math.random() - 0.5);

    const prompt = `Hãy đóng vai một từ điển Anh-Việt. Từ cần tra cứu là: "${term}".
Vui lòng trả về kết quả với các thông tin sau:
- term: nếu là tiếng việt thì chuyển nó về tiếng anh (viết hoa chữ cái đầu tiên nhé)
- phonetic: Phiên âm quốc tế (IPA) của từ tiếng Anh này.
- translation: Nghĩa tiếng Việt của từ này.
- notes: Ghi chú ngữ pháp hoặc cách dùng từ (viết bằng tiếng Việt).
- examples: Mảng gồm đúng 3 câu ví dụ. Mỗi ví dụ có "en" (câu tiếng Anh chứa từ đó) và "vi" (câu dịch sang tiếng Việt).`;

    let generatedData = null;

    for (const { index, key } of shuffledKeys) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                translation: { type: Type.STRING },
                notes: { type: Type.STRING },
                examples: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      en: { type: Type.STRING },
                      vi: { type: Type.STRING },
                    },
                    required: ["en", "vi"],
                  },
                },
              },
              required: ["term", "phonetic", "translation", "examples"],
            },
          },
        });
        
        const responseText = response.text;
        generatedData = JSON.parse(responseText);
        break; // Success! Exit the loop
      } catch (err) {
        console.warn(`[AI Generation] Key API_KEY_AI_${index} failed:`, err.message);
        // Continue to the next key in the loop
      }
    }

    if (!generatedData) {
      return res.status(500).json({ error: "All AI API keys failed to generate content or parse response." });
    }

    if (!generatedData.notes) generatedData.notes = "";

    const newVocab = {
      term: generatedData.term,
      phonetic: generatedData.phonetic,
      translation: generatedData.translation,
      notes: generatedData.notes,
      examples: generatedData.examples,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await vocabRef.set(newVocab);

    res.json({ source: "ai", ...newVocab });
  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate content" });
  }
});

// Clone a public set
router.post("/set/:setId/clone", async (req, res) => {
  try {
    const { setId } = req.params;

    const setRef = db.collection("flashcard_sets").doc(setId);
    const setDoc = await setRef.get();

    if (!setDoc.exists) return res.status(404).json({ error: "Flashcard set not found" });

    const setData = setDoc.data();

    if (!setData.isPublic && setData.userId !== req.uid) {
      return res.status(403).json({ error: "This set is not public" });
    }

    const newSet = {
      userId: req.uid,
      title: `${setData.title} (Clone)`,
      description: setData.description || "",
      cardCount: setData.cardCount || 0,
      learnedCount: 0,
      lastStudied: null,
      color: setData.color || "bg-blue-500",
      isNew: true,
      isPublic: false,
      clonedFrom: setId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const newSetRef = await db.collection("flashcard_sets").add(newSet);

    const cardsSnapshot = await db.collection("flashcards").where("setId", "==", setId).get();

    if (!cardsSnapshot.empty) {
      const batch = db.batch();

      cardsSnapshot.docs.forEach((doc) => {
        const cardData = doc.data();
        const newCardRef = db.collection("flashcards").doc();
        batch.set(newCardRef, {
          setId: newSetRef.id,
          userId: req.uid,
          term: cardData.term,
          phonetic: cardData.phonetic || "",
          translation: cardData.translation,
          examples: cardData.examples || [],
          notes: cardData.notes || "",
          isLearned: false,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
    }

    res.json({ id: newSetRef.id, ...newSet });
  } catch (error) {
    console.error("Clone Error:", error);
    res.status(500).json({ error: "Failed to clone flashcard set" });
  }
});

// Update set privacy
router.patch("/set/:setId/privacy", async (req, res) => {
  try {
    const { setId } = req.params;
    const { isPublic } = req.body;

    const setRef = db.collection("flashcard_sets").doc(setId);
    const setDoc = await setRef.get();

    if (!setDoc.exists || setDoc.data().userId !== req.uid) {
      return res.status(404).json({ error: "Flashcard set not found" });
    }

    await setRef.update({
      isPublic: !!isPublic,
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({ success: true, isPublic: !!isPublic });
  } catch (error) {
    console.error("Privacy Update Error:", error);
    res.status(500).json({ error: "Failed to update set privacy" });
  }
});

export default router;
