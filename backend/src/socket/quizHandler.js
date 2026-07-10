import { QuizRoom } from "../models/Schemas.js";
import { activeQuizRooms } from "./state.js";

export function registerQuizHandlers(io, socket) {
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
    if (!roomUsers.find((u) => u.uid === user.uid)) {
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
    const updatedUsers = roomUsers.filter((u) => u.uid !== uid);
    activeQuizRooms.set(roomCode, updatedUsers);

    io.to(roomCode).emit("room_participants_update", updatedUsers);
  });

  socket.on("teacher_kick_student", ({ roomCode, uid }) => {
    const roomUsers = activeQuizRooms.get(roomCode) || [];
    const updatedUsers = roomUsers.filter((u) => u.uid !== uid);
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
      correctCount,
    });
  });

  socket.on("student_finished", ({ roomCode, user, score }) => {
    socket.to(roomCode).emit("student_finished_update", {
      uid: user.uid,
      name: user.name,
      score,
    });
  });
}
