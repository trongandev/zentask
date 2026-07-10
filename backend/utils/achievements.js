import User from "../src/models/User.js";
import { QuizResult, FlashcardProgress } from "../src/models/Schemas.js";
import { SYSTEM_BADGES } from "../src/config/system.js";
import { createNotification } from "./notifications.js";

// eventType: "CHECK_IN" | "STUDY_TIME" | "FLASHCARD_LEARNED" | "QUIZ_SUBMIT" | "LEADERBOARD"
export const checkAchievements = async (uid, eventType, data = {}, app) => {
  try {
    const user = await User.findById(uid);
    if (!user) return;

    const achievedBadges = user.achievedBadges || [];
    let newBadges = [];

    // Helper to evaluate badge
    const awardBadge = (badgeId) => {
      if (!achievedBadges.includes(badgeId) && !newBadges.includes(badgeId)) {
        newBadges.push(badgeId);
      }
    };

    if (eventType === "CHECK_IN") {
      // 1: Chăm chỉ - Học 7 ngày liên tiếp
      if (user.streak >= 7) awardBadge(1);

      // 9: Ngôi sao hy vọng - Học bù sau khi mất chuỗi
      if (user.streak === 1 && user.maxStreak >= 3) awardBadge(9);
    } else if (eventType === "STUDY_TIME") {
      // Server is in UTC, so we convert to VN time (UTC+7)
      const vnHour = (new Date().getUTCHours() + 7) % 24;

      // 2: Cú đêm - Học sau 10h tối (22:00 -> 04:00)
      if (vnHour >= 22 || vnHour < 4) awardBadge(2);

      // 6: Dậy sớm - Học trước 6h sáng (04:00 -> 06:00)
      if (vnHour >= 4 && vnHour < 6) awardBadge(6);

      // 7: Sọt rác - Học liên tục 2 tiếng
      if (data.todayMinutes && data.todayMinutes >= 120) awardBadge(7);
    } else if (eventType === "QUIZ_SUBMIT") {
      // 4: Hoàn hảo - Đạt 100% điểm 5 bài Quiz
      // 8: Kẻ huỷ diệt - Vượt qua 100 bài Quiz
      if (!achievedBadges.includes(4) || !achievedBadges.includes(8)) {
        const quizResults = await QuizResult.find({ uid }).lean();
        const totalQuizzes = quizResults.length;
        let perfectCount = 0;

        quizResults.forEach((doc) => {
          if (doc.score === 100) perfectCount++;
        });

        if (perfectCount >= 5) awardBadge(4);
        if (totalQuizzes >= 100) awardBadge(8);
      }
    } else if (eventType === "FLASHCARD_LEARNED") {
      // 3: Thần đồng từ vựng - Học 1000 từ vựng
      if (!achievedBadges.includes(3)) {
        const count = await FlashcardProgress.countDocuments({ userId: uid });
        if (count >= 1000) awardBadge(3);
      }
    } else if (eventType === "LEADERBOARD") {
      // 5: Thợ săn thành tích - Vào top 3 bảng xếp hạng tuần
      if (data.rank && data.rank <= 3) awardBadge(5);
    }

    // Save and Notify
    if (newBadges.length > 0) {
      await User.findByIdAndUpdate(uid, {
        $push: { achievedBadges: { $each: newBadges } },
      });

      for (const badgeId of newBadges) {
        const badgeDef = SYSTEM_BADGES.find((b) => b.id === badgeId);
        if (badgeDef) {
          await createNotification(app, uid, "achievement", "🏆 Đạt danh hiệu mới!", `Chúc mừng bạn đã đạt danh hiệu "${badgeDef.name}" - ${badgeDef.description}`);
        }
      }
    }
  } catch (err) {
    console.error("Error checking achievements:", err);
  }
};
