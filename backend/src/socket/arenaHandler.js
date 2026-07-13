import { ArenaTournamentRoom, Flashcard, BotConfig } from "../models/Schemas.js";
import { BUILTIN_FLASHCARD_SETS } from "../data/builtinLearning/index.js";
import User from "../models/User.js";
import { arenaQueue, activeArenaRooms, tournamentLobbies, userSockets } from "./state.js";

const BOT_NAMES = ["Lopy Bot", "Nova Bot", "Mika Bot", "Zen Bot", "Ivy Bot", "Pixel Bot"];
const BOT_AVATARS = ["/mascot/Lopy (1).png", "/mascot/Lopy (3).png", "/mascot/Lopy (8).png", "/mascot/Lopy (14).png"];

const getUid = (user = {}) => String(user.uid || user._id || "");
const getRankId = (user = {}) => Number(user.rankId || 1);

const BOT_MATCH_DELAY_MS = 10000;
const ARENA_QUEUE_STALE_MS = 12000;
const ARENA_PRESENCE_INTERVAL_HINT_MS = 3000;

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
// refresh every 60s
setInterval(refreshBotConfigs, 60000);
setTimeout(refreshBotConfigs, 1000);

const BOT_ACCURACY_BY_RANK = {
  1: 0.35,
  2: 0.5,
  3: 0.65,
  4: 0.7,
  5: 0.85,
};

const isBotEligible = (user = {}) => getRankId(user) <= 5;
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

const getBuiltinTournamentWords = () =>
  BUILTIN_FLASHCARD_SETS.flatMap((set) => (set.words || []).map((word) => normalizeArenaWord(word, set.categoryName || set.category || "builtin"))).filter((word) => word.term && word.translation);

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

  const selectedCards = shuffleArray([...pickItems(builtinWords, 6), ...pickItems(userAWords, 3), ...pickItems(userBWords, 3)]).slice(0, 12);
  const safeCards = selectedCards.length >= 6 ? selectedCards : pickItems([...selectedCards, ...fallbackBuiltin], 12);
  const validModes = ["quiz", "fill_blank", "listening", "guess", "typing"];
  const modes = Array.from({ length: safeCards.length }, (_, idx) => validModes[idx % validModes.length]);
  const x2Indices = pickItems(
    Array.from({ length: safeCards.length }, (_, i) => i),
    Math.min(2, safeCards.length),
  );

  return {
    cards: shuffleArray(safeCards),
    modes: shuffleArray(modes),
    x2Indices,
    sourceMix: { builtinPercent: 50, playerAPercent: 25, playerBPercent: 25, builtinCount: 6, playerACount: 3, playerBCount: 3 },
  };
};

const emitTournamentLobbyUpdate = async (code, io) => {
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
      entry.socket.emit("arena_tournament_lobby_update", { code, room: { id: room._id, ...room }, participants, canStart: participants.length >= 2, minPlayers: 2 });
    }
  });
};

