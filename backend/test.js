import mongoose from 'mongoose';
import { Course, CourseTier, CourseLesson, CourseRank } from './src/models/Course.js';
import { BeginnerProgress } from './src/models/Schemas.js';

mongoose.connect('mongodb://localhost:27017/zentask').then(async () => {
  const course = await Course.findOne({ languageCode: 'en' });
  const currentTier = await CourseTier.findOne({ courseId: course._id, cefr: 'B2' }).populate("rankId");
  const currentRankNum = currentTier.rankId.rankId;
  const previousRanks = await CourseRank.find({ rankId: { $lt: currentRankNum } });
  const previousRankIds = previousRanks.map(r => r._id);
            
  const previousTiers = await CourseTier.find({
     courseId: course._id,
     $or: [
       { rankId: { $in: previousRankIds } },
       { rankId: currentTier.rankId._id, tierNum: { $lt: currentTier.tierNum } }
     ]
  });
  
  const previousTierIds = previousTiers.map(t => t._id);
  const previousLessons = await CourseLesson.find({ tierId: { $in: previousTierIds } });
  
  const previousLessonIds = [];
  for (const lesson of previousLessons) {
    const wordCount = lesson.wordCount || 0;
    const totalChunks = Math.ceil(wordCount / 5) || 1;
    for (let i = 0; i < totalChunks; i++) {
      previousLessonIds.push(`${lesson.lessonId}_${i}`);
    }
  }
  
  console.log('Found lessons for previous tiers (base topics):', previousLessons.length);
  console.log('Total generated chunks (_0, _1, etc):', previousLessonIds.length);
  
  process.exit(0);
}).catch(console.error);
