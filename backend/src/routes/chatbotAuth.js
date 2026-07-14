import { Router } from "express";
import { ZaloAuth } from "../models/Schemas.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// GET /api/chatbot-auth/info/:id
// Public endpoint for frontend to check validity of the auth link
router.get(
  "/info/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const authReq = await ZaloAuth.findOne({ authId: id }).lean();

    if (!authReq) {
      return res.status(404).json({ error: "Link uỷ quyền không tồn tại hoặc đã hết hạn." });
    }

    res.json({ success: true, authId: authReq.authId });
  }),
);

// POST /api/chatbot-auth/authorize
// Requires user login. Links the zaloId to the logged in user.
router.post(
  "/authorize",
  verifyToken,
  asyncHandler(async (req, res) => {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Missing auth id" });
    }

    const authReq = await ZaloAuth.findOne({ authId: id });
    if (!authReq) {
      return res.status(404).json({ error: "Link uỷ quyền không tồn tại hoặc đã hết hạn." });
    }

    // Find the current user
    const user = await User.findById(req.user.uid);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản user." });
    }

    // Link Zalo ID
    user.zaloId = authReq.zaloId;
    user.botState = { action: "idle" }; // Reset state
    await user.save();

    // Delete the auth request to prevent reuse
    await ZaloAuth.deleteOne({ _id: authReq._id });

    res.json({ success: true, message: "Liên kết thành công!" });
  }),
);

export default router;
