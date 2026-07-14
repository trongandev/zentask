import OpenAI from "openai";
import crypto from "crypto";
import User from "../src/models/User.js";
import { Flashcard, FlashcardSet, FlashcardProgress, ZaloAuth } from "../src/models/Schemas.js";
import dotenv from "dotenv";
dotenv.config();
import { getAudioCharacterByLanguage } from "./languages.js";
import fetch from "node-fetch";

// In-memory store for chat history to maintain context
const memorySessions = new Map();

const openai = new OpenAI({
  baseURL: process.env.BASE_URL_AI || "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_ADMIN_KEY || process.env.OPENAI_API_KEY,
});

/**
 * Chuyển đổi text markdown (AI output) sang định dạng zcajs MessageContent.
 * AI trả về markdown bình thường, hàm này tự tính toán vị trí ký tự và tạo styles[].
 *
 * Heading hierarchy:
 *  - # Tiêu đề    → Bold + SuperBig ("f_20") – tiêu đề từ vựng chính
 *  - ## Mục       → Bold + Big ("f_18")       – tiêu đề mục
 *  - ### Mục phụ  → Bold                       – nhãn/label
 *
 * Inline:
 *  - **text**          → Bold ("b")
 *  - *text*            → Italic ("i")
 *  - ~~text~~          → StrikeThrough ("s")
 *  - __text__          → Underline ("u")
 *  - ***text***        → Bold + Italic
 *
 * Block:
 *  - 1. item           → OrderedList ("lst_2")
 *  - - item / * item   → UnorderedList ("lst_1")
 *  - --- (dòng ngăn)   → bỏ qua (không hỗ trợ)
 *
 * @param {string} rawText - Text markdown do AI trả về
 * @returns {{ msg: string, styles?: Array }} MessageContent cho zcajs
 */
