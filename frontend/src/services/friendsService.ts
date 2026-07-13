const API_URL = import.meta.env.VITE_API_BACKEND;

async function request(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}/api/friends${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || "Có lỗi xảy ra.");
  }

  return response.json();
}

export type FriendStatus = "none" | "sent" | "received" | "friend";

export interface FriendUser {
  uid: string;
  friendId?: string;
  friendshipId?: string;
  displayName: string;
  email?: string;
  username?: string;
  photoURL?: string;
  level?: number;
  xp?: number;
  friendStatus?: FriendStatus;
}

export interface FriendRequestItem {
  id: string;
  fromId: string;
  toId: string;
  status: string;
  createdAt: string;
  user: FriendUser;
}

export interface FriendMessage {
  id: string;
  chatId?: string;
  senderId: string;
  receiverId: string;
  type: "text" | "share";
  text?: string;
  share?: {
    type: "flashcard_folder" | "quiz";
    itemId: string;
    ownerId: string;
    title: string;
    summary: string;
  };
  savedBy?: string[];
  createdAt: string;
}

export interface ShareOptions {
  folders: Array<{ id: string; name: string; color?: string; setCount?: number }>;
  quizzes: Array<{ id: string; title: string; difficulty?: string; questionCount?: number }>;
}

export const friendsService = {
  searchUsers(query: string): Promise<FriendUser[]> {
    return request(`/search?q=${encodeURIComponent(query)}`);
  },
  listFriends(): Promise<FriendUser[]> {
    return request("/list");
  },
  getRequests(): Promise<{ incoming: FriendRequestItem[]; outgoing: FriendRequestItem[] }> {
    return request("/requests");
  },
  sendRequest(userId: string) {
    return request("/request", { method: "POST", body: JSON.stringify({ userId }) });
  },
  respondRequest(id: string, action: "accept" | "decline") {
    return request(`/request/${id}/respond`, { method: "POST", body: JSON.stringify({ action }) });
  },
  unfriend(friendId: string) {
    return request(`/unfriend/${friendId}`, { method: "POST" });
  },
  getMessages(friendId: string): Promise<FriendMessage[]> {
    return request(`/messages/${friendId}`);
  },
  sendMessage(friendId: string, text: string): Promise<FriendMessage> {
    return request(`/messages/${friendId}`, { method: "POST", body: JSON.stringify({ text }) });
  },
  getShareOptions(): Promise<ShareOptions> {
    return request("/share-options");
  },
  shareContent(friendId: string, type: "flashcard_folder" | "quiz", itemId: string, text?: string): Promise<FriendMessage> {
    return request("/share", { method: "POST", body: JSON.stringify({ friendId, type, itemId, text }) });
  },
  previewShare(messageId: string) {
    return request(`/share/${messageId}/preview`);
  },
  saveShare(messageId: string) {
    return request(`/share/${messageId}/save`, { method: "POST" });
  },
  getOnlineFriends(): Promise<FriendUser[]> {
    return request("/online");
  }
};
