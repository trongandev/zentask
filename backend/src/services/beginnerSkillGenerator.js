import BeginnerSkill from "../models/beginnerSkill.js";
import User from "../models/User.js";
import { LANGUAGE_LEVELS } from "../config/languageLevels.js";
import { generateAIContent } from "./ai.service.js";

const LANG_MAP = {
  en: {
    name: "tiếng Anh",
    voices: ["en-US-AriaNeural", "en-US-GuyNeural", "en-US-JennyNeural", "en-US-SteffanNeural", "en-GB-SoniaNeural", "en-GB-RyanNeural", "en-AU-NatashaNeural", "en-AU-WilliamNeural"],
  },
  zh: {
    name: "tiếng Trung",
    voices: ["zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural", "zh-CN-YunjianNeural", "zh-CN-XiaoyiNeural", "zh-CN-YunyangNeural", "zh-CN-XiaobeiNeural"],
  },
  ja: {
    name: "tiếng Nhật",
    voices: ["ja-JP-NanamiNeural", "ja-JP-KeitaNeural", "ja-JP-AoiNeural", "ja-JP-DaichiNeural", "ja-JP-MayuNeural"],
  },
  ko: {
    name: "tiếng Hàn",
    voices: ["ko-KR-SunHiNeural", "ko-KR-InJoonNeural", "ko-KR-SeoHyunNeural", "ko-KR-BongJinNeural", "ko-KR-GookMinNeural"],
  },
};

export function parseSkillData(rawText) {
  const lines = rawText
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter((l) => l);
  const result = { topic: {}, dialogues: [], listenQuestions: [], passage: "", readQuestions: [], writingPrompt: "", listenItems: [], readItems: [] };

  for (const line of lines) {
    const parts = line.split("|");
    const tag = parts[0];

    if (tag === "#TOPIC") {
      result.topic = { en: parts[1], vi: parts[2] };
    } else if (tag === "#DIALOGUE") {
      result.dialogues.push({ speaker: parts[1], text: parts[2], voice: parts[3] });
    } else if (tag === "#PASSAGE") {
      result.passage = parts[1];
    } else if (tag === "#LISTEN") {
      result.listenItems.push({ text: parts[1], translation: parts[2], voice: parts[3] });
    } else if (tag === "#READ") {
      result.readItems.push({ text: parts[1], translation: parts[2] });
    } else if (tag === "#WRITING") {
      result.writingPrompt = parts[1];
    } else if (tag === "#Q_LISTEN" || tag === "#Q_READ" || tag === "#Q") {
      const options = [parts[2], parts[3], parts[4]].filter(Boolean);
      options.sort(() => Math.random() - 0.5);

      const qObj = {
        question: parts[1],
        correctAnswer: parts[2],
        options: options,
        explanation: parts[5],
      };

      if (tag === "#Q_READ") result.readQuestions.push(qObj);
      else result.listenQuestions.push(qObj);
    }
  }
  return result;
}

