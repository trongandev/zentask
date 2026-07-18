import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const seedDailyTasks = async () => {
  try {
    const { DailyTask } = await import("../models/Schemas.js");
    const { DAILY_TASKS } = await import("./system.js");

    // Check if tasks have missing desc field, if so, re-seed
    const sampleTask = await DailyTask.findOne();
    if (!sampleTask || !sampleTask.desc) {
      console.log("Seeding DailyTasks...");
      await DailyTask.deleteMany({}); // wipe out old tasks without desc
      const tasksToSeed = DAILY_TASKS.map((task) => ({
        type: task.id,
        title: task.title,
        desc: task.desc,
        xpPerItem: task.xpPerItem,
        icon: task.icon,
        total: task.total,
      }));
      await DailyTask.insertMany(tasksToSeed);
      console.log("DailyTasks seeded successfully");
    }
  } catch (error) {
    console.error("Error seeding DailyTasks:", error.message);
  }
};

const seedBotConfigs = async () => {
  try {
    const { BotConfig } = await import("../models/Schemas.js");
    const count = await BotConfig.countDocuments();
    if (count === 0) {
      console.log("Seeding BotConfigs...");
      const botConfigs = [
        {
          rankId: 1,
          rankName: "Bạc",
          correctRate: 40,
          fastResponseRate: 30,
          slowResponseRate: 70,
          timeDistribution: { 8: 10, 9: 10, 10: 10 },
        },
        {
          rankId: 2,
          rankName: "Lục Bảo",
          correctRate: 50,
          fastResponseRate: 45,
          slowResponseRate: 55,
          timeDistribution: { 6: 9, 7: 9, 8: 9, 9: 9, 10: 9 },
        },
        {
          rankId: 3,
          rankName: "Tinh Anh",
          correctRate: 60,
          fastResponseRate: 60,
          slowResponseRate: 40,
          timeDistribution: { 5: 10, 6: 10, 7: 10, 8: 10, 9: 10, 10: 10 },
        },
        {
          rankId: 4,
          rankName: "Kim Cương",
          correctRate: 70,
          fastResponseRate: 75,
          slowResponseRate: 25,
          timeDistribution: { 3: 9.3, 4: 9.3, 5: 9.4, 6: 9.4, 7: 9.4, 8: 9.4, 9: 9.4, 10: 9.4 },
        },
        {
          rankId: 5,
          rankName: "Cao Thủ",
          correctRate: 85,
          fastResponseRate: 90,
          slowResponseRate: 10,
          timeDistribution: { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9, 10: 9 },
        },
      ];
      await BotConfig.insertMany(botConfigs);
      console.log("BotConfigs seeded successfully");
    }
  } catch (error) {
    console.error("Error seeding BotConfigs:", error.message);
  }
};

const seedBeginnerCourseAndRanks = async () => {
  try {
    const { Course, CourseRank } = await import("../models/Course.js");
    const { RANK_NAMES } = await import("./system.js");

    // Seed global ranks
    for (const [id, name] of Object.entries(RANK_NAMES)) {
      const rankId = parseInt(id);
      let rank = await CourseRank.findOne({ rankId });
      if (!rank) {
        await CourseRank.create({ rankId, name });
        console.log(`Seeded CourseRank: ${name}`);
      }
    }

    // Seed default English course
    let course = await Course.findOne({ languageCode: "en" });
    let isNewCourse = false;
    if (!course) {
      course = await Course.create({ name: "Tiếng Anh", languageCode: "en" });
      console.log("Seeded default English course.");
      isNewCourse = true;
    }

    const { CourseTier, CourseLesson } = await import("../models/Course.js");
    const existingTiers = await CourseTier.countDocuments({ courseId: course._id });

    if (existingTiers === 0 || isNewCourse) {
      const dataPath = path.join(__dirname, "rankDataEN.json");
      if (fs.existsSync(dataPath)) {
        console.log("Seeding beginner English data from JSON...");
        const rawData = fs.readFileSync(dataPath, "utf8");
        const data = JSON.parse(rawData);

        for (const rankId of Object.keys(data)) {
          const rankData = data[rankId];
          const rank = await CourseRank.findOne({ rankId: parseInt(rankId) });
          if (!rank) continue;

          for (const tierNum of Object.keys(rankData.tiers)) {
            const tierData = rankData.tiers[tierNum];
            const tier = await CourseTier.create({
              courseId: course._id,
              rankId: rank._id,
              tierNum: parseInt(tierNum),
              cefr: tierData.cefr,
              topics: tierData.topics,
            });

            if (tierData.data) {
              for (const lesson of tierData.data) {
                // Keep only 1 example to save space
                const processedWords = (lesson.words || []).map((w) => {
                  if (w.examples && Array.isArray(w.examples) && w.examples.length > 0) {
                    w.examples = [w.examples[0]];
                  }
                  return w;
                });

                await CourseLesson.create({
                  tierId: tier._id,
                  lessonId: lesson.id,
                  title: lesson.title,
                  category: lesson.category,
                  wordCount: processedWords.length,
                  words: processedWords,
                });
              }
            }
          }
        }
        console.log("Successfully seeded English data from JSON.");
      }
    }
  } catch (error) {
    console.error("Error seeding beginner data:", error.message);
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
    await seedBotConfigs();
    await seedBeginnerCourseAndRanks();
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
