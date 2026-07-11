import express from "express";
import { AttackerFeedback } from "../models/Schemas.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.post(
  "/banned-feedback",
  asyncHandler(async (req, res) => {
    const { message } = req.body;
    let clientIp = req.headers["cf-connecting-ip"] || req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress || "";
    if (typeof clientIp === "string") {
      clientIp = clientIp.split(",")[0].trim();
      if (clientIp.startsWith("::ffff:")) {
        clientIp = clientIp.substring(7);
      }
    }

    if (!message || message.trim().length < 5) {
      return res.status(400).json({ success: false, message: "Feedback quá ngắn." });
    }

    await AttackerFeedback.create({
      ip: clientIp,
      message,
      userAgent: req.headers["user-agent"] || "",
    });

    res.json({ success: true, message: "Cảm ơn bạn đã đóng góp!" });
  })
);

export default router;
