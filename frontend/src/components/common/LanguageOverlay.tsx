import React, { useState } from "react";
import { Volume2, Loader2, ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import axiosInstance from "../../services/axiosConfig";
import { Modal } from "../ui/Modal";
import { LANGUAGE_LEVELS, getDefaultLevels } from "../../config/languageLevels";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { Button } from "@/src/components/ui/Button";
import { PlacementTest } from "./PlacementTest";

const LANGUAGES = [
  { code: "en", name: "Tiếng Anh", hot: true, badge: "Hot - 65% lựa chọn" },
  { code: "zh", name: "Tiếng Trung", hot: true, badge: "Hot - 20% lựa chọn" },
  { code: "ko", name: "Tiếng Hàn", hot: true, badge: "Hot" },
  { code: "ja", name: "Tiếng Nhật", hot: true, badge: "Hot" },
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

type Step = "LANGUAGE" | "LEVEL_OR_TEST" | "TEST";

export const LanguageOverlay: React.FC<LanguageOverlayProps> = ({ onSelect, isOpen, canClose = false, onClose }) => {
  const [step, setStep] = useState<Step>("LANGUAGE");
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [isConfirmingSwitch, setIsConfirmingSwitch] = useState(false);
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const [pendingLevelSelection, setPendingLevelSelection] = useState<string | null>(null);
  const [isConfirmingExitTest, setIsConfirmingExitTest] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const { playAudio, stopAudio, isPlaying } = useTTSAudio();

  const [testError, setTestError] = useState<string>("");

  const { user, updateUser } = useAuth();

  // Khôi phục state từ localStorage khi mở modal
  React.useEffect(() => {
    if (isOpen) {
      setIsConfirmingSwitch(false);
      const savedState = localStorage.getItem("zentask_placement_test");
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          // Only restore if we are in the middle of a test and not evaluating
          if (parsed.selectedLang && !parsed.evaluationResult) {
            setStep("TEST");
            setSelectedLang(parsed.selectedLang);
          }
        } catch (e) {
          console.error("Lỗi khi khôi phục bài test:", e);
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectLanguage = (code: string) => {
    setSelectedLang(code);
    setStep("LEVEL_OR_TEST");
  };

  const handleSelectLevel = async (level: string, skipTopics: boolean = false) => {
    if (!selectedLang) return;
    setIsLoading(true);
    try {
      const res = await axiosInstance.put("/api/user/language-level", { languageCode: selectedLang, level, skipTopics });
      if (res.data.status === "success") {
        updateUser({
          preferences: res.data.preferences,
          languageLevel: res.data.languageLevel,
        });
        onSelect(res.data.preferences?.language ? PREF_LANG_MAP[res.data.preferences.language] : "en");
        setStep("LANGUAGE");
        setIsConfirmingSwitch(false);
        localStorage.removeItem("zentask_placement_test");
      }
    } catch (error) {
      console.error("Lỗi khi chuyển ngôn ngữ/cấp độ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTest = () => {
    if (selectedLang !== "en") return;
    setTestError("");
    setStep("TEST");
  };

  const levels = selectedLang ? LANGUAGE_LEVELS[selectedLang] || getDefaultLevels() : [];


  const PREF_LANG_MAP: Record<string, string> = {
    "Tiếng Anh": "en",
    "Tiếng Nhật": "ja",
    "Tiếng Trung": "zh",
    "Tiếng Hàn": "ko",
  };
  const currentLangCode = PREF_LANG_MAP[user?.preferences?.language || "Tiếng Anh"] || "en";

  const hasSelectedLanguageAndLevel = !!(user?.preferences?.language && user?.languageLevel);
  const isTakingTest = step === "TEST";
  const canDismissModal = canClose && !isLoading && !isTakingTest;

  return (
    <Modal isOpen={isOpen} onClose={() => canDismissModal && onClose && onClose()} hideCloseButton={!canDismissModal} className="max-w-3xl p-8 relative overflow-hidden bg-white">
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-700 font-medium">{step === "TEST" ? "Đang chuẩn bị bài thi cho bạn..." : "Đang thiết lập hệ thống..."}</p>
        </div>
      )}

      {/* STEP 1: CHỌN NGÔN NGỮ */}
      {step === "LANGUAGE" && (
        <>
          {hasSelectedLanguageAndLevel && !isConfirmingSwitch ? (
            <div className="text-center mb-10 flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Ngôn ngữ hiện hành</h2>
              <div className="w-32 h-24 mb-6 rounded-xl overflow-hidden shadow-md border-4 border-slate-100">
                <img src={`/flag/${currentLangCode}.svg`} alt="Current Language" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-2xl font-bold text-slate-700 mb-2">{LANGUAGES.find((l) => l.code === currentLangCode)?.name || "Đang học"}</h3>
              <p className="text-slate-500 font-medium mb-10">Trình độ: {user.languageLevel || "Chưa xác định"}</p>

              {showSwitchWarning ? (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 mt-2 mb-6 flex flex-col items-center justify-center gap-4 animate-in fade-in max-w-sm w-full mx-auto text-center">
                  <p className="text-red-700 font-medium">Thay đổi ngôn ngữ sẽ reset lại các cài đặt lộ trình và sở thích học tập cũ. Bạn có chắc chắn không?</p>
                  <div className="flex gap-3 w-full">
                    <Button onClick={() => setShowSwitchWarning(false)} className="flex-1 px-4 py-3 bg-white text-slate-600 hover:bg-slate-100 rounded-xl font-bold border border-slate-200">
                      Hủy
                    </Button>
                    <Button
                      onClick={() => {
                        setShowSwitchWarning(false);
                        setIsConfirmingSwitch(true);
                      }}
                      className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-sm shadow-red-600/20"
                    >
                      Chuyển ngay
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setShowSwitchWarning(true)}
                  className="px-8 py-4 bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-200 hover:border-red-300 rounded-2xl font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  Chuyển ngôn ngữ học mới
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <h2 className="text-3xl font-extrabold text-slate-800 mb-3">Bạn muốn học ngôn ngữ nào?</h2>
                <p className="text-slate-500 text-lg">Chọn một ngôn ngữ để bắt đầu lộ trình học của bạn.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
                {LANGUAGES.map((lang) => (
                  <Button
                    key={lang.code}
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-blue-50 border-2 rounded-2xl transition-all hover:scale-105 hover:shadow-lg group",
                      lang.hot ? "border-indigo-100 hover:border-indigo-400 bg-gradient-to-b from-white to-indigo-50/30" : "border-transparent hover:border-blue-400",
                    )}
                  >
                    {lang.badge && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap z-10">
                        {lang.badge}
                      </span>
                    )}
                    <div className="w-16 h-12 mb-4 rounded overflow-hidden shadow-sm">
                      <img src={`/flag/${lang.code}.svg`} alt={lang.name} className="w-full h-full object-cover" />
                    </div>
                    <span className={cn("font-bold transition-colors", lang.hot ? "text-indigo-700" : "text-slate-700 group-hover:text-blue-600")}>{lang.name}</span>
                  </Button>
                ))}
              </div>

              {hasSelectedLanguageAndLevel && isConfirmingSwitch && (
                <Button onClick={() => setIsConfirmingSwitch(false)} className="mx-auto mt-4 text-slate-500 hover:text-slate-800 font-medium flex items-center justify-center w-full">
                  Hủy bỏ
                </Button>
              )}
            </>
          )}
        </>
      )}

      {/* STEP 2: CHỌN TRÌNH ĐỘ HOẶC LÀM TEST */}
      {step === "LEVEL_OR_TEST" && (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
          <Button onClick={() => setStep("LANGUAGE")} className="self-start text-slate-500 hover:text-slate-800 font-medium mb-6 flex items-center">
            <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Quay lại chọn ngôn ngữ
          </Button>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-slate-800 mb-3">Xác định trình độ của bạn</h2>
            <p className="text-slate-500">{selectedLang === "en" ? "Làm bài test ngắn để chúng tôi xây dựng lộ trình học phù hợp nhất với bạn." : "Chọn trình độ hiện tại của bạn để bắt đầu."}</p>
          </div>

          {testError && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-center font-medium">{testError}</div>}

          {pendingLevelSelection ? (
            <div className="flex flex-col items-center justify-center flex-1 animate-in zoom-in duration-300 text-center px-4 py-8">
              <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 border-4 border-blue-100 shadow-sm">
                <span className="text-3xl font-black">{pendingLevelSelection}</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4">Xác nhận chọn lộ trình</h3>
              <p className="text-slate-600 mb-6 text-lg"></p>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-8 max-w-md mx-auto shadow-sm">
                <p className="text-sm font-semibold text-amber-700 ">
                  <span className="mr-2 text-xl">⚠️</span>
                  Lưu ý: Nếu bạn tự chọn trình độ, hệ thống sẽ <strong>không</strong> bỏ qua các bài học trước đó. Nếu bạn muốn bỏ qua bài học để tới đúng trình độ của mình, vui lòng quay lại và chọn{" "}
                  <strong>Bắt đầu Test Năng lực</strong>.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm mx-auto">
                <Button onClick={() => setPendingLevelSelection(null)} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">
                  Quay về
                </Button>
                <Button
                  onClick={() => handleSelectLevel(pendingLevelSelection)}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all"
                >
                  Đồng ý
                </Button>
              </div>
            </div>
          ) : selectedLang === "en" ? (
            <div className="flex flex-col gap-4 max-w-md mx-auto w-full mb-8">
              <Button
                onClick={handleStartTest}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/30 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-1 border-b-4 border-indigo-800"
              >
                <span className="text-lg">Bắt đầu Test Năng lực</span>
                <span className="text-indigo-200 text-sm font-medium">Khuyên dùng • Chỉ mất 5 phút</span>
              </Button>

              <div className="mt-8">
                <p className="text-center text-sm font-medium text-slate-400 mb-4 uppercase tracking-widest">Hoặc tự chọn</p>
                <div className="grid grid-cols-2 gap-3 p-1">
                  {levels.map((lvl) => (
                    <Button
                      key={lvl.id}
                      onClick={() => setPendingLevelSelection(lvl.id)}
                      className="p-3 bg-white border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-xl text-center transition-all group"
                    >
                      <span className="font-bold text-slate-700 block mb-1">{lvl.id}</span>
                      <span className="text-xs text-slate-500 line-clamp-2">{lvl.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-h-[50vh] overflow-y-auto p-1">
              {levels.map((lvl) => (
                <Button
                  key={lvl.id}
                  onClick={() => setPendingLevelSelection(lvl.id)}
                  className="flex flex-col items-start p-4 bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl text-left transition-all group"
                >
                  <span className="font-bold text-slate-800 group-hover:text-blue-700 mb-1">{lvl.name}</span>
                  <span className="text-sm text-slate-500">{lvl.description}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: LÀM BÀI TEST & ĐÁNH GIÁ */}
      {step === "TEST" && selectedLang && (
        <PlacementTest
          selectedLang={selectedLang}
          onComplete={(levelId) => handleSelectLevel(levelId, true)}
          onCancel={() => setStep("LEVEL_OR_TEST")}
        />
      )}
    </Modal>
  );
};
