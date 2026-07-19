import axiosInstance from "@/src/services/axiosConfig";
import React, { useState } from "react";

export function Honeypot() {
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (message.length < 5) {
            setError("Vui lòng nhập ít nhất 5 kí tự.");
            return;
        }
        try {
            const res = await axiosInstance.post(`/api/public/banned-feedback`, {
                message,
            });
            const data = res.data;
            if (data.success) {
                setSuccess(true);
            } else {
                setError(data.message || "Có lỗi xảy ra.");
            }
        } catch (err) {
            setError("Không thể gửi phản hồi, vui lòng thử lại sau.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
            <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl max-w-lg w-full text-center">
                <h1 className="text-3xl font-extrabold text-indigo-600 mb-4 tracking-tight">Chào bạn, chúng ta nói chuyện một chút nhé!</h1>
                <p className="text-gray-600 mb-4 leading-relaxed">
                    Hệ thống của chúng tôi nhận thấy một số truy cập bất thường từ địa chỉ IP của bạn. Có vẻ như bạn đang cố gắng tìm hiểu cách hệ thống hoạt động hoặc kiểm tra các lỗ hổng bảo mật.
                </p>
                <p className="text-gray-600 mb-6 leading-relaxed">
                    Thay vì mất thời gian để tấn công một hệ thống học tập dành cho cộng đồng, tại sao chúng ta không hợp tác? Nếu bạn tìm thấy bất kỳ lỗi hoặc lỗ hổng nào, xin vui lòng đóng góp ý
                    kiến để chúng tôi cải thiện.
                </p>

                {!success ? (
                    <div className="flex flex-col gap-4">
                        <textarea
                            className="w-full h-32 p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-gray-800"
                            placeholder="Hãy nhập những góp ý, hoặc báo lỗi bạn tìm thấy tại đây... (nhỏ nhất 5 kí tự)"
                            value={message}
                            onChange={(e) => {
                                setMessage(e.target.value);
                                setError("");
                            }}
                        />
                        {error && <p className="text-red-500 font-medium text-sm text-left">{error}</p>}
                        <button onClick={handleSubmit} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm">
                            Gửi Góp Ý Yêu Thương
                        </button>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-sm text-gray-500 mb-3">Hoặc bạn có thể tham gia cộng đồng của chúng tôi để cùng học tập:</p>
                            <a
                                href="https://zalo.me/g/vappqohaaewiockcc9zc"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-3 px-6 rounded-xl transition-colors">
                                Tham gia cộng đồng Zalo
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                        <p className="text-green-600 font-bold text-lg mb-2">Cảm ơn bạn rất nhiều!</p>
                        <p className="text-green-700 text-sm">Đội ngũ phát triển sẽ ghi nhận đóng góp của bạn. Mong rằng bạn sẽ trở thành một phần của cộng đồng xây dựng hệ thống.</p>
                        <a
                            href="https://zalo.me/g/vappqohaaewiockcc9zc"
                            target="_blank"
                            rel="noreferrer"
                            className="mt-6 inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors">
                            Tham gia cộng đồng Zalo
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
