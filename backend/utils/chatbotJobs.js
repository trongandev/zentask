import cron from "node-cron";
import User from "../src/models/User.js";
import { FlashcardProgress, Flashcard, UserDailyStat, DailyTask, LeaderboardWeekly } from "../src/models/Schemas.js";
import { getWeekString } from "./dateUtils.js";
import ChatbotUtil from "./chatbot.js";
import OpenAI from "openai";
import { parseMarkdownToZalo } from "./util.js";
import { generateDailyQuizzes, sendQuiz, activeFlashDrops } from "../src/services/quizBot.service.js";

const openai = new OpenAI({
  baseURL: process.env.BASE_URL_AI || "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_ADMIN_KEY || process.env.OPENAI_API_KEY,
});

export async function triggerFlashDrop(api) {
  const threadId = process.env.QUIZ_GROUP_THREAD_ID;
  if (!threadId) {
    console.warn("[Chatbot Jobs] Chưa cấu hình QUIZ_GROUP_THREAD_ID trong .env");
    return;
  }

  console.log("[Chatbot Jobs] Đang rải Lì xì XP (Flash Drop)...");
  const totalXP = Math.floor(Math.random() * (300 - 70 + 1)) + 70; // 70 ~ 300
  const numWinners = Math.floor(Math.random() * (10 - 3 + 1)) + 3; // 3 ~ 10

  // Generate chunks
  let remainingXP = totalXP;
  const xpChunks = [];
  for (let i = 0; i < numWinners - 1; i++) {
    const limit = Math.max(1, Math.floor((remainingXP / (numWinners - i)) * 1.8));
    const maxPossible = remainingXP - (numWinners - 1 - i);
    const amount = Math.floor(Math.random() * Math.min(limit, maxPossible)) + 1;
    xpChunks.push(amount);
    remainingXP -= amount;
  }
  xpChunks.push(remainingXP);
  xpChunks.sort(() => Math.random() - 0.5);

  const msgText = `🎁 **TÚI KINH NGHIỆM BÍ ẨN!** 🎁\n\nLopy vừa đánh rơi một túi chứa tổng cộng **${totalXP} XP**!\n\n⏳ Dành cho **${numWinners} bạn** nhanh tay nhất thả tim ❤️ vào tin nhắn này!\n(Hết hạn sau 5 phút hoặc khi nhặt hết)`;

  try {
    const res = await api.sendMessage(parseMarkdownToZalo(msgText), threadId, 1);
    const dropMsgId = res?.message?.msgId;

    if (dropMsgId) {
      activeFlashDrops.set(String(dropMsgId), {
        totalXP,
        xpChunks,
        winners: new Map(), // zaloId -> xp
        threadId,
        createdAt: Date.now(),
      });

      // Sau 5 phút, xoá khỏi map nếu chưa hết
      setTimeout(
        async () => {
          if (activeFlashDrops.has(String(dropMsgId))) {
            const { announceFlashDropEnd } = await import("../src/routes/chatbot.js");
            await announceFlashDropEnd(String(dropMsgId));
          }
        },
        5 * 60 * 1000,
      );
    }
  } catch (err) {
    console.error("[Chatbot Jobs] Lỗi rải Flash Drop:", err);
  }
}

