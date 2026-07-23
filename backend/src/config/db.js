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

    const sampleTask = await DailyTask.findOne();
    if (!sampleTask || !sampleTask.desc) {
      console.log("Seeding DailyTasks...");
      await DailyTask.deleteMany({});
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
        { rankId: 1, rankName: "Bạc", correctRate: 40, fastResponseRate: 30, slowResponseRate: 70, timeDistribution: { 8: 10, 9: 10, 10: 10 } },
        { rankId: 2, rankName: "Lục Bảo", correctRate: 50, fastResponseRate: 45, slowResponseRate: 55, timeDistribution: { 6: 9, 7: 9, 8: 9, 9: 9, 10: 9 } },
        { rankId: 3, rankName: "Tinh Anh", correctRate: 60, fastResponseRate: 60, slowResponseRate: 40, timeDistribution: { 5: 10, 6: 10, 7: 10, 8: 10, 9: 10, 10: 10 } },
        { rankId: 4, rankName: "Kim Cương", correctRate: 70, fastResponseRate: 75, slowResponseRate: 25, timeDistribution: { 3: 9.3, 4: 9.3, 5: 9.4, 6: 9.4, 7: 9.4, 8: 9.4, 9: 9.4, 10: 9.4 } },
        { rankId: 5, rankName: "Cao Thủ", correctRate: 85, fastResponseRate: 90, slowResponseRate: 10, timeDistribution: { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9, 10: 9 } },
      ];
      await BotConfig.insertMany(botConfigs);
      console.log("BotConfigs seeded successfully");
    }
  } catch (error) {
    console.error("Error seeding BotConfigs:", error.message);
  }
};

export const getCEFRForLanguage = (langCode, rankId) => {
  const map = {
    en: ["A1", "A2", "B1", "B2", "C1"],
    fr: ["A1", "A2", "B1", "B2", "C1"],
    de: ["A1", "A2", "B1", "B2", "C1"],
    es: ["A1", "A2", "B1", "B2", "C1"],
    zh: ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5"],
    ja: ["N5", "N4", "N3", "N2", "N1"],
    ko: ["TOPIK 1", "TOPIK 2", "TOPIK 3", "TOPIK 4", "TOPIK 5"],
    th: ["Beginner", "Elementary", "Intermediate", "Upper Int", "Advanced"],
  };
  const levels = map[langCode] || map["en"];
  return levels[rankId - 1] || levels[levels.length - 1];
};

