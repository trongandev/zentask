import { Router } from "express";
import { ZaloAuth } from "../models/Schemas.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getApi } from "./chatbot.js";
import { parseMarkdownToZalo } from "../../utils/util.js";

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

    // Send welcome message
    const api = getApi();
    if (api) {
      const welcomeMsg = `🎉 **Liên kết tài khoản thành công!** 🎉\n\nChào mừng ${user.displayName} đã kết nối tài khoản ZenTask với Zalo!\nTừ bây giờ, Mentor Lopy sẽ đồng hành cùng bạn học tiếng Anh mỗi ngày nhé.\n\n📚 **Hướng dẫn nhanh dành cho bạn mới:**\n- Gõ **help** hoặc **menu** để xem danh sách lệnh.\n- Trò chuyện tự nhiên với Lopy bằng cách gõ 1 từ tiếng Anh để tra từ điển, hoặc gõ **chat** để bật chế độ luyện nói 1-1.\n- Mỗi ngày, Lopy sẽ nhắn tin nhắc nhở bạn ôn tập Flashcard theo đúng phương pháp Spaced Repetition.\n\n👉 *Hãy gõ **help** ngay để bắt đầu nào!*`;
      try {
        await api.sendMessage({ msg: parseMarkdownToZalo(welcomeMsg) }, user.zaloId, 0);
      } catch (err) {
        console.error("Không thể gửi tin nhắn chào mừng:", err);
      }
    }

    res.json({ success: true, message: "Liên kết thành công!" });
  }),
);

export default router;
