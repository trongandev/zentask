import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toastService from "../../services/toastService";
import { useAuth } from "@/src/contexts/AuthContext";
import axiosInstance from "@/src/services/axiosConfig";

export function ZaloGo() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const { user } = useAuth();

    useEffect(() => {}, [user]);

    useEffect(() => {
        const checkLink = async () => {
            try {
                const response = await axiosInstance.get(`/api/chatbot-auth/info/${id}`);
                const data = response.data;

                if (data.success) {
                    navigate(`/authorize/${id}`, { replace: true });
                } else {
                    setError(data.error || "Link uỷ quyền không hợp lệ hoặc đã hết hạn!");
                }
            } catch (err) {
                setError("Đã xảy ra lỗi khi kiểm tra link uỷ quyền.");
            }
        };
        if (!user) {
            const relativeUrl = window.location.pathname + window.location.search;
            navigate(`/auth?redirect_url=${relativeUrl}`);
        } else if (id) {
            checkLink();
        }
    }, [user, id, navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FE] p-4 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">!</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Lỗi liên kết</h2>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <button onClick={() => navigate("/")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors">
                        Quay lại trang chủ
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE]">
            <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
    );
}
