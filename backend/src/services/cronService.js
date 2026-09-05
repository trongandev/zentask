import cron from 'node-cron';
import User from '../models/User.js';
import { generateTasksForUser } from './beginnerSkillGenerator.js';
import { PendingMistakeQueue } from '../models/Schemas.js';
import { generatePersonalizedContent } from './personalizedGenerator.js';

export const initCronJobs = () => {
  // Run everyday at 0:00 (Midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Bắt đầu tiến trình tạo ngữ pháp và kỹ năng từ lỗi sai...');
    try {
      // Find all distinct users in the mistake queue
      const userIds = await PendingMistakeQueue.distinct('userId');
      console.log(`[CRON] Tìm thấy ${userIds.length} users có lỗi sai cần xử lý.`);

      const batchSize = 10;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batchIds = userIds.slice(i, i + batchSize);
        
        const promises = batchIds.map(async (uid) => {
          try {
            const user = await User.findById(uid);
            if (!user) return;
            
            // Get mistakes for this user
            const mistakes = await PendingMistakeQueue.find({ userId: uid });
            if (mistakes.length === 0) return;

            // Generate content
            const success = await generatePersonalizedContent(user, mistakes);
            
            if (success) {
              // Delete processed mistakes
              await PendingMistakeQueue.deleteMany({ userId: uid });
            }
          } catch (err) {
            console.error(`[CRON] Lỗi xử lý cho user ${uid}:`, err);
          }
        });
        
        await Promise.all(promises);
      }

      console.log('[CRON] Hoàn thành xử lý lỗi sai.');
    } catch (error) {
      console.error('[CRON] Lỗi nghiêm trọng khi chạy cron:', error);
    }
  }, {
    timezone: "Asia/Ho_Chi_Minh"
  });
};
