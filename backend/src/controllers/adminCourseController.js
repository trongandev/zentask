import { Course, CourseRank, CourseTier, CourseLesson, QuestionBank, WordBank } from "../models/Course.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { GoogleGenAI } from "@google/genai";
import { RANK_CONFIG } from "../config/system.js";
import { getCEFRForLanguage } from "../config/db.js";
import { generateAIContent } from "../services/ai.service.js";
import { parseMessyAIData } from "../../utils/util.js";
import { getSystemPromptCreateCourse, getSystemPromptCreateCourseLessonFull } from "../../utils/prompt.js";

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
          .sort({ order: 1 })
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
            order: l.order || 0,
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

// POST /api/admin/courses/seed
// Seed 1 khóa học mới hoàn chỉnh với cấu trúc Ranks và Tiers
export const createCourse = asyncHandler(async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: "Missing name or code" });
  }

  const newCourse = await Course.create({ name, code });
  res.status(201).json(newCourse);
});

export const updateCourseOrder = asyncHandler(async (req, res) => {
  // Dummy implementation to fix crash
  res.json({ message: "Not implemented yet" });
});

export const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const course = await Course.findById(id);
  if (!course) {
    return res.status(404).json({ error: "Khóa học không tồn tại" });
  }

  // Find all ranks of this course
  const ranks = await CourseRank.find({ courseId: id });
  for (const rank of ranks) {
    // Find all tiers of this rank
    const tiers = await CourseTier.find({ rankId: rank._id });
    for (const tier of tiers) {
      // Find all lessons of this tier
      const lessons = await CourseLesson.find({ tierId: tier._id });
      // Delete words inside lessons if needed (not applicable since words are mixed or in WordBank)
      await CourseLesson.deleteMany({ tierId: tier._id });
    }
    await CourseTier.deleteMany({ rankId: rank._id });
  }

  await CourseRank.deleteMany({ courseId: id });

  // Xoá unassigned lessons và resource bank data
  await CourseLesson.deleteMany({ category: "topic", tierId: { $exists: false } }); // Unassigned lessons
  await WordBank.deleteMany({ courseId: id });
  await QuestionBank.deleteMany({ courseId: id });

  await Course.findByIdAndDelete(id);

  res.json({ message: "Course deleted successfully" });
});

export const seedAdminCourse = asyncHandler(async (req, res) => {
  const { name, languageCode } = req.body;
  if (!name || !languageCode) {
    return res.status(400).json({ error: "Missing name or languageCode" });
  }

  let course = await Course.findOne({ languageCode });
  if (course) {
    return res.status(400).json({ error: "Course for this language already exists" });
  }

  course = await Course.create({ name, languageCode });

  // Create Tiers for this course
  for (let rankId = 1; rankId <= 5; rankId++) {
    const rank = await CourseRank.findOne({ rankId });
    if (rank) {
      const maxTiers = RANK_CONFIG[rankId]?.maxTiers || 1;
      for (let tierNum = 1; tierNum <= maxTiers; tierNum++) {
        await CourseTier.create({
          courseId: course._id,
          rankId: rank._id,
          tierNum: tierNum,
          cefr: getCEFRForLanguage ? getCEFRForLanguage(languageCode, rankId) : "A1",
          topics: [],
        });
      }
    }
  }

  res.json({ status: "success", data: course });
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

  const tier = await CourseTier.findById(tierId);
  if (!tier) return res.status(404).json({ message: "Tier not found" });

  const newLesson = await CourseLesson.create({
    courseId: tier.courseId,
    tierId,
    lessonId,
    title,
    category,
    order: 0,
    wordCount: 0,
    words: [],
    questions: [],
  });

  res.json({ status: "success", data: newLesson });
});

// GET /api/admin/courses/:courseId/unassigned-lessons
export const getUnassignedLessons = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const lessons = await CourseLesson.find({ courseId, tierId: null }).select("-words").sort({ createdAt: -1 }).lean();

  res.json(
    lessons.map((l) => ({
      id: l._id,
      lessonId: l.lessonId,
      title: l.title,
      category: l.category,
      wordCount: l.wordCount || 0,
    })),
  );
});

