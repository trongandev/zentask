import User from "../src/models/User.js";
import { FlashcardProgress, Flashcard, UserDailyStat, DailyTask, LeaderboardWeekly } from "../src/models/Schemas.js";
import { getWeekString } from "./dateUtils.js";
import { generateAIContent } from "../src/services/ai.service.js";
import { parseMarkdownToZalo } from "./util.js";
import { generateDailyQuizzes, sendQuiz, activeFlashDrops } from "../src/services/quizBot.service.js";

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

export const flash_drop_1 = triggerFlashDrop;
export const flash_drop_2 = triggerFlashDrop;
export const flash_drop_3 = triggerFlashDrop;

export const daily_quizzes = async (api) => {
  console.log("[Chatbot Jobs] Đang sinh 10 câu trắc nghiệm tiếng Anh tự động...");
  await generateDailyQuizzes(api);
};

export const send_quiz = async (api) => {
  const threadId = process.env.QUIZ_GROUP_THREAD_ID;
  if (threadId) {
    console.log(`[Chatbot Jobs] Đang gửi trắc nghiệm tới nhóm ${threadId}...`);
    await sendQuiz(api, threadId);
  } else {
    console.warn("[Chatbot Jobs] Chưa cấu hình QUIZ_GROUP_THREAD_ID trong .env");
  }
};

let randomQuizSchedule = [];

export const generate_random_quiz_schedule = async () => {
  randomQuizSchedule = [];
  const quizCount = 10;
  for (let i = 0; i < quizCount; i++) {
    const hour = Math.floor(Math.random() * (22 - 7 + 1)) + 7; // 7h - 22h
    const minute = Math.floor(Math.random() * 60);
    const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    randomQuizSchedule.push(timeStr);
  }
  console.log(`[Chatbot Jobs] Đã lên lịch gửi ${quizCount} đố vui hôm nay vào các giờ: ${randomQuizSchedule.join(", ")}`);
};

export const random_quiz_check = async (api) => {
  if (randomQuizSchedule.length === 0) {
    await generate_random_quiz_schedule();
  }

  const now = new Date();
  const currentTimeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  if (randomQuizSchedule.includes(currentTimeStr)) {
    randomQuizSchedule = randomQuizSchedule.filter((t) => t !== currentTimeStr);
    await send_quiz(api);
  }
};

export const daily_task_reminder = async (api) => {
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
};

const triggerGroupMinigame = async (api, type) => {
  const threadId = process.env.QUIZ_GROUP_THREAD_ID;
  if (!threadId) return;
  const { triggerMinigame } = await import("../src/services/minigame.service.js");
  await triggerMinigame(api, threadId, type);
};

export const minigame_scrambled = (api) => triggerGroupMinigame(api, "scrambled");
export const minigame_emoji = (api) => triggerGroupMinigame(api, "emoji");
export const minigame_listening = (api) => triggerGroupMinigame(api, "listening");

export const word_chain_invite = async (api) => {
  try {
    console.log("[Chatbot Jobs] Đang gửi lời mời chơi Word Chain...");
    const users = await User.find({ zaloId: { $ne: null } }).lean();
    if (users.length === 0) return;

    for (const user of users) {
      // Cập nhật trạng thái botState
      await User.updateOne({ _id: user._id }, { $set: { "botState.action": "word_chain_invite", "botState.wordCount": 0, "botState.lastWord": "" } });

      const msg = `🎮 **MINIGAME: WORD CHAIN (NỐI TỪ)** 🎮\n\nChào buổi tối ${user.displayName || "bạn"}! Bạn có muốn khởi động trí não bằng một ván nối từ Tiếng Anh với Lopy không?\n\n👉 Gõ "ok" hoặc "chơi" để bắt đầu nhé!\n(Bạn cần nối đúng 5 từ liên tiếp để nhận 10 XP thưởng. Gõ "huy" nếu không muốn chơi nữa)`;
      try {
        await api.sendMessage({ msg }, user.zaloId, 0);
      } catch (err) {
        console.error(`[Chatbot Jobs] Không thể gửi lời mời Word Chain cho ZaloId ${user.zaloId}:`, err.message);
      }
    }
  } catch (error) {
    console.error("[Chatbot Jobs] Lỗi khi chạy job Word Chain:", error);
  }
};

export const streak_warning = async (api) => {
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
};

