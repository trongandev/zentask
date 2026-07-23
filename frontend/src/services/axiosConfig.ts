import axios from "axios";
import toastService from "./toastService";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BACKEND,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const isAuthURL = originalRequest.url?.includes("/api/auth/login") || originalRequest.url?.includes("/api/auth/refresh");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthURL) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${import.meta.env.VITE_API_BACKEND}/api/auth/refresh`, {}, { withCredentials: true });
        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (err) {
        processQueue(err, null);
        // Có thể redirect về login ở đây nếu cần, tạm thời để hook useAuth xử lý
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // Global Error Toast
    // Hiện toast nếu không phải 401, hoặc đã retry, hoặc là 401 nhưng xuất phát từ login/refresh
    if (error.response?.status !== 401 || originalRequest._retry || isAuthURL) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || "Đã xảy ra lỗi!";
      toastService.error(errorMsg);
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