// POST /api/admin/courses/:courseId/lesson
export const createUnassignedLesson = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { lessonId, title, category } = req.body;

  const newLesson = await CourseLesson.create({
    courseId,
    tierId: null,
    lessonId,
    title,
    category,
    order: 0,
    wordCount: 0,
    words: [],
    questions: [],
  });

  res.json({ status: "success", data: newLesson });
});

// POST /api/admin/courses/:courseId/generate-topics
export const aiGenerateAdminTopics = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { titles, wordCountConfig = 20, exampleCountConfig = 1, language = "Tiếng Anh", level = "Cơ bản" } = req.body;

  if (!titles || !Array.isArray(titles) || titles.length === 0) {
    return res.status(400).json({ error: "Missing titles array" });
  }

  const course = await Course.findById(courseId).lean();
  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  // Construct prompt dynamically
  let promptText = getSystemPromptCreateCourse(language, level, titles.length, titles.join(", "), wordCountConfig, exampleCountConfig);

  let generatedText = "";
  try {
    generatedText = await generateAIContent({
      prompt: promptText,
      feature: "admin_topics_generate",
      uid: req.user?.uid,
    });
  } catch (err) {
    return res.status(500).json({ error: "AI generation failed." });
  }

  // Parse text
  const parsedTopics = parseMessyAIData(generatedText);
  if (!parsedTopics || parsedTopics.length === 0) {
    return res.status(500).json({ error: "Failed to parse AI output." });
  }

  const createdLessons = [];

  // Bulk create words in WordBank & Topics in CourseLesson
  for (const topic of parsedTopics) {
    // 1. Prepare word bank docs
    const wordBankDocs = topic.words.map((w) => ({
      courseId: course._id,
      term: w.term,
      translation: w.translation,
      phonetic: w.phonetic,
      notes: w.notes,
      examples: w.examples,
    }));

    if (wordBankDocs.length > 0) {
      await WordBank.insertMany(wordBankDocs);
    }

    // 2. Create CourseLesson
    const newLesson = await CourseLesson.create({
      courseId: course._id,
      tierId: null,
      lessonId: `topic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: topic.title || titles[0], // fallback to user's title if parsing fails title
      category: "topic",
      order: 0,
      wordCount: topic.words.length,
      words: topic.words,
      questions: [],
    });

    createdLessons.push(newLesson);
  }

  res.json({ status: "success", data: createdLessons });
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
  if (req.body.questions !== undefined) {
    updateData.questions = req.body.questions;
  }
  if (req.body.order !== undefined) {
    updateData.order = req.body.order;
  }
  if (req.body.tierId !== undefined) {
    if (req.body.tierId === null) {
      updateData.$unset = { tierId: "" };
    } else {
      updateData.tierId = req.body.tierId; // Allows moving from unassigned to assigned
    }
  }

  // Use $unset from updateData if exists, then remove it from updateData so it doesn't conflict with $set
  const updateQuery = { $set: updateData };
  if (updateData.$unset) {
    updateQuery.$unset = updateData.$unset;
    delete updateData.$unset;
  }

  const updated = await CourseLesson.findByIdAndUpdate(id, updateQuery, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: "Lesson not found" });

  res.json({ status: "success", data: updated });
});

// DELETE /api/admin/courses/lesson/:id
export const deleteAdminLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await CourseLesson.findByIdAndDelete(id);
  res.json({ status: "success" });
});

// PUT /api/admin/courses/reorder-lessons
export const reorderAdminLessons = asyncHandler(async (req, res) => {
  const { lessons } = req.body; // Array of { id, tierId, order }
  if (!Array.isArray(lessons)) return res.status(400).json({ error: "Invalid data" });

  const bulkOps = lessons.map((l) => ({
    updateOne: {
      filter: { _id: l.id },
      update: { $set: { tierId: l.tierId, order: l.order } },
    },
  }));

  await CourseLesson.bulkWrite(bulkOps);
  res.json({ status: "success" });
});

// QUESTION BANK CRUD
export const getQuestionBank = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const questions = await QuestionBank.find({ courseId }).sort({ createdAt: -1 }).lean();
  res.json(questions.map((q) => ({ id: q._id, ...q })));
});

export const createQuestion = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const newQuestion = await QuestionBank.create({ courseId, ...req.body });
  res.json({ status: "success", data: { id: newQuestion._id, ...newQuestion.toObject() } });
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await QuestionBank.findByIdAndUpdate(id, req.body, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: "Question not found" });
  res.json({ status: "success", data: { id: updated._id, ...updated } });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await QuestionBank.findByIdAndDelete(id);
  res.json({ status: "success" });
});

// POST /api/admin/courses/ai-generate
export const aiGenerateAdminLesson = asyncHandler(async (req, res) => {
  const { topic, languageCode, count = 10 } = req.body;
  if (!topic || !languageCode) return res.status(400).json({ error: "Thiếu topic hoặc languageCode" });

  const prompt = `Bạn là chuyên gia ngôn ngữ. Hãy tạo ra danh sách từ vựng về chủ đề "${topic}" trong ngôn ngữ "${languageCode}".
Số lượng từ cần tạo: ${count}.
Trả về đúng một chuỗi JSON hợp lệ là một mảng các object. Không chứa markdown \`\`\`json.
Mỗi object có cấu trúc:
{
  "term": "từ vựng",
  "phonetic": "phiên âm (nếu có)",
  "translation": "nghĩa tiếng Việt",
  "notes": "ghi chú thêm (có thể rỗng)",
  "examples": [
    { "en": "câu ví dụ ngôn ngữ gốc", "vi": "câu dịch ví dụ" }
  ]
}`;

  try {
    const text = await generateAIContent({
      prompt,
      feature: "admin_lesson_generate",
      uid: req.user?.uid,
    });
    const cleanText = text
      .replace(/^```json/m, "")
      .replace(/```$/m, "")
      .trim();
    const words = JSON.parse(cleanText);
    res.json({ status: "success", data: words });
  } catch (err) {
    res.status(500).json({ error: "AI generation failed or invalid JSON format", details: err.message });
  }
});

// POST /api/admin/courses/ai-evaluate
export const aiEvaluateAdminCourse = asyncHandler(async (req, res) => {
  const { courseData } = req.body;

  const prompt = `Bạn là chuyên gia thiết kế lộ trình học ngoại ngữ. Dưới đây là dữ liệu các Rank/Tier/Topic hiện tại:
${JSON.stringify(courseData)}
Hãy phân tích và đưa ra nhận xét:
1. Lộ trình có hợp lý không?
2. Thiếu những chủ đề quan trọng nào ở mỗi cấp độ CEFR?
3. Đề xuất thêm một số chủ đề.
Trả lời bằng tiếng Việt, có format rõ ràng.`;

  try {
    const text = await generateAIContent({
      prompt,
      feature: "admin_course_evaluate",
      uid: req.user?.uid,
    });
    res.json({ status: "success", data: text });
  } catch (err) {
    res.status(500).json({ error: "AI evaluation failed.", details: err.message });
  }
});

// PUT /api/admin/courses/tiers/topics
// GET /api/admin/courses/:id/export
export const exportCourseToText = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const course = await Course.findById(id);
  if (!course) return res.status(404).json({ error: "Course not found" });

  const tiers = await CourseTier.find({ courseId: id }).populate("rankId").sort({ rankId: 1, tierNum: 1 });
  const lessons = await CourseLesson.find({ courseId: id }).sort({ order: 1 });

  let output = `##${course.languageCode}\n`;
  for (const tier of tiers) {
    const tierLessons = lessons.filter((l) => l.tierId.toString() === tier._id.toString());
    if (tierLessons.length === 0 && (!tier.topics || tier.topics.length === 0)) continue;

    output += `#TIER|${tier.rankId.rankId}|${tier.tierNum}\n`;

    for (const lesson of tierLessons) {
      output += `#TOPIC|${lesson.lessonId}|${lesson.title}|${lesson.desc || ""}\n`;
      for (const word of lesson.words || []) {
        const ex = word.examples?.[0] ? `${word.examples[0].en}~${word.examples[0].vi}` : "";
        output += `#WORD|${word.term}|${word.phonetic || ""}|${word.translation || ""}|${ex}|${word.notes || ""}\n`;
      }
    }
  }

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="${course.languageCode}_course_export.txt"`);
  res.send(output);
});

export const updateCourseTiersTopics = asyncHandler(async (req, res) => {
  const { tiers } = req.body; // Array of { tierId, topics: string[] }
  if (!tiers || !Array.isArray(tiers)) {
    return res.status(400).json({ error: "Missing tiers array" });
  }

  for (const item of tiers) {
    if (item.tierId && Array.isArray(item.topics)) {
      await CourseTier.findByIdAndUpdate(item.tierId, { topics: item.topics });
    }
  }

  res.json({ status: "success" });
});

export const aiGenerateCourseTextData = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  if (!courseId) {
    return res.status(400).json({ error: "Missing courseId" });
  }
  const course = await Course.findById(courseId).lean();
  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  const prompt = `bạn hãy trả về đúng theo cấu trúc bên dưới với lộ trình khóa học dành cho ${course.name}, được chia thành từng rank và tier theo độ khó của chủ đề đó, mỗi tier cần có ít nhất từ 3 đến 4 chủ đề nổi bật nhất, có tính áp dụng cao trong đời sống
ví dụ cách trả về, bạn cần phải tuân theo chuẩn xác cho từng TIER giống như bên dưới nhé, chỉ thay đổi chủ đề thôi:
RANK 1: Bạc
#TIER|1|1
Trang phục; Nhà cửa & Phòng ốc; Hoạt động hàng ngày; Động vật hoang dã
#TIER|1|2
Gia đình; Động vật nuôi; Đồ ăn & Thức uống; Thời tiết
#TIER|1|3
Chào hỏi & Giới thiệu; Số đếm & Màu sắc; Các bộ phận cơ thể; Đồ dùng học tập

RANK 2: Lục bảo
#TIER|2|1
Lễ hội & Văn hóa; Công việc cơ bản; Phương tiện truyền thông
#TIER|2|2
Du lịch & Khách sạn; Sức khỏe & Lối sống; Cảm xúc & Tâm trạng
#TIER|2|3
Mua sắm & Giá cả; Mô tả ngoại hình & Tính cách; Thể thao
#TIER|2|4
Phương tiện giao thông; Địa điểm trong thành phố; Sở thích & Giải trí

RANK 3: Tinh Anh
#TIER|3|1
Tài chính cá nhân; Giao tiếp công sở; Truyền thông & Quảng cáo
#TIER|3|2
Luật pháp cơ bản; Kinh doanh & Khởi nghiệp; Y học phổ thông
#TIER|3|3
Nghệ thuật & Điện ảnh; Lịch sử & Sự kiện quốc tế; Ẩm thực thế giới
#TIER|3|4
Việc làm & Tuyển dụng; Đời sống đô thị & Nông thôn; Khoa học thường thức
#TIER|3|5
Giáo dục & Trường học; Môi trường & Thiên nhiên; Công nghệ thông tin

RANK 4: Kim cương
#TIER|4|1
Cụm động từ (Phrasal Verbs); Thành ngữ (Idioms); Từ ghép cố định (Collocations)
#TIER|4|2
Tài chính doanh nghiệp; Năng lượng & Tài nguyên; Y học chuyên sâu
#TIER|4|3
Tâm lý học hành vi; Luật pháp quốc tế; Nghiên cứu khoa học
#TIER|4|4
Kinh tế vĩ mô; Văn học & Triết học cơ bản; Biến đổi khí hậu
#TIER|4|5
Chính trị & Xã hội; Toàn cầu hóa; Công nghệ cao (AI, Big Data)

RANK 5: Cao Thủ
#TIER|5|1
Từ vựng học thuật chuyên sâu (IELTS/TOEFL advanced); Thành ngữ cổ & Tiếng lóng phức tạp (Slang & Idioms); Từ đồng nghĩa phân biệt sắc thái (Synonyms with nuances); Thuật ngữ chuyên ngành chuyên sâu (Y sinh, Cơ điện tử, Luật thương mại quốc tế)`;

  try {
    const text = await generateAIContent({
      prompt,
      feature: "admin_course_text_data_generate",
      uid: req.user?.uid,
    });

    const tiers = await CourseTier.find({ courseId }).populate("rankId");
    const lines = text.split("\n");
    let currentTierNum = null;
    let currentRankId = null;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.toUpperCase().startsWith("RANK ")) {
        const match = line.match(/RANK\s+(\d+)/i);
        if (match) currentRankId = parseInt(match[1]);
      } else if (line.startsWith("#TIER|")) {
        const parts = line.split("|");
        if (parts.length >= 3) {
          currentRankId = parseInt(parts[1]?.trim());
          currentTierNum = parseInt(parts[2]?.trim());
        } else {
          currentTierNum = parseInt(parts[1]?.trim());
        }
      } else if (currentRankId && currentTierNum) {
        const topics = line
          .split(";")
          .map((t) => t.trim())
          .filter((t) => t);
        if (topics.length > 0) {
          const tier = tiers.find((t) => t.rankId.rankId === currentRankId && t.tierNum === currentTierNum);
          if (tier) {
            await CourseTier.findByIdAndUpdate(tier._id, { topics });
          }
        }
        currentTierNum = null;
      }
    }

    res.json({ status: "success" });
  } catch (err) {
    res.status(500).json({ error: "AI generation failed.", details: err.message });
  }
});

export const getSampleCoursePrompt = asyncHandler(async (req, res) => {
  const rankConfigStr = JSON.stringify(RANK_CONFIG, null, 2);
  const prompt = `export const RANK_CONFIG = ${rankConfigStr};
tôi đang làm rank như sau, tôi muốn từng rank là 1 cấp độ cũng như từng tier sẽ có 2 ~ 4 chủ đề, hãy cho tôi từng chủ đề phù hợp, trả về theo cấu trúc format dễ nhìn, to nhất là tên rank, tiếp là phần đặc điểm, tiếp là các tier cho rank, tiếp là các chủ đề trong tier đó ví dụ
RANK 1: BẠC (Tương đương HSK 1 - Làm quen)
Đặc điểm: Từ vựng đơn giản nhất, ngắn (1-2 chữ), học về bản thân và môi trường xung quanh.
Tier III (Mới vào):
Chủ đề 1: Chào hỏi & Đại từ (你好, 我, 你, 他...)
Chủ đề 2: Số đếm cơ bản 1 - 100 (一, 二, 三, 百...)
Chủ đề 3: Gia đình ruột thịt (爸爸, 妈妈, 家...)
Tier II:
Chủ đề 1: Thời gian & Thứ ngày tháng (点, 分, 星期, 月, 号...)
Chủ đề 2: Ăn uống hằng ngày (米饭, 水, 茶, 水果...)
Chủ đề 3: Hành động cơ bản tại nhà (看, 听, 说, 读, 写...)
Tier I:
Chủ đề 1: Trường học & Nghề nghiệp cơ bản (学校, 老师, 学生, 医生...)
Chủ đề 2: Đồ vật quen thuộc (书, 桌子, 椅子, 电脑...)
Chủ đề 3: Vị trí cốt lõi (上, 下, 前, 后, 里...)`;

  res.json({ prompt });
});

// POST /api/admin/courses/ai-generate-course-topics
export const aiGenerateCourseTopics = asyncHandler(async (req, res) => {
  const { prompt, courseId, wordCount, exampleCount } = req.body;
  if (!prompt || !courseId) return res.status(400).json({ error: "Missing prompt or courseId" });

  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ error: "Course not found" });

  const tiers = await CourseTier.find({ courseId }).populate("rankId").sort({ rankId: 1, tierNum: 1 });
  if (tiers.length === 0) return res.status(400).json({ error: "Course has no tiers" });

  const tierContext = tiers
    .map((t) => {
      let context = `#TIER|${t.rankId.rankId}|${t.tierNum}`;
      if (t.topics && t.topics.length > 0) {
        context += `\nCác chủ đề yêu cầu sinh từ vựng: ${t.topics.join("; ")}`;
      }
      return context;
    })
    .join("\n");

  const finalWordCount = wordCount || 10;
  const finalExampleCount = exampleCount || 1;
  const systemInstruction = getSystemPromptCreateCourseLessonFull(course.name, tierContext, finalWordCount, finalExampleCount);

  try {
    const text = await generateAIContent({
      prompt,
      systemInstruction,
      feature: "admin_course_structure_generate",
      uid: req.user?.uid,
    });

    // Automatically parse and update DB
    const lines = text.split("\n");
    let currentTierId = null;
    let currentTopic = null;
    const tierUpdates = {}; // { tierId: [topic1Name, topic2Name] }

    // We will save words to WordBank and topics to CourseLesson
    const createdLessons = [];
    const wordBankDocs = [];

    for (let line of lines) {
      line = line.trim();
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

    let updatedCount = 0;
    for (const tierId of Object.keys(tierUpdates)) {
      if (tierUpdates[tierId].length > 0) {
        await CourseTier.findByIdAndUpdate(tierId, { $addToSet: { topics: { $each: tierUpdates[tierId] } } });
        updatedCount++;
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

    res.json({
      status: "success",
      message: `Đã sinh lộ trình thành công! Cập nhật ${updatedCount} tiers, tạo ${createdLessons.length} chủ đề và ${wordBankDocs.length} từ vựng.`,
    });
  } catch (err) {
    res.status(500).json({ error: "AI generation failed.", details: err.message });
  }
});

export const getWordBank = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const words = await WordBank.find({ courseId }).sort({ createdAt: -1 });
  res.json(
    words.map((w) => ({
      id: w._id,
      term: w.term,
      translation: w.translation,
      phonetic: w.phonetic,
      notes: w.notes,
      examples: w.examples,
    })),
  );
});