export function startChatbotJobs(api) {
  // 0. Sinh trắc nghiệm tự động lúc 06:00 sáng
  cron.schedule("0 6 * * *", async () => {
    console.log("[Chatbot Jobs] Đang sinh 10 câu trắc nghiệm tiếng Anh tự động...");
    await generateDailyQuizzes();
  });

  // Đố vui vào các khung giờ: Sáng (8h), Trưa (12h), Chiều tối (18h), Tối muộn (21h)
  const quizTimes = ["0 8 * * *", "0 12 * * *", "0 18 * * *", "0 21 * * *"];
  quizTimes.forEach((time) => {
    cron.schedule(time, async () => {
      const threadId = process.env.QUIZ_GROUP_THREAD_ID;
      if (threadId) {
        console.log(`[Chatbot Jobs] Đang gửi trắc nghiệm tới nhóm ${threadId}...`);
        await sendQuiz(api, threadId);
      } else {
        console.warn("[Chatbot Jobs] Chưa cấu hình QUIZ_GROUP_THREAD_ID trong .env");
      }
    });
  });

  // Quản lý thời gian rải lì xì trong ngày
  let flashDropSchedule = [];

  const generateFlashDropSchedule = () => {
    flashDropSchedule = [];
    const dropCount = Math.floor(Math.random() * 3) + 1; // 1 ~ 3 lần/ngày
    for (let i = 0; i < dropCount; i++) {
      const hour = Math.floor(Math.random() * (22 - 7 + 1)) + 7; // 7h - 22h
      const minute = Math.floor(Math.random() * 60);
      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      flashDropSchedule.push(timeStr);
    }
    console.log(`[Chatbot Jobs] Đã lên lịch rải lì xì hôm nay vào các giờ: ${flashDropSchedule.join(", ")}`);
  };

  // Tạo lịch rải lì xì ngay khi khởi động server
  generateFlashDropSchedule();

  // Reset lịch mỗi 00:00 hàng ngày
  cron.schedule("0 0 * * *", generateFlashDropSchedule);

  // Check mỗi phút xem có tới giờ rải lì xì không
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    if (flashDropSchedule.includes(currentTimeStr)) {
      // Bỏ qua thời gian này để không trigger 2 lần
      flashDropSchedule = flashDropSchedule.filter((t) => t !== currentTimeStr);
      await triggerFlashDrop(api);
    }
  });

  // Gửi thông báo nhắc nhở làm nhiệm vụ hàng ngày lúc 20:00
  cron.schedule("0 20 * * *", async () => {
    try {
      console.log("[Chatbot Jobs] Đang kiểm tra tiến độ nhiệm vụ hàng ngày lúc 20h00...");
      const today = new Date().toISOString().split("T")[0];
      const users = await User.find({ zaloId: { $ne: null } }).lean();
      if (users.length === 0) return;

      const taskConfigs = await DailyTask.find().lean();

      for (const user of users) {
        const stat = await UserDailyStat.findOne({ userId: user._id, date: today }).lean();
        const currentTasks = stat?.tasks || {};

        const missingTasks = [];
        for (const config of taskConfigs) {
          const target = config.total || config.requirement || 1;
          const currentProgress = currentTasks[config.type] || 0;
          if (currentProgress < target) {
            missingTasks.push(`- ${config.title} (${currentProgress}/${target})`);
          }
        }

        if (missingTasks.length > 0) {
          const msg = `📢 Chào buổi tối ${user.displayName || "bạn"}!\n\nĐã 20h00 rồi, bạn vẫn còn một số nhiệm vụ hàng ngày chưa hoàn thành:\n${missingTasks.join("\n")}\n\n👉 Hãy nhanh chóng truy cập website ZenTask để hoàn thành và nhận thưởng XP nhé! 🏆`;
          try {
            await api.sendMessage({ msg }, user.zaloId, 0);
          } catch (err) {
            console.error(`[Chatbot Jobs] Không thể gửi tin nhắn nhắc nhiệm vụ cho ZaloId ${user.zaloId}:`, err.message);
          }
        }
      }
    } catch (error) {
      console.error("[Chatbot Jobs] Lỗi khi chạy job nhắc nhở 20h00:", error);
    }
  });

  // Cảnh báo đứt chuỗi (Streak Warning) lúc 22:00
  cron.schedule("0 22 * * *", async () => {
    try {
      console.log("[Chatbot Jobs] Đang kiểm tra nguy cơ đứt chuỗi lúc 22h00...");
      const today = new Date().toISOString().split("T")[0];
      const users = await User.find({ zaloId: { $ne: null }, streak: { $gte: 3 } }).lean();

      for (const user of users) {
        const stat = await UserDailyStat.findOne({ userId: user._id, date: today }).lean();
        if (!stat || !stat.isCheckedIn) {
          const msg = `😱 Á á! Cảnh báo đứt chuỗi!\n\nChuỗi học tập liên tiếp ${user.streak} ngày của bạn sẽ bốc hơi trong 2 tiếng nữa nếu hôm nay bạn không điểm danh!\n\n👉 Nhanh tay truy cập ZenTask để cứu chuỗi ngay!! 🔥`;
          try {
            await api.sendMessage({ msg }, user.zaloId, 0);
          } catch (err) {
            console.error(`[Chatbot Jobs] Không thể gửi tin nhắc streak cho ZaloId ${user.zaloId}:`, err.message);
          }
        }
      }
    } catch (error) {
      console.error("[Chatbot Jobs] Lỗi khi chạy job cảnh báo streak 22h00:", error);
    }
  });

  // Động lực buổi sáng (Morning Motivation) lúc 06:30
  cron.schedule("30 6 * * *", async () => {
    try {
      const threadId = process.env.QUIZ_GROUP_THREAD_ID;
      if (!threadId) return;
      console.log("[Chatbot Jobs] Đang gửi Morning Motivation...");

      const prompt = `Tạo một câu châm ngôn (Quote) nổi tiếng bằng tiếng Anh mang tính truyền cảm hứng về học tập/sự cố gắng, kèm lời dịch tiếng Việt. Và 1 Idiom (thành ngữ tiếng Anh) ngắn ngẫu nhiên thú vị với giải nghĩa. Format vui vẻ, tràn đầy năng lượng buổi sáng. Không dùng markdown phức tạp ngoài in đậm (**).`;

      const response = await openai.chat.completions.create({
        model: "gemini-3.1-flash-lite", // Dùng mô hình Gemini qua proxy OpenAI đã cấu hình
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const msg = `🌅 **CHÚC MỌI NGƯỜI BUỔI SÁNG TỐT LÀNH!** 🌅\n\n${content}\n\n👉 Khởi động ngày mới, đừng quên vào ZenTask làm Daily Tasks nha! Lopy chúc các bạn một ngày siêu năng suất! 🚀`;
        await api.sendMessage({ msg }, threadId, 1);
      }
    } catch (error) {
      console.error("[Chatbot Jobs] Lỗi tạo Morning Motivation:", error);
    }
  });

  // Nhắc nhở ôn tập Flashcard (Spaced Repetition) theo giờ cá nhân hoá (mặc định 14:00)
  // Quét mỗi giờ
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();
      // Format current hour: "14:00"
      const currentHourStr = `${now.getHours().toString().padStart(2, "0")}:00`;
      
      console.log(`[Chatbot Jobs] Đang kiểm tra Flashcard cần ôn tập lúc ${currentHourStr}...`);
      
      // Lấy user có ZaloId và có giờ học trùng với giờ hiện tại (hoặc mặc định 14:00)
      const users = await User.find({ 
        zaloId: { $ne: null },
        preferredStudyTime: currentHourStr 
      }).lean();
      
      if (users.length === 0) return;

      for (const user of users) {
        // Tìm số lượng thẻ cần ôn tập (nextReview <= now)
        const dueCardsCount = await FlashcardProgress.countDocuments({
          userId: user._id,
          nextReview: { $lte: now },
        });

        if (dueCardsCount > 0) {
          const msg = `📚 **Đến giờ ôn tập rồi!** 📚\n\nChào ${user.displayName}, hệ thống ghi nhận bạn đang có **${dueCardsCount}** từ vựng/flashcard cần được ôn tập lại để nhớ lâu hơn (theo phương pháp lặp lại ngắt quãng).\n\n👉 Hãy vào ZenTask ôn tập ngay kẻo quên nhé!`;
          try {
            await api.sendMessage({ msg }, user.zaloId, 0);
          } catch (err) {
            console.error(`[Chatbot Jobs] Lỗi gửi nhắc Flashcard cho ${user.zaloId}:`, err.message);
          }
        }
      }
    } catch (error) {
      console.error("[Chatbot Jobs] Lỗi nhắc nhở Flashcard:", error);
    }
  });

  // Vinh danh Bảng xếp hạng Tuần (Weekly Leaderboard) lúc 21:00 Chủ Nhật (0 21 * * 0)
  cron.schedule("0 21 * * 0", async () => {
    try {
      const threadId = process.env.QUIZ_GROUP_THREAD_ID;
      if (!threadId) return;
      console.log("[Chatbot Jobs] Đang vinh danh Bảng xếp hạng tuần...");

      const weekStr = getWeekString();
      const topUsers = await LeaderboardWeekly.find({ period: weekStr }).sort({ xp: -1 }).limit(3).populate("uid", "displayName").lean();

      if (topUsers.length > 0) {
        let msg = `🏆 **TỔNG KẾT BẢNG PHONG THẦN TUẦN NÀY** 🏆\n\nChúc mừng các cao thủ đã cày cuốc chăm chỉ nhất tuần qua:\n\n`;
        const medals = ["🥇", "🥈", "🥉"];

        topUsers.forEach((record, index) => {
          const name = record.uid?.displayName || "Ẩn danh";
          msg += `${medals[index]} ${name} - ${record.xp} XP\n`;
        });

        msg += `\n🎉 Cả nhà cùng thả tim chúc mừng nhé! Tuần mới lại tiếp tục đua top nhận thưởng nha! 🔥`;
        await api.sendMessage({ msg }, threadId, 1);
      }
    } catch (error) {
      console.error("[Chatbot Jobs] Lỗi tạo Weekly Leaderboard:", error);
    }
  });

  // 1. Daily Check-in (Mood tracker) dựa trên checkinTime của từng User
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, "0");
    const currentMinute = now.getMinutes().toString().padStart(2, "0");
    const currentTimeStr = `${currentHour}:${currentMinute}`;

    const users = await User.find({ zaloId: { $ne: null }, checkinTime: currentTimeStr });
    if (users.length === 0) return;

    console.log(`[Chatbot Jobs] Running Daily Check-in for ${users.length} users at ${currentTimeStr}...`);

    for (const user of users) {
      try {
        user.botState = { action: "mood_checkin" };
        await user.save();

        const msg = `Chào buổi sáng ${user.displayName}! ☀️\nHôm nay tâm trạng của bạn thế nào? Chọn một icon bên dưới cho Mentor biết nhé!`;
        // Gửi Zalo Message
        await api.sendMessage({ msg: msg + "\n1. 😁 Tràn đầy năng lượng\n2. 😴 Còn buồn ngủ\n3. 😫 Hơi áp lực\n\n(Gõ: mood_happy, mood_sleepy, hoặc mood_tired)" }, user.zaloId, 0);
      } catch (err) {
        console.error(`[Chatbot Jobs] Lỗi gửi check-in cho ${user.zaloId}:`, err);
      }
    }
  });

  // 2. Spaced Repetition Quiz (Tra khảo bài cũ) - Chạy mỗi giờ (Hoặc 14h chiều)
  cron.schedule("0 14 * * *", async () => {
    console.log("[Chatbot Jobs] Running Spaced Repetition Quiz...");
    const users = await User.find({ zaloId: { $ne: null } });

    const now = new Date();
    for (const user of users) {
      // Tìm các flashcard tới hạn
      const dueProgress = await FlashcardProgress.find({ userId: user._id, dueDate: { $lte: now } }).limit(3);
      if (dueProgress.length === 0) continue;

      try {
        const cardIds = dueProgress.map((p) => p.cardId);
        const cards = await Flashcard.find({ _id: { $in: cardIds } });

        for (const card of cards) {
          // Gửi câu hỏi trắc nghiệm
          user.botState = {
            action: "quiz",
            quizData: { cardId: card._id, term: card.term, correctAnswer: card.translation, attempts: 0 },
          };
          await user.save();

          // Gợi ý AI tạo các lựa chọn nhiễu
          const prompt = `Từ vựng tiếng Anh là "${card.term}", nghĩa là "${card.translation}". Hãy tạo 3 nghĩa tiếng Việt sai (distractors) ngắn gọn. Trả về đúng 3 dòng.`;
          const response = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] });

          let wrongOptions = response.choices[0].message.content
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s);
          let options = [card.translation, ...wrongOptions].slice(0, 4);
          options = options.sort(() => Math.random() - 0.5); // Trộn đáp án

          let msg = `Hi ${user.displayName}, từ '${card.term}' hôm trước bạn lưu nghĩa là gì nhỉ? Chọn đáp án đúng bên dưới nhé!\n\n`;
          options.forEach((opt, idx) => (msg += `${idx + 1}. ${opt}\n`));
          msg += `\n(Hãy gõ đáp án chính xác hoặc số thứ tự)`;

          await api.sendMessage({ msg }, user.zaloId, 0);

          // Chờ vài giây để không spam (demo giả lập queue)
          await new Promise((r) => setTimeout(r, 5000));
        }
      } catch (err) {
        console.error(`[Chatbot Jobs] Lỗi gửi quiz cho ${user.zaloId}:`, err);
      }
    }
  });

  // 3. Daily Wrap-up (Báo cáo cá nhân hoá cuối ngày) lúc 21:00 PM
  cron.schedule("0 21 * * *", async () => {
    console.log("[Chatbot Jobs] Running Daily Wrap-up...");
    const today = new Date().toISOString().split("T")[0];
    const users = await User.find({ zaloId: { $ne: null } });
    
    for (const user of users) {
      try {
        const stat = await UserDailyStat.findOne({ userId: user._id, date: today }).lean();
        const streak = user.streak || 0;
        
        let msg = `Ting ting! 🔔 Báo cáo cuối ngày của bạn:\n`;
        msg += `- Chuỗi học liên tiếp (Streak): ${streak} ngày 🔥\n`;
        msg += `- Tổng XP hiện tại: ${user.xp} XP\n`;
        
        if (stat) {
          const tasks = stat.tasks || {};
          const flashcards = tasks.flashcard_review || 0;
          const quizzes = tasks.quiz_taken || 0;
          
          if (flashcards > 0 || quizzes > 0) {
            msg += `\n🌟 Hôm nay bạn đã ôn ${flashcards} từ vựng và tham gia ${quizzes} lần quiz!`;
          } else if (stat.isCheckedIn) {
            msg += `\n🌟 Hôm nay bạn đã điểm danh đầy đủ!`;
          } else {
            msg += `\n💤 Hôm nay bạn chưa tham gia hoạt động nào.`;
          }
        } else {
          msg += `\n💤 Hôm nay bạn chưa tham gia hoạt động nào.`;
        }
        
        if (streak > 0) {
          msg += `\n\nBạn đang giữ chuỗi rất tốt, Mentor tự hào về bạn. Nghỉ ngơi nhé! 🚀`;
        } else {
          msg += `\n\nKhông sao cả, ngày mai hãy bắt đầu lại một chuỗi mới nhé! 🚀`;
        }
        
        await api.sendMessage({ msg }, user.zaloId, 0);
      } catch (err) {
        console.error(`[Chatbot Jobs] Lỗi gửi Daily Wrap-up cho ${user.zaloId}:`, err);
      }
    }
  });

  // 4. Proactive Value Sharing (Chia sẻ kiến thức ngẫu nhiên) - Thứ 4 và Thứ 7 lúc 12:00 trưa
  cron.schedule("0 12 * * 3,6", async () => {
    console.log("[Chatbot Jobs] Running Proactive Value Sharing...");
    const users = await User.find({ zaloId: { $ne: null } });

    try {
      // Nhờ AI sinh ra một kiến thức thú vị
      const prompt = `Đóng vai Mentor (nam, 25 tuổi, ấm áp). Hãy chia sẻ ngắn gọn 1 kiến thức tiếng Anh thú vị hoặc 1 idiom/slang đang hot (thanh niên hay dùng) kèm giải thích. Trọng tâm, ngắn gọn, có thể gọi user là 'bạn'.`;
      const response = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] });
      const msg = `Ê! Gửi bạn một chút kiến thức hay ho này 👇\n\n` + response.choices[0].message.content;

      for (const user of users) {
        await api.sendMessage({ msg }, user.zaloId, 0);
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error(`[Chatbot Jobs] Lỗi tạo chia sẻ kiến thức:`, err);
    }
  });

  // 5. Co-creation Goals - Sáng Thứ Hai 07:00 AM
  cron.schedule("0 7 * * 1", async () => {
    console.log("[Chatbot Jobs] Running Co-creation Goals...");
    const users = await User.find({ zaloId: { $ne: null } });
    for (const user of users) {
      try {
        const msg = `Tuần mới đến rồi ${user.displayName} ơi! 🌅\nTuần này bạn có lịch trình bận rộn không? Chúng ta nên đặt mục tiêu nhẹ nhàng 5 từ/ngày hay bứt phá 15 từ/ngày nhỉ? Bạn cứ chat cho Mentor biết mức phù hợp với sức khỏe tuần này nhé!`;
        await api.sendMessage({ msg }, user.zaloId, 0);
      } catch (err) {
        console.error(`[Chatbot Jobs] Lỗi gửi mục tiêu tuần cho ${user.zaloId}:`, err);
      }
    }
  });
}
