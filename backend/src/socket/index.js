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

  // Store detailed info of connected users
  const connectedUserInfo = new Map();
  app.set("connectedUserInfo", connectedUserInfo);

  io.on("connection", (socket) => {
    console.log("New socket connection:", socket.id);

    socket.on("register", (data) => {
      const uid = typeof data === "string" ? data : data?.uid;
      if (uid) {
        userSockets.set(uid, socket.id);
        socket.currentUid = String(uid);
        
        if (typeof data === "object") {
          connectedUserInfo.set(uid, {
            name: data.name,
            level: data.level,
            rankId: data.rankId,
            rankName: data.rankName,
            socketId: socket.id
          });
          console.log(`User ${data.name} (Lvl ${data.level}, Rank ${data.rankName || data.rankId}) registered with socket ${socket.id}`);
        } else {
          console.log(`User ${uid} registered with socket ${socket.id}`);
        }

        // Hiển thị toàn bộ user đang online
        const onlineNames = Array.from(connectedUserInfo.values()).map(u => u.name).join(", ");
        console.log(`[Online Users - ${connectedUserInfo.size}]: ${onlineNames}`);
      }
    });

    socket.on("disconnect", () => {
      for (const [uid, sockId] of userSockets.entries()) {
        if (sockId === socket.id) {
          const userInfo = connectedUserInfo.get(uid);
          userSockets.delete(uid);
          connectedUserInfo.delete(uid);
          console.log(`User ${userInfo?.name || uid} disconnected`);
          
          const onlineNames = Array.from(connectedUserInfo.values()).map(u => u.name).join(", ");
          console.log(`[Online Users - ${connectedUserInfo.size}]: ${onlineNames}`);
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
