import React from "react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import axiosInstance from "../../services/axiosConfig";
import { Modal } from "../shared/Modal";

const LANGUAGES = [
  { code: "en", name: "Tiếng Anh" },
  { code: "zh", name: "Tiếng Trung" },
  { code: "ko", name: "Tiếng Hàn" },
  { code: "ja", name: "Tiếng Nhật" },
  { code: "de", name: "Tiếng Đức" },
  { code: "fr", name: "Tiếng Pháp" },
  { code: "es", name: "Tiếng TBN" },
  { code: "th", name: "Tiếng Thái" },
];

interface LanguageOverlayProps {
  onSelect: (langCode: string) => void;
  isOpen: boolean;
  canClose?: boolean;
  onClose?: () => void;
}

export const LanguageOverlay: React.FC<LanguageOverlayProps> = ({ onSelect, isOpen, canClose = false, onClose }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const { updateUser } = useAuth();

  if (!isOpen) return null;

  const handleSelectLanguage = async (code: string) => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.put("/api/user/language", { language: code });
      if (res.data.status === "success") {
        updateUser({ targetLanguage: code, learningLanguages: res.data.learningLanguages });
        onSelect(code);
      }
    } catch (error) {
      console.error("Lỗi khi chuyển ngôn ngữ", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !isLoading && canClose && onClose && onClose()} hideCloseButton={!canClose || isLoading} className="max-w-3xl p-8 relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-700 font-medium">Đang thiết lập hệ thống...</p>
        </div>
      )}
      
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-slate-800 mb-3">Bạn muốn học ngôn ngữ nào?</h2>
        <p className="text-slate-500 text-lg">Chọn một ngôn ngữ để bắt đầu. Bạn có thể thay đổi sau.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSelectLanguage(lang.code)}
            className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-blue-50 border-2 border-transparent hover:border-blue-400 rounded-2xl transition-all hover:scale-105 hover:shadow-lg group"
          >
            <div className="w-16 h-12 mb-4 rounded overflow-hidden">
              <img src={`/flag/${lang.code}.svg`} alt={lang.name} className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{lang.name}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
};
