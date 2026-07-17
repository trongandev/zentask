import express from "express";
import { Zalo, FriendEventType, GroupEventType } from "zca-js";
const router = express.Router();
import dotenv from "dotenv";
import { OpenAI } from "openai";
import fs from "fs";
import path from "path";
import sizeOf from "image-size";
dotenv.config();
const THREADID_NOT_REPLY = [, "4730750718637283891" /** Quizzet cộng đồng học từ vựng */];
const ZALOID_BANNED = [];
const GROUP_ACTIVE_REPLY = process.env.QUIZ_GROUP_THREAD_ID;

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
import { initJobs } from "../../utils/jobManager.js";
import { activeQuizzes, activeFlashDrops, sendQuiz, generateDailyQuizzes } from "../services/quizBot.service.js";
import { parseMarkdownToZalo } from "../../utils/util.js";
import crypto from "crypto";
import { ZaloAuth } from "../models/Schemas.js";
import { activeGroupGames } from "../services/minigame.service.js";

const cookie = JSON.parse(fs.readFileSync("./cookie.json", "utf-8"));

let api;
let chatbotUtil;
const messageBuffers = new Map();
const zaloSpamMap = new Map();

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
      if (ZALOID_BANNED.includes(message.threadId)) {
        await api.sendMessage(
          { msg: "Tài khoản của bạn đã bị khóa nhắn tin do nghi ngờ spam tin nhắn với tốc độ cao!, vui lòng liên hệ với admin trong group Zentask để mở khóa" },
          message.threadId,
          message.type,
        );
        return;
      }
      if (THREADID_NOT_REPLY.includes(message.threadId)) return;
      if (message.isSelf) return; // Bỏ qua tin nhắn do bot tự gửi
      const isAudioFile = message.data?.content?.href?.includes(".aac");
      const isFriendAccept = message.data?.content?.title?.includes("Bạn vừa kết bạn với");

      if (typeof message.data.content !== "string" && message.type !== "event" && message.type !== 2 && !isAudioFile && !isFriendAccept && message.threadId !== GROUP_ACTIVE_REPLY) {
        console.log(message.data.content?.title || "Received media/sticker");
        const textRequests = [
          "Ủa alo? Gửi ảnh với sticker rồi bắt em hiểu là sao? Người đẹp gõ chữ ra giùm em đi ạ, mãi iu! 😙",
          "Nhìn hình đoán chữ là em chịu chết rùi á. Gõ chữ ra giùm em đi mí bồ ơi! 😭✨",
        ];
        await api.sendMessage({ msg: textRequests[Math.floor(Math.random() * textRequests.length)] }, message.threadId, message.type);
        return;
      }

      console.log(`[ZCA-JS] Received message from thread: ${message.threadId}`);

      // Spam/DDoS Zalo Bot Detection
      const now = Date.now();
      if (!zaloSpamMap.has(message.threadId)) {
        zaloSpamMap.set(message.threadId, { count: 1, firstMsgAt: now });
      } else {
        const spamRecord = zaloSpamMap.get(message.threadId);
        if (now - spamRecord.firstMsgAt < 60000) {
          // trong 1 phút
          spamRecord.count++;
          if (spamRecord.count > 15 && !spamRecord.alerted) {
            spamRecord.alerted = true;
            try {
              const admins = await User.find({ role: "admin", zaloId: { $ne: null } });
              const alertMsg = `🚨 **CẢNH BÁO ZALO BOT** 🚨\n\nPhát hiện spam tin nhắn liên tục.\n- Zalo ID: ${message.threadId}\n- Tên: ${message.data.dName || "Unknown"}\n\nHãy chặn người dùng này trên ứng dụng Zalo nếu cần thiết.`;
              for (const admin of admins) {
                api.sendMessage({ msg: alertMsg }, admin.zaloId, 0).catch(() => {});
              }
            } catch (e) {}
          }
          if (spamRecord.count > 15) return; // Ignore message processing if spamming
        } else {
          zaloSpamMap.set(message.threadId, { count: 1, firstMsgAt: now }); // reset sau 1 phút
        }
      }

      // Xử lý Mention Bot
      const botId = api.getCurrentUserId ? api.getCurrentUserId() : api.getOwnId ? api.getOwnId() : null;
      const isMentioningBot = message.data.mentions && message.data.mentions.some((m) => String(m.uid) === String(botId));
      const contentString = typeof message.data.content === "string" ? message.data.content.toLowerCase() : "";
      const isCallingBot = isMentioningBot || contentString.includes("@lopy zentask");

      if (isCallingBot && message.threadId === GROUP_ACTIVE_REPLY) {
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
        textLower.startsWith("tts") ||
        textLower.startsWith("login") ||
        textLower.startsWith("chat") ||
        textLower.startsWith("game-") ||
        textLower.startsWith("test-") ||
        textLower.startsWith("ban-ip")
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
          if (!drop.winners.has(uid) && drop.xpChunks.length > 0) {
            const receivedXp = drop.xpChunks.shift(); // Lấy 1 phần XP
            drop.winners.set(uid, receivedXp);
            console.log(`[FlashDrop] User ${uid} nhặt được ${receivedXp} XP`);

            // Tìm user
            User.findOne({ zaloId: String(uid) }).then(async (user) => {
              if (user) {
                addXpToUser(user._id, receivedXp).then(({ xp, level }) => {
                  api.sendMessage({ msg: `🎉 Chúc mừng bạn đã nhặt được ${receivedXp} XP từ túi lì xì!\n⭐ XP hiện tại: ${xp} - Level: ${level}` }, String(uid), 0);
                });
              } else {
                const authId = crypto.randomBytes(6).toString("hex");
                await ZaloAuth.create({ authId, zaloId: String(uid) });
                const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
                const authLink = `${frontendUrl}/go/${authId}`;
                api.sendMessage(
                  {
                    msg: `🎉 Bạn đã giành được ${receivedXp} XP từ túi lì xì!\n\nTuy nhiên, tài khoản Zalo của bạn chưa liên kết với ZenTask.\n👉 Vui lòng bấm vào link dưới đây để đăng nhập và nhận thưởng nhé:\n${authLink}\n\n(Bạn có thể gõ lệnh "login" lúc nào cũng được để tạo link đăng nhập mới)`,
                  },
                  String(uid),
                  0,
                );
              }
            });

            if (drop.xpChunks.length === 0) {
              // Đã nhặt hết
              announceFlashDropEnd(String(targetMsgId));
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

          const user = await User.findOne({ zaloId: String(friendId) });
          if (user) {
            const quote = [
              "🎉 Chào mừng bạn! Mình là **Lopy** - linh vật kiêm Mentor Tiếng Anh siêu nhiệt tình của ZenTask đây! 👋",
              "Để bắt đầu hành trình nâng trình tiếng Anh, Lopy tóm tắt 3 việc bạn cần làm mỗi ngày nha:\n\n1️⃣ **Điểm danh (Check-in)**: Truy cập trang web ZenTask mỗi ngày để nhận quà và duy trì chuỗi học (streak).\n2️⃣ **Mini Quiz**: Lopy sẽ rải câu đố ngẫu nhiên vào Group. Bạn chỉ cần thả tim (❤️) vào tin nhắn chứa đáp án đúng để nhận 5 XP nhé!\n3️⃣ **Bảng xếp hạng**: Cuối tuần Lopy sẽ tổng kết Top 3 cao thủ cày cuốc. Hãy chăm chỉ học để lên đỉnh phong thần nha! 🏆",
              "Sắp tới Lopy sẽ là 'bảo mẫu' gánh bạn trên con đường diệt gọn từ vựng Tiếng Anh. Lười là bị nhắc đó nha! 🔥\n👉 Gõ **help** để xem tất cả lệnh hỗ trợ nhé.",
            ];
            for (let index = 0; index < quote.length; index++) {
              await api.sendMessage(parseMarkdownToZalo(quote[index]), friendId, 0);
            }
          } else {
            // Generate auth link
            const authId = crypto.randomBytes(16).toString("hex");
            const newAuth = new ZaloAuth({ zaloId: String(friendId), authId });
            await newAuth.save();

            const authLink = `${process.env.FRONTEND_URL}/go/${authId}`;
            const welcomeMsg = `Chào bạn! Mình là Mentor Tiếng Anh của ZenTask đây 👋\n\nĐể bắt đầu lộ trình học cá nhân hóa, bạn vui lòng bấm vào link dưới đây để đăng nhập và uỷ quyền cho Zalo Bot truy cập tài khoản của bạn nhé!\n\n👉 ${authLink}`;

            await api.sendMessage(parseMarkdownToZalo(welcomeMsg), friendId, 0);
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
    initJobs(api);
  } catch (error) {
    console.error("Error starting Zalo bot:", error);
  }
}

startZaloBot();

export const getApi = () => api;

export async function announceFlashDropEnd(dropMsgId) {
  const drop = activeFlashDrops.get(dropMsgId);
  if (!drop) return;

  activeFlashDrops.delete(dropMsgId);

  if (drop.winners.size === 0) {
    await api.sendMessage({ msg: `❌ Túi kinh nghiệm ${drop.totalXP} XP đã hết hạn mà không có ai nhận!` }, drop.threadId, 1);
    return;
  }

  try {
    const winnerZaloIds = Array.from(drop.winners.keys());
    const users = await User.find({ zaloId: { $in: winnerZaloIds } }).lean();
    const userMap = {};
    users.forEach((u) => (userMap[u.zaloId] = u.displayName || "Thành viên ẩn danh"));

    let msg = `✅ **KẾT QUẢ GIẬT LÌ XÌ** ✅\n\nTúi **${drop.totalXP} XP** đã được phân phát:\n`;

    // Sắp xếp theo XP nhận được giảm dần
    const sortedWinners = Array.from(drop.winners.entries()).sort((a, b) => b[1] - a[1]);

    sortedWinners.forEach(([uid, xp], index) => {
      const name = userMap[uid] || "Thành viên ẩn danh";
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🔹";
      msg += `\n${medal} ${name}: +${xp} XP`;
    });

    await api.sendMessage({ msg }, drop.threadId, 1);
  } catch (error) {
    console.error("[FlashDrop] Lỗi khi announce kết quả:", error);
  }
}

export default router;
