import { Course, CourseRank, CourseTier, CourseLesson } from "../models/Course.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

// GET /api/admin/courses/tree
// Lấy toàn bộ cây dữ liệu khóa học (không lấy words) để làm Tree View ở Cột Trái
export const getAdminCourseTree = asyncHandler(async (req, res) => {
  const courses = await Course.find().lean();
  const ranks = await CourseRank.find().sort({ rankId: 1 }).lean();

  const result = [];
  for (const course of courses) {
    const courseObj = {
      id: course._id,
      name: course.name,
      languageCode: course.languageCode,
      ranks: [],
    };

    for (const rank of ranks) {
      const tiers = await CourseTier.find({ courseId: course._id, rankId: rank._id }).sort({ tierNum: 1 }).lean();
      if (tiers.length === 0) continue; // Skip rank if no tiers

      const rankObj = {
        id: rank._id,
        rankId: rank.rankId,
        name: rank.name,
        tiers: [],
      };

      for (const tier of tiers) {
        const lessons = await CourseLesson.find({ tierId: tier._id })
          .select("-words") // Quan trọng: không lấy words để tối ưu payload
          .lean();

        rankObj.tiers.push({
          id: tier._id,
          tierNum: tier.tierNum,
          cefr: tier.cefr,
          topics: tier.topics,
          lessons: lessons.map((l) => ({
            id: l._id, // mongodb _id
            lessonId: l.lessonId, // e.g., topic_family
            title: l.title,
            category: l.category,
            wordCount: l.wordCount || 0,
          })),
        });
      }

      courseObj.ranks.push(rankObj);
    }
    result.push(courseObj);
  }

  res.json(result);
});

// GET /api/admin/courses/lesson/:id
export const getAdminLesson = asyncHandler(async (req, res) => {
  const lesson = await CourseLesson.findById(req.params.id).lean();
  if (!lesson) return res.status(404).json({ message: "Lesson not found" });
  res.json(lesson);
});

// POST /api/admin/courses/tier/:tierId/lesson
export const createAdminLesson = asyncHandler(async (req, res) => {
  const { tierId } = req.params;
  const { lessonId, title, category } = req.body;

  const newLesson = await CourseLesson.create({
    tierId,
    lessonId,
    title,
    category,
    wordCount: 0,
    words: [],
  });

  res.json({ status: "success", data: newLesson });
});

// PUT /api/admin/courses/lesson/:id
export const updateAdminLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, category, words } = req.body;

  const updateData = { title, category };

  if (words !== undefined) {
    updateData.words = words;
    updateData.wordCount = Array.isArray(words) ? words.length : 0;
  }

  const updated = await CourseLesson.findByIdAndUpdate(id, updateData, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: "Lesson not found" });

  res.json({ status: "success", data: updated });
});

// DELETE /api/admin/courses/lesson/:id
export const deleteAdminLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await CourseLesson.findByIdAndDelete(id);
  res.json({ status: "success" });
});
