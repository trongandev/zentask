import crypto from "crypto";
if (!global.crypto) {
  global.crypto = crypto.webcrypto || crypto;
}

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import rankRoutes from "./routes/rank.js";
import flashcardRoutes from "./routes/flashcard.js";
import userRoutes from "./routes/user.js";
import configRoutes from "./routes/config.js";
import dotenv from "dotenv";
import compression from "compression";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import { QuizRoom, ArenaTournamentRoom, Flashcard } from "./models/Schemas.js";
import { BUILTIN_FLASHCARD_SETS } from "./data/builtinLearning/index.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

// Store mapping of uid to socket id
const userSockets = new Map();

// Map to track participants in each room. Key: roomCode, Value: Array of user objects
const activeQuizRooms = new Map();

// Arena Matchmaking
const arenaQueue = []; // array of { socket, user, matchData, mode, queuedAt, timer }
const activeArenaRooms = new Map(); // roomCode -> roomState
const tournamentLobbies = new Map(); // tournamentCode -> Map(uid -> { socket, user })

const BOT_NAMES = ["Lopy Bot", "Nova Bot", "Mika Bot", "Zen Bot", "Ivy Bot", "Pixel Bot"];
const BOT_AVATARS = [
  "/mascot/Lopy (1).png",
  "/mascot/Lopy (3).png",
  "/mascot/Lopy (8).png",
  "/mascot/Lopy (14).png",
];

const getUid = (user = {}) => String(user.uid || user._id || "");
const getRankId = (user = {}) => Number(user.rankId || 1);

const STARTER_EASY_BOT_MATCHES = 5;
const BOT_MATCH_DELAY_MS = 15000;
const ARENA_QUEUE_STALE_MS = 12000;
const ARENA_PRESENCE_INTERVAL_HINT_MS = 3000;

const BOT_ACCURACY_BY_RANK = {
  1: 0.35, // Bạc: dễ thắng nhưng vẫn có nhịp thi đấu
  2: 0.50, // Lục bảo: cân bằng hơn
  3: 0.65, // Tinh Anh: tạo áp lực thật
};

const isBotEligible = (user = {}) => getRankId(user) <= 3;
const getBotAccuracy = (seedUser = {}) => {
  const matchesPlayed = Number(seedUser.arenaMatchesPlayed || 0);

  // Mục tiêu onboarding: 5 trận đầu bot rất dễ để người mới thắng và muốn chơi tiếp.
  if (matchesPlayed < STARTER_EASY_BOT_MATCHES) return 0.05;

  const rankId = getRankId(seedUser);
  return BOT_ACCURACY_BY_RANK[rankId] ?? 0;
};

const getBotDifficultyLabel = (seedUser = {}) => {
  const matchesPlayed = Number(seedUser.arenaMatchesPlayed || 0);
  if (matchesPlayed < STARTER_EASY_BOT_MATCHES) return `Tân thủ dễ thắng ${matchesPlayed + 1}/${STARTER_EASY_BOT_MATCHES}`;
  const rankId = getRankId(seedUser);
  if (rankId <= 1) return "Bot Bạc";
  if (rankId === 2) return "Bot Lục bảo";
  if (rankId === 3) return "Bot Tinh Anh";
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
  starterEasyMatch: Number(seedUser.arenaMatchesPlayed || 0) < STARTER_EASY_BOT_MATCHES,
  team,
});

const touchArenaSocket = (socket) => {
  if (socket) socket.arenaLastActive = Date.now();
};

const isArenaSocketRecentlyActive = (socket) => {
  if (!socket?.connected) return false;
  const lastActive = Number(socket.arenaLastActive || 0);
  return lastActive > 0 && Date.now() - lastActive <= ARENA_QUEUE_STALE_MS;
};

const isUidInActiveArenaRoom = (uid) => {
  const safeUid = String(uid || "");
  if (!safeUid) return false;
  for (const room of activeArenaRooms.values()) {
    if ((room.players || []).some((player) => String(player.uid) === safeUid && !player.isBot)) return true;
  }
  return false;
};

const clearQueueEntryTimer = (entry) => {
  if (entry?.timer) clearTimeout(entry.timer);
  if (entry) entry.timer = null;
};


const shuffleArray = (items = []) => [...items].sort(() => Math.random() - 0.5);
const pickItems = (items = [], count = 0) => shuffleArray(items).slice(0, Math.max(0, count));

