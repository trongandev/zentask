import cron from 'node-cron';
import User from '../models/User.js';
import { generateTasksForUser } from './beginnerSkillGenerator.js';

export const initCronJobs = () => {
  // Run everyday at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Bắt đầu tiến trình tạo lộ trình hằng ngày bằng AI...');
    try {
      // Find active users (active within the last 3 days) who opted in
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const activeUsers = await User.find({
        dailyLearningOptIn: true,
        lastActiveDate: { $gte: threeDaysAgo }
      });

      console.log(`[CRON] Tìm thấy ${activeUsers.length} users active. Bắt đầu xử lý batch...`);

      // Batch processing (Process 10 users at a time to avoid rate limits)
      const batchSize = 10;
      for (let i = 0; i < activeUsers.length; i += batchSize) {
        const batch = activeUsers.slice(i, i + batchSize);
        const promises = batch.map(user => {
          return generateTasksForUser(user).catch(err => {
            console.error(`[CRON] Error generating tasks for user ${user._id}:`, err);
          });
        });
        
        await Promise.all(promises);
        
        // Optional: Add a delay between batches if necessary
        // await new Promise(res => setTimeout(res, 2000));
      }

      console.log('[CRON] Hoàn thành tạo lộ trình AI hằng ngày.');
    } catch (error) {
      console.error('[CRON] Lỗi nghiêm trọng khi chạy cron tạo lộ trình:', error);
    }
  }, {
    timezone: "Asia/Ho_Chi_Minh"
  });
};
