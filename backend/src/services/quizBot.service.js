import { GoogleGenAI, Type } from "@google/genai";
import { BotQuiz, ZaloAuth } from "../models/Schemas.js";
import crypto from "crypto";
import { parseMarkdownToZalo } from "../../utils/util.js";
import User from "../models/User.js";
import { addXpToUser } from "../routes/user.js";
import dotenv from "dotenv";
dotenv.config();

// Sử dụng chung logic lấy key API từ flashcard.service.js
function getAvailableKeys() {
  const availableKeys = [];
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`API_KEY_AI_${i}`];
    if (k) availableKeys.push({ index: i, key: k });
  }
  if (availableKeys.length === 0) throw new Error("No AI API Keys configured");
  return availableKeys;
}

export const activeQuizzes = new Map();
export const activeFlashDrops = new Map();

/**
 * Hàm sinh tự động 10 câu trắc nghiệm tiếng Anh
 */
export async function generateDailyQuizzes() {
  try {
    const availableKeys = getAvailableKeys();
    const shuffledKeys = availableKeys.sort(() => Math.random() - 0.5);

    const prompt = `Hãy đóng vai một chuyên gia giảng dạy tiếng Anh. Tạo ra 10 câu trắc nghiệm tiếng Anh ngẫu nhiên, kiến thức trải dài từ lớp 6 tới lớp 12 (ngữ pháp, từ vựng, giới từ...).
Đảm bảo câu hỏi có độ khó đa dạng.
Bạn cần trả về một mảng JSON chứa 10 object. Mỗi object bao gồm các trường sau:
- question: Câu hỏi tiếng Anh.
- options: Mảng 4 lựa chọn A, B, C, D. (VD: ["A. in", "B. on", "C. at", "D. to"])
- correctAnswerIndex: Vị trí của đáp án đúng trong mảng options (từ 0 đến 3).
- explanation: Lời giải thích tại sao lại chọn đáp án đó (viết bằng tiếng Việt).`;

    let generatedData = null;
    for (const { index, key } of shuffledKeys) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctAnswerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ["question", "options", "correctAnswerIndex", "explanation"],
              },
            },
          },
        });
        generatedData = JSON.parse(response.text);
        break;
      } catch (err) {
        console.warn(`[QuizBot Generation] Key API_KEY_AI_${index} failed:`, err.message);
      }
    }

    if (generatedData && generatedData.length > 0) {
      for (const quiz of generatedData) {
        await BotQuiz.create({
          question: quiz.question,
          options: quiz.options,
          correctAnswerIndex: quiz.correctAnswerIndex,
          explanation: quiz.explanation,
          isUsed: false,
        });
      }
      console.log(`[QuizBot] Successfully generated ${generatedData.length} quizzes.`);
    } else {
      console.warn("[QuizBot] Failed to generate quizzes.");
    }
  } catch (error) {
    console.error("[QuizBot] Error in generateDailyQuizzes:", error);
  }
}

/**
 * Gửi một câu đố ngẫu nhiên vào nhóm
 */
