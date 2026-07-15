import express from "express";
import { Zalo, FriendEventType } from "zca-js";
const router = express.Router();
import dotenv from "dotenv";
import { OpenAI } from "openai";
import fs from "fs";
import path from "path";
import sizeOf from "image-size";
const THREADID_NOT_REPLY = [, "4730750718637283891" /** Quizzet cộng đồng học từ vựng */];
dotenv.config();

async function imageMetadataGetter(filePath) {
  const data = await fs.promises.readFile(filePath);
  try {
    const dimensions = sizeOf(data);
    return {
      size: data.length,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (err) {
    console.error("Failed to get image dimensions:", err);
    return { size: data.length };
  }
}

const openai = new OpenAI({
  baseURL: process.env.BASE_URL_AI,
  apiKey: process.env.OPENAI_ADMIN_KEY,
});

const zalo = new Zalo({
  selfListen: false,
  checkUpdate: true,
  logging: true,
  imageMetadataGetter,
});

import ChatbotUtil from "../../utils/chatbot.js";
import { startChatbotJobs } from "../../utils/chatbotJobs.js";

const cookie = JSON.parse(fs.readFileSync("./cookie.json", "utf-8"));

let api;
let chatbotUtil;
const messageBuffers = new Map();

async function startZaloBot() {
  try {
    api = await zalo.login({
      cookie,
      imei: "54dd3183-5496-4b33-a6ef-8032fb598d7c-900b53410dbe0e0c28417a226c81086c",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    });

    chatbotUtil = new ChatbotUtil(api);

    async function handleMessage(message) {
      // console.log(message.threadId);
      if (THREADID_NOT_REPLY.includes(message.threadId)) return;
      if (message.isSelf) return; // Bỏ qua tin nhắn do bot tự gửi
      const isAudioFile = message.data?.content?.href?.includes(".aac");

      if (typeof message.data.content !== "string" && message.type !== "event" && message.type !== 2 && !isAudioFile) {
        console.log(message.data.content?.title || "Received media/sticker");
        const textRequests = [
          "Ủa alo? Gửi ảnh với sticker rồi bắt em hiểu là sao? Người đẹp gõ chữ ra giùm em đi ạ, mãi iu! 😙",
          "Nhìn hình đoán chữ là em chịu chết rùi á. Gõ chữ ra giùm em đi mí bồ ơi! 😭✨",
        ];
        await api.sendMessage({ msg: textRequests[Math.floor(Math.random() * textRequests.length)] }, message.threadId, message.type);
        return;
      }

      console.log(`[ZCA-JS] Received message from thread: ${message.threadId}`);

      // Xử lý Mention Bot
      const botId = api.getCurrentUserId ? api.getCurrentUserId() : api.getOwnId ? api.getOwnId() : null;
      const isMentioningBot = message.data.mentions && message.data.mentions.some((m) => String(m.uid) === String(botId));
      const contentString = typeof message.data.content === "string" ? message.data.content.toLowerCase() : "";
      const isCallingBot = isMentioningBot || contentString.includes("@lopy zentask");

      if (isCallingBot && message.threadId === "190076593393622327") {
        const imagePath = path.resolve("./src/images/lopy-zentask-bot.png");
        if (fs.existsSync(imagePath)) {
          return api.sendMessage(
            {
              msg: "Dạ Mentor Lopy nghe đây! 🥰 Cần hỗ trợ gì bạn cứ nhắn riêng với mình nha!",
              attachments: [imagePath],
            },
            message.threadId,
            message.type,
          );
        }
      }

      // Nếu không phải text message (vd: event, voice) hoặc content không phải chuỗi, xử lý ngay lập tức
      await api.sendTypingEvent(message.threadId, message.type);

      if (message.type !== 0 || typeof message.data.content !== "string") {
        return chatbotUtil.processMessage(message);
      }

      // Xử lý Rate-limit & Buffering (chờ 8s để gom tin nhắn)
      const threadId = message.threadId;
      const content = message.data.content.trim();

      // Nếu là các câu lệnh (/help, /me, tts, fl, ...) xử lý ngay lập tức luôn để phản hồi nhanh
      const textLower = content.toLowerCase();
      if (
        textLower.startsWith("/") ||
        textLower.startsWith("help") ||
        textLower.startsWith("menu") ||
        textLower.startsWith("me") ||
        textLower.startsWith("logout") ||
        textLower.startsWith("fl") ||
        textLower.startsWith("new") ||
        textLower.startsWith("tts")
      ) {
        return chatbotUtil.processMessage(message);
      }

      if (!messageBuffers.has(threadId)) {
        if (content.length > 150) {
          return api.sendMessage({ msg: "Tin nhắn của bạn quá dài (vượt quá 150 ký tự). Bạn vui lòng chat ngắn gọn lại nhé! 😅" }, threadId, 0);
        }

        messageBuffers.set(threadId, {
          content: content,
          timer: setTimeout(async () => {
            const bufferedData = messageBuffers.get(threadId);
            messageBuffers.delete(threadId);

            // Tạo message gộp để xử lý
            const combinedMessage = {
              ...message,
              data: {
                ...message.data,
                content: bufferedData.content,
              },
            };

            await chatbotUtil.processMessage(combinedMessage);
          }, 8000), // 8 giây
        });
      } else {
        // Nếu user nhắn tiếp trong lúc chờ 8s -> Nối chuỗi vào
        const buffer = messageBuffers.get(threadId);

        // Kiểm tra xem nếu nối thêm thì có vượt 150 ký tự không
        if (buffer.content.length + content.length + 3 > 150) {
          clearTimeout(buffer.timer);
          messageBuffers.delete(threadId);
          return api.sendMessage({ msg: "Tổng nội dung tin nhắn của bạn đã vượt quá 150 ký tự. Mentor chỉ đọc được tin nhắn ngắn, bạn chat lại ngắn gọn hơn nhé! 😅" }, threadId, 0);
        }

        buffer.content += " \n " + content;
      }
    }

    api.listener.on("message", handleMessage);

    api.listener.on("friend_event", async (event) => {
      if (event.type === FriendEventType.REQUEST) {
        try {
          const friendId = event.data.fromUid;
          await api.acceptFriendRequest(friendId);
          console.log(`[ZCA-JS] Đã tự động kết bạn thành công với user ID: ${friendId} `);
          const quote = [
            "Chào bạn! Mình là Mentor Tiếng Anh của ZenTask đây 👋",
            "Sắp tới mình sẽ là 'bảo mẫu' gánh bạn trên con đường diệt gọn từ vựng Tiếng Anh. Lười là tui nhắc à nha! 🔥",
            "Bạn gõ help để xem các câu lệnh hỗ trợ nhé",
          ];
          for (let index = 0; index < quote.length; index++) {
            await api.sendMessage(
              {
                msg: quote[index],
              },
              friendId,
              0,
            );
          }
        } catch (error) {
          console.error("[ZCA-JS] Lỗi khi tự động kết bạn:", error);
        }
      }
    });

    api.listener.start();
    console.log("Zalo bot started successfully.");

    // Bật các tiến trình Cron jobs cho Mentor Bot
    startChatbotJobs(api);
  } catch (error) {
    console.error("Error starting Zalo bot:", error);
  }
}

startZaloBot();

export default router;
