import OpenAI from "openai";
import crypto from "crypto";
import User from "../src/models/User.js";
import { Flashcard, FlashcardSet, FlashcardProgress, ZaloAuth, BannedIP } from "../src/models/Schemas.js";
import dotenv from "dotenv";
dotenv.config();
import { getAudioCharacterByLanguage } from "./languages.js";
import fetch from "node-fetch";
import { parseMarkdownToZalo } from "./util.js";
import { MENTOR_PROMPT } from "./prompt.js";
import FlashcardService from "../src/services/flashcard.service.js";
import { activeGroupGames, checkWordChainValidity, botNextWord } from "../src/services/minigame.service.js";

// In-memory store for chat history to maintain context
const memorySessions = new Map();

const openai = new OpenAI({
  baseURL: process.env.BASE_URL_AI || "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_ADMIN_KEY || process.env.OPENAI_API_KEY,
});

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

  async sendVoiceMessage(threadId, text, langCode, code = 0) {
    try {
      const voice = getAudioCharacterByLanguage(langCode);
      const pythonApi = process.env.API_PYTHON;
      const audioUrl = `${pythonApi}/edge-tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`;

      await this.api.sendVoice(
        {
          voiceUrl: audioUrl,
        },
        threadId,
        code,
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

    let content = message.data.content || "";
    if (typeof content !== "string") content = "";
    content = content.trim();

    if (message.type === "event" && message.data.action) {
      content = message.data.action;
    } else if (message.type === 1) {
      // Tin nhắn trong group (text)
      if (activeGroupGames.has(threadId)) {
        const textLower = content.toLowerCase();
        const game = activeGroupGames.get(threadId);

        if (textLower === game.answer) {
          activeGroupGames.delete(threadId); // Kết thúc game
          const uid = message.data.uidFrom;
          const dName = message.data.dName;

          if (user) {
            const { addXpToUser } = await import("../src/routes/user.js");
            const { xp, level } = await addXpToUser(user._id, game.xp);
            return this.api.sendMessage(
              { msg: `🎉 CHÍNH XÁC!\n\nChúc mừng **${dName}** đã đoán đúng từ "${game.answer}" nhanh nhất!\n\n🎁 Bạn nhận được +${game.xp} XP.\n⭐ Tổng XP hiện tại: ${xp}\n👑 Level: ${level}` },
              threadId,
              1,
            );
          } else {
            // Chưa đăng nhập
            const authId = crypto.randomBytes(6).toString("hex");
            await ZaloAuth.create({ authId, zaloId: String(uid) });
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            const authLink = `${frontendUrl}/go/${authId}`;

            this.api.sendMessage(
              {
                msg: `🎉 CHÍNH XÁC!\n\nChúc mừng **${dName}** đã đoán đúng từ "${game.answer}" nhanh nhất!\n\n(ZenTask đã gửi tin nhắn riêng cho bạn để nhận thưởng ${game.xp} XP nhé!)`,
              },
              threadId,
              1,
            );

            return this.api.sendMessage(
              {
                msg: `🎉 Bạn đã chiến thắng minigame và giành được ${game.xp} XP!\n\nTuy nhiên, tài khoản Zalo của bạn chưa liên kết với ZenTask nên chưa thể cộng thưởng.\n👉 Vui lòng bấm vào link dưới đây để đăng nhập nhé:\n${authLink}\n\n(Bạn có thể gõ lệnh "login" lúc nào cũng được để tạo link đăng nhập mới)`,
              },
              String(uid),
              0,
            );
          }
        }
      }
      return; // Bỏ qua các tin nhắn text khác trong group
    } else if (message.type !== 0) {
      return; // Bỏ qua ảnh/sticker không xử lý
    }

    // --- LỆNH CHO PHÉP CẢ KHI CHƯA ĐĂNG NHẬP ---
    const textLower = content.toLowerCase();

    if (textLower === "help" || textLower === "/help" || textLower === "menu" || textLower === "/menu") {
      return this.handleCommandHelp(user, threadId);
    }

    const isTtsCommand = textLower.startsWith("tts ") || textLower.startsWith("/tts ");
    if (isTtsCommand) {
      return this.handleCommandTts(user, threadId, content);
    }

    if (textLower === "login" || textLower === "/login") {
      if (user) {
        return this.api.sendMessage({ msg: "Bạn đã đăng nhập rồi nhé! Để đăng xuất, dùng lệnh /logout." }, threadId, 0);
      }
      return this.handleUnlinkedUser(threadId, content, true); // force=true
    }

    if (!user) {
      return this.handleUnlinkedUser(threadId, content);
    }

    // --- XỬ LÝ LỆNH (COMMANDS CHO USER ĐÃ ĐĂNG NHẬP) ---
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

    const isSaveCommand = textLower.startsWith("save ") || textLower.startsWith("/save ");
    if (isSaveCommand) {
      return this.handleCommandSave(user, threadId, content);
    }

    const isRemindCommand = textLower.startsWith("remind ") || textLower.startsWith("/remind");
    if (isRemindCommand) {
      return this.handleCommandRemind(user, threadId, content);
    }

    if (textLower === "chat" || textLower === "/chat") {
      return this.handleCommandChat(user, threadId);
    }

    if (textLower === "game-word-chain" || textLower === "/game-word-chain") {
      const starterWords = ["apple", "hello", "world", "water", "music", "smile", "happy", "house", "train", "plant", "brain", "cloud"];
      const startWord = starterWords[Math.floor(Math.random() * starterWords.length)];
      user.botState = {
        ...user.botState,
        action: "word_chain_playing",
        lastWord: startWord,
        wordCount: 0,
        usedWords: [startWord],
      };
      user.markModified("botState");
      await user.save();
      return this.api.sendMessage(
        {
          msg: `Ván nối từ bắt đầu! Từ đầu tiên của Lopy là: **${startWord}**\n👉 Tới lượt bạn (từ tiếp theo phải bắt đầu bằng chữ '${startWord.slice(-1)}')\n(Bạn cần nối đúng 5 từ liên tiếp để chiến thắng!)`,
        },
        threadId,
        0,
      );
    }

    if (textLower === "game-scrambled" || textLower === "/game-scrambled") {
      const { triggerMinigame } = await import("../src/services/minigame.service.js");
      await triggerMinigame(this.api, threadId, "scrambled");
      return;
    }

    if (textLower === "game-emoji" || textLower === "/game-emoji") {
      const { triggerMinigame } = await import("../src/services/minigame.service.js");
      await triggerMinigame(this.api, threadId, "emoji");
      return;
    }

    if (textLower === "game-listening" || textLower === "/game-listening") {
      const { triggerMinigame } = await import("../src/services/minigame.service.js");
      await triggerMinigame(this.api, threadId, "listening");
      return;
    }

    const isBanIpCommand = textLower.startsWith("ban-ip ") || textLower.startsWith("/ban-ip ");
    if (isBanIpCommand) {
      if (user.role === "admin" || process.env.NODE_ENV === "development") {
        const prefix = textLower.startsWith("/ban-ip ") ? "/ban-ip " : "ban-ip ";
        const ip = content.slice(prefix.length).trim();
        if (!ip) return this.api.sendMessage({ msg: "Vui lòng nhập IP cần ban. VD: /ban-ip 123.45.67.89" }, threadId, 0);
        try {
          const existing = await BannedIP.findOne({ ip });
          if (existing) return this.api.sendMessage({ msg: `IP ${ip} đã bị ban trước đó.` }, threadId, 0);
          await BannedIP.create({ ip, reason: "Banned qua Zalo Bot", isHoneypot: false });
          return this.api.sendMessage({ msg: `✅ Đã ban IP: ${ip} thành công.` }, threadId, 0);
        } catch (e) {
          return this.api.sendMessage({ msg: `❌ Lỗi khi ban IP: ${e.message}` }, threadId, 0);
        }
      } else {
        return this.api.sendMessage({ msg: "❌ Bạn không có quyền thực hiện lệnh này." }, threadId, 0);
      }
    }

    if (user?.role === "admin" || process.env.NODE_ENV === "development") {
      if (textLower === "test-flash-drop" || textLower === "/test-flash-drop") {
        const { triggerFlashDrop } = await import("./chatbotJobs.js");
        await triggerFlashDrop(this.api);
        return this.api.sendMessage({ msg: "✅ Đã test kích hoạt Flash Drop thành công." }, threadId, 0);
      }

      const groupThreadId = process.env.QUIZ_GROUP_THREAD_ID;

      if (textLower === "test-quiz" || textLower === "/test-quiz") {
        const { activeGroupGames } = await import("../src/services/minigame.service.js");
        if (activeGroupGames.has(groupThreadId)) {
          return this.api.sendMessage({ msg: "⚠️ Đang có một minigame diễn ra trong nhóm, không thể tạo thêm quiz!" }, threadId, 0);
        }
        const { sendQuiz } = await import("./chatbotJobs.js");
        await sendQuiz(this.api, groupThreadId);
        return this.api.sendMessage({ msg: "✅ Đã gửi đố vui (Quiz) ra nhóm." }, threadId, 0);
      }

      if (textLower === "test-create-quiz" || textLower === "/test-create-quiz") {
        const { generateDailyQuizzes } = await import("./chatbotJobs.js");
        await this.api.sendMessage({ msg: "Đang yêu cầu AI tạo 10 câu quiz mới, vui lòng đợi vài giây..." }, threadId, 0);
        await generateDailyQuizzes();
        return this.api.sendMessage({ msg: "✅ Đã tạo xong quiz! Gõ 'test-quiz' để chạy thử ngay." }, threadId, 0);
      }
      if (textLower === "test-scrambled" || textLower === "/test-scrambled") {
        const { triggerMinigame } = await import("../src/services/minigame.service.js");
        await triggerMinigame(this.api, groupThreadId, "scrambled");
        return this.api.sendMessage({ msg: "✅ Đã gửi game Đảo chữ ra nhóm." }, threadId, 0);
      }

      if (textLower === "test-emoji" || textLower === "/test-emoji") {
        const { triggerMinigame } = await import("../src/services/minigame.service.js");
        await triggerMinigame(this.api, groupThreadId, "emoji");
        return this.api.sendMessage({ msg: "✅ Đã gửi game Đuổi hình bắt chữ ra nhóm." }, threadId, 0);
      }

      if (textLower === "test-listening" || textLower === "/test-listening") {
        const { triggerMinigame } = await import("../src/services/minigame.service.js");
        await triggerMinigame(this.api, groupThreadId, "listening");
        return this.api.sendMessage({ msg: "✅ Đã gửi game Nghe & Chép chính tả ra nhóm." }, threadId, 0);
      }

      if (textLower === "test-game-finish" || textLower === "/test-game-finish") {
        const { activeGroupGames } = await import("../src/services/minigame.service.js");
        const game = activeGroupGames.get(groupThreadId);
        if (!game) return this.api.sendMessage({ msg: "❌ Không có minigame nào đang diễn ra trong nhóm." }, threadId, 0);

        activeGroupGames.delete(groupThreadId);
        const { addXpToUser } = await import("../src/routes/user.js");
        const { xp, level } = await addXpToUser(user._id, game.xp);

        this.api.sendMessage(
          {
            msg: `🎉 CHÍNH XÁC!\n\nAdmin **${user.displayName}** đã dùng quyền lực để cưỡng chế giải đúng từ "${game.answer}"!\n\n(ZenTask đã gửi tin nhắn riêng cho bạn để nhận thưởng ${game.xp} XP nhé!)`,
          },
          groupThreadId,
          1,
        );
        return this.api.sendMessage({ msg: `✅ Đã trao giải game cho bạn! Bạn nhận được +${game.xp} XP. (Tổng: ${xp} - Lv.${level})` }, threadId, 0);
      }

      if (textLower === "test-game-end" || textLower === "/test-game-end") {
        const { activeGroupGames } = await import("../src/services/minigame.service.js");
        const game = activeGroupGames.get(groupThreadId);
        if (!game) return this.api.sendMessage({ msg: "❌ Không có minigame nào đang diễn ra trong nhóm." }, threadId, 0);

        activeGroupGames.delete(groupThreadId);
        this.api.sendMessage({ msg: `🛑 Minigame đã bị admin huỷ bỏ!\n\nĐáp án chính xác là: **${game.answer}**` }, groupThreadId, 1);
        return this.api.sendMessage({ msg: "✅ Đã huỷ minigame trong nhóm." }, threadId, 0);
      }
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
    if (state.action === "word_chain_invite") {
      return this.handleWordChainInvite(user, threadId, content, state);
    }
    if (state.action === "word_chain_playing") {
      return this.handleWordChainPlaying(user, threadId, content, state);
    }

    // Luồng mặc định: Trò chuyện tự do với AI
    return this.handleAIChat(user, threadId, content, session);
  }

  async handleUnlinkedUser(threadId, content, force = false) {
    const session = memorySessions.get(threadId) || {};

    // Check if we already sent a link recently to prevent spam
    if (!force && session.authLinkSentAt && new Date() - session.authLinkSentAt < 60000) {
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

  async handleWordChainInvite(user, threadId, content, state) {
    const textLower = content.toLowerCase();
    if (textLower === "ok" || textLower === "chơi") {
      // Bắt đầu chơi, bot đi trước
      const starterWords = ["apple", "hello", "world", "water", "music", "smile", "happy", "house", "train", "plant", "brain", "cloud"];
      const startWord = starterWords[Math.floor(Math.random() * starterWords.length)];
      user.botState = {
        ...user.botState,
        action: "word_chain_playing",
        lastWord: startWord,
        wordCount: 0,
        usedWords: [startWord],
      };
      user.markModified("botState");
      await user.save();

      return this.api.sendMessage({ msg: `Ván nối từ bắt đầu! Từ đầu tiên của Lopy là: **${startWord}**\n👉 Tới lượt bạn (từ tiếp theo phải bắt đầu bằng chữ '${startWord.slice(-1)}')` }, threadId, 0);
    } else if (textLower === "huy" || textLower === "huỷ" || textLower === "không" || textLower === "no") {
      user.botState = { action: null };
      user.markModified("botState");
      await user.save();
      return this.api.sendMessage({ msg: "Đã huỷ minigame Word Chain. Khi nào muốn chơi bạn nhớ kêu Lopy nha!" }, threadId, 0);
    } else {
      return this.api.sendMessage({ msg: "Bạn có muốn chơi Word Chain không? Trả lời 'ok' để chơi hoặc 'huy' để từ chối nhé." }, threadId, 0);
    }
  }

  async handleWordChainPlaying(user, threadId, content, state) {
    const textLower = content.toLowerCase().trim();
    if (textLower === "huy" || textLower === "huỷ" || textLower === "exit" || textLower === "quit") {
      user.botState = { action: null };
      user.markModified("botState");
      await user.save();
      return this.api.sendMessage({ msg: "Đã dừng game. Hẹn gặp lại bạn sau!" }, threadId, 0);
    }

    // Kiểm tra hợp lệ (đầu vào từ user)
    const usedWords = new Set(state.usedWords || []);
    const validation = await checkWordChainValidity(state.lastWord, textLower, usedWords);
    if (!validation.valid) {
      // KHÔNG end game, cho phép user đoán lại
      return this.api.sendMessage(
        {
          msg: `❌ Rất tiếc, bạn đã nối sai từ!\nLý do: ${validation.reason}\n\n👉 Hãy suy nghĩ và đoán lại một từ khác bắt đầu bằng chữ '${state.lastWord.slice(-1)}' nhé!\n(Gõ "exit" nếu bạn muốn dừng chơi)`,
        },
        threadId,
        0,
      );
    }

    // Hợp lệ, tăng count
    usedWords.add(textLower);
    const wordCount = (state.wordCount || 0) + 1;

    let rewardMsg = "";
    // Thưởng XP mỗi 5 từ liên tiếp, game vẫn tiếp tục
    if (wordCount % 5 === 0) {
      const { addXpToUser } = await import("../src/routes/user.js");
      const { xp, level } = await addXpToUser(user._id, 10);
      rewardMsg = `🎉 Tự hào quá! Bạn đã nối thành công ${wordCount} từ!\n🎁 Thưởng nóng +10 XP (Tổng: ${xp} XP - Lv.${level})\n\n`;
    }

    // Bot suy nghĩ từ tiếp theo
    const lastChar = textLower.slice(-1);
    const botWord = await botNextWord(lastChar, usedWords);

    if (!botWord) {
      user.botState = { action: null };
      user.markModified("botState");
      await user.save();
      const { addXpToUser } = await import("../src/routes/user.js");
      const { xp, level } = await addXpToUser(user._id, 15);
      return this.api.sendMessage(
        { msg: `🎉 CHÚC MỪNG!\n\nLopy bí rồi, không tìm được từ nào tiếp theo! Bạn đã chiến thắng xuất sắc!\n🎁 Lopy tặng bạn +15 XP.\n⭐ Tổng XP hiện tại: ${xp}\n👑 Level: ${level}` },
        threadId,
        0,
      );
    }

    usedWords.add(botWord);
    user.botState = {
      ...user.botState,
      lastWord: botWord,
      wordCount: wordCount,
      usedWords: Array.from(usedWords),
    };
    user.markModified("botState");
    await user.save();

    const turnMsg = `✅ Hợp lệ (${wordCount} từ)\n\nTừ tiếp theo của Lopy là: **${botWord}**\n👉 Lượt bạn (bắt đầu bằng chữ '${botWord.slice(-1)}')`;
    return this.api.sendMessage({ msg: rewardMsg + turnMsg }, threadId, 0);
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
      if (user.botState?.action !== "chatting_english") {
        currentHistory[0] = {
          ...currentHistory[0],
          content: MENTOR_PROMPT + contextStr,
        };
      }

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
  async handleCommandHelp(user, threadId) {
    let msg = `🌟 **DANH SÁCH LỆNH CỦA LOPY** 🌟\n\nBạn có thể gõ các lệnh sau (có dấu / hoặc không):\n\n`;

    msg += `🚀 **Cơ bản**:\n`;
    msg += `🔸 **help** / **menu**: Xem menu lệnh.\n`;
    msg += `🔸 **tts [từ]**: Đọc phát âm từ vựng (VD: tts apple).\n\n`;

    if (user) {
      msg += `👤 **Tài khoản của bạn**:\n`;
      msg += `🔸 **me**: Xem thông tin tài khoản.\n`;
      msg += `🔸 **logout**: Hủy liên kết Zalo.\n\n`;

      msg += `🎮 **Giải trí & Học tập**:\n`;
      msg += `🔸 **game-word-chain**: Bắt đầu minigame nối từ Tiếng Anh.\n`;
      msg += `🔸 **game-scrambled**: Bắt đầu minigame Đảo Chữ.\n`;
      msg += `🔸 **game-emoji**: Bắt đầu minigame Đuổi hình bắt chữ (Emoji).\n`;
      msg += `🔸 **game-listening**: Bắt đầu minigame Nghe & chép chính tả.\n\n`;

      msg += `📚 **Flashcards (Từ vựng)**:\n`;
      msg += `🔸 **fl**: Xem 10 bộ từ vựng mới nhất.\n`;
      msg += `🔸 **fl [stt] [trang]**: Xem chi tiết 1 bộ (VD: fl 1 2).\n`;
      msg += `🔸 **new [stt] [từ]**: Thêm từ mới vào bộ (VD: new 1 accuracy).\n`;
    } else {
      msg += `🔑 **Tài khoản**:\n`;
      msg += `🔸 **login**: Đăng nhập & liên kết với ZenTask.\n`;
    }

    if (user?.role === "admin" || process.env.NODE_ENV === "development") {
      msg += `\n\n**🛠️ Lệnh Admin/Dev:**\n`;
      msg += `- **ban-ip [ip]**: Cấm địa chỉ IP truy cập hệ thống.\n`;
      msg += `- **test-flash-drop**: Test gọi chức năng rải lì xì.\n`;
      msg += `- **test-create-quiz**: Yêu cầu AI tạo 10 câu trắc nghiệm.\n`;
      msg += `- **test-quiz**: Gửi đố vui ra nhóm ngay lập tức.\n`;
      msg += `- **test-scrambled**: Gửi game Đảo chữ ra nhóm ngay.\n`;
      msg += `- **test-emoji**: Gửi game Đuổi hình bắt chữ ra nhóm ngay.\n`;
      msg += `- **test-listening**: Gửi game Nghe chính tả ra nhóm ngay.\n`;
      msg += `- **test-game-finish**: Trao giải minigame ngay lập tức cho Admin.\n`;
      msg += `- **test-game-end**: Huỷ bỏ minigame đang diễn ra trong nhóm.`;
    }

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

    try {
      const result = await FlashcardService.generateAiFlashcards(user._id, {
        term: term,
        setId: targetSet._id,
      });

      if (result && result.ok) {
        const msg = `Đã thêm từ mới vào bộ **${targetSet.title}** thành công! 🎉\n- **${result.term}** ${result.phonetic ? `*${result.phonetic}*` : ""}: ${result.translation}`;
        return this.sendAIMessage(threadId, msg);
      } else {
        return this.sendAIMessage(threadId, "Xin lỗi, không thể tạo flashcard cho từ vựng này. Vui lòng thử từ khác.");
      }
    } catch (err) {
      return this.sendAIMessage(threadId, err.message || "Đã xảy ra lỗi khi thêm từ vựng. Vui lòng thử lại sau.");
    }
  }

  async handleCommandSave(user, threadId, content) {
    const args = content.trim().split(/\s+/);
    if (args.length < 2) {
      return this.sendAIMessage(threadId, "Cú pháp sai. Vui lòng gõ theo mẫu: **save [từ vựng]**\nVD: save accuracy");
    }

    // Gộp tất cả các chữ phía sau thành term
    const term = args.slice(1).join(" ");

    // Lấy bộ flashcard mới nhất của người dùng làm mặc định
    const sets = await FlashcardSet.find({ userId: user._id }).sort({ createdAt: -1 }).limit(1).lean();
    if (sets.length === 0) {
      return this.sendAIMessage(threadId, "Bạn chưa có bộ từ vựng nào trên ZenTask để lưu. Hãy tạo bộ mới trên ứng dụng nhé!");
    }

    const targetSet = sets[0];

    try {
      const result = await FlashcardService.generateAiFlashcards(user._id, {
        term: term,
        setId: targetSet._id,
      });

      if (result && result.ok) {
        const msg = `Đã lưu từ **${term}** vào bộ **${targetSet.title}** thành công! 🎉`;
        return this.sendAIMessage(threadId, msg);
      } else {
        return this.sendAIMessage(threadId, "Xin lỗi, không thể tạo flashcard cho từ vựng này. Vui lòng thử từ khác.");
      }
    } catch (err) {
      return this.sendAIMessage(threadId, err.message || "Đã xảy ra lỗi khi thêm từ vựng. Vui lòng thử lại sau.");
    }
  }

  async handleCommandRemind(user, threadId, content) {
    const args = content.trim().split(/\s+/);
    if (args.length < 2) {
      return this.sendAIMessage(threadId, "Cú pháp sai. Vui lòng gõ theo mẫu: **remind HH:MM**\nVD: remind 21:30");
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const timeStr = args[1];

    if (!timeRegex.test(timeStr)) {
      return this.sendAIMessage(threadId, "Định dạng giờ không hợp lệ. Hãy gõ HH:MM (VD: 08:30 hoặc 21:00).");
    }

    user.preferredStudyTime = timeStr;
    await user.save();

    return this.sendAIMessage(threadId, `✅ Đã lưu giờ học cá nhân của bạn là **${timeStr}**. Mentor sẽ nhắc bạn vào giờ này mỗi ngày nhé!`);
  }

  async handleCommandChat(user, threadId) {
    if (user.botState?.action === "chatting_english") {
      user.botState = { action: "idle" };
      await user.save();
      // Reset memory to standard prompt
      memorySessions.set(threadId, {
        history: [{ role: "system", content: MENTOR_PROMPT }],
        lastActive: new Date(),
      });
      return this.sendAIMessage(threadId, "Đã thoát chế độ Mock Interview. Trở lại làm Mentor tiếng Việt nhé! 👋");
    } else {
      user.botState = { action: "chatting_english" };
      await user.save();
      const mockPrompt = `You are a friendly American native speaker chatting with an English learner (B1-B2 level). 
Talk entirely in English. If they make grammar mistakes, gently correct them, but keep the conversation flowing naturally. Keep responses short and conversational, like in a chat app.`;

      memorySessions.set(threadId, {
        history: [{ role: "system", content: mockPrompt }],
        lastActive: new Date(),
      });
      return this.sendAIMessage(threadId, "Hey there! I'm in Native Speaker mode now. 🇺🇸 Let's practice English together! What did you do today?");
    }
  }
}

export default ChatbotUtil;
