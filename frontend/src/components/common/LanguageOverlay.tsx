import React, { useState } from "react";
import { Volume2, Loader2, ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import axiosInstance from "../../services/axiosConfig";
import { Modal } from "../shared/Modal";
import { LANGUAGE_LEVELS, getDefaultLevels } from "../../config/languageLevels";
import { useTTSAudio } from "../../hooks/useTTSAudio";

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

type Step = "LANGUAGE" | "LEVEL_OR_TEST" | "TEST";

export const LanguageOverlay: React.FC<LanguageOverlayProps> = ({ onSelect, isOpen, canClose = false, onClose }) => {
  const [step, setStep] = useState<Step>("LANGUAGE");
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const { playAudio, stopAudio, isPlaying } = useTTSAudio();

  // Adaptive Test State
  const [testData, setTestData] = useState<any>(null);
  const [activeQuestions, setActiveQuestions] = useState<any[]>([]); // Current phase questions
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  const [currentPhase, setCurrentPhase] = useState<1 | 2 | 3>(1);
  const [branchPhase2, setBranchPhase2] = useState<string>("");
  const [branchPhase3, setBranchPhase3] = useState<string>("");

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [testError, setTestError] = useState<string>("");

  const { updateUser } = useAuth();

  // Khôi phục state từ localStorage khi mở modal
  React.useEffect(() => {
    if (isOpen) {
      const savedState = localStorage.getItem("zentask_placement_test");
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          // Only restore if we are in the middle of a test and not evaluating
          if (parsed.step === "TEST" && parsed.selectedLang === "en") {
            setStep(parsed.step);
            setSelectedLang(parsed.selectedLang);
            setTestData(parsed.testData);
            setActiveQuestions(parsed.activeQuestions);
            setCurrentQuestionIndex(parsed.currentQuestionIndex);
            setUserAnswers(parsed.userAnswers);
            setCurrentPhase(parsed.currentPhase);
            setBranchPhase2(parsed.branchPhase2);
            setBranchPhase3(parsed.branchPhase3);
          }
        } catch (e) {
          console.error("Lỗi khi khôi phục bài test:", e);
        }
      }
    }
  }, [isOpen]);

  // Lưu state vào localStorage mỗi khi có thay đổi trong lúc thi
  React.useEffect(() => {
    if (step === "TEST" && testData && !isEvaluating && !evaluationResult) {
      const stateToSave = {
        step,
        selectedLang,
        testData,
        activeQuestions,
        currentQuestionIndex,
        userAnswers,
        currentPhase,
        branchPhase2,
        branchPhase3,
      };
      localStorage.setItem("zentask_placement_test", JSON.stringify(stateToSave));
    }
  }, [step, selectedLang, testData, activeQuestions, currentQuestionIndex, userAnswers, currentPhase, branchPhase2, branchPhase3, isEvaluating, evaluationResult]);

  if (!isOpen) return null;

  const handleSelectLanguage = (code: string) => {
    setSelectedLang(code);
    setStep("LEVEL_OR_TEST");
  };

  const handleSelectLevel = async (level: string) => {
    if (!selectedLang) return;
    setIsLoading(true);
    try {
      const res = await axiosInstance.put("/api/user/language-level", { languageCode: selectedLang, level });
      if (res.data.status === "success") {
        updateUser({ targetLanguage: res.data.targetLanguage, learningLanguages: res.data.learningLanguages });
        onSelect(res.data.targetLanguage);
        setStep("LANGUAGE");
        localStorage.removeItem("zentask_placement_test");
      }
    } catch (error) {
      console.error("Lỗi khi chuyển ngôn ngữ/cấp độ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTest = async () => {
    if (selectedLang !== "en") return;
    setTestError("");
    setIsLoading(true);
    try {
      const res = await axiosInstance.get(`/api/user/placement-test?lang=en`);
      if (res.data.status === "success") {
        const data = res.data.data;
        setTestData(data);
        setActiveQuestions(data.phase1);
        setCurrentPhase(1);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setStep("TEST");
      }
    } catch (error: any) {
      console.error("Lỗi khi tạo bài test", error);
      setTestError(error.response?.data?.error || "Không thể tải bài test lúc này. Vui lòng chọn level tay.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerTest = (answer: string) => {
    const q = activeQuestions[currentQuestionIndex];
    const newAnswers = { ...userAnswers, [q.id]: answer };
    setUserAnswers(newAnswers);
    stopAudio();

    if (currentQuestionIndex < activeQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Phase completed, calculate branch and move to next
      processPhaseTransition(newAnswers);
    }
  };

  const processPhaseTransition = (currentAnswers: Record<string, string>) => {
    if (currentPhase === 1) {
      // Calculate score for phase 1 (6 questions)
      let score1 = 0;
      testData.phase1.forEach((q: any) => {
        if (currentAnswers[q.id] === q.answer) score1++;
      });

      let nextBranch = "A2_B1";
      if (score1 >= 5) nextBranch = "B1_B2";
      else if (score1 <= 2) nextBranch = "A1_A2";

      setBranchPhase2(nextBranch);
      setActiveQuestions(testData.phase2[nextBranch]);
      setCurrentPhase(2);
      setCurrentQuestionIndex(0);
    } else if (currentPhase === 2) {
      // Calculate score for phase 2 (8 questions)
      let score2 = 0;
      testData.phase2[branchPhase2].forEach((q: any) => {
        if (currentAnswers[q.id] === q.answer) score2++;
      });

      let nextBranch = "B1";
      if (branchPhase2 === "A1_A2") {
        nextBranch = score2 >= 5 ? "A2" : "A1";
      } else if (branchPhase2 === "A2_B1") {
        nextBranch = score2 >= 5 ? "B1" : "A2";
      } else if (branchPhase2 === "B1_B2") {
        nextBranch = score2 >= 5 ? "B2" : "B1";
      }

      setBranchPhase3(nextBranch);
      setActiveQuestions(testData.phase3[nextBranch]);
      setCurrentPhase(3);
      setCurrentQuestionIndex(0);
    } else if (currentPhase === 3) {
      // Phase 3 finished, submit test
      submitTest(currentAnswers);
    }
  };

  const submitTest = async (answers: Record<string, string>) => {
    setIsEvaluating(true);

    // Calculate total score internally just for logging
    let totalScore = 0;
    Object.keys(answers).forEach((qid) => {
      // find question
      const q = [...testData.phase1, ...testData.phase2[branchPhase2], ...testData.phase3[branchPhase3]].find((x) => x.id === qid);
      if (q && q.answer === answers[qid]) totalScore++;
    });

    // The final level is branchPhase3, but if they aced phase 3, maybe push them higher?
    // Let's just use branchPhase3 as the baseline
    let finalLevelId = branchPhase3;
    let score3 = 0;
    testData.phase3[branchPhase3].forEach((q: any) => {
      if (answers[q.id] === q.answer) score3++;
    });

    if (score3 === 6 && finalLevelId === "B2") finalLevelId = "C1"; // Ceiling check

    try {
      const res = await axiosInstance.post("/api/user/placement-test/evaluate", {
        lang: selectedLang,
        finalLevelId,
        totalScore,
      });
      if (res.data.status === "success") {
        setEvaluationResult(res.data.evaluation);
        localStorage.removeItem("zentask_placement_test");
      }
    } catch (error: any) {
      console.error("Lỗi khi đánh giá", error);
      setTestError("Không thể đánh giá kết quả lúc này.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const playTTS = () => {
    const q = activeQuestions[currentQuestionIndex];
    if (q && q.audioText) {
      playAudio(q.audioText);
    }
  };

  const levels = selectedLang ? LANGUAGE_LEVELS[selectedLang] || getDefaultLevels() : [];

  // Progress text based on total questions (6 + 8 + 6 = 20)
  const getOverallProgress = () => {
    let passed = 0;
    if (currentPhase === 1) passed = currentQuestionIndex;
    if (currentPhase === 2) passed = 6 + currentQuestionIndex;
    if (currentPhase === 3) passed = 14 + currentQuestionIndex;
    return passed;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isLoading && canClose && step === "LANGUAGE" && onClose && onClose()}
      hideCloseButton={!canClose || isLoading || step === "TEST"}
      className="max-w-3xl p-8 relative overflow-hidden bg-white"
    >
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-700 font-medium">{step === "TEST" ? "Đang chuẩn bị bài thi cho bạn..." : "Đang thiết lập hệ thống..."}</p>
        </div>
      )}

      {/* STEP 1: CHỌN NGÔN NGỮ */}
      {step === "LANGUAGE" && (
        <>
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
                <div className="w-16 h-12 mb-4 rounded overflow-hidden shadow-sm">
                  <img src={`/flag/${lang.code}.svg`} alt={lang.name} className="w-full h-full object-cover" />
                </div>
                <span className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{lang.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* STEP 2: CHỌN TRÌNH ĐỘ HOẶC LÀM TEST */}
      {step === "LEVEL_OR_TEST" && (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
          <button onClick={() => setStep("LANGUAGE")} className="self-start text-slate-500 hover:text-slate-800 font-medium mb-6 flex items-center">
            <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Quay lại chọn ngôn ngữ
          </button>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-slate-800 mb-3">Xác định trình độ của bạn</h2>
            <p className="text-slate-500">{selectedLang === "en" ? "Làm bài test ngắn để chúng tôi xây dựng lộ trình học phù hợp nhất với bạn." : "Chọn trình độ hiện tại của bạn để bắt đầu."}</p>
          </div>

          {testError && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-center font-medium">{testError}</div>}

          {selectedLang === "en" ? (
            <div className="flex flex-col gap-4 max-w-md mx-auto w-full mb-8">
              <button
                onClick={handleStartTest}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/30 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-1 border-b-4 border-indigo-800"
              >
                <span className="text-lg">Bắt đầu Test Năng lực</span>
                <span className="text-indigo-200 text-sm font-medium">Khuyên dùng • Chỉ mất 5 phút</span>
              </button>

              <div className="mt-8">
                <p className="text-center text-sm font-medium text-slate-400 mb-4 uppercase tracking-widest">Hoặc tự chọn</p>
                <div className="grid grid-cols-2 gap-3 max-h-[30vh] overflow-y-auto p-1">
                  {levels.map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => handleSelectLevel(lvl.id)}
                      className="p-3 bg-white border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-xl text-center transition-all group"
                    >
                      <span className="font-bold text-slate-700 block mb-1">{lvl.id}</span>
                      <span className="text-xs text-slate-500 line-clamp-2">{lvl.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-h-[50vh] overflow-y-auto p-1">
              {levels.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => handleSelectLevel(lvl.id)}
                  className="flex flex-col items-start p-4 bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl text-left transition-all group"
                >
                  <span className="font-bold text-slate-800 group-hover:text-blue-700 mb-1">{lvl.name}</span>
                  <span className="text-sm text-slate-500">{lvl.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: LÀM BÀI TEST & ĐÁNH GIÁ */}
      {step === "TEST" && (
        <div className="flex flex-col min-h-[450px]">
          {isEvaluating ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-10 animate-in fade-in zoom-in">
              <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-6" />
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Đang phân tích kết quả...</h3>
              <p className="text-slate-500">Hệ thống đang đánh giá câu trả lời để xếp lớp chính xác cho bạn.</p>
            </div>
          ) : evaluationResult ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-6 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 text-4xl shadow-inner border-4 border-white ring-4 ring-green-50">🎉</div>
              <h3 className="text-3xl font-black text-slate-800 mb-2">
                Trình độ của bạn: <span className="text-indigo-600 px-3 py-1 bg-indigo-50 rounded-lg ml-1">{evaluationResult.levelId}</span>
              </h3>
              <p className="text-lg font-medium text-slate-500 mb-3">
                Bạn trả lời đúng: <span className="text-green-600 font-bold">{evaluationResult.score}/20</span> câu
              </p>
              <p className="text-slate-600 italic mb-10 max-w-md mx-auto bg-slate-50 p-4 rounded-xl border border-slate-100">"{evaluationResult.feedback}"</p>

              <button
                onClick={() => handleSelectLevel(evaluationResult.levelId)}
                className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/30 transition-all active:scale-[0.98] text-lg border-b-4 border-indigo-800"
              >
                Bắt đầu học ngay ở mức {evaluationResult.levelId}
              </button>
            </div>
          ) : activeQuestions.length > 0 ? (
            <div className="flex flex-col flex-1 animate-in slide-in-from-right-4 duration-300">
              <button
                onClick={() => {
                  if (window.confirm("Bạn có chắc chắn muốn thoát? Bài test sẽ bị hủy bỏ.")) {
                    setStep("LEVEL_OR_TEST");
                    localStorage.removeItem("zentask_placement_test");
                  }
                }}
                className="self-start text-slate-500 hover:text-slate-800 font-medium mb-4 flex items-center text-sm"
              >
                <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Thoát bài test, tự chọn trình độ
              </button>

              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  Bài đánh giá <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mx-2"></span> Giai đoạn {currentPhase}
                </span>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold">{getOverallProgress() + 1} / 20</span>
              </div>

              <div className="w-full bg-slate-100 h-2.5 rounded-full mb-8 overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-500 ease-out" style={{ width: `${(getOverallProgress() / 20) * 100}%` }} />
              </div>

              <div className="flex-1 flex flex-col justify-center">
                {activeQuestions[currentQuestionIndex]?.audioText && (
                  <button
                    onClick={playTTS}
                    disabled={isPlaying}
                    className="self-start mb-6 p-4 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm disabled:opacity-50"
                  >
                    {isPlaying ? <Loader2 className="w-6 h-6 animate-spin" /> : <Volume2 className="w-6 h-6" />}
                  </button>
                )}

                <h3 className="text-2xl font-bold text-slate-800 mb-8 leading-snug">{activeQuestions[currentQuestionIndex]?.question}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
                  {activeQuestions[currentQuestionIndex]?.options.map((opt: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleAnswerTest(opt)}
                      className="p-5 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 text-left transition-all active:bg-indigo-100 shadow-sm"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-red-500 font-medium">Có lỗi xảy ra, không thể tải câu hỏi.</div>
          )}
        </div>
      )}
    </Modal>
  );
};
