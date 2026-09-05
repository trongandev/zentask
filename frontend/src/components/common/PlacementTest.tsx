import React, { useState, useEffect } from "react";
import { Volume2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import axiosInstance from "../../services/axiosConfig";
import { useTTSAudio } from "../../hooks/useTTSAudio";

interface PlacementTestProps {
  selectedLang: string;
  onComplete: (levelId: string) => void;
  onCancel: () => void;
}

export const PlacementTest: React.FC<PlacementTestProps> = ({ selectedLang, onComplete, onCancel }) => {
  const { playAudio, stopAudio, isPlaying } = useTTSAudio();

  const [isLoading, setIsLoading] = useState(true);
  const [testData, setTestData] = useState<any>(null);
  const [activeQuestions, setActiveQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  
  const [currentPhase, setCurrentPhase] = useState<1 | 2 | 3>(1);
  const [branchPhase2, setBranchPhase2] = useState<string>("");
  const [branchPhase3, setBranchPhase3] = useState<string>("");

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [testError, setTestError] = useState<string>("");
  const [isConfirmingExitTest, setIsConfirmingExitTest] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem("zentask_placement_test");
    let restored = false;
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.selectedLang === selectedLang && parsed.testData && !parsed.evaluationResult) {
          setTestData(parsed.testData);
          setActiveQuestions(parsed.activeQuestions);
          setCurrentQuestionIndex(parsed.currentQuestionIndex);
          setUserAnswers(parsed.userAnswers);
          setCurrentPhase(parsed.currentPhase);
          setBranchPhase2(parsed.branchPhase2);
          setBranchPhase3(parsed.branchPhase3);
          setIsLoading(false);
          restored = true;
        }
      } catch (e) {
        console.error("Lỗi khi khôi phục bài test:", e);
      }
    }
    
    if (!restored) {
      handleStartTest();
    }
  }, [selectedLang]);

  useEffect(() => {
    if (testData && !isEvaluating && !evaluationResult) {
      const stateToSave = {
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
  }, [selectedLang, testData, activeQuestions, currentQuestionIndex, userAnswers, currentPhase, branchPhase2, branchPhase3, isEvaluating, evaluationResult]);

  const handleStartTest = async () => {
    setTestError("");
    setIsLoading(true);
    try {
      const res = await axiosInstance.get(`/api/user/placement-test?lang=${selectedLang}`);
      if (res.data.status === "success") {
        const data = res.data.data;
        setTestData(data);
        setActiveQuestions(data.phase1);
        setCurrentPhase(1);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
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
      processPhaseTransition(newAnswers);
    }
  };

  const processPhaseTransition = (currentAnswers: Record<string, string>) => {
    if (currentPhase === 1) {
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
      submitTest(currentAnswers);
    }
  };

  const submitTest = async (answers: Record<string, string>) => {
    setIsEvaluating(true);
    let totalScore = 0;
    Object.keys(answers).forEach((qid) => {
      const q = [...testData.phase1, ...testData.phase2[branchPhase2], ...testData.phase3[branchPhase3]].find((x) => x.id === qid);
      if (q && q.answer === answers[qid]) totalScore++;
    });

    let finalLevelId = branchPhase3;
    let score3 = 0;
    testData.phase3[branchPhase3].forEach((q: any) => {
      if (answers[q.id] === q.answer) score3++;
    });

    if (score3 === 6 && finalLevelId === "B2") finalLevelId = "C1";

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

  const getOverallProgress = () => {
    let passed = 0;
    if (currentPhase === 1) passed = currentQuestionIndex;
    if (currentPhase === 2) passed = 6 + currentQuestionIndex;
    if (currentPhase === 3) passed = 14 + currentQuestionIndex;
    return passed;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-20 text-center animate-in fade-in zoom-in">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-700 font-medium">Đang chuẩn bị bài thi cho bạn...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[450px]">
      {testError && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-center font-medium">{testError}</div>}
      
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
          <p className="text-slate-600 italic mb-4 max-w-md mx-auto bg-slate-50 p-4 rounded-xl border border-slate-100">"{evaluationResult.feedback}"</p>

          <div className="bg-blue-50 text-blue-700 p-4 rounded-xl mb-10 max-w-md mx-auto text-sm font-medium border border-blue-100 text-left">
            <span className="text-lg mr-2">🚀</span>
            Hệ thống sẽ tự động điều chỉnh lộ trình cho phù hợp với trình độ {evaluationResult.levelId}.
          </div>

          <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
            <Button
              onClick={() => onComplete(evaluationResult.levelId)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/30 transition-all active:scale-[0.98] text-lg border-b-4 border-indigo-800"
            >
              Tiếp tục với mức {evaluationResult.levelId}
            </Button>
          </div>
        </div>
      ) : activeQuestions.length > 0 ? (
        <div className="flex flex-col flex-1 animate-in slide-in-from-right-4 duration-300">
          {isConfirmingExitTest ? (
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
              <p className="text-red-700 font-medium">Bạn có chắc chắn muốn thoát? Bài test sẽ bị hủy bỏ.</p>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={() => setIsConfirmingExitTest(false)} className="flex-1 px-4 py-2 bg-white text-slate-600 hover:bg-slate-100 rounded-lg font-bold border border-slate-200">
                  Không
                </Button>
                <Button
                  onClick={() => {
                    localStorage.removeItem("zentask_placement_test");
                    setIsConfirmingExitTest(false);
                    onCancel();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm shadow-red-600/20"
                >
                  Thoát bài test
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsConfirmingExitTest(true)} className="self-start text-slate-500 hover:text-slate-800 font-medium mb-4 flex items-center text-sm">
              <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Thoát bài test
            </Button>
          )}

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
              <Button
                onClick={playTTS}
                disabled={isPlaying}
                className="self-start mb-6 p-4 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm disabled:opacity-50"
              >
                {isPlaying ? <Loader2 className="w-6 h-6 animate-spin" /> : <Volume2 className="w-6 h-6" />}
              </Button>
            )}

            <h3 className="text-2xl font-bold text-slate-800 mb-8 leading-snug">{activeQuestions[currentQuestionIndex]?.question}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
              {activeQuestions[currentQuestionIndex]?.options.map((opt: string, i: number) => (
                <Button
                  key={i}
                  onClick={() => handleAnswerTest(opt)}
                  className="p-5 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 text-left transition-all active:bg-indigo-100 shadow-sm"
                >
                  {opt}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-red-500 font-medium">Có lỗi xảy ra, không thể tải câu hỏi.</div>
      )}
    </div>
  );
};