const normalizeArenaWord = (word = {}, source = "unknown") => ({
  id: String(word.id || word._id || `${source}_${Math.random().toString(36).slice(2, 9)}`),
  term: String(word.term || word.title || "").trim(),
  phonetic: String(word.phonetic || ""),
  translation: String(word.translation || word.meaning || "").trim(),
  examples: Array.isArray(word.examples) ? word.examples : [],
  notes: String(word.notes || `Nguồn: ${source}`),
  source,
});

const getBuiltinTournamentWords = () => BUILTIN_FLASHCARD_SETS
  .flatMap((set) => (set.words || []).map((word) => normalizeArenaWord(word, set.categoryName || set.category || "builtin")))
  .filter((word) => word.term && word.translation);

const getUserTournamentWords = async (uid, fallback = []) => {
  if (!uid) return [];
  const docs = await Flashcard.find({ userId: uid }).limit(400).lean();
  const words = docs.map((word) => normalizeArenaWord(word, "user_flashcard")).filter((word) => word.term && word.translation);
  return words.length ? words : fallback;
};

const buildTournamentMatchData = async (playerAUid, playerBUid) => {
  const builtinWords = getBuiltinTournamentWords();
  const fallbackBuiltin = builtinWords;
  const userAWords = await getUserTournamentWords(playerAUid, builtinWords);
  const userBWords = await getUserTournamentWords(playerBUid, builtinWords);

  // 12 câu để chia đúng 50% / 25% / 25%: 6 câu có sẵn, 3 câu người A, 3 câu người B.
  const selectedCards = shuffleArray([
    ...pickItems(builtinWords, 6),
    ...pickItems(userAWords, 3),
    ...pickItems(userBWords, 3),
  ]).slice(0, 12);

  const safeCards = selectedCards.length >= 6 ? selectedCards : pickItems([...selectedCards, ...fallbackBuiltin], 12);
  const validModes = ["quiz", "fill_blank", "listening", "guess", "typing"];
  const modes = Array.from({ length: safeCards.length }, (_, idx) => validModes[idx % validModes.length]);
  const x2Indices = pickItems(Array.from({ length: safeCards.length }, (_, i) => i), Math.min(2, safeCards.length));

  return {
    cards: shuffleArray(safeCards),
    modes: shuffleArray(modes),
    x2Indices,
    sourceMix: {
      builtinPercent: 50,
      playerAPercent: 25,
      playerBPercent: 25,
      builtinCount: 6,
      playerACount: 3,
      playerBCount: 3,
    },
  };
};

const emitTournamentLobbyUpdate = async (code) => {
  const lobby = tournamentLobbies.get(code);
  const room = await ArenaTournamentRoom.findOne({ code }).lean();
  if (!room || !lobby) return;
  const participants = [...lobby.values()].map((entry) => ({
    uid: getUid(entry.user),
    displayName: entry.user.displayName || entry.user.name || "Học viên",
    name: entry.user.name || entry.user.displayName || "Học viên",
    photoURL: entry.user.photoURL || entry.user.avatar || "",
    avatar: entry.user.avatar || entry.user.photoURL || "",
  }));
  lobby.forEach((entry) => {
    if (entry.socket?.connected) {
      entry.socket.emit("arena_tournament_lobby_update", {
        code,
        room: { id: room._id, ...room },
        participants,
        canStart: participants.length >= 2,
        minPlayers: 2,
      });
    }
  });
};

const removeSocketFromTournamentLobbies = (socket) => {
  for (const [code, lobby] of tournamentLobbies.entries()) {
    let changed = false;
    for (const [uid, entry] of lobby.entries()) {
      if (entry.socket.id === socket.id) {
        lobby.delete(uid);
        changed = true;
      }
    }
    if (lobby.size === 0) tournamentLobbies.delete(code);
    else if (changed) emitTournamentLobbyUpdate(code).catch((err) => console.warn("[Arena] lobby update failed:", err.message));
  }
};

const removeArenaEntries = (predicate, reason = "cleanup") => {
  let removedCount = 0;
  for (let i = arenaQueue.length - 1; i >= 0; i--) {
    const entry = arenaQueue[i];
    if (predicate(entry)) {
      clearQueueEntryTimer(entry);
      arenaQueue.splice(i, 1);
      entry.socket.currentArenaQueued = false;
      entry.socket.currentArenaQueueToken = null;
      removedCount++;
      console.log(`[Arena] removed queue entry (${reason}): ${entry.user?.name || entry.user?.uid || entry.socket.id}`);
    }
  }
  return removedCount;
};

