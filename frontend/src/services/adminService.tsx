import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_BACKEND;

export const adminService = {
  // Users
  getUsers: async (page = 1, limit = 10) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users?page=${page}&limit=${limit}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return await res.json();
    } catch (error: any) {
      toast.error(error.message);
      return { users: [], total: 0, page: 1, totalPages: 1 };
    }
  },

  updateUserRole: async (uid: string, role: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${uid}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update role");
      toast.success("Cập nhật quyền thành công!");
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  },

  banUser: async (uid: string, isBanned: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${uid}/ban`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update ban status");
      toast.success(isBanned ? "Đã khoá tài khoản!" : "Đã mở khoá tài khoản!");
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  },

  // Tasks
  getTasks: async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/tasks`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      return data.tasks;
    } catch (error: any) {
      toast.error(error.message);
      return [];
    }
  },

  createTask: async (taskData: any) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create task");
      toast.success("Thêm nhiệm vụ thành công!");
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  },

  updateTask: async (id: string, taskData: any) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update task");
      toast.success("Cập nhật nhiệm vụ thành công!");
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  },

  deleteTask: async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/tasks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete task");
      toast.success("Xóa nhiệm vụ thành công!");
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  },

  // Vocab Sets
  getVocabSets: async (page = 1, limit = 10) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/vocab-sets?page=${page}&limit=${limit}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch vocab sets");
      return await res.json();
    } catch (error: any) {
      toast.error(error.message);
      return { items: [], total: 0, page: 1, totalPages: 1 };
    }
  },
  deleteVocabSet: async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/vocab-sets/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete vocab set");
      toast.success("Xóa bộ từ vựng thành công!");
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  },

  // Vocab
  getVocab: async (page = 1, limit = 10) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/vocab?page=${page}&limit=${limit}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch vocab");
      return await res.json();
    } catch (error: any) {
      toast.error(error.message);
      return { items: [], total: 0, page: 1, totalPages: 1 };
    }
  },
  deleteVocab: async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/vocab/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete vocab");
      toast.success("Xóa từ vựng thành công!");
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  },

  // Quizzes
  getQuizzes: async (page = 1, limit = 10) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/quizzes?page=${page}&limit=${limit}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch quizzes");
      return await res.json();
    } catch (error: any) {
      toast.error(error.message);
      return { items: [], total: 0, page: 1, totalPages: 1 };
    }
  },
  deleteQuiz: async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/quizzes/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete quiz");
      toast.success("Xóa quiz thành công!");
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  },

  // Quiz History
  getQuizHistory: async (page = 1, limit = 10) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/quiz-history?page=${page}&limit=${limit}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch quiz history");
      return await res.json();
    } catch (error: any) {
      toast.error(error.message);
      return { items: [], total: 0, page: 1, totalPages: 1 };
    }
  },

  // Bot Configs
  getBotConfigs: async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/bot-config`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bot configs");
      return await res.json();
    } catch (error: any) {
      toast.error(error.message);
      return { items: [] };
    }
  },
  saveBotConfig: async (config: any) => {
    try {
      const id = config.id || config._id;
      const url = id ? `${API_URL}/api/admin/bot-config/${id}` : `${API_URL}/api/admin/bot-config`;
      const method = id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to save bot config");
      return await res.json();
    } catch (error: any) {
      throw error;
    }
  },
  deleteBotConfig: async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/bot-config/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete bot config");
      return true;
    } catch (error: any) {
      throw error;
    }
  },

  // System Logs
  getSystemLogs: async (page = 1, limit = 20) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/system-logs?page=${page}&limit=${limit}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch system logs");
      return await res.json();
    } catch (error: any) {
      toast.error(error.message);
      return { items: [], total: 0, page: 1, totalPages: 1 };
    }
  },

  // Analytics
  getAnalyticsOverview: async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/analytics/overview`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return await res.json();
    } catch (error: any) {
      toast.error(error.message);
      return null;
    }
  },

  // Community Posts
  getCommunityPosts: async (page = 1, limit = 10) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/community-posts?page=${page}&limit=${limit}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch posts");
      return await res.json();
    } catch (error: any) {
      toast.error(error.message);
      return { items: [], total: 0, page: 1, totalPages: 1 };
    }
  },

  deleteCommunityPost: async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/community-posts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete post");
      toast.success("Xoá bài viết thành công!");
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  },

  // Banned IPs
  getBannedIps: async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/banned-ips`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch banned IPs");
      return await res.json();
    } catch (error: any) {
      toast.error(error.message);
      return [];
    }
  },

  addBannedIp: async (ip: string, reason: string, isHoneypot: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/banned-ips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ip, reason, isHoneypot })
      });
      if (!res.ok) throw new Error("Failed to ban IP");
      toast.success("Đã cấm IP thành công!");
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  },

  deleteBannedIp: async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/banned-ips/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to unban IP");
      toast.success("Đã gỡ cấm IP thành công!");
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  },

  // Attacker Feedbacks
  getAttackerFeedbacks: async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/attacker-feedbacks`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch feedbacks");
      return await res.json();
    } catch (error: any) {
      toast.error(error.message);
      return [];
    }
  },

  deleteAttackerFeedback: async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/attacker-feedbacks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete feedback");
      toast.success("Xoá feedback thành công!");
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  }
};
