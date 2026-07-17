import { Type } from "@google/genai";
import { generateAIContent } from "./ai.service.js";
import dotenv from "dotenv";
import { Flashcard } from "../models/Schemas.js";
import fs from "fs";
import path from "path";
import { parseMarkdownToZalo } from "../../utils/util.js";

dotenv.config();

export const activeGroupGames = new Map(); // threadId -> { type, answer, xp, createdAt }
export const activeWordChains = new Map(); // uid -> { status, wordCount, timer, lastWord }

export const englishWordsSet = new Set();
export const wordsByFirstLetter = {};

// Tải từ điển vào bộ nhớ (O(1))
try {
  const filePath = path.resolve("./src/data/words_alpha.txt");
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf-8");
    const words = data.split(/\r?\n/);
    for (const w of words) {
      const word = w.trim().toLowerCase();
      if (word.length > 0) {
        englishWordsSet.add(word);
        const firstLetter = word[0];
        if (!wordsByFirstLetter[firstLetter]) {
          wordsByFirstLetter[firstLetter] = [];
        }
        wordsByFirstLetter[firstLetter].push(word);
      }
    }
    console.log(`[Minigame Service] Loaded ${englishWordsSet.size} English words into memory.`);
  } else {
    console.warn(`[Minigame Service] Dictionary file not found at ${filePath}`);
  }
} catch (e) {
  console.error("Error loading words_alpha.txt", e);
}



export async function generateScrambledWord() {
  const prompt = `Generate a random common English word (level Grade 1 to Grade 12). Return a JSON object with:
- "word": the exact english word (letters only, no spaces or special characters)
- "hint": a short hint in Vietnamese explaining the word (do not include the word itself).`;

  try {
    const result = await generateAIContent({
      prompt,
      feature: "minigame_scrambled_generate",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          hint: { type: Type.STRING },
        },
        required: ["word", "hint"],
      },
    });

    const originalWord = result.word.toLowerCase().trim();
    // Scramble the word (make sure it's actually scrambled)
    let scrambled = originalWord;
    let attempts = 0;
    while (scrambled === originalWord && attempts < 10) {
      scrambled = scrambled
        .split("")
        .sort(() => 0.5 - Math.random())
        .join("");
      attempts++;
    }

    return { word: originalWord, scrambled: scrambled.toUpperCase(), hint: result.hint };
  } catch (err) {
    console.error(`Error generating scrambled word:`, err.message);
  }

  return null;
}

export async function generateEmojiWord() {
  const prompt = `Generate a random common English word (level Grade 1 to Grade 12) that can be clearly represented by a sequence of emojis. Return a JSON object with:
- "word": the exact english word (letters only)
- "emojis": a sequence of 2-4 emojis that visually represent the word (no text).`;

  try {
    const result = await generateAIContent({
      prompt,
      feature: "minigame_emoji_generate",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          emojis: { type: Type.STRING },
        },
        required: ["word", "emojis"],
      },
    });

    return { word: result.word.toLowerCase().trim(), emojis: result.emojis };
  } catch (err) {
    console.error(`Error generating emoji word:`, err.message);
  }

  return null;
}

export async function getListeningFlashcard() {
  try {
    const result = await Flashcard.aggregate([{ $sample: { size: 1 } }]);
    if (result && result.length > 0) {
      return result[0];
    }
  } catch (e) {
    console.error("Error getting listening flashcard", e);
  }
  return null;
}

export async function checkWordChainValidity(lastWord, newWord, usedWords = new Set()) {
  if (!lastWord || !newWord) return { valid: false, reason: "Từ không hợp lệ." };
  lastWord = lastWord.trim().toLowerCase();
  newWord = newWord.trim().toLowerCase();

  if (lastWord.slice(-1) !== newWord.charAt(0)) {
    return { valid: false, reason: `Từ mới phải bắt đầu bằng chữ '${lastWord.slice(-1)}'.` };
  }

  if (usedWords.has(newWord)) {
    return { valid: false, reason: "Từ này đã được sử dụng trong ván chơi rồi." };
  }

  if (!englishWordsSet.has(newWord)) {
    return { valid: false, reason: `Từ "${newWord}" không có trong từ điển tiếng Anh.` };
  }

  return { valid: true, reason: "" };
}

export async function botNextWord(lastChar, usedWords = new Set()) {
  const possibleWords = wordsByFirstLetter[lastChar] || [];
  const unusedWords = possibleWords.filter((w) => !usedWords.has(w));

  if (unusedWords.length === 0) {
    return null; // Bot thua do hết từ
  }

  // Cơ chế cân bằng: Bot có 25% khả năng giả vờ không tìm được từ để user thắng (chỉ khi user đã nối được ít nhất 2 từ)
  if (usedWords.size >= 3 && Math.random() < 0.25) {
    return null;
  }

  // Chọn từ ngẫu nhiên
  const randomIndex = Math.floor(Math.random() * unusedWords.length);
  return unusedWords[randomIndex];
}