const seedCourse = async () => {
  try {
    const { Course, CourseRank, CourseTier } = await import("../models/Course.js");
    const { RANK_NAMES, RANK_CONFIG } = await import("./system.js");

    const languages = [
      { name: "Tiếng Anh", code: "en" },
      { name: "Tiếng Trung", code: "zh" },
      { name: "Tiếng Hàn", code: "ko" },
      { name: "Tiếng Nhật", code: "ja" },
      { name: "Tiếng Đức", code: "de" },
      { name: "Tiếng Pháp", code: "fr" },
      { name: "Tiếng Tây Ban Nha", code: "es" },
      { name: "Tiếng Thái Lan", code: "th" },
    ];

    // Seed global ranks
    for (const [id, name] of Object.entries(RANK_NAMES)) {
      const rankId = parseInt(id);
      let rank = await CourseRank.findOne({ rankId });
      if (!rank) {
        await CourseRank.create({ rankId, name });
        console.log(`Seeded CourseRank: ${name}`);
      }
    }

    // Seed Courses & Tiers
    for (const lang of languages) {
      let course = await Course.findOne({ languageCode: lang.code });
      if (!course) {
        course = await Course.create({ name: lang.name, languageCode: lang.code });
        console.log(`Seeded Course: ${lang.name}`);

        // Create Tiers for this course
        for (let rankId = 1; rankId <= 5; rankId++) {
          const rank = await CourseRank.findOne({ rankId });
          if (rank) {
            const maxTiers = RANK_CONFIG[rankId].maxTiers || 1;
            for (let tierNum = 1; tierNum <= maxTiers; tierNum++) {
              await CourseTier.create({
                courseId: course._id,
                rankId: rank._id,
                tierNum: tierNum,
                cefr: getCEFRForLanguage(lang.code, rankId),
                topics: [],
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in seedCourse:", error.message);
  }
};

const seedCoursesFromTxt = async () => {
  try {
    const { Course, CourseTier, CourseLesson, WordBank } = await import("../models/Course.js");
    const courseDir = path.join(__dirname, "course");

    if (!fs.existsSync(courseDir)) return;

    const files = fs.readdirSync(courseDir).filter((f) => f.endsWith(".txt"));
    for (const file of files) {
      const dataPath = path.join(courseDir, file);
      const rawData = fs.readFileSync(dataPath, "utf8");
      const lines = rawData.split("\n");

      let langCode = null;
      if (lines[0] && lines[0].startsWith("##")) {
        langCode = lines[0].substring(2).trim();
      }

      if (!langCode) {
        console.warn(`File ${file} is missing language code header (e.g. ##en). Skipping.`);
        continue;
      }

      const course = await Course.findOne({ languageCode: langCode });
      if (!course) {
        console.warn(`Course with languageCode ${langCode} not found for file ${file}. Skipping.`);
        continue;
      }

      const existingLessons = await CourseLesson.countDocuments({ courseId: course._id });
      if (existingLessons > 0) {
        // console.log(`Course ${langCode} already seeded. Skipping ${file}.`);
        continue;
      }

      console.log(`Seeding data for ${langCode} from ${file}...`);

      const tiers = await CourseTier.find({ courseId: course._id }).populate("rankId");

      let currentTierId = null;
      let currentTopic = null;
      const createdLessons = [];
      const wordBankDocs = [];
      const tierUpdates = {};

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith("#TIER|")) {
          const parts = line.split("|");
          const rId = parseInt(parts[1]?.trim());
          const tNum = parseInt(parts[2]?.trim());
          const tier = tiers.find((t) => t.rankId.rankId === rId && t.tierNum === tNum);
          currentTierId = tier ? tier._id.toString() : null;
          if (currentTierId && !tierUpdates[currentTierId]) {
            tierUpdates[currentTierId] = [];
          }
        } else if (line.startsWith("#TOPIC|")) {
          const parts = line.split("|");
          const topicId = parts[1]?.trim();
          const title = parts[2]?.trim();
          const desc = parts[3]?.trim();

          if (currentTierId && title) {
            tierUpdates[currentTierId].push(title);
            currentTopic = {
              lessonId: topicId || `topic_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              title: title,
              desc: desc,
              tierId: currentTierId,
              words: [],
            };
            createdLessons.push(currentTopic);
          }
        } else if (line.startsWith("#WORD|")) {
          const parts = line.split("|");
          const term = parts[1]?.trim();
          const phonetic = parts[2]?.trim();
          const translation = parts[3]?.trim();
          const exampleStr = parts[4]?.trim();
          const note = parts[5]?.trim();

          if (currentTopic && term) {
            const examples = [];
            if (exampleStr) {
              const exParts = exampleStr.split("~");
              if (exParts.length === 2) {
                examples.push({ en: exParts[0].trim(), vi: exParts[1].trim() });
              }
            }

            const wordData = {
              id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              term,
              phonetic,
              translation,
              examples,
              notes: note,
            };
            currentTopic.words.push(wordData);

            wordBankDocs.push({
              courseId: course._id,
              term,
              phonetic,
              translation,
              notes: note,
              examples,
            });
          }
        }
      }

      for (const tierId of Object.keys(tierUpdates)) {
        if (tierUpdates[tierId].length > 0) {
          await CourseTier.findByIdAndUpdate(tierId, { $addToSet: { topics: { $each: tierUpdates[tierId] } } });
        }
      }

      for (const lessonData of createdLessons) {
        await CourseLesson.create({
          courseId: course._id,
          lessonId: lessonData.lessonId,
          tierId: lessonData.tierId,
          title: lessonData.title,
          category: "topic",
          order: 0,
          wordCount: lessonData.words.length,
          words: lessonData.words,
          questions: [],
        });
      }

      if (wordBankDocs.length > 0) {
        await WordBank.insertMany(wordBankDocs);
      }

      console.log(`Successfully seeded ${langCode} from ${file}.`);
    }
  } catch (error) {
    console.error("Error seeding course data from txt files:", error.message);
  }
};

const seedDropTable = async () => {
  try {
    const { Course, CourseRank, CourseTier, CourseLesson, WordBank, QuestionBank } = await import("../models/Course.js");

    console.log("⚠️ Dropping all course-related collections...");
    await Promise.all([CourseLesson.deleteMany({}), CourseTier.deleteMany({}), CourseRank.deleteMany({}), Course.deleteMany({}), WordBank.deleteMany({}), QuestionBank.deleteMany({})]);
    console.log("✅ Successfully dropped all course data!");
  } catch (error) {
    console.error("❌ Error dropping tables:", error.message);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {});
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Dùng hàm dưới đây khi bạn muốn reset toàn bộ dữ liệu khóa học
    // await seedDropTable();

    // Run seeders
    await seedDailyTasks();
    await seedBotConfigs();
    await seedCourse();
    await seedCoursesFromTxt();
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
