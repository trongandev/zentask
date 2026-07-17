import mongoose from 'mongoose';

const { Schema } = mongoose;

export const DailyTaskSchema = new Schema({
  title: { type: String, required: true },
  desc: { type: String },
  xpPerItem: { type: Number, default: 0 },
  type: { type: String },
  icon: { type: String },
  total: { type: Number, default: 1 },
}, { timestamps: true });

export const UserDailyStatSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  studyMinutes: { type: Number, default: 0 },
  isCheckedIn: { type: Boolean, default: false },
  tasks: { type: Map, of: Schema.Types.Mixed, default: {} },
}, { timestamps: true });


export const DailyUsageSchema = new Schema({
  uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  key: { type: String, required: true },
  count: { type: Number, default: 0 },
}, { timestamps: true });
DailyUsageSchema.index({ uid: 1, date: 1, key: 1 }, { unique: true });
DailyUsageSchema.index({ date: 1, key: 1 });

export const IpSignupCounterSchema = new Schema({
  ipHash: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  emails: [{ type: String }],
  lastSignupAt: { type: Date },
}, { timestamps: true });

export const NotificationSchema = new Schema({
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String },
  referenceId: { type: Schema.Types.Mixed, default: null },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

export const FlashcardProgressSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  cardId: { type: Schema.Types.ObjectId, ref: 'Flashcard', required: true },
  setId: { type: Schema.Types.ObjectId, ref: 'FlashcardSet', required: true },
  dueDate: { type: Date, required: true },
  interval: { type: Number, default: 0 },
  easeFactor: { type: Number, default: 2.5 },
  repetitions: { type: Number, default: 0 },
  quality: { type: Number, default: 0 },
  lastStudied: { type: Date },
}, { timestamps: true });

export const FlashcardSchema = new Schema({
  setId: { type: Schema.Types.ObjectId, ref: 'FlashcardSet', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  term: { type: String, required: true },
  language: { type: String, default: 'en' }, // en, zh, ko, ja, de, fr, es, th
  phonetic: { type: String, default: "" },
  translation: { type: String, required: true },
  examples: { type: Schema.Types.Mixed, default: [] },
  notes: { type: String, default: "" },
  isLearned: { type: Boolean, default: false },
}, { timestamps: true });

export const FlashcardFolderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  color: { type: String, default: "bg-blue-500" },
}, { timestamps: true });

export const FlashcardCategorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  color: { type: String, default: "bg-slate-500" },
  description: { type: String, default: "" },
}, { timestamps: true });

export const QuizCategorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  color: { type: String, default: "bg-blue-500" },
  description: { type: String, default: "" },
}, { timestamps: true });

export const FlashcardSetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  folderId: { type: Schema.Types.ObjectId, ref: 'FlashcardFolder', default: null },
  categoryId: { type: Schema.Types.ObjectId, ref: 'FlashcardCategory', default: null },
  categoryName: { type: String, default: "" },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  language: { type: String, default: 'en' }, // en, zh, ko, ja, de, fr, es, th
  cardCount: { type: Number, default: 0 },
  learnedCount: { type: Number, default: 0 },
  lastStudied: { type: Date },
  color: { type: String, default: "bg-blue-500" },
  isNew: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false },
  order: { type: Number },
  clonedFrom: { type: Schema.Types.ObjectId, ref: 'FlashcardSet' },
}, { timestamps: true, suppressReservedKeysWarning: true });

export const VocabularySchema = new Schema({
  term: { type: String, required: true, lowercase: true },
  language: { type: String, default: 'en' }, // en, zh, ko, ja, de, fr, es, th
  phonetic: { type: String, default: "" },
  translation: { type: String, required: true },
  notes: { type: String, default: "" },
  examples: { type: Schema.Types.Mixed, default: [] },
}, { timestamps: true });
VocabularySchema.index({ term: 1, language: 1 }, { unique: true });

export const LeaderboardWeeklySchema = new Schema({
  uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  period: { type: String, required: true },
  xp: { type: Number, default: 0 },
}, { timestamps: true });

export const GrammarTestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String },
  description: { type: String },
  exercises: { type: Schema.Types.Mixed },
}, { timestamps: true });