export async function sendQuiz(api, threadId) {
  try {
    // 1. Tìm 1 quiz chưa dùng
    const quiz = await BotQuiz.findOne({ isUsed: false }).sort({ createdAt: 1 });
    // const quiz = await BotQuiz.findOne().sort({ createdAt: 1 });
    if (!quiz) {
      console.log("[QuizBot] Không còn câu hỏi chưa sử dụng trong DB.");
      return;
    }

    // 2. Đánh dấu đã dùng
    quiz.isUsed = true;
    await quiz.save();

    // Định nghĩa thời gian
    const timeOut = 10 * 60 * 1000 + 1 * 1000; // 10 phút + 1 giây
    const intervalDelay = 30000; // 30 giây thả tim 1 lần
    const maxHearts = Math.trunc(timeOut / intervalDelay);

    // 3. Gửi câu hỏi
    const questionText = `## 🔔 MINI QUIZ TIẾNG ANH!\n\n${quiz.question}\n\n*Bạn có thể thả like hoặc tym vào đáp án đúng.*\n*⏳ Thời gian: 10 phút. Bot sẽ đếm ngược bằng cách thả ${maxHearts} tim vào tin nhắn này.*\nTrả lời đúng sẽ nhận được 5XP.`;
    const questionRes = await api.sendMessage(parseMarkdownToZalo(questionText), threadId, 1);
    const questionMsgId = questionRes?.message?.msgId;
    // ZCA-JS có thể không trả về cliMsgId sau khi gửi, nên ta dùng fallback
    const questionCliMsgId = questionRes?.message?.cliMsgId || String(Date.now());

    // 4. Gửi từng đáp án và lưu lại msgId
    const optionMsgIds = [];
    for (let i = 0; i < quiz.options.length; i++) {
      const opt = quiz.options[i];
      const res = await api.sendMessage({ msg: opt }, threadId, 1);
      if (res && res.message && res.message.msgId) {
        optionMsgIds.push(res.message.msgId);
      }
    }

    // Nếu không lấy được ID (có thể do lỗi api.sendMessage return), in ra log
    if (optionMsgIds.length !== quiz.options.length) {
      console.warn("[QuizBot] Không thể lấy đủ msgId của các đáp án. Tính năng đếm thả tim có thể không hoạt động chính xác.");
    }

    const quizSessionId = quiz._id.toString();

    // 5. Lưu vào bộ nhớ tạm để nghe reaction
    activeQuizzes.set(quizSessionId, {
      quizId: quizSessionId,
      threadId: threadId,
      correctMsgId: optionMsgIds[quiz.correctAnswerIndex],
      wrongMsgIds: optionMsgIds.filter((_, idx) => idx !== quiz.correctAnswerIndex),
      usersCorrect: new Set(),
      usersWrong: new Set(),
      correctAnswerText: quiz.options[quiz.correctAnswerIndex],
      explanation: quiz.explanation,
    });

    console.log(`[QuizBot] Đã gửi quiz ${quizSessionId}. Đợi reaction trong ${timeOut / 1000} giây...`);

    // 6. Set timeout 10 phút để đánh giá
    const evaluationTimeoutId = setTimeout(() => {
      evaluateQuiz(api, quizSessionId);
    }, timeOut);

    // 7. Hẹn giờ thả tim mỗi 10 giây để đếm ngược
    if (questionMsgId) {
      console.log(`[QuizBot] Bắt đầu thả tim đếm ngược vào msgId: ${questionMsgId}`);
      let heartsCount = 0;

      const intervalId = setInterval(async () => {
        // Dừng nếu đã đủ số tim hoặc quiz đã được đánh giá (không còn trong activeQuizzes)
        if (heartsCount >= maxHearts || !activeQuizzes.has(quizSessionId)) {
          clearInterval(intervalId);
          console.log("[QuizBot] Ngừng đếm ngược thả tim.");
          return;
        }

        try {
          await api.addReaction("/-heart", {
            data: {
              msgId: String(questionMsgId),
              cliMsgId: String(questionCliMsgId),
            },
            threadId: String(threadId),
            type: 1, // ThreadType.Group
          });
          heartsCount++;
        } catch (error) {
          console.error("[QuizBot] Lỗi thả tim đếm ngược:", error.message);
          heartsCount++;
        }
      }, intervalDelay);
    } else {
      console.warn("[QuizBot] Không lấy được questionMsgId để thả tim.");
    }
  } catch (error) {
    console.error("[QuizBot] Error in sendQuiz:", error);
  }
}

/**
 * Đánh giá kết quả quiz sau 10 phút
 */