export const morning_motivation = async (api) => {
  try {
    const threadId = process.env.QUIZ_GROUP_THREAD_ID;
    if (!threadId) return;
    console.log("[Chatbot Jobs] Đang gửi Morning Motivation...");

    const prompt = `Tạo một câu châm ngôn (Quote) nổi tiếng bằng tiếng Anh mang tính truyền cảm hứng về học tập/sự cố gắng, kèm lời dịch tiếng Việt. Và 1 Idiom (thành ngữ tiếng Anh) ngắn ngẫu nhiên thú vị với giải nghĩa. Format vui vẻ, tràn đầy năng lượng buổi sáng. Không dùng markdown phức tạp ngoài in đậm (**).`;

    const content = await generateAIContent({
      prompt,
      feature: "chatbot_morning_motivation",
    });
    if (content) {
      const msg = `🌅 **CHÚC MỌI NGƯỜI BUỔI SÁNG TỐT LÀNH!** 🌅\n\n${content}\n\n👉 Khởi động ngày mới, đừng quên vào ZenTask làm Daily Tasks nha! Lopy chúc các bạn một ngày siêu năng suất! 🚀`;
      await api.sendMessage(parseMarkdownToZalo(msg), threadId, 1);
    }
  } catch (error) {
    console.error("[Chatbot Jobs] Lỗi tạo Morning Motivation:", error);
  }
};

export const spaced_repetition_check = async (api) => {
  try {
    const now = new Date();
    const currentHourStr = `${now.getHours().toString().padStart(2, "0")}:00`;
    console.log(`[Chatbot Jobs] Đang kiểm tra Flashcard cần ôn tập lúc ${currentHourStr}...`);

    const users = await User.find({
      zaloId: { $ne: null },
      preferredStudyTime: currentHourStr,
    }).lean();

    if (users.length === 0) return;

    for (const user of users) {
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
};

export const weekly_leaderboard = async (api) => {
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
};

export const daily_checkin = async (api) => {
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
      await api.sendMessage({ msg: msg + "\n1. 😁 Tràn đầy năng lượng\n2. 😴 Còn buồn ngủ\n3. 😫 Hơi áp lực\n\n(Gõ: mood_happy, mood_sleepy, hoặc mood_tired)" }, user.zaloId, 0);
    } catch (err) {
      console.error(`[Chatbot Jobs] Lỗi gửi check-in cho ${user.zaloId}:`, err);
    }
  }
};

export const spaced_repetition_quiz = async (api) => {
  console.log("[Chatbot Jobs] Running Spaced Repetition Quiz...");
  const users = await User.find({ zaloId: { $ne: null } });

  const now = new Date();
  for (const user of users) {
    const dueProgress = await FlashcardProgress.find({ userId: user._id, dueDate: { $lte: now } }).limit(3);
    if (dueProgress.length === 0) continue;

    try {
      const cardIds = dueProgress.map((p) => p.cardId);
      const cards = await Flashcard.find({ _id: { $in: cardIds } });

      for (const card of cards) {
        user.botState = {
          action: "quiz",
          quizData: { cardId: card._id, term: card.term, correctAnswer: card.translation, attempts: 0 },
        };
        await user.save();

        const prompt = `Từ vựng tiếng Anh là "${card.term}", nghĩa là "${card.translation}". Hãy tạo 3 nghĩa tiếng Việt sai (distractors) ngắn gọn. Trả về đúng 3 dòng.`;
        const content = await generateAIContent({ prompt, feature: "chatbot_quiz", uid: user._id });

        let wrongOptions = content
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s);
        let options = [card.translation, ...wrongOptions].slice(0, 4);
        options = options.sort(() => Math.random() - 0.5);

        let msg = `Hi ${user.displayName}, từ '${card.term}' hôm trước bạn lưu nghĩa là gì nhỉ? Chọn đáp án đúng bên dưới nhé!\n\n`;
        options.forEach((opt, idx) => (msg += `${idx + 1}. ${opt}\n`));
        msg += `\n(Hãy gõ đáp án chính xác hoặc số thứ tự)`;

        await api.sendMessage({ msg }, user.zaloId, 0);
        await new Promise((r) => setTimeout(r, 5000));
      }
    } catch (err) {
      console.error(`[Chatbot Jobs] Lỗi gửi quiz cho ${user.zaloId}:`, err);
    }
  }
};

export const daily_wrapup = async (api) => {
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
};

export const proactive_value_sharing = async (api) => {
  console.log("[Chatbot Jobs] Running Proactive Value Sharing...");
  const users = await User.find({ zaloId: { $ne: null } });

  try {
    const prompt = `Đóng vai Mentor (nam, 25 tuổi, ấm áp). Hãy chia sẻ ngắn gọn 1 kiến thức tiếng Anh thú vị hoặc 1 idiom/slang đang hot (thanh niên hay dùng) kèm giải thích. Trọng tâm, ngắn gọn, có thể gọi user là 'bạn'.`;
    const content = await generateAIContent({ prompt, feature: "chatbot_value_sharing" });
    const msg = `Ê! Gửi bạn một chút kiến thức hay ho này 👇\n\n` + content;

    for (const user of users) {
      await api.sendMessage({ msg }, user.zaloId, 0);
      await new Promise((r) => setTimeout(r, 2000));
    }
  } catch (err) {
    console.error(`[Chatbot Jobs] Lỗi tạo chia sẻ kiến thức:`, err);
  }
};

export const co_creation_goals = async (api) => {
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
};