export const TensesTestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String },
  description: { type: String },
  exercises: { type: Schema.Types.Mixed },
}, { timestamps: true });

export const QuizRoomSchema = new Schema({
  roomCode: { type: String, required: true, unique: true },
  hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: Schema.Types.ObjectId, required: true },
  status: { type: String, enum: ['waiting', 'playing', 'ended'], default: 'waiting' },
  participants: [{ type: Schema.Types.Mixed }]
}, { timestamps: true });



export const QuizResultSchema = new Schema({
  uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  score: { type: Number, required: true },
  totalCorrect: { type: Number },
  totalQuestions: { type: Number },
  answers: { type: Schema.Types.Mixed },
  evaluation: { type: Schema.Types.Mixed },
  usedRebirth: { type: Boolean, default: false },
  roomId: { type: Schema.Types.ObjectId, ref: 'QuizRoom', default: null },
  roomSettings: { type: Schema.Types.Mixed },
}, { timestamps: true });

export const QuizSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  difficulty: { type: String, default: "Medium" },
  duration: { type: Number, default: 15 },
  questions: { type: Schema.Types.Mixed, default: [] },
  creatorId: { type: String }, // Can be ObjectId or system string
  categoryId: { type: Schema.Types.ObjectId, ref: 'QuizCategory', default: null },
  categoryName: { type: String, default: "" },
  isPublic: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

export const UserRewardSchema = new Schema({
  uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  period: { type: String, required: true },
  xpReward: { type: Number, required: true },
  claimedAt: { type: Date, default: Date.now },
}, { timestamps: true });