export async function triggerMinigame(api, threadId, type) {
  if (!threadId) return;

  if (activeGroupGames.has(threadId)) {
    console.log(`[Minigame Service] Nhóm ${threadId} đang có một game diễn ra, không thể tạo thêm.`);
    // Tùy chọn: Nhắn tin cho người yêu cầu biết nhóm đang bận
    // await api.sendMessage({ msg: "⚠️ Đang có một minigame diễn ra trong nhóm, vui lòng chờ kết thúc rồi mới tạo game mới nhé!" }, threadId, 0);
    return;
  }

  let msgText = "";
  let answer = "";
  const xpReward = 15;

  if (type === "scrambled") {
    console.log(`[Minigame Service] Bắt đầu minigame Đảo Chữ (Scrambled Words) cho ${threadId}...`);
    const data = await generateScrambledWord();
    if (!data) return;
    answer = data.word;
    msgText = `🎮 **MINIGAME: GIẢI MÃ TỪ VỰNG!** 🎮\n\nTừ tiếng Anh này đã bị xáo trộn các chữ cái:\n👉 **${data.scrambled}**\n\n💡 Gợi ý: ${data.hint}\n\n⏳ Bạn nào gõ đáp án chính xác nhanh nhất sẽ nhận được ${xpReward} XP!\n\n*(Lưu ý: Không cần tag tên mình, chỉ cần gõ đúng đáp án mình sẽ ghi nhận tự động)*`;
    await api.sendMessage(parseMarkdownToZalo(msgText), threadId, 1);
  } else if (type === "emoji") {
    console.log(`[Minigame Service] Bắt đầu minigame Đuổi Hình Bắt Chữ (Emoji to Word) cho ${threadId}...`);
    const data = await generateEmojiWord();
    if (!data) return;
    answer = data.word;
    msgText = `🎮 **MINIGAME: ĐUỔI HÌNH BẮT CHỮ!** 🎮\n\nHãy đoán từ tiếng Anh dựa trên các Emoji sau:\n👉 **${data.emojis}**\n\n⏳ Bạn nào gõ đáp án chính xác nhanh nhất sẽ nhận được ${xpReward} XP!\n\n*(Lưu ý: Không cần tag tên mình, chỉ cần gõ đúng đáp án mình sẽ ghi nhận tự động)*`;
    await api.sendMessage(parseMarkdownToZalo(msgText), threadId, 1);
  } else if (type === "listening") {
    console.log(`[Minigame Service] Bắt đầu minigame Nghe & Chép Chính Tả (Listening Race) cho ${threadId}...`);
    const card = await getListeningFlashcard();
    console.log(card);
    if (!card) return;
    answer = card.term.toLowerCase().trim();
    msgText = `🎮 **MINIGAME: NGHE & CHÉP CHÍNH TẢ!** 🎮\n\nLopy vừa gửi một đoạn Voice ở dưới.\n⏳ Bạn nào nghe và gõ lại chính xác TỪ VỰNG đó nhanh nhất sẽ nhận được ${xpReward} XP!\n\n*(Lưu ý: Không cần tag tên mình, chỉ cần gõ đúng đáp án mình sẽ ghi nhận tự động)*`;

    try {
      await api.sendMessage(parseMarkdownToZalo(msgText), threadId, 1);
      const { default: ChatbotUtil } = await import("../../utils/chatbot.js");
      const botUtil = new ChatbotUtil(api);
      await botUtil.sendVoiceMessage(threadId, card.term, "en", 1);
    } catch (e) {
      console.error("Lỗi khi gửi voice:", e);
      return; // Hủy nếu lỗi
    }
  }

  if (answer) {
    activeGroupGames.set(threadId, {
      type,
      answer,
      xp: xpReward,
      createdAt: Date.now(),
    });

    // Hết hạn sau 10 phút nếu không ai trả lời
    setTimeout(
      async () => {
        if (activeGroupGames.has(threadId)) {
          const game = activeGroupGames.get(threadId);
          if (game.answer === answer) {
            activeGroupGames.delete(threadId);
            await api.sendMessage({ msg: `❌ Rất tiếc, đã hết thời gian mà chưa có ai đoán đúng!\n\nĐáp án chính xác là: **${answer}**` }, threadId, 1);
          }
        }
      },
      10 * 60 * 1000,
    );
  }
}
