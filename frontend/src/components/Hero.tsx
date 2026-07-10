import { Play } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

export function Hero() {
    const { user } = useAuth();
    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-50 to-blue-100/50 p-10 flex items-center justify-between border border-blue-100">
            {/* Decorative background elements matching the image */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                <div className="absolute right-0 top-0 bottom-0 w-[50%] opacity-90">
                    <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="w-full h-full text-blue-200">
                        {/* Sunrise and mountains abstract */}
                        <circle cx="300" cy="150" r="80" fill="#fff9e6" />
                        <path d="M150 200 L250 100 L400 200 Z" fill="#e0f2fe" opacity="0.6" />
                        <path d="M250 200 L320 130 L400 200 Z" fill="#bae6fd" opacity="0.6" />
                    </svg>
                </div>
                {/* Lotus illustration right aligned */}
                <div className="absolute right-4 bottom-0 w-64 h-64 opacity-100 drop-shadow-2xl">
                    <img src="/mascot/Lopy (1).png" alt="Mascot" className="w-full h-full object-contain object-bottom" />
                </div>
            </div>

            <div className="relative z-10 max-w-xl">
                <p className="text-gray-600 font-medium mb-2 flex items-center gap-2">
                    Chào mừng trở lại, {user?.displayName || "bạn"}! <span className="text-xl">👋</span>
                </p>
                <h2 className="text-4xl font-extrabold text-blue-900 mb-4 tracking-tight leading-tight">
                    Học tập hiệu quả hơn
                    <br />
                    mỗi ngày
                </h2>
                <p className="text-gray-600 mb-8 text-lg">Mỗi ngày một chút tiến bộ, tương lai rộng mở.</p>
                <Link to="/beginner">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                        <Play className="w-5 h-5 fill-current" />
                        Tiếp tục học ngay
                    </button>
                </Link>
            </div>
        </div>
    );
}