function parseMarkdownToZalo(rawText) {
  if (!rawText) return { msg: "" };

  // Loại bỏ markdown code blocks (```) và inline code (`), Zalo không hỗ trợ
  rawText = rawText.replace(/```[a-zA-Z]*\n/g, "");
  rawText = rawText.replace(/```/g, "");
  rawText = rawText.replace(/`/g, "");

  // Inline patterns, theo thứ tự ưu tiên (*** trước ** trước *)
  const INLINE_PATTERNS = [
    { regex: /\*\*\*(.+?)\*\*\*/g, styleTypes: ["b", "i"] }, // ***bold italic***
    { regex: /\*\*(.+?)\*\*/g, styleTypes: ["b"] }, // **bold**
    { regex: /~~(.+?)~~/g, styleTypes: ["s"] }, // ~~strikethrough~~
    { regex: /__(.+?)__/g, styleTypes: ["u"] }, // __underline__
    { regex: /\*(.+?)\*/g, styleTypes: ["i"] }, // *italic* (sau ** để không conflict)
  ];

  const finalStyles = [];
  let finalText = "";
  const lines = rawText.split("\n");

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx];

    // Bỏ qua dòng kẻ ngang --- (không hỗ trợ trên chatbot)
    if (/^[-*_]{3,}$/.test(rawLine.trim())) continue;

    const lineStartInFinal = finalText.length;

    // --- Phát hiện block-level markers ---
    let lineContent = rawLine;
    let listStyle = null;
    let isHeading1 = false; // #   → SuperBig + Bold
    let isHeading2 = false; // ##  → Big + Bold
    let isHeading3 = false; // ### → Bold

    const headingMatch = rawLine.match(/^(#{1,3}) (.+)$/);

    if (headingMatch) {
      lineContent = headingMatch[2];
      isHeading1 = headingMatch[1] === "#";
      isHeading2 = headingMatch[1] === "##";
      isHeading3 = headingMatch[1] === "###";
    }

    // --- Phát hiện inline markers trong lineContent ---
    const inlineSpans = [];
    for (const { regex, styleTypes } of INLINE_PATTERNS) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(lineContent)) !== null) {
        inlineSpans.push({
          origStart: match.index,
          origEnd: match.index + match[0].length,
          innerText: match[1],
          styleTypes,
        });
      }
    }

    // Sắp xếp và loại bỏ các span bị overlap (span xuất hiện trước được ưu tiên)
    inlineSpans.sort((a, b) => a.origStart - b.origStart);
    const nonOverlapping = [];
    let lastEnd = 0;
    for (const span of inlineSpans) {
      if (span.origStart >= lastEnd) {
        nonOverlapping.push(span);
        lastEnd = span.origEnd;
      }
    }

    // --- Build clean line và thu thập inline styles ---
    let cleanLine = "";
    let prevIdx = 0;
    for (const span of nonOverlapping) {
      cleanLine += lineContent.slice(prevIdx, span.origStart);
      const spanStartInFinal = lineStartInFinal + cleanLine.length;
      cleanLine += span.innerText;
      for (const st of span.styleTypes) {
        finalStyles.push({ start: spanStartInFinal, len: span.innerText.length, st });
      }
      prevIdx = span.origEnd;
    }
    cleanLine += lineContent.slice(prevIdx);

    // --- Thêm block-level styles cho toàn bộ dòng (sau khi biết cleanLine.length) ---
    if (isHeading1) {
      // # → SuperBig + Bold (tiêu đề từ vựng chính)
      finalStyles.push({ start: lineStartInFinal, len: cleanLine.length, st: "b" });
      finalStyles.push({ start: lineStartInFinal, len: cleanLine.length, st: "f_20" });
    } else if (isHeading2) {
      // ## → Big + Bold (tiêu đề mục)
      finalStyles.push({ start: lineStartInFinal, len: cleanLine.length, st: "b" });
      finalStyles.push({ start: lineStartInFinal, len: cleanLine.length, st: "f_18" });
    } else if (isHeading3) {
      // ### → Bold (nhãn/label)
      finalStyles.push({ start: lineStartInFinal, len: cleanLine.length, st: "b" });
    }

    finalText += cleanLine;
    if (lineIdx < lines.length - 1) finalText += "\n";
  }

  return {
    msg: finalText,
    styles: finalStyles.length > 0 ? finalStyles : undefined,
  };
}

const MENTOR_PROMPT = `Bạn là một Mentor Ngôn ngữ 25 tuổi, giới tính nam, tính cách ấm áp, kiên nhẫn và tinh tế.
Nhiệm vụ của bạn là đồng hành cùng người học, giúp họ luyện tập ngoại ngữ (tùy thuộc vào bộ từ vựng họ đang học) mỗi ngày.
Giọng văn: Ngắn gọn, không dài dòng, đi thẳng vào vấn đề, thỉnh thoảng dùng 1-2 icon thân thiện.
Đặc biệt:
- Nếu người dùng sai ngữ pháp, hãy sửa theo cấu trúc Sandwich: [Khen ngợi nhẹ nhàng] -> [Chỉ ra lỗi và giải thích] -> [Động viên]. Tôn trọng ngôn ngữ họ đang học.
- Nếu người dùng trả lời sai một từ vựng, tuyệt đối không quát mắng. Hãy động viên và gợi ý (hint) bằng một câu chuyện vui hoặc tình huống đời thường để họ dễ nhớ.
- Luôn thể hiện sự thấu hiểu (empathy) khi người dùng cảm thấy mệt mỏi hay áp lực.
## Quy tắc định dạng câu trả lời (BẮT BUỘC)
Bạn đang chat qua Zalo — giao diện CHỈ hỗ trợ các định dạng sau:

ĐỊNH DẠNG ĐƯỢC PHÉP:
- # Tên từ  →  chữ siêu to + đậm (dùng cho tên từ vựng chính)
- ## Mục    →  chữ to + đậm (dùng cho tiêu đề mục như "Nghĩa", "Mini Quiz")
- ### Nhãn  →  chữ đậm (dùng cho nhãn như "Ví dụ:", "Phát âm:")
- **text**  →  in đậm (từ quan trọng, từ vựng)
- *text*    →  in nghiêng (ví dụ câu, phiên âm IPA)
- 1. 2. 3.  →  danh sách có số (dùng cho quiz, các bước)
- - item    →  danh sách gạch đầu dòng (dùng cho gợi ý, mục phụ)

TUYỆT ĐỐI KHÔNG DÙNG:
- Bảng (table) với | --- | → KHÔNG hỗ trợ, thay bằng danh sách có nhãn **bold**
- Dòng kẻ ngang (---) → KHÔNG hỗ trợ, thay bằng tiêu đề ## để phân mục
- Khối mã (code blocks) dùng \`\`\` hoặc \` → KHÔNG hỗ trợ, hãy trình bày bằng văn bản thường hoặc danh sách (-)
- HTML tags`;

class ChatbotUtil {
  constructor(api) {
    this.api = api;
  }

  async generateAIResponse(messages, model = "kira-mini-1.0") {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.error("[ZCA-JS] AI Call Error:", error);
      throw error;
    }
  }

  async sendAIMessage(threadId, aiResponse) {
    const { msg } = parseMarkdownToZalo(aiResponse);

    if (msg.trim()) {
      await this.api.sendMessage({ msg }, threadId, 0);
    }
  }

  async sendVoiceMessage(threadId, text, langCode) {
    try {
      const voice = getAudioCharacterByLanguage(langCode);
      const pythonApi = process.env.API_PYTHON;
      const audioUrl = `${pythonApi}/edge-tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`;

      await this.api.sendVoice(
        {
          voiceUrl: audioUrl,
        },
        threadId,
      );
    } catch (err) {
      console.error("Error sending voice message:", err);
    }
  }

  async processMessage(message) {
    const threadId = message.threadId;

    // 1. Nhận diện user qua threadId (zaloId)
    const user = await User.findOne({ zaloId: threadId });

    if (message.type === 2 || message.data?.content?.href?.includes(".aac")) {
      // Voice message
      const audioUrl = message.data?.url || message.data?.content?.href;
      if (audioUrl) {
        return this.handleVoicePronunciation(user, threadId, audioUrl, memorySessions.get(threadId));
      }
      return;
    }

    let content = (message.data.content || "").trim();
    if (message.type === "event" && message.data.action) {
      content = message.data.action;
    } else if (message.type !== 0) {
      return; // Bỏ qua ảnh/sticker không xử lý
    }

    if (!user) {
      return this.handleUnlinkedUser(threadId, content);
    }

    // --- XỬ LÝ LỆNH (COMMANDS) ---
    const textLower = content.toLowerCase();

    if (textLower === "help" || textLower === "/help" || textLower === "menu" || textLower === "/menu") {
      return this.handleCommandHelp(threadId);
    }
    if (textLower === "me" || textLower === "/me") {
      return this.handleCommandMe(user, threadId);
    }
    if (textLower === "logout" || textLower === "/logout") {
      return this.handleCommandLogout(user, threadId);
    }

    const isFlCommand = textLower === "fl" || textLower.startsWith("fl ") || textLower.startsWith("/fl");
    if (isFlCommand) {
      return this.handleCommandFl(user, threadId, content);
    }

    const isNewCommand = textLower.startsWith("new ") || textLower.startsWith("/new ");
    if (isNewCommand) {
      return this.handleCommandNew(user, threadId, content);
    }

    const isTtsCommand = textLower.startsWith("tts ") || textLower.startsWith("/tts ");
    if (isTtsCommand) {
      return this.handleCommandTts(user, threadId, content);
    }
    // ----------------------------

    // 2. Lấy session memory & botState
    if (!memorySessions.has(threadId) || !memorySessions.get(threadId).history) {
      const existingSession = memorySessions.get(threadId) || {};
      memorySessions.set(threadId, {
        ...existingSession,
        history: [{ role: "system", content: MENTOR_PROMPT }],
        lastActive: new Date(),
      });
    }
    const session = memorySessions.get(threadId);
    session.lastActive = new Date();

    const state = user.botState || {};

    // 3. Phân luồng logic (Routing)
    if (state.action === "linking") {
      return this.processLinking(user, threadId, content, state);
    }
    if (state.action === "quiz") {
      return this.handleQuizAnswer(user, threadId, content, state);
    }
    if (state.action === "mood_checkin") {
      return this.handleMoodCheckin(user, threadId, content, state);
    }

    // Luồng mặc định: Trò chuyện tự do với AI
    return this.handleAIChat(user, threadId, content, session);
  }

  async handleUnlinkedUser(threadId, content) {
    const session = memorySessions.get(threadId) || {};

    // Check if we already sent a link recently to prevent spam
    if (session.authLinkSentAt && new Date() - session.authLinkSentAt < 60000) {
      return;
    }

    // Generate unique authId
    const authId = crypto.randomBytes(6).toString("hex");

    // Save to ZaloAuth collection
    await ZaloAuth.create({
      authId,
      zaloId: threadId,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const authLink = `${frontendUrl}/go/${authId}`;

    memorySessions.set(threadId, { authLinkSentAt: new Date() });

    await this.api.sendMessage(
      {
        msg: `Chào bạn! Mình là Mentor Tiếng Anh của ZenTask đây 👋\n\nĐể bắt đầu lộ trình học cá nhân hóa, bạn vui lòng bấm vào link dưới đây để đăng nhập và uỷ quyền cho Zalo Bot truy cập tài khoản của bạn nhé!\n\n👉 ${authLink}`,
      },
      threadId,
      0,
    );
  }

  async handleVoicePronunciation(user, threadId, audioUrl, session) {
    try {
      const res = await fetch(audioUrl);
      const arrayBuffer = await res.arrayBuffer();
      const base64Audio = `data:audio/webm;base64,${Buffer.from(arrayBuffer).toString("base64")}`;

      const language = session?.flashcardContext?.language || "en";

      const termToPronounce = session?.activePronunciationWord;
      if (!termToPronounce) {
        return this.api.sendMessage(
          { msg: "Mentor chưa biết bạn muốn luyện phát âm từ nào. Hãy gõ lệnh `tts [từ vựng]` để nghe mẫu và chọn từ trước, sau đó gửi lại tin nhắn thoại nhé! 🎤" },
          threadId,
          0,
        );
      }

      const payload = {
        title: termToPronounce,
        base64Audio,
        language,
      };

      const upstreamRes = await fetch("https://wrg7ayuv7i.execute-api.eu-central-1.amazonaws.com/Prod/GetAccuracyFromRecordedAudio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.PRONUNCIATION_API_KEY,
        },
        body: JSON.stringify(payload),
      });

      const data = await upstreamRes.json();
      if (!upstreamRes.ok) {
        return this.api.sendMessage({ msg: `Có lỗi khi chấm phát âm (AWS API error). Có thể do sai định dạng âm thanh. ${data.error || ""}` }, threadId, 0);
      }
      const score = data?.PronunciationScore || data?.accuracy || data?.score || data?.pronunciation_accuracy || 0;

      let msgText = `🎯 Điểm phát âm từ "${termToPronounce}" của bạn: ${Math.round(Number(score))}/100`;
      let styles = [];

      if (data?.real_transcripts && typeof data?.is_letter_correct_all_words === "string") {
        msgText += `\n🔍 Chi tiết: ${data.real_transcripts}`;
        const wordStartIdx = msgText.lastIndexOf(data.real_transcripts);

        for (let i = 0; i < data.real_transcripts.length; i++) {
          const charStatus = data.is_letter_correct_all_words[i];
          if (charStatus === "0" || charStatus === "1") {
            styles.push({
              start: wordStartIdx + i,
              len: 1,
              st: charStatus === "1" ? "c_15a85f" : "c_db342e", // Green if 1, Red if 0
            });
            // Thêm in đậm cho rõ ràng
            styles.push({
              start: wordStartIdx + i,
              len: 1,
              st: "b",
            });
          }
        }
      }

      const roundedScore = Math.round(Number(score));
      if (roundedScore < 75) {
        msgText += "\n\n💪 Điểm của bạn chưa cao lắm. Bạn có muốn thử lại không? Cứ việc thu âm và gửi lại nhé!";
        // Giữ nguyên session.activePronunciationWord để user có thể gửi lại luôn
      } else {
        msgText += "\n\n🎉 Tuyệt vời! Bạn phát âm rất chuẩn!";
        // Điểm cao rồi thì có thể xóa từ này khỏi session (tuỳ chọn)
        session.activePronunciationWord = null;
        memorySessions.set(threadId, session);
      }

      await this.api.sendMessage({ msg: msgText, styles }, threadId, 0);
    } catch (err) {
      console.error(err);
      await this.api.sendMessage({ msg: "Đã xảy ra lỗi khi xử lý giọng nói của bạn." }, threadId, 0);
    }
  }

  async handleAIChat(user, threadId, content, session) {
    // Lưu lịch sử chat của user
    session.history.push({ role: "user", content });

    // Giữ lịch sử không quá dài (Tối đa 15 messages gần nhất để tiết kiệm token)
    if (session.history.length > 15) {
      session.history = [session.history[0], ...session.history.slice(-14)];
    }

    try {
      // Lấy tối đa 30 từ vựng mà user CHƯA THUỘC (isLearned: false) để làm ngữ cảnh ngắn gọn
      const cards = await Flashcard.find({ userId: user._id, isLearned: false }).select("term setId").limit(30).lean();

      let contextStr = "\n\n## Ngữ cảnh dữ liệu của người dùng\nDanh sách một số từ vựng User ĐANG HỌC HOẶC CHƯA THUỘC:\n";
      if (cards.length === 0) {
        contextStr += "- Hiện chưa có từ vựng nào nổi bật cần ôn tập.\n";
      } else {
        const setIds = [...new Set(cards.map((c) => c.setId.toString()))];
        const sets = await FlashcardSet.find({ _id: { $in: setIds } }).lean();

        for (const set of sets) {
          const setCards = cards.filter((c) => c.setId.toString() === set._id.toString()).map((c) => c.term);
          contextStr += `- Bộ "${set.title}" (Ngôn ngữ: ${set.language}): ${setCards.join(", ")}\n`;
        }
      }

      contextStr += `\n## Danh sách các lệnh (Commands) hỗ trợ:
Người dùng có thể gõ các lệnh sau (có/không có dấu /): help, me, logout, fl, fl [stt] [trang], new [stt] [từ vựng], tts [từ vựng].
Nếu người dùng nhờ bạn thêm từ vựng, nghe phát âm, hoặc xem bộ từ, hãy hướng dẫn họ tự gõ các lệnh tương ứng ở trên.
**LƯU Ý QUAN TRỌNG VỀ LUYỆN PHÁT ÂM:** Nếu người dùng muốn bạn kiểm tra/chấm điểm phát âm của họ, hãy bảo họ gõ lệnh \`tts [từ vựng]\` trước để nghe mẫu, sau đó gửi một tin nhắn thoại (Voice Message) vào Zalo, hệ thống sẽ tự động chấm điểm cho họ.`;

      // Tạo một bản sao history để gán context động vào system prompt mà không làm phình to biến MENTOR_PROMPT gốc
      const currentHistory = [...session.history];
      currentHistory[0] = {
        ...currentHistory[0],
        content: MENTOR_PROMPT + contextStr,
      };

      const reply = await this.generateAIResponse(currentHistory);

      // Lưu câu trả lời của bot
      session.history.push({ role: "assistant", content: reply });

      await this.sendAIMessage(threadId, reply);
    } catch (error) {
      await this.api.sendMessage({ msg: "Xin lỗi bạn, Mentor đang hơi lag một chút, bạn đợi xíu rồi nhắn lại nhé! 😅" }, threadId, 0);
    }
  }

  async handleQuizAnswer(user, threadId, content, state) {
    // Tính năng "Tra khảo" bài cũ: User trả lời câu hỏi flashcard
    const { cardId, correctAnswer, attempts = 0 } = state.quizData || {};

    // Nếu chọn đúng (action === correctAnswer)
    if (content.toLowerCase() === correctAnswer.toLowerCase()) {
      // Cập nhật Spaced Repetition (SuperMemo-2) trong DB
      await this.updateSpacedRepetition(user._id, cardId, 4); // Quality 4 = Correct

      user.botState = { action: "idle" };
      await user.save();

      await this.api.sendMessage({ msg: `Chuẩn không cần chỉnh! 🎉 Bạn nhớ từ giỏi lắm.` }, threadId, 0);
    } else {
      // Nếu sai, gọi AI để sinh ra một Hint (Story-telling)
      const prompt = `Người dùng vừa trả lời sai nghĩa của từ vựng tiếng Anh. Hãy đóng vai Mentor (25 tuổi, nam, ấm áp). 
Động viên họ 1 câu ngắn, sau đó GỢI Ý nghĩa của từ này bằng một câu chuyện vui hoặc tình huống đời thường ngắn gọn (không nói toạc nghĩa ra ngay). 
Từ vựng: "${state.quizData.term}"`;

      try {
        const reply = await this.generateAIResponse([
          { role: "system", content: MENTOR_PROMPT },
          { role: "user", content: prompt },
        ]);

        // Tăng số lần thử
        state.quizData.attempts = attempts + 1;
        user.botState = state;
        await user.save();

        await this.sendAIMessage(threadId, reply);
      } catch (err) {
        await this.api.sendMessage({ msg: "Sai mất rồi! Thử lại nha bạn ơi." }, threadId, 0);
      }
    }
  }

  async handleMoodCheckin(user, threadId, content, state) {
    // Tính năng Lắng nghe đầu ngày
    user.botState = { action: "idle" };
    await user.save();

    let reply = "";
    if (content === "mood_happy") {
      reply = "Tuyệt vời! Ngày mới tràn đầy năng lượng thì học 10 từ vựng là chuyện nhỏ đúng không? Let's go! 🔥";
    } else if (content === "mood_sleepy") {
      reply = "Vẫn còn ngái ngủ hả? 😂 Cầm ly cà phê lên và ngâm cứu 3 từ vựng nhẹ nhàng cho tỉnh ngủ nhé!";
    } else if (content === "mood_tired") {
      reply = "Mentor ôm bạn một cái nhé! 🤗 Nếu áp lực quá thì hôm nay nghỉ ngơi, mình không ép học đâu. Khi nào sẵn sàng thì bảo mình nha.";
    } else {
      reply = "Ghi nhận tâm trạng của bạn! Hôm nay cố gắng nhé!";
    }

    await this.api.sendMessage({ msg: reply }, threadId, 0);
  }

  // Hàm cập nhật Spaced Repetition (Thuật toán SM-2)
  async updateSpacedRepetition(userId, cardId, quality) {
    const progress = await FlashcardProgress.findOne({ userId, cardId });
    if (!progress) return;

    let { repetitions, easeFactor, interval } = progress;

    if (quality >= 3) {
      if (repetitions === 0) interval = 1;
      else if (repetitions === 1) interval = 6;
      else interval = Math.round(interval * easeFactor);
      repetitions += 1;
    } else {
      repetitions = 0;
      interval = 1;
    }

    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + interval);

    progress.repetitions = repetitions;
    progress.interval = interval;
    progress.easeFactor = easeFactor;
    progress.dueDate = nextDueDate;
    progress.quality = quality;
    progress.lastStudied = new Date();
    await progress.save();
  }
  async handleCommandHelp(threadId) {
    const msg = `## 📋 Danh sách Lệnh (Commands)
Bạn có thể gõ các lệnh sau (có hoặc không có dấu / đều được):
- **help** hoặc **menu**: Xem danh sách lệnh này.
- **me**: Xem thông tin tài khoản đang liên kết.
- **logout**: Đăng xuất (hủy liên kết Zalo).
- **fl**: Xem 10 bộ từ vựng mới nhất của bạn.
- **fl [stt] [trang]**: Xem danh sách từ vựng trong bộ có số thứ tự [stt]. Mỗi trang hiển thị tối đa 10 từ. VD: *fl 1 2* (xem trang 2 của bộ thứ 1).
- **new [stt] [từ vựng]**: Thêm từ vựng mới vào bộ số [stt]. VD: *new 1 accuracy* (thêm từ accuracy vào bộ thứ 1).
- **tts [từ vựng]**: Đọc phát âm của từ vựng. VD: *tts apple* (đọc phát âm từ apple).`;
    await this.sendAIMessage(threadId, msg);
  }

  async handleCommandTts(user, threadId, content) {
    const textLower = content.toLowerCase();
    const prefix = textLower.startsWith("/tts ") ? "/tts " : "tts ";
    const term = content.slice(prefix.length).trim();

    if (!term) {
      return this.api.sendMessage({ msg: "Bạn chưa nhập từ vựng cần đọc. VD: tts apple" }, threadId, 0);
    }

    const session = memorySessions.get(threadId) || {};
    const langCode = session?.flashcardContext?.language || "en";

    // Lưu lại từ vựng để chờ chấm điểm Voice
    session.activePronunciationWord = term;
    memorySessions.set(threadId, session);

    await this.api.sendMessage(
      { msg: `Đang gửi phát âm mẫu cho từ "${term}"...\n🎤 Trả lời tin nhắn này bằng một tin nhắn thoại (Voice Message) để Mentor chấm điểm phát âm cho bạn nhé!` },
      threadId,
      0,
    );
    await this.sendVoiceMessage(threadId, term, langCode);
  }

  async handleCommandMe(user, threadId) {
    const msg = `## 👤 Thông tin tài khoản
- **Tên hiển thị:** ${user.displayName}
- **Email:** ${user.email}
- **Rank:** Hạng ${user.rank || 1}
- **Ngày tham gia:** ${new Date(user.createdAt).toLocaleDateString("vi-VN")}`;
    await this.sendAIMessage(threadId, msg);
  }

  async handleCommandLogout(user, threadId) {
    user.zaloId = null;
    user.botState = { action: "idle" };
    await user.save();
    memorySessions.delete(threadId);
    await this.sendAIMessage(threadId, "Đã hủy liên kết tài khoản thành công! Hẹn gặp lại bạn nhé 👋");
  }

  async handleCommandFl(user, threadId, content) {
    const args = content.trim().split(/\s+/);
    const stt = parseInt(args[1]);
    const page = parseInt(args[2]) || 1;

    const sets = await FlashcardSet.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10).lean();

    if (sets.length === 0) {
      return this.sendAIMessage(threadId, "Bạn chưa có bộ từ vựng nào trên ZenTask. Hãy tạo bộ mới trên ứng dụng nhé!");
    }

    if (!stt || isNaN(stt)) {
      let msg = `## 📚 ${sets.length} Bộ từ vựng mới nhất\n`;
      sets.forEach((s, idx) => {
        msg += `${idx + 1}. **${s.title}** (${s.cardCount} từ)\n`;
      });
      msg += `\n*Gõ **fl [stt] [trang]** để xem chi tiết. VD: fl 1 1*`;
      return this.sendAIMessage(threadId, msg);
    }

    if (stt < 1 || stt > sets.length) {
      return this.sendAIMessage(threadId, `Không tìm thấy bộ từ vựng ở vị trí số ${stt}. Vui lòng gõ **fl** để xem danh sách.`);
    }

    const targetSet = sets[stt - 1];
    const limit = 10;
    const skip = (page - 1) * limit;

    const cards = await Flashcard.find({ setId: targetSet._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const totalCards = await Flashcard.countDocuments({ setId: targetSet._id });
    const totalPages = Math.ceil(totalCards / limit) || 1;

    if (cards.length === 0) {
      return this.sendAIMessage(threadId, `Bộ **${targetSet.title}** đang trống (hoặc trang ${page} không có từ nào).`);
    }

    let msg = `## 📖 Bộ: ${targetSet.title} (Trang ${page}/${totalPages})\n`;
    cards.forEach((c) => {
      msg += `- **${c.term}**: ${c.translation}\n`;
    });
    if (page < totalPages) {
      msg += `\n*Gõ **fl ${stt} ${page + 1}** để xem trang tiếp theo.*`;
    }
    return this.sendAIMessage(threadId, msg);
  }

  async handleCommandNew(user, threadId, content) {
    const args = content.trim().split(/\s+/);
    const stt = parseInt(args[1]);
    const term = args.slice(2).join(" ");

    if (!stt || isNaN(stt) || !term) {
      return this.sendAIMessage(threadId, "Cú pháp sai. Vui lòng gõ theo mẫu: **new [stt] [từ vựng]**\nVD: new 1 accuracy");
    }

    const sets = await FlashcardSet.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10).lean();
    if (stt < 1 || stt > sets.length) {
      return this.sendAIMessage(threadId, `Không tìm thấy bộ từ vựng ở vị trí số ${stt}. Vui lòng gõ **fl** để xem danh sách.`);
    }

    const targetSet = sets[stt - 1];

    const prompt = `Người dùng muốn thêm từ vựng mới: "${term}". Ngôn ngữ bộ từ vựng: ${targetSet.language}.
Hãy trả về JSON duy nhất có định dạng:
{"term": "từ vựng (chuẩn hoá)", "translation": "nghĩa ngắn gọn", "phonetic": "phiên âm IPA nếu là tiếng Anh, hoặc romaji/pinyin", "notes": ""}
Chỉ trả về JSON, tuyệt đối không thêm bất kỳ văn bản hay markdown (như \`\`\`json) nào khác.`;

    try {
      const reply = await this.generateAIResponse([{ role: "user", content: prompt }]);
      let parsed = null;
      try {
        const cleanJson = reply
          .replace(/```[a-zA-Z]*\n/g, "")
          .replace(/```/g, "")
          .replace(/`/g, "")
          .trim();
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        return this.sendAIMessage(threadId, "Xin lỗi, AI không thể phân tích từ vựng này. Vui lòng thử từ khác.");
      }

      const newCard = await Flashcard.create({
        setId: targetSet._id,
        userId: user._id,
        term: parsed.term || term,
        translation: parsed.translation || "Không có nghĩa",
        phonetic: parsed.phonetic || "",
        notes: parsed.notes || "",
        language: targetSet.language,
      });

      await FlashcardSet.findByIdAndUpdate(targetSet._id, { $inc: { cardCount: 1 } });

      const msg = `Đã thêm từ mới vào bộ **${targetSet.title}** thành công! 🎉\n- **${newCard.term}** ${newCard.phonetic ? `*${newCard.phonetic}*` : ""}: ${newCard.translation}`;
      return this.sendAIMessage(threadId, msg);
    } catch (err) {
      return this.sendAIMessage(threadId, "Đã xảy ra lỗi khi thêm từ vựng. Vui lòng thử lại sau.");
    }
  }
}

export default ChatbotUtil;
