import { PendingMistakeQueue, PersonalizedGrammar } from "../models/Schemas.js";
import BeginnerSkill from "../models/beginnerSkill.js";
import { generateAIContent } from "./ai.service.js";
import { LANGUAGE_LEVELS } from "../config/languageLevels.js";

const LANG_MAP = {
  en: {
    name: "tiếng Anh",
    voices: ["en-US-AriaNeural", "en-US-GuyNeural", "en-US-JennyNeural"],
  },
  zh: {
    name: "tiếng Trung",
    voices: ["zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural"],
  },
  ja: {
    name: "tiếng Nhật",
    voices: ["ja-JP-NanamiNeural", "ja-JP-KeitaNeural"],
  },
  ko: {
    name: "tiếng Hàn",
    voices: ["ko-KR-SunHiNeural", "ko-KR-InJoonNeural"],
  },
};

export const generatePersonalizedContent = async (user, mistakes) => {
  try {
    const targetLang = user.targetLanguage || "en";
    const langLevels = LANGUAGE_LEVELS[targetLang] || LANGUAGE_LEVELS["en"];
    const userLevelsObj = user.languageLevels;
    let userLevelId = langLevels[0].id;
    if (userLevelsObj) {
      userLevelId = (userLevelsObj instanceof Map ? userLevelsObj.get(targetLang) : userLevelsObj[targetLang]) || langLevels[0].id;
    }
    const levelObj = langLevels.find((l) => l.id === userLevelId) || langLevels[0];
    const levelStr = levelObj.name;
    const prefs = user.learningPreferences?.join(", ") || "General";
    const langInfo = LANG_MAP[targetLang] || LANG_MAP["en"];
    const langName = langInfo.name;
    const voice1 = langInfo.voices[0];

    // Nén lỗi (Token compression for mistakes)
    const mistakeGroups = {};
    mistakes.forEach(m => {
      const key = m.mistakeDetail || "Lỗi chung";
      if (!mistakeGroups[key]) mistakeGroups[key] = { count: 0, words: [] };
      mistakeGroups[key].count += 1;
      if (mistakeGroups[key].words.length < 3 && !mistakeGroups[key].words.includes(m.word)) {
        mistakeGroups[key].words.push(m.word);
      }
    });

    const mistakeStr = Object.entries(mistakeGroups)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 4) // Chỉ lấy tối đa 4 nhóm lỗi phổ biến nhất
      .map(([detail, data]) => `${detail} (ví dụ: ${data.words.join(", ")})`)
      .join(" | ");

    const prompt = `Bạn là chuyên gia ngôn ngữ học. Học viên trình độ [${levelStr}], sở thích [${prefs}], ngôn ngữ mục tiêu: ${langName}.
Hôm nay học viên hay mắc các lỗi sau: ${mistakeStr}.

Nhiệm vụ: Tạo 1 lộ trình học KHẮC PHỤC LỖI chuẩn JSON (KHÔNG bọc markdown, trả về raw string json).
Bao gồm:
1. "grammar": Cấu trúc ngữ pháp để sửa các lỗi trên. "categories" chứa chủ đề. "lessons" chứa nội dung chi tiết bài học (bắt buộc gồm 6 bước: discovery, guidedQuestion, rule, trueFalse, fixError, freeOutput).
2. "skills": "tasks" chứa 4 bài tập thực hành (1 listening, 1 speaking, 1 reading, 1 writing) tập trung sửa đúng những lỗi này.

Cấu trúc JSON YÊU CẦU:
{
  "grammar": {
    "categories": [
      {
        "title": "1. Ngữ pháp cần ôn",
        "topics": [
          { "id": "remedial_1", "title": "Tên chủ đề", "description": "Lý do...", "icon": "⚠️" }
        ]
      }
    ],
    "lessons": {
      "remedial_1": {
        "discovery": [
          { "en": "Câu tiếng Anh đúng 1", "vi": "Dịch", "highlight": "từ trọng tâm" },
          { "en": "Câu tiếng Anh đúng 2", "vi": "Dịch", "highlight": "từ trọng tâm" },
          { "en": "Câu tiếng Anh đúng 3", "vi": "Dịch", "highlight": "từ trọng tâm" }
        ],
        "guidedQuestion": {
          "question": "Câu hỏi giúp tự suy luận luật?",
          "options": [ { "id": 1, "text": "Sai" }, { "id": 2, "text": "Đúng" } ],
          "correctId": 2
        },
        "rule": { "title": "Luật", "description": "Giải thích luật..." },
        "trueFalse": { "sentence": "Câu tiếng Anh có chứa lỗi sai", "translation": "Dịch", "isActuallyCorrect": false },
        "fixError": { "incorrect": "Câu sai", "correct": "Câu đúng" },
        "freeOutput": { "prompt": "Yêu cầu user viết 1 câu tự do áp dụng luật" }
      }
    }
  },
  "skills": {
    "tasks": [
      {
        "id": "listen_1", "skill": "listening", "title": "Nghe sửa lỗi", "description": "Nghe hội thoại.",
        "content": {
          "topic": { "en": "Topic name", "vi": "Tên chủ đề" },
          "dialogues": [
            { "speaker": "A", "text": "Câu hội thoại 1 (có chứa từ vựng cần ôn)", "voice": "${voice1}" },
            { "speaker": "B", "text": "Câu hội thoại 2", "voice": "${langInfo.voices[1] || voice1}" }
          ],
          "questions": [
            {
              "question": "Câu hỏi trắc nghiệm nghe hiểu?",
              "options": ["Đáp án 1", "Đáp án 2", "Đáp án 3"],
              "correctAnswer": "Đáp án 2",
              "explanation": "Giải thích vì sao đúng"
            }
          ]
        }
      },
      {
        "id": "speak_1", "skill": "speaking", "title": "Nói sửa lỗi", "description": "Đọc lại đoạn thoại.",
        "content": {
          "topic": { "en": "Topic name", "vi": "Tên chủ đề" },
          "dialogues": [
            { "speaker": "A", "text": "Câu thoại mẫu cần đọc", "voice": "${voice1}" }
          ]
        }
      },
      {
        "id": "read_1", "skill": "reading", "title": "Đọc hiểu", "description": "Đoạn văn ngắn.",
        "content": {
          "topic": { "en": "Topic name", "vi": "Tên chủ đề" },
          "passage": "Một đoạn văn ngắn (khoảng 50-80 từ) chứa các cấu trúc vừa học.",
          "questions": [
            {
              "question": "Câu hỏi trắc nghiệm đọc hiểu?",
              "options": ["A", "B", "C"],
              "correctAnswer": "A",
              "explanation": "Giải thích"
            }
          ]
        }
      },
      {
        "id": "write_1", "skill": "writing", "title": "Luyện viết", "description": "Viết đoạn văn tự do.",
        "content": {
          "topic": { "en": "Topic name", "vi": "Tên chủ đề" },
          "prompt": "Đề bài viết (yêu cầu viết 2-3 câu về chủ đề X)",
          "hints": ["Gợi ý từ vựng 1", "Gợi ý từ vựng 2"]
        }
      }
    ]
  }
}

Yêu cầu bắt buộc: 
- Đối với grammar, bắt buộc trả về object "lessons" chứa key tương ứng với id trong "topics". Lesson PHẢI có đủ 6 key: discovery, guidedQuestion, rule, trueFalse, fixError, freeOutput.
- Đối với skills, bắt buộc có 4 tasks (listening, speaking, reading, writing).`;

    const aiText = await generateAIContent({
      prompt,
      feature: "beginner_personalized_generate",
      uid: user._id,
    });

    let parsed = JSON.parse(aiText);

    // Save Grammar
    if (parsed.grammar && parsed.grammar.categories) {
      await PersonalizedGrammar.findOneAndUpdate(
        { userId: user._id },
        { 
          categories: parsed.grammar.categories, 
          lessons: parsed.grammar.lessons || {},
          lastGeneratedAt: new Date() 
        },
        { upsert: true }
      );
    }

    // Save Skills to BeginnerSkill collection
    if (parsed.skills && parsed.skills.tasks) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const skillDocs = parsed.skills.tasks.map(task => ({
        userId: user._id,
        date: today,
        skill: task.skill, // 'listening' or 'speaking'
        level: userLevelId,
        topic: task.title,
        content: task.content,
        status: "pending"
      }));

      for (const doc of skillDocs) {
        await BeginnerSkill.create(doc);
      }
    }

    return true;
  } catch (error) {
    console.error(`Error generating personalized content for user ${user._id}:`, error);
    return false;
  }
};
