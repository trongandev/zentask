import { Notification } from "../models/Schemas.js";

/**
 * Helper to create a notification in MongoDB and emit via Socket.io
 * @param {object} app - Express app instance to get io
 * @param {string} receiverId - User ID who receives the notification
 * @param {string} type - 'follow', 'community_like', 'community_comment', 'leaderboard', 'learning_reminder'
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} referenceId - Optional ID to route to (e.g., uid, postId)
 */
export const createNotification = async (app, receiverId, type, title, message, referenceId = null) => {
  try {
    const docRef = await Notification.create({
      receiverId,
      type,
      title,
      message,
      referenceId,
      isRead: false
    });

    // Emit via Socket.io if user is online
    const io = app.get("io");
    const userSockets = app.get("userSockets");

    if (io && userSockets && userSockets.has(receiverId.toString())) {
      const socketId = userSockets.get(receiverId.toString());
      io.to(socketId).emit("new_notification", {
        id: docRef._id,
        type,
        title,
        message,
        referenceId,
        isRead: false,
        createdAt: docRef.createdAt.toISOString()
      });
    }

    return docRef._id;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};
