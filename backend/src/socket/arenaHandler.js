import { Flashcard, BotConfig } from "../models/Schemas.js";
import { Course, CourseRank, CourseTier, CourseLesson } from "../models/Course.js";
import { BUILTIN_FLASHCARD_SETS } from "../data/builtinLearning/index.js";
import User from "../models/User.js";
import { activeArenaRooms, userSockets } from "./state.js";
import LearningRoadmap from "../models/LearningRoadmap.js";

const BOT_NAMES = ["Lopy Bot", "Nova Bot", "Mika Bot", "Zen Bot", "Ivy Bot", "Pixel Bot"];
const BOT_AVATARS = ["/mascot/Lopy (1).png", "/mascot/Lopy (3).png", "/mascot/Lopy (8).png", "/mascot/Lopy (14).png"];

const getUid = (user = {}) => String(user.uid || user._id || "");
const getRankId = (user = {}) => Number(user.rankId || 1);

let botConfigsCache = {};

const refreshBotConfigs = async () => {
  try {
    const configs = await BotConfig.find().lean();
    if (configs && configs.length > 0) {
      botConfigsCache = configs.reduce((acc, c) => {
        acc[c.rankId] = c;
        return acc;
      }, {});
    }
  } catch (err) {
    console.error("[Arena] fetch bot configs failed:", err);
  }
};
setInterval(refreshBotConfigs, 60000);
setTimeout(refreshBotConfigs, 1000);

const getBotAccuracy = (seedUser = {}) => {
  const rankId = getRankId(seedUser);
  if (botConfigsCache[rankId]) {
    return botConfigsCache[rankId].correctRate / 100;
  }
  if (rankId <= 1) return 0.4;
  if (rankId === 2) return 0.5;
  if (rankId === 3) return 0.6;
  if (rankId === 4) return 0.7;
  if (rankId === 5) return 0.85;
  return 0.5;
};

const getBotDifficultyLabel = (seedUser = {}) => {
  const rankId = getRankId(seedUser);
  if (botConfigsCache[rankId]?.rankName) return `Bot ${botConfigsCache[rankId].rankName}`;
  if (rankId <= 1) return "Bot Bạc";
  if (rankId === 2) return "Bot Lục bảo";
  if (rankId === 3) return "Bot Tinh Anh";
  if (rankId === 4) return "Bot Kim Cương";
  if (rankId === 5) return "Bot Cao Thủ";
  return "Bot luyện tập";
};