export const removeSocketFromTournamentLobbies = (socket, io) => {
  for (const [code, lobby] of tournamentLobbies.entries()) {
    let changed = false;
    for (const [uid, entry] of lobby.entries()) {
      if (entry.socket.id === socket.id) {
        lobby.delete(uid);
        changed = true;
      }
    }
    if (lobby.size === 0) tournamentLobbies.delete(code);
    else if (changed) emitTournamentLobbyUpdate(code, io).catch((err) => console.warn("[Arena] lobby update failed:", err.message));
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

export const removeArenaSocketFromQueue = (socket) => {
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
    liveEntry.socket.emit("arena_queue_timeout", {
      message: "Hiện tại hệ thống không có ai đang online, bạn có muốn chuyển qua đấu với bot không?",
      botRank: liveEntry.user.rankId
    });
  }, BOT_MATCH_DELAY_MS);
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
    let delay = 1800 + Math.floor(Math.random() * 7200); // default delay
    let isCorrect = Math.random() < Number(bot.botAccuracy || 0);

    if (config) {
      isCorrect = Math.random() < (config.correctRate / 100);
      
      const randTime = Math.random() * 100;
      let cumulative = 0;
      let matchedSecond = null;

      // Check time distribution mapping
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
        delay = 9500 + Math.random() * 450; // max 9.95s
      } else {
        // Fallback fast response
        delay = Math.random() * 9900; // 0 to 9.9s
      }
      console.log(`[Arena Bot Debug] Bot ${bot.name} (Rank ${bot.rankId}) - isCorrect: ${isCorrect}, randTime: ${randTime.toFixed(2)}%, matchedSecond: ${matchedSecond}, delay: ${Math.round(delay)}ms`);
    }

    const timer = setTimeout(() => {
      if (!activeArenaRooms.has(room.roomCode)) return;
      if (room.answered[bot.uid]) return;
      const timeRemaining = Math.max(0, 10 - Math.floor(delay / 1000));
      console.log(`[Arena Bot Debug] Bot ${bot.name} answering - timeRemaining: ${timeRemaining}, isCorrect: ${isCorrect}`);
      applyArenaAnswer(room, bot.uid, timeRemaining, isCorrect, io);
    }, delay);
    room.botTimers.push(timer);
  });
};

