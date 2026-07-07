import { db } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Helper to create a notification in Firestore and emit via Socket.io
 * @param {object} app - Express app instance to get io
 * @param {string} receiverId - User ID who receives the notification
 * @param {string} type - 'follow', 'community_like', 'community_comment', 'leaderboard', 'learning_reminder'
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} referenceId - Optional ID to route to (e.g., uid, postId)
 */
export const createNotification = async (app, receiverId, type, title, message, referenceId = null) => {
  try {
    const notification = {
      receiverId,
      type,
      title,
      message,
      referenceId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection("notifications").add(notification);

    // Emit via Socket.io if user is online
    const io = app.get("io");
    const userSockets = app.get("userSockets");

    if (io && userSockets && userSockets.has(receiverId)) {
      const socketId = userSockets.get(receiverId);
      io.to(socketId).emit("new_notification", {
        id: docRef.id,
        type,
        title,
        message,
        referenceId,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    return docRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};
