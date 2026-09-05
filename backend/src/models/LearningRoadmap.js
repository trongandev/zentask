import mongoose from 'mongoose';

const learningRoadmapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    days: [
      {
        day: { type: Number, required: true },
        topic: { type: String, required: true },
        words: [
          {
            word: { type: String, required: true },
            phonetic: { type: String }, // phiên âm
            meaning: { type: String, required: true },
            pos: { type: String }, // part of speech
            example: { type: String }, // ví dụ
            example_translation: { type: String } // dịch nghĩa ví dụ
          }
        ]
      }
    ],
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active'
    },
    completedDays: {
      type: [Number],
      default: []
    },
    lastCompletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
  }
);

const LearningRoadmap = mongoose.model('LearningRoadmap', learningRoadmapSchema);
export default LearningRoadmap;
