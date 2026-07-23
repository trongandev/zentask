import { BeginnerProgress } from "../models/Schemas.js";
import { Course, CourseRank, CourseTier, CourseLesson } from "../models/Course.js";

export const getBeginnerProgress = async (req, res) => {
  try {
    const uid = req.user.uid;
    let progress = await BeginnerProgress.findOne({ uid });

    if (!progress) {
      progress = await BeginnerProgress.create({
        uid,
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
