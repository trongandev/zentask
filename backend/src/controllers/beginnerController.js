import { BeginnerProgress } from '../models/Schemas.js';

export const getBeginnerProgress = async (req, res) => {
  try {
    const uid = req.user.id;
    let progress = await BeginnerProgress.findOne({ uid });
    
    if (!progress) {
      progress = await BeginnerProgress.create({
        uid,
        completedGrammarTopics: [],
        completedSkills: []
      });
    }

    res.json(progress);
  } catch (error) {
    console.error('Error in getBeginnerProgress:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const completeGrammarTopic = async (req, res) => {
  try {
    const uid = req.user.id;
    const { topicId } = req.body;

    if (!topicId) {
      return res.status(400).json({ message: 'Thiếu topicId' });
    }

    let progress = await BeginnerProgress.findOne({ uid });
    if (!progress) {
      progress = new BeginnerProgress({ uid, completedGrammarTopics: [], completedSkills: [] });
    }

    if (!progress.completedGrammarTopics.includes(topicId)) {
      progress.completedGrammarTopics.push(topicId);
      await progress.save();
    }

    res.json({ message: 'Đã lưu tiến độ thành công', progress });
  } catch (error) {
    console.error('Error in completeGrammarTopic:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