const removeArenaSocketFromQueue = (socket) => {
  if (!socket) return false;
  const removedCount = removeArenaEntries((item) => item.socket.id === socket.id, "socket");
  return removedCount > 0;
};

const removeArenaUidFromQueue = (uid) => {
  const safeUid = String(uid || "");
  if (!safeUid) return 0;
  return removeArenaEntries((item) => getUid(item.user) === safeUid, "uid");
};

const isQueueEntryAlive = (entry) => {
  if (!entry?.socket?.connected) return false;
  if (entry.matched) return false;
  if (entry.socket.currentArenaRoom) return false;
  if (!isArenaSocketRecentlyActive(entry.socket)) return false;
  return true;
};

const cleanupArenaQueue = () => {
  removeArenaEntries((entry) => !isQueueEntryAlive(entry), "stale");
};

const getLiveArenaQueue = (mode) => {
  cleanupArenaQueue();
  return arenaQueue.filter((entry) => entry.mode === mode && isQueueEntryAlive(entry));
};

const dequeueArenaEntry = (entry, reason = "matched") => {
  const idx = arenaQueue.findIndex((item) => item.queueToken === entry.queueToken);
  if (idx === -1) return null;
  const [removed] = arenaQueue.splice(idx, 1);
  clearQueueEntryTimer(removed);
  removed.socket.currentArenaQueued = false;
  removed.socket.currentArenaQueueToken = null;
  removed.matched = true;
  console.log(`[Arena] dequeued ${removed.user?.name || removed.user?.uid || removed.socket.id} (${reason})`);
  return removed;
};

const enqueueArenaEntry = (entry) => {
  removeArenaSocketFromQueue(entry.socket);
  entry.queueToken = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  entry.queuedAt = Date.now();
  entry.lastHumanCheckAt = Date.now();
  entry.matched = false;
  entry.socket.currentArenaQueued = true;
  entry.socket.currentArenaQueueToken = entry.queueToken;
  touchArenaSocket(entry.socket);
  arenaQueue.push(entry);
  return entry;
};

const startBotFallbackTimer = (entry, onTimeout) => {
  clearQueueEntryTimer(entry);
  if (!isBotEligible(entry.user)) {
    entry.socket.emit("arena_queue_status", {
      status: "waiting_human",
      message: "Rank hiện tại chỉ ghép người thật, hệ thống sẽ tiếp tục chờ đối thủ.",
    });
    return;
  }
  entry.timer = setTimeout(() => {
    cleanupArenaQueue();
    const liveEntry = arenaQueue.find((item) => item.queueToken === entry.queueToken && isQueueEntryAlive(item));
    if (!liveEntry) return;
    onTimeout(liveEntry);
  }, BOT_MATCH_DELAY_MS);
};


const calculateArenaPoints = (room, timeRemaining, isCorrect) => {
  if (!isCorrect) return 0;
  const isX2 = room.matchData?.x2Indices?.includes(room.currentQuestionIndex);
  let points = 50 + Math.floor(Math.max(0, Number(timeRemaining || 0)) * 5);
  if (isX2) points *= 2;
  return points;
};

