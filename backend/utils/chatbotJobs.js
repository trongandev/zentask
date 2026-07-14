import cron from "node-cron";
import User from "../src/models/User.js";
import { FlashcardProgress, Flashcard } from "../src/models/Schemas.js";
import ChatbotUtil from "./chatbot.js";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.BASE_URL_AI || "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_ADMIN_KEY || process.env.OPENAI_API_KEY,
});

export function startChatbotJobs(api) {
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
        const cardIds = dueProgress.map(p => p.cardId);
        const cards = await Flashcard.find({ _id: { $in: cardIds } });

        for (const card of cards) {
          // Gửi câu hỏi trắc nghiệm
          user.botState = { 
            action: "quiz",
            quizData: { cardId: card._id, term: card.term, correctAnswer: card.translation, attempts: 0 }
          };
          await user.save();

          // Gợi ý AI tạo các lựa chọn nhiễu
          const prompt = `Từ vựng tiếng Anh là "${card.term}", nghĩa là "${card.translation}". Hãy tạo 3 nghĩa tiếng Việt sai (distractors) ngắn gọn. Trả về đúng 3 dòng.`;
          const response = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{role: "user", content: prompt}] });
          
          let wrongOptions = response.choices[0].message.content.split("\n").map(s => s.trim()).filter(s => s);
          let options = [card.translation, ...wrongOptions].slice(0, 4);
          options = options.sort(() => Math.random() - 0.5); // Trộn đáp án

          let msg = `Hi ${user.displayName}, từ '${card.term}' hôm trước bạn lưu nghĩa là gì nhỉ? Chọn đáp án đúng bên dưới nhé!\n\n`;
          options.forEach((opt, idx) => msg += `${idx + 1}. ${opt}\n`);
          msg += `\n(Hãy gõ đáp án chính xác hoặc số thứ tự)`;

          await api.sendMessage({ msg }, user.zaloId, 0);
          
          // Chờ vài giây để không spam (demo giả lập queue)
          await new Promise(r => setTimeout(r, 5000));
        }
      } catch (err) {
        console.error(`[Chatbot Jobs] Lỗi gửi quiz cho ${user.zaloId}:`, err);
      }
    }
  });

  // 3. Weekly/Daily Report lúc 21:00 PM
  cron.schedule("0 21 * * *", async () => {
    console.log("[Chatbot Jobs] Running Daily Report...");
    const users = await User.find({ zaloId: { $ne: null } });
    for (const user of users) {
      try {
        const streak = user.streak || 0;
        let msg = `Ting ting! 🔔 Báo cáo cuối ngày:\n- Chuỗi học liên tiếp (Streak): ${streak} ngày 🔥\n- Điểm XP hiện tại: ${user.xp}\n`;
        
        if (streak > 0) {
          msg += `Bạn đang giữ chuỗi rất tốt, cố gắng đừng để đứt streak nhé. Chỉ cần 2 phút ôn tập thôi là được! Mentor tự hào về bạn.`;
        } else {
          msg += `Hôm nay bạn chưa học bài nè, không sao cả, ngày mai hãy bắt đầu lại một chuỗi mới nhé! 🚀`;
        }
        await api.sendMessage({ msg }, user.zaloId, 0);
      } catch (err) {
         console.error(`[Chatbot Jobs] Lỗi gửi report cho ${user.zaloId}:`, err);
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
      const response = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{role: "user", content: prompt}] });
      const msg = `Ê! Gửi bạn một chút kiến thức hay ho này 👇\n\n` + response.choices[0].message.content;

      for (const user of users) {
        await api.sendMessage({ msg }, user.zaloId, 0);
        await new Promise(r => setTimeout(r, 2000));
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
