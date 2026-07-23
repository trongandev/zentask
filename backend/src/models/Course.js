import mongoose from "mongoose";

const { Schema } = mongoose;

export const CourseSchema = new Schema(
  {
    name: { type: String, required: true },
    languageCode: { type: String, required: true, unique: true }, // e.g. "en", "de"
  },
  { timestamps: true },
);

export const CourseRankSchema = new Schema(
  {
    rankId: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true },
);

export const CourseTierSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    rankId: { type: Schema.Types.ObjectId, ref: "CourseRank", required: true },
    tierNum: { type: Number, required: true },
    cefr: { type: String },
    topics: [{ type: String }],
  },
  { timestamps: true },
);

export const CourseLessonWordSchema = new Schema(
  {
    examples: { type: [Schema.Types.Mixed], default: [] },
    id: String,
    notes: String,
    phonetic: String,
    term: String,
    translation: String,
  },
  { timestamps: true },
);

export const CourseLessonSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    tierId: { type: Schema.Types.ObjectId, ref: "CourseTier" }, // Optional for unassigned topics
    lessonId: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String },
    order: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    words: [CourseLessonWordSchema],
    questions: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);



export const QuestionBankSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    type: { type: String, default: "multiple_choice" },
    question: { type: String, required: true },
    options: { type: [String], default: [] },
    correctIndex: { type: Number, default: 0 },
    explanation: { type: String },
  },
  { timestamps: true },
);

export const WordBankSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    term: { type: String, required: true },
    translation: { type: String, required: true },
    phonetic: { type: String },
    notes: { type: String },
    examples: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);

export const Course = mongoose.models.Course || mongoose.model("Course", CourseSchema);
export const CourseRank = mongoose.models.CourseRank || mongoose.model("CourseRank", CourseRankSchema);
export const CourseTier = mongoose.models.CourseTier || mongoose.model("CourseTier", CourseTierSchema);
export const CourseLesson = mongoose.models.CourseLesson || mongoose.model("CourseLesson", CourseLessonSchema);

export const WordBank = mongoose.models.WordBank || mongoose.model("WordBank", WordBankSchema);
export const QuestionBank = mongoose.models.QuestionBank || mongoose.model("QuestionBank", QuestionBankSchema);
