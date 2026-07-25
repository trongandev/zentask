import mongoose from 'mongoose';

const beginnerSkillSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    skill: {
      type: String,
      enum: ['listening', 'speaking', 'reading', 'writing'],
      required: true,
    },
    level: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
    score: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find a user's daily tasks
beginnerSkillSchema.index({ userId: 1, date: 1, skill: 1 });

const BeginnerSkill = mongoose.model('BeginnerSkill', beginnerSkillSchema, 'beginnerSkill');
export default BeginnerSkill;