const createArenaBot = (seedUser = {}, idx = 1, team = "red") => ({
  uid: `bot_${team}_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
  name: `${BOT_NAMES[(idx - 1) % BOT_NAMES.length]} ${idx}`,
  avatar: BOT_AVATARS[(idx - 1) % BOT_AVATARS.length],
  rankInfo: getBotDifficultyLabel(seedUser),
  rankId: getRankId(seedUser),
  tier: seedUser.tier || 3,
  isBot: true,
  botAccuracy: getBotAccuracy(seedUser),
  botAccuracyLabel: `${Math.round(getBotAccuracy(seedUser) * 100)}% đúng`,
  team,
});

const shuffleArray = (items = []) => [...items].sort(() => Math.random() - 0.5);
const pickItems = (items = [], count = 0) => shuffleArray(items).slice(0, Math.max(0, count));

const normalizeArenaWord = (word = {}, source = "unknown") => ({
  id: String(word.id || word._id || `${source}_${Math.random().toString(36).slice(2, 9)}`),
  term: String(word.term || word.word || word.title || "").trim(),
  phonetic: String(word.phonetic || ""),
  translation: String(word.translation || word.meaning || "").trim(),
  examples: Array.isArray(word.examples) ? word.examples : [{ en: word.example || "", vi: word.example_translation || "" }],
  notes: String(word.notes || `Nguồn: ${source}`),
  source,
});

const getBuiltinTournamentWords = () =>
  BUILTIN_FLASHCARD_SETS.flatMap((set) => (set.words || []).map((word) => normalizeArenaWord(word, set.categoryName || set.category || "builtin"))).filter((word) => word.term && word.translation);

// Hàm dựng Deck từ Roadmap của user
const buildRoadmapArenaDeck = async (uid) => {
  let validWords = [];
  try {
    const roadmap = await LearningRoadmap.findOne({ userId: uid }).lean();
    if (roadmap && roadmap.days) {
      roadmap.days.forEach(day => {
        if (day.words && Array.isArray(day.words)) {
          validWords.push(...day.words);
        }
      });
    }
  } catch (error) {
    console.error("[Arena] Error building roadmap deck:", error);
  }

  // Lọc trùng
  const uniqueWordsMap = new Map();
  validWords.forEach((w) => uniqueWordsMap.set(w.word || w.term, {
    term: w.word || w.term,
    meaning: w.meaning || w.translation || "",
    pos: w.pos || "",
    example: w.example || "",
    example_translation: w.example_translation || ""
  }));
  validWords = Array.from(uniqueWordsMap.values());

  // Nếu quá ít từ, lấy thêm từ generic
  if (validWords.length < 10) {
    const builtin = getBuiltinTournamentWords();
    validWords = [...validWords, ...builtin];
  }

  // Chuyển sang format Arena Word
  validWords = validWords.map(w => normalizeArenaWord(w, "roadmap"));

  const selectedCards = shuffleArray(validWords).slice(0, 10);
  const validModes = ["quiz", "fill_blank", "listening", "guess", "typing"];
  const modes = Array.from({ length: 10 }, (_, idx) => validModes[idx % validModes.length]);
  const x2Indices = pickItems(
    Array.from({ length: 10 }, (_, i) => i),
    2,
  );

  return { cards: selectedCards, modes: shuffleArray(modes), x2Indices };
};

const calculateArenaPoints = (room, timeRemaining, isCorrect) => {
  if (!isCorrect) return 0;
  const isX2 = room.matchData?.x2Indices?.includes(room.currentQuestionIndex);
  let points = 50 + Math.floor(Math.max(0, Number(timeRemaining || 0)) * 5);
  if (isX2) points *= 2;
  return points;
};

const emitArenaScore = (room, io) => {
  const teamScores = { blue: 0, red: 0 };
  room.players.forEach((player) => {
    const score = room.scores[player.uid] || 0;
    teamScores[player.team] = (teamScores[player.team] || 0) + score;
  });
  io.to(room.roomCode).emit("arena_score_update", {
    userScores: room.scores,
    userAnswered: room.answered,
    teamScores,
  });
};

const areAllArenaPlayersAnswered = (room) => room.players.every((player) => room.answered[player.uid]);

const applyArenaAnswer = (room, uid, timeRemaining, isCorrect, io) => {
  if (!room || room.answered[uid]) return;
  const points = calculateArenaPoints(room, timeRemaining, isCorrect);
  room.scores[uid] = (room.scores[uid] || 0) + points;
  room.answered[uid] = true;
  emitArenaScore(room, io);
  if (areAllArenaPlayersAnswered(room)) {
    io.to(room.roomCode).emit("arena_both_answered");
  }
};

const clearArenaBotTimers = (room) => {
  if (!room?.botTimers) return;
  room.botTimers.forEach((timer) => clearTimeout(timer));
  room.botTimers = [];
};

const scheduleArenaBots = (room, io) => {
  clearArenaBotTimers(room);
  const bots = room.players.filter((player) => player.isBot);
  bots.forEach((bot) => {
    const config = botConfigsCache[bot.rankId];
    let delay = 1800 + Math.floor(Math.random() * 7200);
    let isCorrect = Math.random() < Number(bot.botAccuracy || 0);

    if (config) {
      isCorrect = Math.random() < config.correctRate / 100;

      const randTime = Math.random() * 100;
      let cumulative = 0;
      let matchedSecond = null;

      const timeDist = config.timeDistribution || {};
      for (let sec = 1; sec <= 10; sec++) {
        const p = Number(timeDist[sec] || 0);
        cumulative += p;
        if (randTime <= cumulative) {
          matchedSecond = sec;
          break;
        }
      }

      if (matchedSecond !== null) {
        delay = (10 - matchedSecond) * 1000 + Math.random() * 900;
      } else if (randTime <= cumulative + Number(config.slowResponseRate || 0)) {
        delay = 9500 + Math.random() * 450;
      } else {
        delay = Math.random() * 9900;
      }
    }

    const timer = setTimeout(() => {
      if (!activeArenaRooms.has(room.roomCode)) return;
      if (room.answered[bot.uid]) return;
      const timeRemaining = Math.max(0, 10 - Math.floor(delay / 1000));
      applyArenaAnswer(room, bot.uid, timeRemaining, isCorrect, io);
    }, delay);
    room.botTimers.push(timer);
  });
};

const createArenaRoom = (players, matchData, mode = "solo", io) => {
  const roomCode = `arena_${mode}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  players.filter((player) => !player.isBot).forEach((player) => {
    const socket = player.socket;
    if (socket?.connected) {
      socket.join(roomCode);
      socket.currentArenaRoom = roomCode;
    }
  });

  const safePlayers = players.map(({ socket, ...player }) => player);
  const scores = {};
  const answered = {};
  const ready = {};
  safePlayers.forEach((player) => {
    scores[player.uid] = 0;
    answered[player.uid] = false;
    ready[player.uid] = player.isBot;
  });

  const roomState = {
    roomCode,
    mode,
    matchData,
    players: safePlayers,
    currentQuestionIndex: 0,
    scores,
    answered,
    botTimers: [],
    createdAt: Date.now(),
    hostSocketId: players[0]?.socket?.id || null,
    status: "playing",
    ready,
  };
  activeArenaRooms.set(roomCode, roomState);

  players.filter((player) => !player.isBot && player.socket?.connected).forEach((player) => {
    const socket = player.socket;
    const me = safePlayers.find((p) => p.uid === String(player.uid));
    const enemy = safePlayers.find((p) => p.team !== me?.team) || safePlayers.find(p => p.uid !== me?.uid);
    socket.emit("arena_match_found", {
      roomCode,
      arenaMode: mode,
      mode,
      p1: me,
      p2: enemy,
      players: safePlayers,
      myTeam: me?.team || "blue",
      matchData,
    });
  });

  console.log(`[Arena] created roadmap bot room ${roomCode}`);
  return roomState;
};

const clearArenaRoomSocketState = (targetRoomCode, exceptSocketId = null, io) => {
  const room = activeArenaRooms.get(targetRoomCode);
  if (!room) return;
  room.players
    .filter((player) => !player.isBot)
    .forEach((player) => {
      const sockId = userSockets.get(String(player.uid));
      const playerSocket = sockId ? io.sockets.sockets.get(sockId) : null;
      if (!playerSocket) return;
      playerSocket.leave(targetRoomCode);
      playerSocket.currentArenaRoom = null;
    });
};

export const leaveArenaRoom = (socket, roomCode, reason = "leave", io) => {
  const targetRoomCode = roomCode || socket.currentArenaRoom;
  if (!targetRoomCode) return;

  const room = activeArenaRooms.get(targetRoomCode);
  socket.leave(targetRoomCode);
  socket.currentArenaRoom = null;

  if (room) {
    clearArenaBotTimers(room);
    socket.to(targetRoomCode).emit("arena_opponent_left", { reason, mode: room.mode });
    clearArenaRoomSocketState(targetRoomCode, socket.id, io);
    activeArenaRooms.delete(targetRoomCode);
    console.log(`Socket ${socket.id} left arena room ${targetRoomCode} (${reason})`);
  }
};

export function registerArenaHandlers(io, socket) {
  socket.on("find_arena_match", async ({ user } = {}) => {
    if (!user) return;
    const uid = getUid(user);
    if (!uid) return socket.emit("arena_matchmaking_error", { message: "Thiếu thông tin người chơi" });

    if (socket.currentArenaRoom) {
      return socket.emit("arena_matchmaking_error", { message: "Bạn đang ở trong một trận đấu khác" });
    }

    let freshProfile = null;
    try {
      freshProfile = await User.findById(uid).select("displayName photoURL rankId tier stars arenaMatchesPlayed preferences").lean();
    } catch (err) {
      console.warn("[Arena] Cannot refresh user profile:", err.message);
    }

    const entryUser = {
      ...user,
      uid,
      name: user.name || freshProfile?.displayName || "User",
      avatar: user.avatar || freshProfile?.photoURL || "",
      rankId: Number(freshProfile?.rankId || user.rankId || 1),
      tier: Number(freshProfile?.tier || user.tier || 3),
    };

    const serverDeck = await buildRoadmapArenaDeck(uid);
    const bot = createArenaBot(entryUser, 1, "red");
    
    const roomState = createArenaRoom([
      { ...entryUser, socket, team: "blue", slotIndex: 0 },
      bot
    ], serverDeck, "roadmap_bot", io);

    // Auto start
    setTimeout(() => {
      io.to(roomState.roomCode).emit("arena_start_match");
      scheduleArenaBots(roomState, io);
    }, 1000);
  });

  socket.on("cancel_arena_search", () => {
    if (socket.currentArenaRoom) {
      const roomCode = socket.currentArenaRoom;
      const room = activeArenaRooms.get(roomCode);
      if (room) {
        socket.leave(roomCode);
        socket.currentArenaRoom = null;
        clearArenaBotTimers(room);
        activeArenaRooms.delete(roomCode);
      }
    }
  });

  socket.on("arena_answer", ({ roomCode, uid, timeRemaining, isCorrect }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room) return;
    applyArenaAnswer(room, String(uid), timeRemaining, !!isCorrect, io);
  });

  socket.on("arena_next_question", ({ roomCode }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room) return;

    if (!areAllArenaPlayersAnswered(room)) return;

    room.currentQuestionIndex++;
    room.players.forEach((player) => {
      room.answered[player.uid] = false;
    });

    const totalQuestions = room.matchData?.cards?.length || 10;
    if (room.currentQuestionIndex >= totalQuestions) {
      clearArenaBotTimers(room);
      const teamScores = { blue: 0, red: 0 };
      room.players.forEach((player) => {
        teamScores[player.team] = (teamScores[player.team] || 0) + (room.scores[player.uid] || 0);
      });
      io.to(roomCode).emit("arena_end_game", {
        userScores: room.scores,
        teamScores,
        players: room.players,
        arenaMode: room.mode,
      });
      clearArenaRoomSocketState(roomCode, null, io);
      activeArenaRooms.delete(roomCode);
    } else {
      io.to(roomCode).emit("arena_next_question_sync", { index: room.currentQuestionIndex });
      scheduleArenaBots(room, io);
    }
  });

  socket.on("arena_leave", ({ roomCode } = {}) => {
    leaveArenaRoom(socket, roomCode, "leave", io);
  });
}
