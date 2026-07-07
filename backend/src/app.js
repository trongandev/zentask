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
import { db } from "./firebase.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
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
const arenaQueue = []; // array of { socket, user, matchData }
const activeArenaRooms = new Map(); // roomCode -> roomState

io.on("connection", (socket) => {
  console.log("New socket connection:", socket.id);

  socket.on("register", (uid) => {
    if (uid) {
      userSockets.set(uid, socket.id);
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
      const snapshot = await db.collection("quiz_rooms").where("roomCode", "==", roomCode).get();
      snapshot.forEach(doc => doc.ref.delete());
      console.log(`Deleted room ${roomCode} from Firestore`);
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
  socket.on("find_arena_match", ({ user, matchData }) => {
    // Check if already in queue
    const existingIdx = arenaQueue.findIndex(item => item.user.uid === user.uid);
    if (existingIdx !== -1) return;

    if (arenaQueue.length > 0) {
      const opponent = arenaQueue.shift();
      const roomCode = `arena_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      socket.join(roomCode);
      opponent.socket.join(roomCode);
      
      const roomState = {
        roomCode,
        p1: opponent.user,
        p2: user,
        p1Socket: opponent.socket.id,
        p2Socket: socket.id,
        matchData: opponent.matchData, // Use P1's deck
        currentQuestionIndex: 0,
        p1Score: 0,
        p2Score: 0,
        p1Answered: false,
        p2Answered: false,
      };
      activeArenaRooms.set(roomCode, roomState);
      
      socket.currentArenaRoom = roomCode;
      opponent.socket.currentArenaRoom = roomCode;

      io.to(roomCode).emit("arena_match_found", {
        roomCode,
        p1: opponent.user,
        p2: user,
        matchData: opponent.matchData
      });
      console.log(`Arena match found: ${opponent.user.name} vs ${user.name}`);
    } else {
      arenaQueue.push({ socket, user, matchData });
      console.log(`User ${user.name} joined arena queue`);
    }
  });

  socket.on("cancel_arena_search", () => {
    const idx = arenaQueue.findIndex(item => item.socket.id === socket.id);
    if (idx !== -1) {
      arenaQueue.splice(idx, 1);
      console.log(`Socket ${socket.id} left arena queue`);
    }
  });

  socket.on("arena_answer", ({ roomCode, uid, timeRemaining, isCorrect }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room) return;
    
    const isX2 = room.matchData.x2Indices?.includes(room.currentQuestionIndex);
    let points = 0;
    if (isCorrect) {
      points = 50 + Math.floor(timeRemaining * 5); // Max 100 for 10s
      if (isX2) points *= 2;
    }
    
    if (room.p1.uid === uid && !room.p1Answered) {
      room.p1Score += points;
      room.p1Answered = true;
    } else if (room.p2.uid === uid && !room.p2Answered) {
      room.p2Score += points;
      room.p2Answered = true;
    }
    
    io.to(roomCode).emit("arena_score_update", {
      userScores: {
        [room.p1.uid]: room.p1Score,
        [room.p2.uid]: room.p2Score
      },
      userAnswered: {
        [room.p1.uid]: room.p1Answered,
        [room.p2.uid]: room.p2Answered
      }
    });
    
    if (room.p1Answered && room.p2Answered) {
      io.to(roomCode).emit("arena_both_answered");
    }
  });

  socket.on("arena_next_question", ({ roomCode }) => {
    const room = activeArenaRooms.get(roomCode);
    if (!room) return;
    
    // Only let P1 trigger to avoid double events
    if (socket.id === room.p1Socket) {
      room.currentQuestionIndex++;
      room.p1Answered = false;
      room.p2Answered = false;
      
      if (room.currentQuestionIndex >= 10) { // 10 questions total
        io.to(roomCode).emit("arena_end_game", {
          userScores: {
            [room.p1.uid]: room.p1Score,
            [room.p2.uid]: room.p2Score
          }
        });
        activeArenaRooms.delete(roomCode);
      } else {
        io.to(roomCode).emit("arena_next_question_sync", { index: room.currentQuestionIndex });
      }
    }
  });

  socket.on("arena_leave", ({ roomCode }) => {
    socket.leave(roomCode);
    socket.currentArenaRoom = null;
    activeArenaRooms.delete(roomCode); // If someone leaves, end room
    socket.to(roomCode).emit("arena_opponent_left");
  });
});

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
app.use(express.json());
app.use(cookieParser());

import leaderboardRoutes from "./routes/leaderboard.js";
import communityRoutes from "./routes/community.js";
import notificationRoutes from "./routes/notifications.js";
import quizRoutes from "./routes/quiz.js";
import adminRoutes from "./routes/admin.js";
import arenaRoutes from "./routes/arena.js";

app.use("/api/auth", authRoutes);
app.use("/api/rank", rankRoutes);
app.use("/api/flashcard", flashcardRoutes);
app.use("/api/user", userRoutes);
app.use("/api/config", configRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/arena", arenaRoutes);

app.get("/health", (req, res) => {
  res.send("OK");
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
