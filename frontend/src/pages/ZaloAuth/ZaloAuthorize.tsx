import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toastService from "../../services/toastService";
import { useAuth } from "../../contexts/AuthContext";
import { CheckCircle2 } from "lucide-react";

export function ZaloAuthorize() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAuthorize = async () => {
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_BACKEND;
      const response = await fetch(`${API_URL}/api/chatbot-auth/authorize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        toastService.success("Liên kết thành công!");
        // Tự động chuyển về Zalo sau 2 giây
        setTimeout(() => {
          window.location.href = "zalo://conversation?phone=0842034755";
        }, 2000);
      } else {
        toastService.error(data.error || "Uỷ quyền thất bại!");
      }
    } catch (err) {
      toastService.error("Có lỗi xảy ra khi uỷ quyền.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FE] p-4 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Uỷ quyền thành công!</h2>
          <p className="text-gray-500 mb-6">Tài khoản Zalo của bạn đã được kết nối với hệ thống ZenTask. Bạn có thể quay lại Zalo để tiếp tục.</p>
          <button onClick={() => (window.location.href = "zalo://")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors">
            Mở Zalo ngay
          </button>
          <button
            onClick={() => navigate("/")}
            disabled={loading}
            className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3.5 px-4 rounded-xl transition-colors mt-5 cursor-pointer"
          >
            Quay về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FE] p-4 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        <img src="/logo.png" alt="ZenTask Logo" className="w-16 h-16 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Liên kết tài khoản Zalo</h2>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">
          Zalo Bot <strong>ZenTask Mentor</strong> đang yêu cầu quyền truy cập vào tiến trình học tập của tài khoản <br />
          <span className="font-semibold text-gray-800">{user?.email}</span>
        </p>

        <div className="bg-blue-50 rounded-2xl p-4 mb-6 text-left border border-blue-100">
          <h3 className="font-bold text-blue-900 text-sm mb-2">Quyền truy cập bao gồm:</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">✓</span> Xem tiến độ Flashcard & Quiz
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">✓</span> Xem thông tin chuỗi học (Streak)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">✓</span> Nhận nhắc nhở lịch học qua Zalo
            </li>
          </ul>
        </div>

        <button
          onClick={handleAuthorize}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 mb-3"
        >
          {loading ? "Đang xử lý..." : "Chấp nhận uỷ quyền"}
        </button>
        <button
          onClick={() => navigate("/")}
          disabled={loading}
          className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3.5 px-4 rounded-xl transition-colors"
        >
          Hủy bỏ
        </button>
      </div>
    </div>
  );
}
