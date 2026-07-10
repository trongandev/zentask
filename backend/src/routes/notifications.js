import { Router } from "express";
import { Notification } from "../models/Schemas.js";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.use(verifyToken);

// Get notifications
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const notificationsDocs = await Notification.find({ receiverId: req.user.uid }).sort({ createdAt: -1 }).limit(50).lean();

    const notifications = notificationsDocs.map((doc) => ({
      id: doc._id,
      ...doc,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    }));

    res.json(notifications);
  }),
);

// Mark all as read
router.put(
  "/read-all",
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ receiverId: req.user.uid, isRead: false }, { $set: { isRead: true } });

    res.json({ status: "success" });
  }),
);

// Mark specific as read
router.put(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notif = await Notification.findById(req.params.id);

    if (!notif) return res.status(404).json({ error: "Not found" });
    if (notif.receiverId.toString() !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

    notif.isRead = true;
    await notif.save();

    res.json({ status: "success" });
  }),
);

export default router;
