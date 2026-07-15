import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // Not required for Google OAuth users
    },
    displayName: {
      type: String,
      default: 'Học viên',
    },
    photoURL: {
      type: String,
      default: 'https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg',
    },
    username: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    bio: {
      type: String,
      default: '',
      maxlength: 500,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    isVip: {
      type: Boolean,
      default: false,
    },
    vipUntil: {
      type: Date,
      default: null,
    },
    subscription: {
      plan: { type: String, default: 'free' },
      status: { type: String, default: 'inactive' },
    },
    level: {
      type: Number,
      default: 1,
    },
    xp: {
      type: Number,
      default: 0,
    },
    streak: {
      type: Number,
      default: 0,
    },
    maxStreak: {
      type: Number,
      default: 0,
    },
    lastCheckInDate: {
      type: String,
      default: "",
    },
    rankId: {
      type: Number,
      default: 1,
    },
    tier: {
      type: Number,
      default: 3,
    },
    stars: {
      type: Number,
      default: 0,
    },
    arenaMatchesPlayed: {
      type: Number,
      default: 0,
    },
    learnedBeginnerWords: {
      type: [String],
      default: [],
    },
    completedBeginnerTopics: {
      type: [String],
      default: [],
    },
    achievedBadges: {
      type: [String],
      default: [],
    },
    appSettings: {
      theme: { type: String, default: 'light' },
      accentColor: { type: String, default: 'blue' },
    },

    grammarProgress: {
      maxStage: { type: Number, default: 1 },
      totalCorrect: { type: Number, default: 0 },
      totalWrong: { type: Number, default: 0 },
      totalTimeSpent: { type: Number, default: 0 },
      completedStages: { type: [String], default: [] },
    },
    tensesProgress: {
      maxStage: { type: Number, default: 1 },
      totalCorrect: { type: Number, default: 0 },
      totalWrong: { type: Number, default: 0 },
      totalTimeSpent: { type: Number, default: 0 },
      completedStages: { type: [String], default: [] },
    },
    zaloId: {
      type: String,
      default: null,
      index: true,
    },
    checkinTime: {
      type: String,
      default: "08:00",
    },
    botState: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    }
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Exclude password when returning user object
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  // Rename _id to uid for backward compatibility with frontend
  user.uid = user._id; 
  delete user._id;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);
export default User;
