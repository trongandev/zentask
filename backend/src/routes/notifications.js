import { Router } from "express";
import { auth, db } from "../firebase.js";

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

// Get notifications
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("notifications")
      .where("receiverId", "==", req.uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
      
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt._seconds * 1000).toISOString() : new Date().toISOString()
    }));

    res.json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// Mark all as read
router.put("/read-all", async (req, res) => {
  try {
    const snapshot = await db.collection("notifications")
      .where("receiverId", "==", req.uid)
      .where("isRead", "==", false)
      .get();
      
    if (snapshot.empty) return res.json({ status: "success" });

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { isRead: true });
    });

    await batch.commit();
    res.json({ status: "success" });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// Mark specific as read
router.put("/:id/read", async (req, res) => {
  try {
    const notifRef = db.collection("notifications").doc(req.params.id);
    const doc = await notifRef.get();
    
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    if (doc.data().receiverId !== req.uid) return res.status(403).json({ error: "Forbidden" });

    await notifRef.update({ isRead: true });
    res.json({ status: "success" });
  } catch (error) {
    console.error("Mark single read error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
