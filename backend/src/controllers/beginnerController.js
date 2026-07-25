import { BeginnerProgress } from "../models/Schemas.js";
import { Course, CourseRank, CourseTier, CourseLesson } from "../models/Course.js";
import User from "../models/User.js";
import BeginnerSkill from "../models/beginnerSkill.js";
import { generateTasksForUser } from '../services/beginnerSkillGenerator.js';

export const getBeginnerProgress = async (req, res) => {
  try {
    const uid = req.user.uid;
    let progress = await BeginnerProgress.findOne({ uid });

    if (!progress) {
      progress = await BeginnerProgress.create({
        uid,
        userId: uid,           // Tránh lỗi index duplicate userId_1_lessonId_1 do schema cũ
        lessonId: "general",   // Tránh lỗi index duplicate userId_1_lessonId_1 do schema cũ
        completedGrammarTopics: [],
        completedSkills: [],
      });
    }

    res.json(progress);
  } catch (error) {
    console.error("Error in getBeginnerProgress:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const completeGrammarTopic = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { topicId } = req.body;

    if (!topicId) {
      return res.status(400).json({ message: "Thiếu topicId" });
    }

    let progress = await BeginnerProgress.findOne({ uid });
    if (!progress) {
      progress = new BeginnerProgress({ uid, completedGrammarTopics: [], completedSkills: [] });
    }

    if (!progress.completedGrammarTopics.includes(topicId)) {
      progress.completedGrammarTopics.push(topicId);
      await progress.save();
    }

    res.json({ message: "Đã lưu tiến độ thành công", progress });
  } catch (error) {
    console.error("Error in completeGrammarTopic:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const seedBeginnerData = async (req, res) => {
  try {
    const { courseName, languageCode, data } = req.body;

    let course = await Course.findOne({ languageCode });
    if (!course) {
      course = await Course.create({ name: courseName, languageCode });
    } else {
      const oldTiers = await CourseTier.find({ courseId: course._id });
      for (const tier of oldTiers) {
        await CourseLesson.deleteMany({ tierId: tier._id });
      }
      await CourseTier.deleteMany({ courseId: course._id });
    }

    for (const rankId of Object.keys(data)) {
      const rankData = data[rankId];
      let rank = await CourseRank.findOne({ rankId: parseInt(rankId) });
      if (!rank) {
        rank = await CourseRank.create({
          rankId: parseInt(rankId),
          name: rankData.name,
        });
      }

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
            await CourseLesson.create({
              tierId: tier._id,
              lessonId: lesson.id,
              title: lesson.title,
              category: lesson.category,
              wordCount: (lesson.words || []).length,
              words: lesson.words,
            });
          }
        }
      }
    }

    res.json({ message: "Seed successful" });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getBeginnerRanks = async (req, res) => {
  try {
    const languageCode = req.user?.targetLanguage || req.query.lang || "en";
    const course = await Course.findOne({ languageCode });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const ranks = await CourseRank.find().sort({ rankId: 1 }).lean();

    // We need to build the hierarchy
    const result = {};
    for (const rank of ranks) {
      const tiers = await CourseTier.find({ courseId: course._id, rankId: rank._id }).lean();

      const tiersObj = {};
      for (const tier of tiers) {
        const lessons = await CourseLesson.find({ tierId: tier._id }).select("lessonId title category wordCount").lean();
        tiersObj[tier.tierNum] = {
          cefr: tier.cefr,
          topics: tier.topics,
          data: lessons.map((l) => ({
            id: l.lessonId,
            title: l.title,
            category: l.category,
            wordCount: l.wordCount || 0,
          })),
        };
      }

      result[rank.rankId] = {
        name: rank.name,
        tiers: tiersObj,
      };
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching ranks:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getBeginnerLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = await CourseLesson.findOne({ lessonId }).lean();
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    res.json({
      id: lesson.lessonId,
      title: lesson.title,
      category: lesson.category,
      words: lesson.words,
    });
  } catch (error) {
    console.error("Error fetching lesson:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getBeginnerStats = async (req, res) => {
  try {
    const uid = req.user.uid || req.user.id || req.user._id;
    const languageCode = req.user?.targetLanguage || req.query.lang || "en";
    const course = await Course.findOne({ languageCode });
    let totalWords = 0;
    let totalTopics = 0;

    if (course) {
      const tiers = await CourseTier.find({ courseId: course._id }).lean();
      const tierIds = tiers.map((t) => t._id);

      const stats = await CourseLesson.aggregate([
        { $match: { tierId: { $in: tierIds } } },
        {
          $group: {
            _id: null,
            totalWords: { $sum: "$wordCount" },
            totalTopics: { $sum: 1 },
          },
        },
      ]);
      if (stats.length > 0) {
        totalWords = stats[0].totalWords || 0;
        totalTopics = stats[0].totalTopics || 0;
      }
    }

    const records = await BeginnerProgress.find({ $or: [{ uid: uid }, { userId: uid }] }).lean();
    const completedLessonIds = records.map((r) => r.lessonId); // e.g. "t1_do_an_uong_0"
    const rewardClaimedCount = records.filter((r) => r.rewardClaimed).length;

    // Extract base topicIds (e.g. "t1_do_an_uong")
    const baseTopicIds = completedLessonIds
      .filter((id) => typeof id === "string" && id.length > 0)
      .map((id) => {
        const lastUnderscore = id.lastIndexOf("_");
        return lastUnderscore > 0 ? id.substring(0, lastUnderscore) : id;
      });
    const uniqueBaseTopicIds = [...new Set(baseTopicIds)];

    // Fetch word count for completed base topics
    const completedLessonsDocs = await CourseLesson.find({ lessonId: { $in: uniqueBaseTopicIds } })
      .select("lessonId wordCount")
      .lean();

    const wordCountMap = {};
    completedLessonsDocs.forEach(doc => {
      wordCountMap[doc.lessonId] = doc.wordCount || 0;
    });

    let learnedWords = 0;
    completedLessonIds
      .filter((id) => typeof id === "string" && id.length > 0)
      .forEach((id) => {
        const lastUnderscore = id.lastIndexOf("_");
        const baseId = lastUnderscore > 0 ? id.substring(0, lastUnderscore) : id;
        const index = lastUnderscore > 0 ? parseInt(id.substring(lastUnderscore + 1), 10) : 0;
        
        const totalWordsInTopic = wordCountMap[baseId] || 0;
        if (totalWordsInTopic > 0) {
          const WORDS_PER_LESSON = 5;
          const totalLessonsInTopic = Math.ceil(totalWordsInTopic / WORDS_PER_LESSON) || 1;
          
          if (index === totalLessonsInTopic - 1) {
            // Last chunk
            const remainder = totalWordsInTopic - (index * WORDS_PER_LESSON);
            learnedWords += remainder > 0 ? remainder : WORDS_PER_LESSON;
          } else {
            // Normal chunk
            learnedWords += WORDS_PER_LESSON;
          }
        }
      });

    const completedTopics = records.length;
    const totalXP = completedTopics * 10 + rewardClaimedCount * 20;

    res.json({
      totalWords,
      totalTopics,
      completedTopics,
      learnedWords,
      totalXP,
    });
  } catch (error) {
    console.error("Error in getBeginnerStats:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const optInDailyLearning = async (req, res) => {
  try {
    const uid = req.user.uid || req.user.id || req.user._id;
    const { preferences } = req.body;

    if (!Array.isArray(preferences) || preferences.length === 0) {
      return res.status(400).json({ message: "Vui lòng chọn ít nhất 1 chủ đề yêu thích." });
    }

    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.learningPreferences = preferences;
    user.dailyLearningOptIn = true;
    user.lastActiveDate = new Date();
    await user.save();

    // Trigger async function to generate Day 1 tasks immediately if they don't exist yet for today
    generateTasksForUser(user).catch(err => console.error("Error generating initial tasks:", err));

    res.json({ message: "Đã lưu sở thích và kích hoạt Lộ trình hằng ngày!", preferences });
  } catch (error) {
    console.error("Error in optInDailyLearning:", error);
    res.status(500).json({ message: "Lỗi server khi đăng ký lộ trình" });
  }
};

export const getDailyTasks = async (req, res) => {
  try {
    const uid = req.user.uid || req.user.id || req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = await BeginnerSkill.find({
      userId: uid,
      date: { $gte: today }
    }).sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (error) {
    console.error("Error fetching daily tasks:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const getSkillTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await BeginnerSkill.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy bài tập này" });
    }
    res.json({ task });
  } catch (error) {
    console.error("Error fetching skill task by ID:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const devGenerateTasks = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Chức năng này chỉ dành cho môi trường phát triển." });
    }
    const uid = req.user.uid || req.user.id || req.user._id;
    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Force trigger background task
    generateTasksForUser(user).catch(err => console.error("Dev trigger error:", err));

    res.json({ message: "Đang tiến hành tạo bài tập mới ở background..." });
  } catch (error) {
    console.error("Error in devGenerateTasks:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