export const generateTasksForUser = async (user) => {
  try {
    const PREF_LANG_MAP = {
      "Tiếng Anh": "en",
      "Tiếng Nhật": "ja",
      "Tiếng Trung": "zh",
      "Tiếng Hàn": "ko",
    };
    const prefLang = user?.preferences?.language || "Tiếng Anh";
    const targetLang = PREF_LANG_MAP[prefLang] || "en";
    const langLevels = LANGUAGE_LEVELS[targetLang] || LANGUAGE_LEVELS["en"];

    // Fallback if user doesn't have level set
    const userLevelsObj = user.languageLevels;
    let userLevelId = langLevels[0].id;
    if (userLevelsObj) {
      userLevelId = (userLevelsObj instanceof Map ? userLevelsObj.get(targetLang) : userLevelsObj[targetLang]) || langLevels[0].id;
    }

    const levelObj = langLevels.find((l) => l.id === userLevelId) || langLevels[0];
    const levelStr = levelObj.name;
    const prefs = (user.preferences?.interests || []).join(", ") || "General";

    const langInfo = LANG_MAP[targetLang] || LANG_MAP["en"];
    const langName = langInfo.name;
    const voiceList = langInfo.voices.join(", ");

    const isEnglish = targetLang === "en";

    // Pick 2 random voices for the placeholder example in prompt so AI knows how to use them
    const randomVoice1 = langInfo.voices[0];
    const randomVoice2 = langInfo.voices[1];

    const prompt = `Bạn là chuyên gia ngôn ngữ. Tạo 1 bộ bài tập ${langName} ngắn gọn cho học viên trình độ [${levelStr}], sở thích [${prefs}].
QUY TẮC ĐỊNH DẠNG TỐI CAO:
1. KHÔNG json, KHÔNG giải thích, KHÔNG bọc markdown.
2. Mỗi thẻ nằm trên MỘT HÀNG DUY NHẤT, ngăn cách bằng dấu |

Định dạng mẫu:
#TOPIC|Tên chủ đề chung ${langName}|Tên chủ đề tiếng Việt
#LISTEN|Câu hoặc từ vựng luyện nghe 1|Nghĩa tiếng Việt|${randomVoice1}
#LISTEN|Câu hoặc từ vựng luyện nghe 2|Nghĩa tiếng Việt|${randomVoice2}
#DIALOGUE|Nhân vật 1|Câu thoại 1|${randomVoice1}
#DIALOGUE|Nhân vật 2|Câu thoại 2|${randomVoice2}
#Q_LISTEN|Câu hỏi trắc nghiệm nghe 1?|Đáp án đúng|Sai 1|Sai 2|Giải thích
#Q_LISTEN|Câu hỏi trắc nghiệm nghe 2?|Đáp án đúng|Sai 1|Sai 2|Giải thích
#READ|Câu hoặc từ vựng đọc hiểu 1|Nghĩa tiếng Việt
#READ|Câu hoặc từ vựng đọc hiểu 2|Nghĩa tiếng Việt
#PASSAGE|Đoạn văn đọc hiểu ngắn gọn (3-5 câu)...
#Q_READ|Câu hỏi đọc hiểu 1?|Đáp án đúng|Sai 1|Sai 2|Giải thích
#Q_READ|Câu hỏi đọc hiểu 2?|Đáp án đúng|Sai 1|Sai 2|Giải thích
${isEnglish ? "#WRITING|Đề bài viết ngắn (2-3 câu) liên quan đến chủ đề" : ""}

LƯU Ý VỀ VOICE (QUAN TRỌNG): 
Đối với thẻ #LISTEN và #DIALOGUE, hãy lựa chọn các voice ngẫu nhiên (nên mix 1 nam 1 nữ nếu có 2 nhân vật) từ danh sách sau: [${voiceList}]. TUYỆT ĐỐI KHÔNG dùng voice nào ngoài danh sách này.

YÊU CẦU: Sinh ra ít nhất 5 #LISTEN, 7 #Q_LISTEN, 5 #READ và 5 #Q_READ.
HÃY TẠO NGAY 1 BỘ BÀI TẬP ${isEnglish ? "4 KỸ NĂNG" : "NGHE VÀ ĐỌC"} BẰNG ${langName.toUpperCase()} THEO ĐÚNG ĐỊNH DẠNG TRÊN:`;

    const aiText = await generateAIContent({
      prompt,
      feature: "beginner_skill_generate",
      uid: user._id,
    });

    const parsedData = parseSkillData(aiText);

    if (parsedData.dialogues.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Listening Task
      await BeginnerSkill.create({
        userId: user._id,
        date: today,
        skill: "listening",
        level: userLevelId,
        topic: parsedData.topic.en || "Daily Listening",
        content: {
          topic: parsedData.topic,
          listenItems: parsedData.listenItems,
          dialogues: parsedData.dialogues,
          questions: parsedData.listenQuestions,
        },
        status: "pending",
      });

      // Speaking Task (Can reuse the same dialogue for speaking practice)
      if (isEnglish) {
        await BeginnerSkill.create({
          userId: user._id,
          date: today,
          skill: "speaking",
          level: userLevelId,
          topic: parsedData.topic.en || "Daily Speaking",
          content: {
            topic: parsedData.topic,
            dialogues: parsedData.dialogues,
          },
          status: "pending",
        });
      }

      // Reading Task
      if (parsedData.passage) {
        await BeginnerSkill.create({
          userId: user._id,
          date: today,
          skill: "reading",
          level: userLevelId,
          topic: parsedData.topic.en || "Daily Reading",
          content: {
            topic: parsedData.topic,
            readItems: parsedData.readItems,
            passage: parsedData.passage,
            questions: parsedData.readQuestions,
          },
          status: "pending",
        });
      }

      // Writing Task
      if (isEnglish && parsedData.writingPrompt) {
        await BeginnerSkill.create({
          userId: user._id,
          date: today,
          skill: "writing",
          level: userLevelId,
          topic: parsedData.topic.en || "Daily Writing",
          content: {
            topic: parsedData.topic,
            prompt: parsedData.writingPrompt,
          },
          status: "pending",
        });
      }
    }

    return true;
  } catch (error) {
    console.error(`Error generating tasks for user ${user._id}:`, error);
    return false;
  }
};
