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

export const CourseLessonSchema = new Schema(
  {
    tierId: { type: Schema.Types.ObjectId, ref: "CourseTier", required: true },
    lessonId: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String },
    wordCount: { type: Number, default: 0 },
    words: { type: [Schema.Types.Mixed] },
  },
  { timestamps: true },
);
export const Course = mongoose.models.Course || mongoose.model("Course", CourseSchema);
export const CourseRank = mongoose.models.CourseRank || mongoose.model("CourseRank", CourseRankSchema);
export const CourseTier = mongoose.models.CourseTier || mongoose.model("CourseTier", CourseTierSchema);
export const CourseLesson = mongoose.models.CourseLesson || mongoose.model("CourseLesson", CourseLessonSchema);