const emitArenaScore = (room) => {
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

const applyArenaAnswer = (room, uid, timeRemaining, isCorrect) => {
  if (!room || room.answered[uid]) return;
  const points = calculateArenaPoints(room, timeRemaining, isCorrect);
  room.scores[uid] = (room.scores[uid] || 0) + points;
  room.answered[uid] = true;
  emitArenaScore(room);
  if (areAllArenaPlayersAnswered(room)) {
    io.to(room.roomCode).emit("arena_both_answered");
  }
};

const clearArenaBotTimers = (room) => {
  if (!room?.botTimers) return;
  room.botTimers.forEach((timer) => clearTimeout(timer));
  room.botTimers = [];
};

const scheduleArenaBots = (room) => {
  clearArenaBotTimers(room);
  const bots = room.players.filter((player) => player.isBot);
  bots.forEach((bot) => {
    const delay = 1800 + Math.floor(Math.random() * 7200);
    const timer = setTimeout(() => {
      if (!activeArenaRooms.has(room.roomCode)) return;
      if (room.answered[bot.uid]) return;
      const isCorrect = Math.random() < Number(bot.botAccuracy || 0);
      const timeRemaining = Math.max(0, 10 - Math.floor(delay / 1000));
      applyArenaAnswer(room, bot.uid, timeRemaining, isCorrect);
    }, delay);
    room.botTimers.push(timer);
  });
};

const createArenaRoom = (players, matchData, mode = "solo") => {
  const humanPlayers = players.filter((player) => !player.isBot && player.socket?.connected);
  if (humanPlayers.length === 0) {
    console.warn("[Arena] ignored room creation because no connected human players are available");
    return null;
  }

  const roomCode = `arena_${mode}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const usedUids = new Set();
  const normalizedPlayers = [];

  players.forEach((player, index) => {
    const uid = String(player.uid || "");
    if (!uid || usedUids.has(uid)) return;
    usedUids.add(uid);
    normalizedPlayers.push({
      ...player,
      uid,
      team: player.team || (mode === "team2v2" ? (index % 2 === 0 ? "blue" : "red") : (index === 0 ? "blue" : "red")),
    });
  });

  normalizedPlayers
    .filter((player) => !player.isBot)
    .forEach((player) => {
      removeArenaSocketFromQueue(player.socket);
      const socket = player.socket;
      if (socket?.connected) {
        socket.join(roomCode);
        socket.currentArenaRoom = roomCode;
        socket.currentArenaQueued = false;
        socket.currentArenaQueueToken = null;
        socket.currentArenaMode = mode;
        touchArenaSocket(socket);
      }
    });

  const safePlayers = normalizedPlayers.map(({ socket, ...player }) => player);
  const scores = {};
  const answered = {};
  safePlayers.forEach((player) => {
    scores[player.uid] = 0;
    answered[player.uid] = false;
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
    hostSocketId: humanPlayers[0]?.socket?.id || null,
    p1: safePlayers[0],
    p2: safePlayers.find((p) => p.team !== safePlayers[0]?.team) || safePlayers[1],
  };
  activeArenaRooms.set(roomCode, roomState);

  normalizedPlayers
    .filter((player) => !player.isBot && player.socket?.connected)
    .forEach((player) => {
      const socket = player.socket;
      const me = safePlayers.find((p) => p.uid === String(player.uid));
      const enemy = safePlayers.find((p) => p.team !== me?.team) || roomState.p2;
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

  console.log(`[Arena] created ${mode} room ${roomCode}: ${safePlayers.map((p) => `${p.name || p.uid}${p.isBot ? "(bot)" : ""}`).join(" vs ")}`);
  scheduleArenaBots(roomState);
  return roomState;
};

const startSoloBotMatch = (entry) => {
  if (!entry || !isQueueEntryAlive(entry) || !isBotEligible(entry.user)) return false;
  const removed = dequeueArenaEntry(entry, "solo_bot");
  if (!removed) return false;
  const bot = createArenaBot(removed.user, 1, "red");
  createArenaRoom([
    { ...removed.user, socket: removed.socket, team: "blue" },
    bot,
  ], removed.matchData, "solo");
  return true;
};

const tryCreateSoloRoom = (entry) => {
  if (!entry || !isQueueEntryAlive(entry)) return false;
  const liveSoloQueue = getLiveArenaQueue("solo");
  const opponent = liveSoloQueue.find((item) => item.queueToken !== entry.queueToken && getUid(item.user) !== getUid(entry.user));
  if (!opponent) return false;

  const first = dequeueArenaEntry(opponent, "solo_human");
  const second = dequeueArenaEntry(entry, "solo_human");
  if (!first || !second) return false;

  createArenaRoom([
    { ...first.user, socket: first.socket, team: "blue" },
    { ...second.user, socket: second.socket, team: "red" },
  ], first.matchData || second.matchData, "solo");
  return true;
};

const tryCreateTeam2v2Room = (forceEntry = null) => {
  const liveTeamQueue = getLiveArenaQueue("team2v2");
  if (liveTeamQueue.length >= 4) {
    const picked = liveTeamQueue.slice(0, 4).map((entry) => dequeueArenaEntry(entry, "team2v2_human")).filter(Boolean);
    if (picked.length >= 4) {
      createArenaRoom(
        picked.map((entry, index) => ({ ...entry.user, socket: entry.socket, team: index < 2 ? "blue" : "red" })),
        picked[0].matchData,
        "team2v2",
      );
      return true;
    }
  }

  if (forceEntry && isQueueEntryAlive(forceEntry) && isBotEligible(forceEntry.user)) {
    const liveQueue = getLiveArenaQueue("team2v2");
    const pickedEntries = [];
    const forceLive = liveQueue.find((entry) => entry.queueToken === forceEntry.queueToken) || forceEntry;
    if (forceLive && isQueueEntryAlive(forceLive)) pickedEntries.push(forceLive);
    for (const entry of liveQueue) {
      if (pickedEntries.length >= 4) break;
      if (entry.queueToken !== forceLive.queueToken) pickedEntries.push(entry);
    }

    const picked = pickedEntries.slice(0, 4).map((entry) => dequeueArenaEntry(entry, "team2v2_bot_fill")).filter(Boolean);
    if (!picked.length) return false;

    const seed = picked[0];
    const players = picked.map((entry, index) => ({ ...entry.user, socket: entry.socket, team: index < 2 ? "blue" : "red" }));
    while (players.length < 4) {
      const team = players.length < 2 ? "blue" : "red";
      players.push(createArenaBot(seed.user, players.length + 1, team));
    }
    createArenaRoom(players, seed.matchData, "team2v2");
    return true;
  }

  return false;
};


const clearArenaRoomSocketState = (targetRoomCode, exceptSocketId = null) => {
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
      playerSocket.currentArenaQueued = false;
      playerSocket.currentArenaQueueToken = null;
      if (playerSocket.id !== exceptSocketId) touchArenaSocket(playerSocket);
    });
};

const leaveArenaRoom = (socket, roomCode, reason = "leave") => {
  const targetRoomCode = roomCode || socket.currentArenaRoom;
  if (!targetRoomCode) return;

  const room = activeArenaRooms.get(targetRoomCode);
  socket.leave(targetRoomCode);
  socket.currentArenaRoom = null;
  socket.currentArenaQueued = false;
  socket.currentArenaQueueToken = null;

  if (room) {
    clearArenaBotTimers(room);
    socket.to(targetRoomCode).emit("arena_opponent_left", { reason, mode: room.mode });
    clearArenaRoomSocketState(targetRoomCode, socket.id);
    activeArenaRooms.delete(targetRoomCode);
    console.log(`Socket ${socket.id} left arena room ${targetRoomCode} (${reason})`);
  }
};

io.on("connection", (socket) => {
  console.log("New socket connection:", socket.id);

  socket.on("register", (uid) => {
    if (uid) {
      userSockets.set(uid, socket.id);
      socket.currentUid = String(uid);
      console.log(`User ${uid} registered with socket ${socket.id}`);
    }
  });

  socket.on("disconnect", () => {
    for (const [uid, sockId] of userSockets.entries()) {
      if (sockId === socket.id) {
        userSockets.delete(uid);
        console.log(`User ${uid} disconnected`);
        break;
      }
    }

    // Remove user from quiz rooms if they disconnect
    if (socket.currentRoom && socket.currentUid) {
      const roomUsers = activeQuizRooms.get(socket.currentRoom) || [];
      const updatedUsers = roomUsers.filter(u => u.uid !== socket.currentUid);
      activeQuizRooms.set(socket.currentRoom, updatedUsers);
      io.to(socket.currentRoom).emit("room_participants_update", updatedUsers);
    }

    // Remove stale Arena state so disconnected/back-navigation users are not matched later
    removeArenaSocketFromQueue(socket);
    leaveArenaRoom(socket, socket.currentArenaRoom, "disconnect");
    removeSocketFromTournamentLobbies(socket);
  });

  // Quiz Room Sockets
  socket.on("join_quiz_room", ({ roomCode, user }) => {
    socket.join(roomCode);

    // Store current room and uid on socket for disconnect cleanup
    socket.currentRoom = roomCode;
    socket.currentUid = user.uid;

    if (!activeQuizRooms.has(roomCode)) {
      activeQuizRooms.set(roomCode, []);
    }
    const roomUsers = activeQuizRooms.get(roomCode);

    // Check if already in array to avoid duplicates
    if (!roomUsers.find(u => u.uid === user.uid)) {
      roomUsers.push(user);
    }

    console.log(`User ${user.name} joined room ${roomCode}`);
    io.to(roomCode).emit("room_participants_update", roomUsers);
  });

  socket.on("leave_quiz_room", ({ roomCode, uid }) => {
    socket.leave(roomCode);
    socket.currentRoom = null;
    socket.currentUid = null;

    const roomUsers = activeQuizRooms.get(roomCode) || [];
    const updatedUsers = roomUsers.filter(u => u.uid !== uid);
    activeQuizRooms.set(roomCode, updatedUsers);

    io.to(roomCode).emit("room_participants_update", updatedUsers);
  });

  socket.on("teacher_kick_student", ({ roomCode, uid }) => {
    const roomUsers = activeQuizRooms.get(roomCode) || [];
    const updatedUsers = roomUsers.filter(u => u.uid !== uid);
    activeQuizRooms.set(roomCode, updatedUsers);

    // Notify room to update list
    io.to(roomCode).emit("room_participants_update", updatedUsers);

    // Notify specific user they were kicked
    io.to(roomCode).emit("room_kicked_student", { uid });
  });

  socket.on("teacher_start_quiz", ({ roomCode, quizId }) => {
    console.log(`Teacher started quiz ${quizId} in room ${roomCode}`);
    io.to(roomCode).emit("quiz_started", quizId);
  });

  socket.on("teacher_end_quiz", async ({ roomCode }) => {
    console.log(`Teacher ended quiz room ${roomCode}`);
    io.to(roomCode).emit("room_ended");
    activeQuizRooms.delete(roomCode);

    try {
      await QuizRoom.deleteMany({ roomCode });
      console.log(`Deleted room ${roomCode} from MongoDB`);
    } catch (e) {
      console.error(`Error deleting room ${roomCode}:`, e);
    }
  });

  socket.on("student_progress", ({ roomCode, user, answeredCount, totalQuestions, correctCount }) => {
    // Forward the progress to the teacher/room
    socket.to(roomCode).emit("student_progress_update", {
      uid: user.uid,
      name: user.name,
      avatar: user.avatar,
      answeredCount,
      totalQuestions,
      correctCount
    });
  });

  socket.on("student_finished", ({ roomCode, user, score }) => {
    socket.to(roomCode).emit("student_finished_update", {
      uid: user.uid,
      name: user.name,
      score
    });
  });

  // =====================
  // ARENA SOCKETS
  // =====================
  socket.on("arena_presence", ({ state, roomCode, mode } = {}) => {
    touchArenaSocket(socket);
    socket.currentArenaClientState = state || socket.currentArenaClientState || "active";
    if (roomCode && socket.currentArenaRoom === roomCode) socket.currentArenaMode = mode || socket.currentArenaMode;
  });

  socket.on("find_arena_match", async ({ user, matchData, mode, matchMode } = {}) => {
    if (!user || !matchData) return;
    touchArenaSocket(socket);
    cleanupArenaQueue();

    const uid = getUid(user);
    if (!uid) return socket.emit("arena_matchmaking_error", { message: "Thiếu thông tin người chơi" });

    if (socket.currentArenaRoom || isUidInActiveArenaRoom(uid)) {
      return socket.emit("arena_matchmaking_error", { message: "Bạn đang ở trong một trận đấu khác" });
    }

    // Một người chỉ được có một request ghép trận. Nếu mở lại trang/tab mới, xóa request cũ để tránh người ảo.
    removeArenaUidFromQueue(uid);

    let freshProfile = null;
    try {
      freshProfile = await User.findById(uid).select("displayName photoURL rankId tier stars arenaMatchesPlayed").lean();
    } catch (err) {
      console.warn("[Arena] Cannot refresh user profile for bot difficulty:", err.message);
    }

    const arenaMode = mode || matchMode || "solo";
    const entryUser = {
      ...user,
      uid,
      name: user.name || freshProfile?.displayName || "User",
      avatar: user.avatar || freshProfile?.photoURL || "",
      rankId: Number(freshProfile?.rankId || user.rankId || 1),
      tier: Number(freshProfile?.tier || user.tier || 3),
      stars: Number(freshProfile?.stars || user.stars || 0),
      arenaMatchesPlayed: Number(freshProfile?.arenaMatchesPlayed || user.arenaMatchesPlayed || 0),
    };

    const entry = enqueueArenaEntry({
      socket,
      user: entryUser,
      matchData,
      mode: arenaMode,
      timer: null,
    });

    socket.emit("arena_queue_status", {
      status: "queued",
      mode: arenaMode,
      botEligible: isBotEligible(entryUser),
      botAfterMs: isBotEligible(entryUser) ? BOT_MATCH_DELAY_MS : null,
      presencePingMs: ARENA_PRESENCE_INTERVAL_HINT_MS,
    });

    if (arenaMode === "team2v2") {
      const createdNow = tryCreateTeam2v2Room(entry);
      if (!createdNow) {
        startBotFallbackTimer(entry, (liveEntry) => tryCreateTeam2v2Room(liveEntry));
        console.log(`User ${entry.user.name} joined arena 2v2 queue`);
      }
      return;
    }

    const createdSolo = tryCreateSoloRoom(entry);
    if (!createdSolo) {
      startBotFallbackTimer(entry, (liveEntry) => startSoloBotMatch(liveEntry));
      console.log(`User ${entry.user.name} joined arena solo queue`);
    }
  });

  socket.on("join_arena_tournament_lobby", async ({ code, user } = {}) => {
    try {
      const safeCode = String(code || "").trim();
      const uid = getUid(user);
      if (!safeCode || !uid) return;
      const room = await ArenaTournamentRoom.findOne({ code: safeCode });
      if (!room) return socket.emit("arena_tournament_error", { message: "Không tìm thấy phòng giải đấu" });
      if (room.status === "ended") return socket.emit("arena_tournament_error", { message: "Giải đấu đã kết thúc" });

      const participantIds = (room.participantIds || []).map(String);
      if (!participantIds.includes(uid)) {
        room.participantIds.push(uid);
        await room.save();
      }

      if (!tournamentLobbies.has(safeCode)) tournamentLobbies.set(safeCode, new Map());
      tournamentLobbies.get(safeCode).set(uid, { socket, user: { ...user, uid } });
      socket.currentTournamentCode = safeCode;
      await emitTournamentLobbyUpdate(safeCode);
    } catch (err) {
      console.error("[Arena] join tournament lobby failed:", err);
      socket.emit("arena_tournament_error", { message: "Không vào được phòng chờ giải đấu" });
    }
  });

  socket.on("leave_arena_tournament_lobby", async ({ code } = {}) => {
    const safeCode = String(code || socket.currentTournamentCode || "").trim();
    if (!safeCode) return;
    const lobby = tournamentLobbies.get(safeCode);
    if (lobby) {
      for (const [uid, entry] of lobby.entries()) {
        if (entry.socket.id === socket.id) lobby.delete(uid);
      }
      if (lobby.size === 0) tournamentLobbies.delete(safeCode);
      else await emitTournamentLobbyUpdate(safeCode);
    }
    socket.currentTournamentCode = null;
  });

  socket.on("start_arena_tournament_match", async ({ code } = {}) => {
    try {
      const safeCode = String(code || "").trim();
      if (!safeCode) return;
      const room = await ArenaTournamentRoom.findOne({ code: safeCode });
      if (!room) return socket.emit("arena_tournament_error", { message: "Không tìm thấy phòng giải đấu" });
      if (room.status !== "waiting") return socket.emit("arena_tournament_error", { message: "Phòng không còn ở trạng thái chờ" });
      if (String(room.hostId) !== String(socket.currentUid || socket.handshake?.auth?.uid || room.hostId)) {
        // Không ép quá chặt vì app hiện dùng cookie/session, nhưng vẫn ưu tiên chủ phòng đang bấm.
      }

      const lobby = tournamentLobbies.get(safeCode);
      const connectedPlayers = lobby ? [...lobby.values()].filter((entry) => entry.socket?.connected) : [];
      if (connectedPlayers.length < 2) {
        return socket.emit("arena_tournament_error", { message: "Cần ít nhất 2 người trong phòng chờ mới bắt đầu được" });
      }

      const hostId = String(room.hostId);
      const hostEntry = connectedPlayers.find((entry) => getUid(entry.user) === hostId) || connectedPlayers[0];
      const opponentEntry = connectedPlayers.find((entry) => getUid(entry.user) !== getUid(hostEntry.user));
      if (!opponentEntry) return socket.emit("arena_tournament_error", { message: "Chưa có đối thủ trong phòng chờ" });

      const playerAUid = getUid(hostEntry.user);
      const playerBUid = getUid(opponentEntry.user);
      const matchData = await buildTournamentMatchData(playerAUid, playerBUid);

      room.status = "playing";
      room.settings = {
        ...(room.settings || {}),
        currentMatch: {
          playerAUid,
          playerBUid,
          sourceMix: matchData.sourceMix,
          startedAt: new Date(),
        },
      };
      await room.save();

      createArenaRoom([
        { ...hostEntry.user, socket: hostEntry.socket, team: "blue", tournamentCode: safeCode },
        { ...opponentEntry.user, socket: opponentEntry.socket, team: "red", tournamentCode: safeCode },
      ], matchData, "tournament");
      tournamentLobbies.delete(safeCode);
    } catch (err) {
      console.error("[Arena] start tournament match failed:", err);
      socket.emit("arena_tournament_error", { message: "Không bắt đầu được giải đấu" });
    }
  });

  socket.on("cancel_arena_search", () => {
    removeArenaSocketFromQueue(socket);
  });

  socket.on("arena_answer", ({ roomCode, uid, timeRemaining, isCorrect }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room) return;
    applyArenaAnswer(room, String(uid), timeRemaining, !!isCorrect);
  });

  socket.on("arena_team_hint", ({ roomCode, uid, message }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room) return;
    const sender = room.players.find((player) => player.uid === String(uid));
    if (!sender) return;
    room.players
      .filter((player) => !player.isBot && player.team === sender.team && player.uid !== sender.uid)
      .forEach((player) => {
        const sockId = userSockets.get(player.uid);
        if (sockId) io.to(sockId).emit("arena_team_hint", { from: sender.name, message, uid: sender.uid });
      });
  });

  socket.on("arena_next_question", ({ roomCode }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room) return;

    // Any human in the room can advance, but only after everyone answered.
    if (!areAllArenaPlayersAnswered(room)) return;

    room.currentQuestionIndex++;
    room.players.forEach((player) => { room.answered[player.uid] = false; });

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
      clearArenaRoomSocketState(roomCode);
      activeArenaRooms.delete(roomCode);
    } else {
      io.to(roomCode).emit("arena_next_question_sync", { index: room.currentQuestionIndex });
      scheduleArenaBots(room);
    }
  });

  socket.on("arena_leave", ({ roomCode } = {}) => {
    removeArenaSocketFromQueue(socket);
    leaveArenaRoom(socket, roomCode, "leave");
  });});

app.set("io", io);
app.set("userSockets", userSockets);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(compression());
app.use(morgan("dev"));
app.use(express.json({ limit: "25mb" }));
app.use(cookieParser());

// Support Bearer token from Extension (map to req.cookies.session)
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    req.cookies.session = authHeader.split(" ")[1];
  }
  next();
});

import leaderboardRoutes from "./routes/leaderboard.js";
import communityRoutes from "./routes/community.js";
import notificationRoutes from "./routes/notifications.js";
import quizRoutes from "./routes/quiz.js";
import adminRoutes from "./routes/admin.js";
import arenaRoutes from "./routes/arena.js";
import grammarRoutes from "./routes/grammar.js";
import tensesRoutes from "./routes/tenses.js";
import aiRoutes from "./routes/ai.js";
import notebookRoutes from "./routes/notebook.js";
import utilitiesRoutes from "./routes/utilities.js";
import friendsRoutes from "./routes/friends.js";
import pronunciationRoutes from "./routes/pronunciation.js";
import skillPracticeRoutes from "./routes/skillPractice.js";

app.use("/api/auth", authRoutes);
app.use("/api/rank", rankRoutes);
app.use("/api/flashcard", flashcardRoutes);
app.use("/api/user", userRoutes);
app.use("/api/config", configRoutes);
app.use("/api/grammar", grammarRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/arena", arenaRoutes);
app.use("/api/tenses", tensesRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notebook", notebookRoutes);
app.use("/api/utilities", utilitiesRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/pronunciation", pronunciationRoutes);
app.use("/api/skill-practice", skillPracticeRoutes);

app.get("/health", (req, res) => {
  res.send("OK");
});

import { errorHandler } from "./middleware/errorHandler.js";
app.use(errorHandler);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
