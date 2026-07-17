import cron from "node-cron";
import { BotJobSchedule } from "../src/models/Schemas.js";
import * as jobs from "./chatbotJobs.js";

const scheduledTasks = new Map();
let globalApi = null;

const scheduleCronJob = (jobDoc, api) => {
  if (scheduledTasks.has(jobDoc.jobId)) {
    scheduledTasks.get(jobDoc.jobId).stop();
    scheduledTasks.delete(jobDoc.jobId);
  }

  if (!jobDoc.isActive) return;

  try {
    const task = cron.schedule(jobDoc.cronExpression, async () => {
      console.log(`[JobManager] Running job: ${jobDoc.name} (${jobDoc.jobId})`);
      try {
        if (jobs[jobDoc.jobId]) {
          await jobs[jobDoc.jobId](api);
        } else {
          console.warn(`[JobManager] Handler for job ${jobDoc.jobId} not found in chatbotJobs.js`);
        }
        await BotJobSchedule.updateOne({ jobId: jobDoc.jobId }, { lastRun: new Date() });
      } catch (e) {
        console.error(`[JobManager] Job ${jobDoc.jobId} failed:`, e);
      }
    });

    scheduledTasks.set(jobDoc.jobId, task);
  } catch (error) {
    console.error(`[JobManager] Invalid cron expression for ${jobDoc.jobId}: ${jobDoc.cronExpression}`);
  }
};

const defaultJobs = [
  { jobId: "daily_quizzes", name: "Tự tạo 10 câu trắc nghiệm", description: "Mỗi 6h sáng, tự động lấy AI sinh 10 câu mới.", cronExpression: "0 6 * * *", isActive: true },
  { jobId: "generate_random_quiz_schedule", name: "Sinh lịch đố vui ngẫu nhiên", description: "Sinh 10 khung giờ ngẫu nhiên mỗi ngày lúc 00:00", cronExpression: "0 0 * * *", isActive: true },
  { jobId: "random_quiz_check", name: "Quét lịch đố vui", description: "Kiểm tra mỗi phút xem có tới giờ gửi đố vui không", cronExpression: "* * * * *", isActive: true },
  { jobId: "daily_task_reminder", name: "Nhắc nhiệm vụ ngày", description: "Gửi inbox báo người dùng nếu chưa làm xong daily task lúc 20h.", cronExpression: "0 20 * * *", isActive: true },
  { jobId: "minigame_scrambled", name: "Minigame Đảo Chữ", description: "Tự gửi minigame đảo chữ lúc 21:00", cronExpression: "0 21 * * *", isActive: true },
  { jobId: "minigame_emoji", name: "Minigame Bắt Chữ", description: "Tự gửi minigame đuổi hình bắt chữ lúc 21:30", cronExpression: "30 21 * * *", isActive: true },
  { jobId: "minigame_listening", name: "Minigame Nghe Chép", description: "Tự gửi minigame nghe chép chính tả lúc 22:00", cronExpression: "0 22 * * *", isActive: true },
  { jobId: "word_chain_invite", name: "Rủ chơi Nối từ", description: "Inbox rủ người dùng chơi word chain lúc 20:30", cronExpression: "30 20 * * *", isActive: true },
  { jobId: "streak_warning", name: "Cảnh báo đứt chuỗi", description: "Cảnh báo lúc 22:00 nếu chưa điểm danh để mất streak.", cronExpression: "0 22 * * *", isActive: true },
  { jobId: "morning_motivation", name: "Động lực buổi sáng", description: "Gửi câu châm ngôn ngẫu nhiên ra nhóm lúc 6:30", cronExpression: "30 6 * * *", isActive: true },
  { jobId: "spaced_repetition_check", name: "Nhắc ôn Flashcard", description: "Quét mỗi giờ xem ai tới hạn ôn thẻ thì báo inbox.", cronExpression: "0 * * * *", isActive: true },
  { jobId: "weekly_leaderboard", name: "Bảng phong thần tuần", description: "Vinh danh thành tích tuần vào 21:00 Chủ Nhật", cronExpression: "0 21 * * 0", isActive: true },
  { jobId: "daily_checkin", name: "Check-in tâm trạng", description: "Quét mỗi phút để hỏi tâm trạng user theo giờ họ đã hẹn.", cronExpression: "* * * * *", isActive: true },
  { jobId: "spaced_repetition_quiz", name: "Tra bài Flashcard", description: "Gửi câu trắc nghiệm lấy từ các thẻ đã học vào 14:00.", cronExpression: "0 14 * * *", isActive: true },
  { jobId: "daily_wrapup", name: "Báo cáo cuối ngày", description: "Gửi inbox tóm tắt hoạt động trong ngày cho user lúc 21:00", cronExpression: "0 21 * * *", isActive: true },
  { jobId: "proactive_value_sharing", name: "Chia sẻ kiến thức", description: "Chia sẻ idiom/slang vui vào 12h Thứ 4 và Thứ 7", cronExpression: "0 12 * * 3,6", isActive: true },
  { jobId: "co_creation_goals", name: "Mục tiêu thứ hai", description: "Hỏi mục tiêu tuần vào 07:00 Thứ hai", cronExpression: "0 7 * * 1", isActive: true },
  { jobId: "flash_drop_1", name: "Rải Lì Xì (Lần 1)", description: "Rải XP ngẫu nhiên", cronExpression: "15 9 * * *", isActive: true },
  { jobId: "flash_drop_2", name: "Rải Lì Xì (Lần 2)", description: "Rải XP ngẫu nhiên", cronExpression: "45 15 * * *", isActive: true },
  { jobId: "flash_drop_3", name: "Rải Lì Xì (Lần 3)", description: "Rải XP ngẫu nhiên", cronExpression: "20 20 * * *", isActive: true },
];

export const initJobs = async (api) => {
  globalApi = api;
  // 1. Seed defaults if DB is empty or missing jobs
  for (const defaultJob of defaultJobs) {
    const exists = await BotJobSchedule.findOne({ jobId: defaultJob.jobId });
    if (!exists) {
      await BotJobSchedule.create(defaultJob);
    }
  }

  // 2. Load all from DB and schedule
  const allJobs = await BotJobSchedule.find();
  for (const jobDoc of allJobs) {
    scheduleCronJob(jobDoc, api);
  }
  console.log(`[JobManager] Loaded & Scheduled ${allJobs.length} active jobs.`);
};

export const triggerJob = async (jobId) => {
  if (!globalApi) throw new Error("Bot API not initialized");
  if (jobs[jobId]) {
    await jobs[jobId](globalApi);
    await BotJobSchedule.updateOne({ jobId }, { lastRun: new Date() });
    return { success: true, message: `Đã kích hoạt job ${jobId}` };
  }
  throw new Error(`Handler cho job ${jobId} không tồn tại`);
};

export const reloadJob = async (jobId) => {
  const jobDoc = await BotJobSchedule.findOne({ jobId });
  if (jobDoc) {
    scheduleCronJob(jobDoc, globalApi);
  }
};