export const createWord = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const word = new WordBank({ courseId, ...req.body });
  await word.save();
  res.status(201).json({
    id: word._id,
    term: word.term,
    translation: word.translation,
    phonetic: word.phonetic,
    notes: word.notes,
    examples: word.examples,
  });
});

export const updateWord = asyncHandler(async (req, res) => {
  const word = await WordBank.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({
    id: word._id,
    term: word.term,
    translation: word.translation,
    phonetic: word.phonetic,
    notes: word.notes,
    examples: word.examples,
  });
});

export const deleteWord = asyncHandler(async (req, res) => {
  await WordBank.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// POST /api/admin/courses/paste
export const handlePasteAdminCourses = asyncHandler(async (req, res) => {
  const { action, itemIds, targetParentId, childType } = req.body;

  if (!action || !itemIds || !Array.isArray(itemIds) || !childType) {
    return res.status(400).json({ error: "Thiếu tham số bắt buộc" });
  }

  if (action === "cut") {
    if (childType === "lesson") {
      await CourseLesson.updateMany({ _id: { $in: itemIds } }, { $set: { tierId: targetParentId } });
    } else if (childType === "tier") {
      await CourseTier.updateMany({ _id: { $in: itemIds } }, { $set: { rankId: targetParentId } });
    } else if (childType === "rank") {
      await CourseRank.updateMany({ _id: { $in: itemIds } }, { $set: { courseId: targetParentId } });
    }
  } else if (action === "copy") {
    // Only support copying Lessons for now
    if (childType === "lesson") {
      const lessons = await CourseLesson.find({ _id: { $in: itemIds } }).lean();

      const newLessons = lessons.map((lesson) => {
        const newLesson = { ...lesson };
        delete newLesson._id;
        delete newLesson.createdAt;
        delete newLesson.updatedAt;

        newLesson.tierId = targetParentId;
        newLesson.lessonId = `${lesson.lessonId}_copy_${Math.random().toString(36).substring(2, 6)}`;
        newLesson.title = `${lesson.title} (Copy)`;

        return newLesson;
      });

      if (newLessons.length > 0) {
        await CourseLesson.insertMany(newLessons);
      }
    } else {
      return res.status(400).json({ error: "Chỉ hỗ trợ nhân bản (copy) ở cấp độ Bài học/Chủ đề." });
    }
  } else {
    return res.status(400).json({ error: "Hành động không hợp lệ" });
  }

  res.json({ status: "success" });
});
