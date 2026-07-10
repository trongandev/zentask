import { Server } from "socket.io";
import { userSockets, activeQuizRooms } from "./state.js";
import { registerQuizHandlers } from "./quizHandler.js";
import { registerArenaHandlers, removeArenaSocketFromQueue, leaveArenaRoom, removeSocketFromTournamentLobbies } from "./arenaHandler.js";

export function initializeSocket(server, app) {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  app.set("io", io);
  app.set("userSockets", userSockets);

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
        const updatedUsers = roomUsers.filter((u) => u.uid !== socket.currentUid);
        activeQuizRooms.set(socket.currentRoom, updatedUsers);
        io.to(socket.currentRoom).emit("room_participants_update", updatedUsers);
      }

      // Remove stale Arena state
      removeArenaSocketFromQueue(socket);
      leaveArenaRoom(socket, socket.currentArenaRoom, "disconnect", io);
      removeSocketFromTournamentLobbies(socket, io);
    });

    // Register all external handlers
    registerQuizHandlers(io, socket);
    registerArenaHandlers(io, socket);
  });

  return io;
}
