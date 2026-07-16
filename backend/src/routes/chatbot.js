import express from "express";
import { Zalo, FriendEventType, GroupEventType } from "zca-js";
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
import { verifyToken } from "../middleware/auth.js";
import User from "../models/User.js";
import { addXpToUser } from "./user.js";
import { startChatbotJobs } from "../../utils/chatbotJobs.js";
import { activeQuizzes, activeFlashDrops, sendQuiz, generateDailyQuizzes } from "../services/quizBot.service.js";

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
      console.log(message.data.uidFrom, message.data.dName);
      if (THREADID_NOT_REPLY.includes(message.threadId)) return;
      if (message.isSelf) return; // Bỏ qua tin nhắn do bot tự gửi
      const isAudioFile = message.data?.content?.href?.includes(".aac");
      const isFriendAccept = message.data?.content?.title?.includes("Bạn vừa kết bạn với");

      if (typeof message.data.content !== "string" && message.type !== "event" && message.type !== 2 && !isAudioFile && !isFriendAccept) {
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

      if (message.type !== 0 || typeof message.data.content !== "string") {
        return chatbotUtil.processMessage(message);
      }

      // Xử lý Rate-limit & Buffering (chờ 8s để gom tin nhắn)
      const threadId = message.threadId;
      const content = message.data.content.trim();
      await api.sendTypingEvent(message.threadId, message.type);

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

      // Xử lý lệnh test cho môi trường dev
      if (process.env.NODE_ENV === "development") {
        if (textLower === "test-quiz") {
          // return sendQuiz(api, "7366109777025344429");
          return sendQuiz(api, process.env.QUIZ_GROUP_THREAD_ID);
        }
        if (textLower === "test-create-quiz") {
          await api.sendMessage({ msg: "Đang yêu cầu AI tạo 10 câu quiz mới, vui lòng đợi vài giây..." }, message.threadId, 0);
          await generateDailyQuizzes();
          return api.sendMessage({ msg: "✅ Đã tạo xong quiz! Gõ 'test-quiz' để chạy thử ngay." }, message.threadId, 0);
        }
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

    api.listener.on("reaction", (reaction) => {
      try {
        // Tìm msgId của tin nhắn gốc (tin nhắn bị thả tim) và uid người thả tim
        let targetMsgId = reaction.msgId;
        let arrayRMsg = reaction.data?.content?.rMsg;
        if (arrayRMsg && Array.isArray(arrayRMsg) && arrayRMsg.length > 0) {
          targetMsgId = arrayRMsg[0].gMsgID;
        }
        if (!targetMsgId) {
          targetMsgId = reaction.data?.msgId; // Fallback
        }

        const uid = reaction.data.uidFrom;

        if (!targetMsgId || !uid) return;

        // Quét các quiz đang chạy xem targetMsgId có khớp với đáp án nào không
        for (const [quizId, session] of activeQuizzes.entries()) {
          if (String(session.correctMsgId) === String(targetMsgId)) {
            session.usersCorrect.add(uid);
            console.log(`[QuizBot] User ${uid} chọn ĐÚNG cho quiz ${quizId}`);
          } else if (session.wrongMsgIds.map(String).includes(String(targetMsgId))) {
            session.usersWrong.add(uid);
            console.log(`[QuizBot] User ${uid} chọn SAI cho quiz ${quizId}`);
          }
        }

        // Quét Flash Drops
        if (activeFlashDrops.has(String(targetMsgId))) {
          const drop = activeFlashDrops.get(String(targetMsgId));
          if (!drop.winners.has(uid)) {
            drop.winners.add(uid);
            console.log(`[FlashDrop] User ${uid} nhặt được ${drop.xpAmount} XP`);

            // Tìm user
            User.findOne({ zaloId: String(uid) }).then((user) => {
              if (user) {
                addXpToUser(user._id, drop.xpAmount).then(({ xp, level }) => {
                  api.sendMessage({ msg: `🎉 Chúc mừng bạn đã nhặt được túi ${drop.xpAmount} XP!\n⭐ XP hiện tại: ${xp} - Level: ${level}` }, String(uid), 0);
                });
              }
            });

            if (drop.winners.size >= 3) {
              api.sendMessage({ msg: `✅ Túi kinh nghiệm ${drop.xpAmount} XP đã được 3 bạn nhanh tay nhất nhặt hết! Hẹn các bạn dịp sau nhé!` }, drop.threadId, 1);
              activeFlashDrops.delete(String(targetMsgId));
            }
          }
        }
      } catch (error) {
        console.error("[QuizBot] Lỗi xử lý reaction:", error);
      }
    });

    api.listener.on("friend_event", async (event) => {
      if (event.type === FriendEventType.REQUEST) {
        try {
          const friendId = event.data.fromUid;
          await api.acceptFriendRequest(friendId);
          console.log(`[ZCA-JS] Đã tự động kết bạn thành công với user ID: ${friendId} `);
          const quote = [
            "🎉 Chào mừng bạn! Mình là **Lopy** - linh vật kiêm Mentor Tiếng Anh siêu nhiệt tình của ZenTask đây! 👋",
            "Để bắt đầu hành trình nâng trình tiếng Anh, Lopy tóm tắt 3 việc bạn cần làm mỗi ngày nha:\n\n1️⃣ **Điểm danh (Check-in)**: Truy cập trang web ZenTask mỗi ngày để nhận quà và duy trì chuỗi học (streak).\n2️⃣ **Mini Quiz**: Lopy sẽ rải câu đố ngẫu nhiên vào Group. Bạn chỉ cần thả tim (❤️) vào tin nhắn chứa đáp án đúng để nhận 5 XP nhé!\n3️⃣ **Bảng xếp hạng**: Cuối tuần Lopy sẽ tổng kết Top 3 cao thủ cày cuốc. Hãy chăm chỉ học để lên đỉnh phong thần nha! 🏆",
            "Sắp tới Lopy sẽ là 'bảo mẫu' gánh bạn trên con đường diệt gọn từ vựng Tiếng Anh. Lười là bị nhắc đó nha! 🔥\n👉 Gõ **help** để xem tất cả lệnh hỗ trợ nhé.",
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

    api.listener.on("group_event", async (event) => {
      if (event.type === GroupEventType.JOIN) {
        try {
          const newMenber = event.data.updateMembers[0];
          const groupId = event.threadId || event.data?.groupId || event.data?.threadId;
          console.log(`[ZCA-JS] Người dùng ${newMenber.dName} tham gia nhóm ${groupId}`);

          const mentionName = `@${newMenber.dName}`;
          const greetingMsg = `Chào mừng ${mentionName} tới với group ZenTask - nơi kết nối tri thức! 👋`;

          const quote = [
            {
              msg: greetingMsg,
              mentions: [
                {
                  pos: greetingMsg.indexOf(mentionName),
                  len: mentionName.length,
                  uid: newMenber.id,
                },
              ],
            },
            { msg: "Mình là Lopy - một linh vật của ZenTask. 🦖" },
            { msg: "Mình sẽ giúp bạn học tập và nhắc nhở bạn học tập mỗi ngày nha. Lười là tui nhắc à nha! 🔥" },
            { msg: "Để bắt đầu, bạn hãy bấm vào tui, sau đó kết bạn và nhắn tin riêng cho tui để tui hỗ trợ nhé!" },
          ];

          for (let index = 0; index < quote.length; index++) {
            await api.sendMessage(
              quote[index],
              groupId,
              1, // Type 1 thường dùng cho tin nhắn nhóm trong zca-js/Zalo
            );
          }
        } catch (error) {
          console.error("[ZCA-JS] Lỗi khi gửi tin nhắn chào mừng nhóm:", error);
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

export const getApi = () => api;

export default router;