const createArenaRoom = (players, matchData, mode = "solo", io) => {
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
    
    // Default team logic if not specified
    const team = player.team || (mode === "team2v2" ? (index % 2 === 0 ? "blue" : "red") : index === 0 ? "blue" : "red");
    
    // Default slotIndex logic if not specified
    let slotIndex = player.slotIndex;
    if (slotIndex === undefined) {
      if (mode === "team2v2") {
         // assign 0, 1 for blue, 2, 3 for red
         if (team === "blue") slotIndex = (normalizedPlayers.filter(p => p.team === "blue").length) % 2;
         else slotIndex = 2 + ((normalizedPlayers.filter(p => p.team === "red").length) % 2);
      } else {
         slotIndex = team === "blue" ? 0 : 2;
      }
    }

    normalizedPlayers.push({
      ...player,
      uid,
      team,
      slotIndex
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
    hostSocketId: humanPlayers[0]?.socket?.id || null,
    p1: safePlayers[0],
    p2: safePlayers.find((p) => p.team !== safePlayers[0]?.team) || safePlayers[1],
    status: "waiting",
    ready,
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
  return roomState;
};

const startSoloBotMatch = (entry, io, botRankOverride = null) => {
  if (!entry || !isQueueEntryAlive(entry) || !isBotEligible(entry.user)) return false;
  const removed = dequeueArenaEntry(entry, "solo_bot");
  if (!removed) return false;
  const seedUser = botRankOverride ? { ...removed.user, rankId: botRankOverride } : removed.user;
  const bot = createArenaBot(seedUser, 1, "red");
  createArenaRoom([{ ...removed.user, socket: removed.socket, team: "blue" }, bot], removed.matchData, "solo", io);
  return true;
};

const tryCreateSoloRoom = (entry, io) => {
  if (!entry || !isQueueEntryAlive(entry)) return false;
  const liveSoloQueue = getLiveArenaQueue("solo");
  const opponent = liveSoloQueue.find((item) => item.queueToken !== entry.queueToken && getUid(item.user) !== getUid(entry.user));
  if (!opponent) return false;

  const first = dequeueArenaEntry(opponent, "solo_human");
  const second = dequeueArenaEntry(entry, "solo_human");
  if (!first || !second) return false;

  createArenaRoom(
    [
      { ...first.user, socket: first.socket, team: "blue" },
      { ...second.user, socket: second.socket, team: "red" },
    ],
    first.matchData || second.matchData,
    "solo",
    io,
  );
  return true;
};

const tryCreateTeam2v2Room = (forceEntry = null, io) => {
  const liveTeamQueue = getLiveArenaQueue("team2v2");
  if (liveTeamQueue.length >= 4) {
    const picked = liveTeamQueue
      .slice(0, 4)
      .map((entry) => dequeueArenaEntry(entry, "team2v2_human"))
      .filter(Boolean);
    if (picked.length >= 4) {
      createArenaRoom(
        picked.map((entry, index) => ({ ...entry.user, socket: entry.socket, team: index < 2 ? "blue" : "red" })),
        picked[0].matchData,
        "team2v2",
        io,
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

    const picked = pickedEntries
      .slice(0, 4)
      .map((entry) => dequeueArenaEntry(entry, "team2v2_bot_fill"))
      .filter(Boolean);
    if (!picked.length) return false;

    const seed = picked[0];
    const players = picked.map((entry, index) => ({ ...entry.user, socket: entry.socket, team: entry.user.team || (index < 2 ? "blue" : "red") }));
    if (forceEntry.targetSlotIndex !== undefined) {
      const botTeam = forceEntry.targetSlotIndex < 2 ? "blue" : "red";
      const bot = createArenaBot(seed.user, players.length + 1, botTeam);
      bot.slotIndex = forceEntry.targetSlotIndex;
      players.push(bot);
    } else {
      while (players.length < 4) {
        const team = players.length < 2 ? "blue" : "red";
        players.push(createArenaBot(seed.user, players.length + 1, team));
      }
    }
    createArenaRoom(players, seed.matchData, "team2v2", io);
    return true;
  }

  return false;
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
      playerSocket.currentArenaQueued = false;
      playerSocket.currentArenaQueueToken = null;
      if (playerSocket.id !== exceptSocketId) touchArenaSocket(playerSocket);
    });
};

export const leaveArenaRoom = (socket, roomCode, reason = "leave", io) => {
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
    clearArenaRoomSocketState(targetRoomCode, socket.id, io);
    activeArenaRooms.delete(targetRoomCode);
    console.log(`Socket ${socket.id} left arena room ${targetRoomCode} (${reason})`);
  }
};

export function registerArenaHandlers(io, socket) {
  socket.on("arena_presence", ({ state, roomCode, mode } = {}) => {
    touchArenaSocket(socket);
    socket.currentArenaClientState = state || socket.currentArenaClientState || "active";
    if (roomCode && socket.currentArenaRoom === roomCode) socket.currentArenaMode = mode || socket.currentArenaMode;
  });

  socket.on("find_arena_match", async ({ user, matchData, mode, matchMode, botRankOverride } = {}) => {
    if (!user || !matchData) return;
    touchArenaSocket(socket);
    cleanupArenaQueue();

    const uid = getUid(user);
    if (!uid) return socket.emit("arena_matchmaking_error", { message: "Thiếu thông tin người chơi" });

    if (socket.currentArenaRoom || isUidInActiveArenaRoom(uid)) {
      return socket.emit("arena_matchmaking_error", { message: "Bạn đang ở trong một trận đấu khác" });
    }

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

    // If user explicitly chose a bot rank, create bot match immediately
    const safeBotRankOverride = botRankOverride != null ? Number(botRankOverride) : null;
    if (safeBotRankOverride && safeBotRankOverride >= 1 && safeBotRankOverride <= 5 && arenaMode === "solo") {
      const entry = enqueueArenaEntry({ socket, user: entryUser, matchData, mode: arenaMode, timer: null });
      startSoloBotMatch(entry, io, safeBotRankOverride);
      return;
    }

    const entry = enqueueArenaEntry({
      socket,
      user: entryUser,
      matchData,
      mode: arenaMode,
      targetSlotIndex,
      timer: null,
    });

    socket.emit("arena_queue_status", {
      status: "queued",
      mode: arenaMode,
      botEligible: isBotEligible(entryUser),
      botAfterMs: isBotEligible(entryUser) ? 10000 : null,
      presencePingMs: ARENA_PRESENCE_INTERVAL_HINT_MS,
    });

    if (arenaMode === "team2v2") {
      const createdNow = tryCreateTeam2v2Room(entry, io);
      if (!createdNow) {
        startBotFallbackTimer(entry, (liveEntry) => tryCreateTeam2v2Room(liveEntry, io));
        console.log(`User ${entry.user.name} joined arena 2v2 queue`);
      }
      return;
    }

    const createdSolo = tryCreateSoloRoom(entry, io);
    if (!createdSolo) {
      startBotFallbackTimer(entry, (liveEntry) => startSoloBotMatch(liveEntry, io));
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
      await emitTournamentLobbyUpdate(safeCode, io);
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
      else await emitTournamentLobbyUpdate(safeCode, io);
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

      createArenaRoom(
        [
          { ...hostEntry.user, socket: hostEntry.socket, team: "blue", tournamentCode: safeCode },
          { ...opponentEntry.user, socket: opponentEntry.socket, team: "red", tournamentCode: safeCode },
        ],
        matchData,
        "tournament",
        io,
      );
      tournamentLobbies.delete(safeCode);
    } catch (err) {
      console.error("[Arena] start tournament match failed:", err);
      socket.emit("arena_tournament_error", { message: "Không bắt đầu được giải đấu" });
    }
  });

  socket.on("cancel_arena_search", () => {
    removeArenaSocketFromQueue(socket);
    
    if (socket.currentArenaRoom) {
      const roomCode = socket.currentArenaRoom;
      const room = activeArenaRooms.get(roomCode);
      if (room && room.status === "waiting") {
        socket.leave(roomCode);
        socket.currentArenaRoom = null;
        socket.currentArenaQueued = false;
        socket.currentArenaQueueToken = null;
        
        const playerIndex = room.players.findIndex(p => p.socket?.id === socket.id || p.uid === socket.currentUid);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
        }
        
        if (room.players.filter(p => !p.isBot).length === 0) {
           clearArenaBotTimers(room);
           activeArenaRooms.delete(roomCode);
        } else {
           io.to(roomCode).emit("arena_opponent_left", { reason: "cancelled", mode: room.mode });
        }
      }
    }
  });



  socket.on("arena_answer", ({ roomCode, uid, timeRemaining, isCorrect }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room) return;
    applyArenaAnswer(room, String(uid), timeRemaining, !!isCorrect, io);
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

  socket.on("arena_lobby_chat", ({ roomCode, text }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room) return;
    socket.to(roomCode).emit("arena_lobby_chat_received", {
      uid: socket.currentUid,
      name: socket.user?.displayName || "Người chơi",
      avatar: socket.user?.photoURL,
      text,
      time: Date.now()
    });
  });

  socket.on("arena_kick_player", ({ roomCode, targetUid }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room) return;
    
    // Only host can kick
    if (socket.id !== room.hostSocketId) return;

    const targetIndex = room.players.findIndex((p) => p.uid === targetUid);
    if (targetIndex === -1) return;

    const target = room.players[targetIndex];
    if (target.isBot) {
      room.players.splice(targetIndex, 1);
      delete room.ready[target.uid];
      io.to(roomCode).emit("arena_player_kicked", { targetUid });
    } else {
      if (target.socket) {
        target.socket.emit("arena_opponent_left", { reason: "kicked", mode: room.mode });
        target.socket.leave(roomCode);
        target.socket.currentArenaRoom = null;
        target.socket.currentArenaQueued = false;
        target.socket.currentArenaQueueToken = null;
      }
      room.players.splice(targetIndex, 1);
      delete room.ready[target.uid];
      io.to(roomCode).emit("arena_player_kicked", { targetUid });
    }
  });

  socket.on("arena_move_slot", ({ roomCode, targetSlotIndex }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room || room.status !== "waiting") return;
    
    const player = room.players.find(p => p.uid === socket.currentUid);
    if (!player) return;

    // Check if slot is taken
    const slotTaken = room.players.some(p => p.slotIndex === targetSlotIndex);
    if (slotTaken) return; // slot is already taken

    player.slotIndex = targetSlotIndex;
    if (targetSlotIndex === 0 || targetSlotIndex === 1) player.team = "blue";
    else if (targetSlotIndex === 2 || targetSlotIndex === 3) player.team = "red";

    io.to(roomCode).emit("arena_player_added", { player, players: room.players });
  });

  socket.on("arena_swap_slots", ({ roomCode, targetUid }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room || room.status !== "waiting") return;
    
    // Only host can swap others, or a player can swap with someone else if they want (simple approach: anyone can swap with anyone for now, or maybe only host can do it, but let's allow the user who clicks to swap with target)
    const p1Index = room.players.findIndex(p => p.uid === socket.currentUid);
    const p2Index = room.players.findIndex(p => p.uid === targetUid);
    
    if (p1Index === -1 || p2Index === -1) return;
    
    const p1 = room.players[p1Index];
    const p2 = room.players[p2Index];
    
    // Swap slots and teams
    const tempSlot = p1.slotIndex;
    const tempTeam = p1.team;
    
    p1.slotIndex = p2.slotIndex;
    p1.team = p2.team;
    
    p2.slotIndex = tempSlot;
    p2.team = tempTeam;

    io.to(roomCode).emit("arena_player_added", { player: p1, players: room.players });
  });

  socket.on("arena_add_bot", ({ roomCode, botRankId, targetSlotIndex }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room || room.status !== "waiting") return;
    
    // Only host can add bot
    if (socket.id !== room.hostSocketId) return;

    // Check if room is full
    const maxPlayers = room.mode === "team2v2" ? 4 : 2;
    if (room.players.length >= maxPlayers) return;

    // Determine team for the new bot based on targetSlotIndex
    let newTeam = "red";
    if (targetSlotIndex === 0 || targetSlotIndex === 1) newTeam = "blue";
    else if (targetSlotIndex === 2 || targetSlotIndex === 3) newTeam = "red";
    else {
      if (room.mode === "team2v2") {
        const blueCount = room.players.filter((p) => p.team === "blue").length;
        if (blueCount < 2) newTeam = "blue";
        else newTeam = "red";
      } else {
        newTeam = room.players[0].team === "blue" ? "red" : "blue";
      }
    }

    const hostPlayer = room.players.find((p) => p.uid === room.p1?.uid) || room.players[0];
    const botUser = { ...hostPlayer, rankId: Number(botRankId) || 1 };
    const bot = createArenaBot(botUser, room.players.length + 1, newTeam);
    if (targetSlotIndex !== undefined) bot.slotIndex = targetSlotIndex;
    else bot.slotIndex = newTeam === "blue" ? 1 : 3; // fallback for bots if no slot given
    
    room.players.push(bot);
    room.scores[bot.uid] = 0;
    room.answered[bot.uid] = false;
    room.ready[bot.uid] = true;

    io.to(roomCode).emit("arena_player_added", { player: { uid: bot.uid, name: bot.name, avatar: bot.avatar, rankInfo: bot.rankInfo, isBot: bot.isBot, team: bot.team } });

    // Check if ready state needs auto-trigger since bot is always ready
    const humanPlayers = room.players.filter((p) => !p.isBot);
    const allReady = humanPlayers.every((p) => room.ready[p.uid]);
    if (allReady && room.players.length === maxPlayers) {
      room.status = "playing";
      io.to(roomCode).emit("arena_start_match");
      scheduleArenaBots(room, io);
    }
  });

  socket.on("arena_ready", ({ roomCode }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room) return;
    const player = room.players.find((p) => p.uid === socket.currentUid);
    if (player) {
      room.ready[player.uid] = true;
      io.to(roomCode).emit("arena_player_ready", { uid: player.uid, ready: true });

      const humanPlayers = room.players.filter((p) => !p.isBot);
      const allReady = humanPlayers.every((p) => room.ready[p.uid]);

      if (allReady && room.status === "waiting") {
        room.status = "playing";
        io.to(roomCode).emit("arena_start_match");
        scheduleArenaBots(room, io);
      }
    }
  });

  socket.on("arena_unready", ({ roomCode }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room) return;
    const player = room.players.find((p) => p.uid === socket.currentUid);
    if (player) {
      room.ready[player.uid] = false;
      io.to(roomCode).emit("arena_player_ready", { uid: player.uid, ready: false });
    }
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

  // --- Challenge system ---
  const pendingChallenges = socket._arenaPendingChallenges || new Map();
  socket._arenaPendingChallenges = pendingChallenges;

  socket.on("arena_challenge_invite", async ({ targetUid, challenger, mode, matchData, roomCode, targetSlotIndex } = {}) => {
    if (!targetUid || !challenger?.uid) return;
    const targetSocketId = userSockets.get(String(targetUid));
    if (!targetSocketId) {
      return socket.emit("arena_challenge_declined", { name: "Người chơi", reason: "offline" });
    }
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket?.connected) {
      return socket.emit("arena_challenge_declined", { name: "Người chơi", reason: "offline" });
    }

    // Check if target is already in a match
    if (targetSocket.currentArenaRoom || isUidInActiveArenaRoom(String(targetUid))) {
      return socket.emit("arena_challenge_declined", { name: "Người chơi", reason: "busy" });
    }

    // Store pending challenge with timeout
    const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timeout = setTimeout(() => {
      if (pendingChallenges.has(challengeId)) {
        pendingChallenges.delete(challengeId);
        socket.emit("arena_challenge_expired", { challengeId });
      }
    }, 30000);

    pendingChallenges.set(challengeId, { 
      challengerUid: challenger.uid, 
      targetUid: String(targetUid), 
      timeout, 
      challengerSocket: socket,
      mode,
      matchData,
      roomCode,
      targetSlotIndex
    });

    // Send challenge to target
    targetSocket.emit("arena_challenge_received", {
      ...challenger,
      challengeId,
      challengeMode: mode,
      matchData,
    });
    // Store on target socket too for response lookup
    if (!targetSocket._arenaIncomingChallenges) targetSocket._arenaIncomingChallenges = new Map();
    targetSocket._arenaIncomingChallenges.set(challengeId, { challengerSocket: socket, challenger, timeout, mode, matchData, roomCode, targetSlotIndex });

    console.log(`[Arena] Challenge sent from ${challenger.name} to uid ${targetUid}`);
  });

  socket.on("arena_challenge_response", async ({ challengerUid, accepted, challengeId: inChallengeId, responder } = {}) => {
    // Find the challenge — check incoming challenges on this socket
    const incomingChallenges = socket._arenaIncomingChallenges || new Map();
    let foundEntry = null;
    let foundId = null;

    for (const [cid, entry] of incomingChallenges.entries()) {
      if (inChallengeId ? cid === inChallengeId : String(entry.challenger?.uid) === String(challengerUid)) {
        foundEntry = entry;
        foundId = cid;
        break;
      }
    }

    if (!foundEntry || !foundId) return;

    // Clear timeout and remove
    if (foundEntry.timeout) clearTimeout(foundEntry.timeout);
    incomingChallenges.delete(foundId);
    
    // Remove from challenger's pending map to prevent expiration event
    if (foundEntry.challengerSocket && foundEntry.challengerSocket._arenaPendingChallenges) {
      foundEntry.challengerSocket._arenaPendingChallenges.delete(foundId);
    }

    if (!accepted) {
      // Declined
      const responderName = responder?.name || socket.currentArenaUserName || "Người chơi";
      foundEntry.challengerSocket?.emit("arena_challenge_declined", { name: responderName, challengeId: foundId });
      console.log(`[Arena] Challenge ${foundId} declined`);
      return;
    }

    const { challengerSocket, mode, matchData, challenger, roomCode: challengeRoomCode, targetSlotIndex } = foundEntry;

    if (challengerSocket && challengerSocket.connected) {
      challengerSocket.emit("arena_challenge_result", { 
        targetUid: socket.currentUid, 
        accepted: true, 
        mode 
      });
      
      const responderUser = {
        socket, 
        uid: socket.currentUid, 
        name: responder?.name || "Đối thủ", 
        avatar: responder?.avatar, 
        rankInfo: responder?.rankInfo,
        rankId: responder?.rankId,
        tier: responder?.tier,
        level: responder?.level,
        isBot: false
      };

      if (challengeRoomCode && activeArenaRooms.has(challengeRoomCode)) {
        // Join existing room
        const room = activeArenaRooms.get(challengeRoomCode);
        
        let finalSlot = targetSlotIndex;
        let finalTeam = "red";

        if (room.mode === "team2v2") {
          const takenSlots = new Set(room.players.map(p => p.slotIndex));
          if (room.players.length >= 4) {
             socket.emit("arena_matchmaking_error", { message: "Phòng đã đầy" });
             return;
          }
          if (finalSlot === undefined || takenSlots.has(finalSlot)) {
             // Find first empty slot
             for (let i = 0; i < 4; i++) {
               if (!takenSlots.has(i)) {
                 finalSlot = i;
                 break;
               }
             }
          }
          if (finalSlot === 0 || finalSlot === 1) finalTeam = "blue";
          else finalTeam = "red";
        } else {
          // Solo
          if (room.players.length >= 2) {
             socket.emit("arena_matchmaking_error", { message: "Phòng đã đầy" });
             return;
          }
          finalTeam = room.players[0].team === "blue" ? "red" : "blue";
          finalSlot = finalTeam === "blue" ? 0 : 2;
        }
        
        responderUser.team = finalTeam;
        responderUser.slotIndex = finalSlot;
        
        room.players.push(responderUser);
        room.scores[responderUser.uid] = 0;
        room.answered[responderUser.uid] = false;
        
        removeArenaSocketFromQueue(socket);
        socket.join(challengeRoomCode);
        socket.currentArenaRoom = challengeRoomCode;
        socket.currentArenaMode = room.mode;
        
        // Emit update to everyone in room
        io.to(challengeRoomCode).emit("arena_player_added", { player: responderUser, players: room.players });
        
        // Send initial match data to the new player
        socket.emit("arena_match_found", {
          roomCode: challengeRoomCode,
          arenaMode: room.mode,
          mode: room.mode,
          p1: room.players.find(p => p.uid === socket.currentUid),
          p2: room.players.find(p => p.team !== responderUser.team),
          players: room.players,
          myTeam: responderUser.team,
          matchData: room.matchData,
        });
      } else {
        // Create new room
        setTimeout(() => {
          createArenaRoom(
            [
              { 
                socket: challengerSocket, 
                uid: challenger.uid, 
                name: challenger.name, 
                avatar: challenger.avatar, 
                rankInfo: challenger.rankInfo,
                rankId: challenger.rankId,
                tier: challenger.tier,
                level: challenger.level,
                isBot: false, 
                team: "blue",
                slotIndex: 0
              },
              { 
                ...responderUser,
                team: "red",
                slotIndex: 2
              }
            ],
            matchData,
            mode,
            io
          );
        }, 1000);
      }
    }

  });

  socket.on("arena_leave", ({ roomCode } = {}) => {
    removeArenaSocketFromQueue(socket);
    leaveArenaRoom(socket, roomCode, "leave", io);
  });
}
