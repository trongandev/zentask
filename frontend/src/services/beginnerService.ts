import axiosInstance from "./axiosConfig";

export const beginnerService = {
  saveLessonProgress: async (lessonId: string) => {
    const res = await axiosInstance.post(`/api/user/beginner-progress`, { lessonId });
    return res.data;
  },
};
