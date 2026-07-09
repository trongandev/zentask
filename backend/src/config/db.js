import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const seedDailyTasks = async () => {
  try {
    const { DailyTask } = await import('../models/Schemas.js');
    const { DAILY_TASKS } = await import('./system.js');
    
    // Check if tasks have missing desc field, if so, re-seed
    const sampleTask = await DailyTask.findOne();
    if (!sampleTask || !sampleTask.desc) {
      console.log('Seeding DailyTasks...');
      await DailyTask.deleteMany({}); // wipe out old tasks without desc
      const tasksToSeed = DAILY_TASKS.map(task => ({
        type: task.id,
        title: task.title,
        desc: task.desc,
        xpPerItem: task.xpPerItem,
        icon: task.icon,
        total: task.total
      }));
      await DailyTask.insertMany(tasksToSeed);
      console.log('DailyTasks seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding DailyTasks:', error.message);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options are mostly defaults in Mongoose 6+, but explicitly set them if needed
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Run seeders
    await seedDailyTasks();
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
