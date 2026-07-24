import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Volume2, Mic, ArrowRight, Check, X, SkipForward, Loader2 } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { usePronunciationAssessment, pickWords } from "../../hooks/usePronunciationAssessment";
import { cn } from "../../lib/utils";
import toastService from "@/src/services/toastService";
import { beginnerService } from "../../services/beginnerService";

import { Round1Listen } from "../../components/beginner/practice/Round1Listen";
import { Round2ChooseMeaning } from "../../components/beginner/practice/Round2ChooseMeaning";
import { Round3Pronunciation } from "../../components/beginner/practice/Round3Pronunciation";
import { Round4CompleteWord } from "../../components/beginner/practice/Round4CompleteWord";
import { Round5FillBlank } from "../../components/beginner/practice/Round5FillBlank";
import { Round6ReverseQuiz } from "../../components/beginner/practice/Round6ReverseQuiz";
import { Round7WordBuilder } from "../../components/beginner/practice/Round7WordBuilder";
import { RoundPlaceholder } from "../../components/beginner/practice/RoundPlaceholders";
import axiosInstance from "@/src/services/axiosConfig";
import { useUserStore } from "@/src/services/userService";
import { Button } from "@/src/components/ui/Button";

type RoundType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function BeginnerLessonPractice() {
  const { topicId, lessonIndex } = useParams();
  const navigate = useNavigate();
  const { playAudio, preloadAudio } = useTTSAudio();
  const [words, setWords] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState<RoundType>(1);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const [knownWordIds, setKnownWordIds] = useState<string[]>([]);

  const [mistakes, setMistakes] = useState<{ word: any; round: RoundType }[]>([]);
  const [isReviewPhase, setIsReviewPhase] = useState(false);
  const [skipCount, setSkipCount] = useState(0);

  // States for interactive inputs
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const lessonId = `${topicId}_${lessonIndex}`;
    const savedState = localStorage.getItem(`beginner_lesson_progress_${lessonId}`);

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setWords(parsed.words);
        setCurrentRound(parsed.currentRound);
        setCurrentWordIndex(parsed.currentWordIndex);
        setKnownWordIds(parsed.knownWordIds);
        if (parsed.mistakes) setMistakes(parsed.mistakes);
        if (parsed.isReviewPhase) setIsReviewPhase(parsed.isReviewPhase);
        if (parsed.skipCount !== undefined) setSkipCount(parsed.skipCount);
        return;
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }

    const fetchLessonData = async () => {
      try {
        const res = await axiosInstance.get(`/api/beginner/lesson/${topicId}`);
        if (res.status === 200) {
          const set = res.data;
          if (set && set.words) {
            const idx = Number(lessonIndex) || 0;
            const startIndex = idx * 5;
            const lessonWords = set.words.slice(startIndex, startIndex + 5);

            if (lessonWords.length === 0) {
              navigate("/beginner");
            } else {
              setWords([...lessonWords].sort(() => Math.random() - 0.5));
            }
          }
        } else {
          navigate("/beginner");
        }
      } catch (err) {
        console.error("Failed to fetch lesson data", err);
        navigate("/beginner");
      }
    };

    fetchLessonData();
  }, [topicId, lessonIndex, navigate]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (words.length === 0) return;
    const lessonId = `${topicId}_${lessonIndex}`;
    const stateToSave = {
      words,
      currentRound,
      currentWordIndex,
      knownWordIds,
      mistakes,
      isReviewPhase,
      skipCount,
    };
    localStorage.setItem(`beginner_lesson_progress_${lessonId}`, JSON.stringify(stateToSave));
  }, [words, currentRound, currentWordIndex, knownWordIds, topicId, lessonIndex, mistakes, isReviewPhase, skipCount]);

  const activeWords = useMemo(() => {
    let filtered = words.filter((w) => !knownWordIds.includes(w.id));
    if (currentRound === 6 && !isReviewPhase) {
      return filtered.slice(0, 3);
    }
    return filtered;
  }, [words, knownWordIds, currentRound, isReviewPhase]);

  const validRounds = useMemo(() => {
    if (words.length === 0) return [1, 2, 3, 4, 5, 6, 7] as RoundType[];
    const sampleWord = words[0];
    const lang = sampleWord?.language || "";
    const isEng = lang === "en" || /^[a-zA-Z\s.,!?'-]+$/.test(sampleWord.term);
    const nonLatin = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0E00-\u0E7F]/;
    const isLatin = !nonLatin.test(sampleWord.term);

    const rounds: RoundType[] = [1, 2];
    if (isEng) rounds.push(3);
    if (isLatin) {
      rounds.push(4);
      rounds.push(5);
    }
    rounds.push(6);
    rounds.push(7);
    return rounds.sort((a, b) => a - b);
  }, [words]);

  const currentWord = isReviewPhase && mistakes.length > 0 ? mistakes[0].word : activeWords[currentWordIndex];
  const activeRound = isReviewPhase && mistakes.length > 0 ? mistakes[0].round : currentRound;

  useEffect(() => {
    if (currentWord) {
      preloadAudio(currentWord.term);
    }
  }, [currentWord, preloadAudio]);

  // Helper to move to next word or next round
  const proceedToNext = (isSkipped: boolean) => {
    let newMistakes = [...mistakes];

    if (!isSkipped) {
      if (isReviewPhase) {
        if (isCorrect === true) {
          newMistakes.shift();
        } else if (isCorrect === false) {
          const failed = newMistakes.shift();
          if (failed) newMistakes.push(failed);
        }
      } else {
        if (isCorrect === false) {
          newMistakes.push({ word: currentWord, round: currentRound });
        }
      }
    } else {
      if (isReviewPhase) {
        newMistakes.shift();
      }
    }

    setMistakes(newMistakes);
    setIsCorrect(null);
    setSelectedAnswer(null);
    setInputText("");

    if (isReviewPhase) {
      if (newMistakes.length === 0) {
        finishLesson();
      }
      return;
    }

    if (currentWordIndex + 1 < activeWords.length) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      // Move to next round
      const currentIndex = validRounds.indexOf(currentRound);
      if (currentIndex !== -1 && currentIndex + 1 < validRounds.length) {
        setCurrentRound(validRounds[currentIndex + 1]);
        setCurrentWordIndex(0);
        // Reshuffle for next round
        setWords((prev) => [...prev].sort(() => Math.random() - 0.5));
      } else {
        // FINISHED ALL ROUNDS
        if (newMistakes.length > 0) {
          setIsReviewPhase(true);
          toastService.error("Giờ là lúc ôn tập lại những từ chưa đúng!");
        } else {
          finishLesson();
        }
      }
    }
  };

  const nextStep = () => proceedToNext(false);
  const skipStep = () => {
    if (skipCount >= 5) return;
    setSkipCount((prev) => prev + 1);
    proceedToNext(true);
  };

  const finishLesson = async () => {
    setIsSubmitting(true);
    try {
      const lessonId = `${topicId}_${lessonIndex}`;
      await beginnerService.saveLessonProgress(lessonId);
      // Delete progress from localStorage after success
      localStorage.removeItem(`beginner_lesson_progress_${lessonId}`);
      toastService.success("Chúc mừng bạn đã hoàn thành bài học! + 10XP");
      navigate("/beginner");
    } catch (err) {
      console.error(err);
      toastService.error("Có lỗi xảy ra khi lưu tiến trình!");
    }
    setIsSubmitting(false);
  };

  const handleKnowWord = () => {
    if (currentWord) {
      setKnownWordIds((prev) => [...prev, currentWord.id]);
      if (activeWords.length <= 1) {
        // If they know all words, finish lesson early?
        // For now just move to next step, it will auto-calculate
      }
      nextStep();
    }
  };

  // Derived state for correct answer display
  const getCorrectAnswerDisplay = () => {
    if (!currentWord) return "";
    if (activeRound === 7) {
      return (currentWord.examples?.[0]?.en || currentWord.example?.[0]?.en || currentWord.term).trim();
    }
    return currentWord.term;
  };

  if (!currentWord && activeWords.length > 0) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (activeWords.length === 0 && words.length > 0) {
    // Knew all words
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold mb-4">Tuyệt vời, bạn đã biết hết các từ này!</h2>
        <Button onClick={finishLesson} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold">
          {isSubmitting ? "Đang lưu..." : "Hoàn thành bài học"}
        </Button>
      </div>
    );
  }

  const checkAnswer = (correct: boolean) => {
    if (isCorrect !== null) return;
    setIsCorrect(correct);
    if (currentWord) {
      let targetText = currentWord.term;
      if (activeRound === 7) {
        targetText = (currentWord.examples?.[0]?.en || currentWord.example?.[0]?.en || currentWord.term).trim();
      }
      playAudio(targetText, undefined, correct ? "correct" : "wrong");
    }
  };
  return (
    <div className="max-w-xl mx-auto w-full pt-8 px-4 flex flex-col min-h-[80vh]">
      {/* Progress Bar */}
      <div className="flex items-center gap-4 mb-8">
        <Button onClick={() => navigate("/beginner")} className="text-slate-400 hover:text-slate-700">
          <X className="w-6 h-6" />
        </Button>
        <div className="flex-1 bg-slate-200 h-4 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-300"
            style={{
              width: `${(((validRounds.indexOf(currentRound) !== -1 ? validRounds.indexOf(currentRound) : 0) * activeWords.length + currentWordIndex) / (validRounds.length * activeWords.length)) * 100}%`,
            }}
          />
        </div>
        <div className="text-sm font-bold text-slate-500">{isReviewPhase ? `Ôn tập (${mistakes.length} câu)` : `Vòng ${validRounds.indexOf(currentRound) + 1}/${validRounds.length}`}</div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center pb-24">
        {activeRound === 1 && <Round1Listen key={currentWord?.id} currentWord={currentWord} />}

        {activeRound === 2 && (
          <Round2ChooseMeaning
            key={currentWord?.id}
            topicId={topicId}
            currentWord={currentWord}
            allLessonWords={words}
            isCorrect={isCorrect}
            onCheckAnswer={(answer, correct) => {
              setSelectedAnswer(answer);
              checkAnswer(correct);
            }}
          />
        )}

        {activeRound === 3 && <Round3Pronunciation key={currentWord?.id} currentWord={currentWord} isCorrect={isCorrect} setIsCorrect={setIsCorrect} />}

        {activeRound === 4 && <Round4CompleteWord key={currentWord?.id} currentWord={currentWord} isCorrect={isCorrect} onCheckAnswer={checkAnswer} />}

        {activeRound === 5 && (
          <Round5FillBlank
            key={currentWord?.id}
            topicId={topicId}
            currentWord={currentWord}
            allLessonWords={words}
            isCorrect={isCorrect}
            onCheckAnswer={(answer, correct) => {
              setSelectedAnswer(answer);
              checkAnswer(correct);
            }}
          />
        )}

        {activeRound === 6 && (
          <Round6ReverseQuiz
            key={currentWord?.id}
            topicId={topicId}
            currentWord={currentWord}
            allLessonWords={words}
            isCorrect={isCorrect}
            onCheckAnswer={(answer, correct) => {
              setSelectedAnswer(answer);
              checkAnswer(correct);
            }}
          />
        )}

        {activeRound === 7 && (
          <Round7WordBuilder
            key={currentWord?.id}
            currentWord={currentWord}
            isCorrect={isCorrect}
            onCheckAnswer={(answer, correct) => {
              setSelectedAnswer(answer);
              checkAnswer(correct);
            }}
          />
        )}
      </div>

      {/* Footer Controls */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          {activeRound === 1 ? (
            <>
              <Button onClick={handleKnowWord} className="font-bold text-slate-500 px-6 py-3 hover:bg-slate-100 rounded-2xl">
                Tôi đã biết từ này
              </Button>
              <Button onClick={nextStep} className="font-bold text-white bg-blue-500 hover:bg-blue-600 px-8 py-3 rounded-2xl flex items-center gap-2">
                Tiếp tục <ArrowRight className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <div
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all",
                isCorrect === true ? "bg-green-100 text-green-800 animate-in slide-in-from-bottom-2" : isCorrect === false ? "bg-red-100 text-red-800 animate-shake" : "bg-transparent",
              )}
            >
              <div className="flex flex-col">
                {isCorrect === true && (
                  <span className="font-bold flex items-center gap-2">
                    <Check className="w-6 h-6" /> Tuyệt vời!
                  </span>
                )}
                {isCorrect === false && (
                  <span className="font-bold flex items-center gap-2">
                    <X className="w-6 h-6" /> Đáp án đúng: {getCorrectAnswerDisplay()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {isCorrect === null && (
                  <Button
                    onClick={skipStep}
                    disabled={skipCount >= 5}
                    className={cn(
                      "font-bold px-6 py-3 rounded-2xl transition-all",
                      skipCount >= 5 ? "text-slate-300 bg-slate-50 cursor-not-allowed" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    Bỏ qua {skipCount < 5 ? `(${5 - skipCount})` : "(Hết lượt)"}
                  </Button>
                )}
                <Button
                  onClick={nextStep}
                  className={cn(
                    "font-bold px-8 py-3 rounded-2xl flex items-center gap-2",
                    isCorrect === null ? "text-white bg-blue-500 hover:bg-blue-600" : isCorrect === true ? "text-white bg-green-500 hover:bg-green-600" : "text-white bg-red-500 hover:bg-red-600",
                  )}
                >
                  {isCorrect === null ? "Kiểm tra" : "Tiếp tục"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