export async function evaluateQuiz(api, quizSessionId) {
  try {
    const session = activeQuizzes.get(quizSessionId);
    if (!session) return; // Đã xử lý hoặc bị xoá

    // Giải phóng bộ nhớ trước để ngưng nhận event
    activeQuizzes.delete(quizSessionId);

    const threadId = session.threadId;

    let finalMsg = "";
    let finalStyles = [];
    const mentions = [];

    // Phần 1: Thông báo & Đáp án (Có markdown)
    let part1 = `## ⏱️ Đã hết thời gian!\n\n`;

    const correctList = Array.from(session.usersCorrect);
    correctList.forEach((u) => session.usersWrong.delete(u));
    const wrongList = Array.from(session.usersWrong);

    if (correctList.length > 0) {
      part1 += `🎉 Chúc mừng các bạn đã trả lời chính xác đáp án:\n**${session.correctAnswerText}**\n\n`;
    } else {
      part1 += `Rất tiếc, chưa có ai trả lời đúng lần này.\nĐáp án chính xác là: **${session.correctAnswerText}**\n\n`;
      if (wrongList.length > 0) {
        part1 += `Cố lên nha các bạn:\n`;
      }
    }

    const parsed1 = parseMarkdownToZalo(part1);
    finalMsg += parsed1.msg;
    if (parsed1.styles) finalStyles.push(...parsed1.styles);

    // Phần 2: Mentions (Plain text)
    if (correctList.length > 0) {
      for (const uid of correctList) {
        const tagText = `@Bạn`;
        mentions.push({
          pos: finalMsg.length,
          len: tagText.length,
          uid: String(uid),
        });
        finalMsg += `${tagText} `;
      }
      finalMsg += `\n\n`;
    } else if (wrongList.length > 0) {
      for (const uid of wrongList) {
        const tagText = `@Bạn`;
        mentions.push({
          pos: finalMsg.length,
          len: tagText.length,
          uid: String(uid),
        });
        finalMsg += `${tagText} `;
      }
      finalMsg += `\n\n`;
    }

    // Sau khi gửi thông báo kết quả chung vào group, xử lý cộng điểm cho các user trả lời đúng
    if (correctList.length > 0) {
      for (const uid of correctList) {
        try {
          // Tìm user trong hệ thống theo zaloId
          const user = await User.findOne({ zaloId: String(uid) });
          if (user) {
            // Cộng 5 XP
            const { xp, level } = await addXpToUser(user._id, 5);

            // Gửi tin nhắn chúc mừng cá nhân
            const privateMsg = `🎉 Chúc mừng bạn đã trả lời chính xác câu hỏi Mini Quiz!\n\n🎁 Bạn nhận được +5 XP.\n⭐ Tổng XP hiện tại: ${xp}\n👑 Level: ${level}\n\nTiếp tục phát huy nhé!`;
            await api.sendMessage({ msg: privateMsg }, String(uid), 0);
          } else {
            const authId = crypto.randomBytes(6).toString("hex");
            await ZaloAuth.create({ authId, zaloId: String(uid) });
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            const authLink = `${frontendUrl}/go/${authId}`;
            api.sendMessage({ msg: `🎉 Bạn đã trả lời chính xác câu hỏi Mini Quiz!\n\nTuy nhiên, tài khoản Zalo của bạn chưa liên kết với ZenTask nên chưa thể cộng điểm thưởng (+5 XP).\n👉 Vui lòng bấm vào link dưới đây để đăng nhập và tích luỹ kinh nghiệm nha:\n${authLink}\n\n(Bạn có thể gõ lệnh "login" lúc nào cũng được để lấy link đăng nhập mới)` }, String(uid), 0);
          }
        } catch (err) {
          console.error(`[QuizBot] Error processing reward for Zalo uid ${uid}:`, err);
        }
      }
    }

    // Phần 3: Giải thích (Có markdown)
    const parsed3 = parseMarkdownToZalo(`💡 **Giải thích:**\n${session.explanation}`);
    if (parsed3.styles) {
      for (const st of parsed3.styles) {
        finalStyles.push({
          start: finalMsg.length + st.start,
          len: st.len,
          st: st.st,
        });
      }
    }
    finalMsg += parsed3.msg;

    await api.sendMessage(
      {
        msg: finalMsg,
        styles: finalStyles.length > 0 ? finalStyles : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
      },
      threadId,
      1,
    );
  } catch (error) {
    console.error("[QuizBot] Error in evaluateQuiz:", error);
  }
}