export const FriendshipSchema = new Schema({
  users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export const FriendRequestSchema = new Schema({
  fromId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  toId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
}, { timestamps: true });

export const FriendMessageSchema = new Schema({
  chatId: { type: String, required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ["text", "share"], required: true },
  text: { type: String, default: "" },
  share: { type: Schema.Types.Mixed },
  savedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export const CommunityPostSchema = new Schema({
  uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  tags: [{ type: String }],
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  commentsCount: { type: Number, default: 0 }
}, { timestamps: true });

export const CommunityCommentSchema = new Schema({
  postId: { type: Schema.Types.ObjectId, ref: 'CommunityPost', required: true },
  uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'CommunityComment', default: null },
  content: { type: String, required: true },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export const NotebookSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: "Untitled notebook" },
  description: { type: String, default: "" },
  coverColor: { type: String, default: "#2563eb" },
  activePageId: { type: String },
  pages: { type: Schema.Types.Mixed, default: [] },
  settings: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const LeaderboardMonthlySchema = new Schema({
  uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  period: { type: String, required: true },
  xp: { type: Number, default: 0 },
}, { timestamps: true });

export const ArenaMatchmakingStatSchema = new Schema({
  uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  durationMs: { type: Number, required: true },
  rankId: { type: Number, default: 1 },
  tier: { type: Number, default: 1 }
}, { timestamps: true });

export const CalculatorHistorySchema = new Schema({
  uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expression: { type: String, required: true },
  result: { type: String, required: true },
  mode: { type: String, default: "basic" },
  type: { type: String, default: "calculation" }
}, { timestamps: true });

export const TranslationHistorySchema = new Schema({
  uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sourceText: { type: String, required: true },
  translatedText: { type: String, required: true },
  source: { type: String, default: "auto" },
}, { timestamps: true });

export const AITokenUsageSchema = new Schema({
  uid: { type: Schema.Types.ObjectId, ref: 'User' },
  feature: { type: String, required: true },
  model: { type: String, required: true },
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  status: { type: String, enum: ['success', 'error'], required: true },
  errorMessage: { type: String }
}, { timestamps: true });

export const BotJobScheduleSchema = new Schema({
  jobId: { type: String, required: true, unique: true },
  cronExpression: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const BeginnerProgressSchema = new Schema({
  uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  completedGrammarTopics: [{ type: String }],
  completedSkills: [{ type: String }],
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  lessonId: { type: String },
  score: { type: Number, default: 100 },
  rewardClaimed: { type: Boolean, default: false }, // x2 XP relearn bonus, only once
}, { timestamps: true });

export const UserActivitySchema = new Schema({
  uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  target: { type: String, required: true },
  type: { type: String, enum: ["quiz", "flashcard", "arena", "other"], default: "other" },
  xpEarned: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export const StudyMethodSchema = new Schema({
  uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  studyMinutes: { type: Number, required: true },
  breakMinutes: { type: Number, required: true },
  breakCount: { type: Number, required: true },
  isCustom: { type: Boolean, default: true }
}, { timestamps: true });

export const ArenaTournamentRoomSchema = new Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, default: "Giải đấu ZenTask" },
  hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  participantIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  invitedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ["waiting", "playing", "ended"], default: "waiting" },
  settings: { type: Schema.Types.Mixed, default: {} },
  xpAwardedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export const SkillPracticeDailySchema = new Schema({
  uid: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  completedModes: { type: [String], default: [] },
  bonusClaimed: { type: Boolean, default: false },
  attempts: { type: Schema.Types.Mixed, default: [] },
}, { timestamps: true });

export const SkillPracticeCacheSchema = new Schema({
  mode: { type: String, required: true },
  sourceHint: { type: String, default: "AI tổng hợp từ nguồn học tiếng Anh công khai" },
  payload: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });

export const UserFollowSchema = new Schema({
  followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  followingId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export const BotConfigSchema = new Schema({
  rankId: { type: Number, required: true, unique: true },
  rankName: { type: String, required: true },
  correctRate: { type: Number, required: true },
  fastResponseRate: { type: Number, required: true }, // <= 10s
  timeDistribution: { type: Schema.Types.Mixed, default: {} }, // % for seconds 1 to 10
  slowResponseRate: { type: Number, required: true }, // > 10s
}, { timestamps: true });

export const ZaloAuthSchema = new Schema({
  authId: { type: String, required: true, unique: true },
  zaloId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 900 } // Tự động xoá sau 15 phút (900s)
}, { timestamps: true });

export const SystemLogSchema = new Schema({
  method: { type: String, required: true },
  url: { type: String, required: true },
  body: { type: Schema.Types.Mixed, default: {} },
  ip: { type: String },
  uid: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

export const BannedIPSchema = new Schema({
  ip: { type: String, required: true, unique: true },
  reason: { type: String, default: "Hành vi đáng ngờ" },
  isHoneypot: { type: Boolean, default: true },
}, { timestamps: true });

export const AttackerFeedbackSchema = new Schema({
  ip: { type: String, required: true },
  message: { type: String, required: true },
  userAgent: { type: String, default: "" },
}, { timestamps: true });

export const BotQuizSchema = new Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswerIndex: { type: Number, required: true },
  explanation: { type: String, required: true },
  isUsed: { type: Boolean, default: false },
}, { timestamps: true });

export const DailyUsage = mongoose.models.DailyUsage || mongoose.model('DailyUsage', DailyUsageSchema);
export const IpSignupCounter = mongoose.models.IpSignupCounter || mongoose.model('IpSignupCounter', IpSignupCounterSchema);
export const DailyTask = mongoose.models.DailyTask || mongoose.model('DailyTask', DailyTaskSchema);
export const UserDailyStat = mongoose.models.UserDailyStat || mongoose.model('UserDailyStat', UserDailyStatSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const FlashcardProgress = mongoose.models.FlashcardProgress || mongoose.model('FlashcardProgress', FlashcardProgressSchema);
export const Flashcard = mongoose.models.Flashcard || mongoose.model('Flashcard', FlashcardSchema);
export const LeaderboardWeekly = mongoose.models.LeaderboardWeekly || mongoose.model('LeaderboardWeekly', LeaderboardWeeklySchema);
export const GrammarTest = mongoose.models.GrammarTest || mongoose.model('GrammarTest', GrammarTestSchema);
export const TensesTest = mongoose.models.TensesTest || mongoose.model('TensesTest', TensesTestSchema);
export const QuizRoom = mongoose.models.QuizRoom || mongoose.model('QuizRoom', QuizRoomSchema);
export const LeaderboardMonthly = mongoose.models.LeaderboardMonthly || mongoose.model('LeaderboardMonthly', LeaderboardMonthlySchema);
export const UserFollow = mongoose.models.UserFollow || mongoose.model('UserFollow', UserFollowSchema);
export const QuizResult = mongoose.models.QuizResult || mongoose.model('QuizResult', QuizResultSchema);
export const FlashcardFolder = mongoose.models.FlashcardFolder || mongoose.model('FlashcardFolder', FlashcardFolderSchema);
export const FlashcardCategory = mongoose.models.FlashcardCategory || mongoose.model('FlashcardCategory', FlashcardCategorySchema);
export const QuizCategory = mongoose.models.QuizCategory || mongoose.model('QuizCategory', QuizCategorySchema);
export const FlashcardSet = mongoose.models.FlashcardSet || mongoose.model('FlashcardSet', FlashcardSetSchema);
export const Vocabulary = mongoose.models.Vocabulary || mongoose.model('Vocabulary', VocabularySchema);
export const Notebook = mongoose.models.Notebook || mongoose.model('Notebook', NotebookSchema);
export const UserReward = mongoose.models.UserReward || mongoose.model('UserReward', UserRewardSchema);
export const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);
export const Friendship = mongoose.models.Friendship || mongoose.model('Friendship', FriendshipSchema);
export const FriendRequest = mongoose.models.FriendRequest || mongoose.model('FriendRequest', FriendRequestSchema);
export const FriendMessage = mongoose.models.FriendMessage || mongoose.model('FriendMessage', FriendMessageSchema);
export const CommunityPost = mongoose.models.CommunityPost || mongoose.model('CommunityPost', CommunityPostSchema);
export const CommunityComment = mongoose.models.CommunityComment || mongoose.model('CommunityComment', CommunityCommentSchema);
export const ArenaMatchmakingStat = mongoose.models.ArenaMatchmakingStat || mongoose.model('ArenaMatchmakingStat', ArenaMatchmakingStatSchema);
export const CalculatorHistory = mongoose.models.CalculatorHistory || mongoose.model('CalculatorHistory', CalculatorHistorySchema);
export const TranslationHistory = mongoose.models.TranslationHistory || mongoose.model('TranslationHistory', TranslationHistorySchema);
export const StudyMethod = mongoose.models.StudyMethod || mongoose.model('StudyMethod', StudyMethodSchema);
export const ArenaTournamentRoom = mongoose.models.ArenaTournamentRoom || mongoose.model('ArenaTournamentRoom', ArenaTournamentRoomSchema);
export const SkillPracticeDaily = mongoose.models.SkillPracticeDaily || mongoose.model('SkillPracticeDaily', SkillPracticeDailySchema);
export const SkillPracticeCache = mongoose.models.SkillPracticeCache || mongoose.model('SkillPracticeCache', SkillPracticeCacheSchema);
export const BotConfig = mongoose.models.BotConfig || mongoose.model('BotConfig', BotConfigSchema);
export const UserActivity = mongoose.models.UserActivity || mongoose.model('UserActivity', UserActivitySchema);
export const SystemLog = mongoose.models.SystemLog || mongoose.model('SystemLog', SystemLogSchema);
export const BannedIP = mongoose.models.BannedIP || mongoose.model('BannedIP', BannedIPSchema);
export const AttackerFeedback = mongoose.models.AttackerFeedback || mongoose.model('AttackerFeedback', AttackerFeedbackSchema);
export const ZaloAuth = mongoose.models.ZaloAuth || mongoose.model('ZaloAuth', ZaloAuthSchema);
export const BotQuiz = mongoose.models.BotQuiz || mongoose.model('BotQuiz', BotQuizSchema);
export const AITokenUsage = mongoose.models.AITokenUsage || mongoose.model('AITokenUsage', AITokenUsageSchema);
export const BotJobSchedule = mongoose.models.BotJobSchedule || mongoose.model('BotJobSchedule', BotJobScheduleSchema);
export const BeginnerProgress = mongoose.models.BeginnerProgress || mongoose.model('BeginnerProgress', BeginnerProgressSchema);
