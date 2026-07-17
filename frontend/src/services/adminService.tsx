import axiosInstance from "./axiosConfig";

export const adminService = {
  // Users
  getUsers: async (page = 1, limit = 10) => {
    const res = await axiosInstance.get(`/api/admin/users?page=${page}&limit=${limit}`);
    return res.data;
  },

  updateUserRole: async (uid: string, role: string) => {
    await axiosInstance.put(`/api/admin/users/${uid}/role`, { role });
    return true;
  },

  banUser: async (uid: string, isBanned: boolean) => {
    await axiosInstance.put(`/api/admin/users/${uid}/ban`, { isBanned });
    return true;
  },

  // Tasks
  getTasks: async () => {
    const res = await axiosInstance.get(`/api/admin/tasks`);
    return res.data;
  },

  createTask: async (taskData: any) => {
    await axiosInstance.post(`/api/admin/tasks`, taskData);
    return true;
  },

  updateTask: async (id: string, taskData: any) => {
    await axiosInstance.put(`/api/admin/tasks/${id}`, taskData);
    return true;
  },

  deleteTask: async (id: string) => {
    await axiosInstance.delete(`/api/admin/tasks/${id}`);
    return true;
  },

  // Vocab Sets
  getVocabSets: async (page = 1, limit = 10) => {
    const res = await axiosInstance.get(`/api/admin/vocab-sets?page=${page}&limit=${limit}`);
    return res.data;
  },
  deleteVocabSet: async (id: string) => {
    await axiosInstance.delete(`/api/admin/vocab-sets/${id}`);
    return true;
  },

  // Vocab
  getVocab: async (page = 1, limit = 10) => {
    const res = await axiosInstance.get(`/api/admin/vocab?page=${page}&limit=${limit}`);
    return res.data;
  },
  deleteVocab: async (id: string) => {
    await axiosInstance.delete(`/api/admin/vocab/${id}`);
    return true;
  },

  // Quizzes
  getQuizzes: async (page = 1, limit = 10) => {
    const res = await axiosInstance.get(`/api/admin/quizzes?page=${page}&limit=${limit}`);
    return res.data;
  },
  deleteQuiz: async (id: string) => {
    await axiosInstance.delete(`/api/admin/quizzes/${id}`);
    return true;
  },

  // Quiz History
  getQuizHistory: async (page = 1, limit = 10) => {
    const res = await axiosInstance.get(`/api/admin/quiz-history?page=${page}&limit=${limit}`);
    return res.data;
  },

  // Bot Configs
  getBotConfigs: async () => {
    const res = await axiosInstance.get(`/api/admin/bot-config`);
    return res.data;
  },
  saveBotConfig: async (config: any) => {
    const id = config.id || config._id;
    if (id) {
      const res = await axiosInstance.put(`/api/admin/bot-config/${id}`, config);
      return res.data;
    } else {
      const res = await axiosInstance.post(`/api/admin/bot-config`, config);
      return res.data;
    }
  },
  deleteBotConfig: async (id: string) => {
    await axiosInstance.delete(`/api/admin/bot-config/${id}`);
    return true;
  },

  // System Logs
  getSystemLogs: async (page = 1, limit = 20) => {
    const res = await axiosInstance.get(`/api/admin/system-logs?page=${page}&limit=${limit}`);
    return res.data;
  },

  // Analytics
  getAnalyticsOverview: async () => {
    const res = await axiosInstance.get(`/api/admin/analytics/overview`);
    return res.data;
  },

  // Community Posts
  getCommunityPosts: async (page = 1, limit = 10) => {
    const res = await axiosInstance.get(`/api/admin/community-posts?page=${page}&limit=${limit}`);
    return res.data;
  },

  deleteCommunityPost: async (id: string) => {
    await axiosInstance.delete(`/api/admin/community-posts/${id}`);
    return true;
  },

  // Banned IPs
  getBannedIps: async () => {
    const res = await axiosInstance.get(`/api/admin/banned-ips`);
    return res.data;
  },

  addBannedIp: async (ip: string, reason: string, isHoneypot: boolean) => {
    await axiosInstance.post(`/api/admin/banned-ips`, { ip, reason, isHoneypot });
    return true;
  },

  deleteBannedIp: async (id: string) => {
    await axiosInstance.delete(`/api/admin/banned-ips/${id}`);
    return true;
  },

  // Attacker Feedbacks
  getAttackerFeedbacks: async () => {
    const res = await axiosInstance.get(`/api/admin/attacker-feedbacks`);
    return res.data;
  },

  deleteAttackerFeedback: async (id: string) => {
    await axiosInstance.delete(`/api/admin/attacker-feedbacks/${id}`);
    return true;
  },
};
