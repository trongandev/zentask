import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Swords, Trophy, X, User, Users, CheckCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { cn } from "../lib/utils";
import { generateArenaDeck, Word, RANK_TOPIC_CONFIG } from "../config/rankTopicConfig";
import { ArenaGameRenderer } from "./ArenaGameRenderer";
import { RankCard } from "../components/shared/RankCard";

const ARENA_TIPS = [
  "Tập trung và phản xạ nhanh sẽ mang lại cho bạn nhiều điểm số hơn!",
  "Cố gắng trả lời nhanh nhưng hãy chắc chắn, sai lầm có thể khiến bạn mất cơ hội lật kèo.",
  "Từ vựng X2 Điểm có thể là chìa khóa giúp bạn chiến thắng, đừng bỏ lỡ!",
  "Càng leo lên Rank cao, độ khó của từ vựng sẽ càng tăng lên. Hãy chuẩn bị tinh thần!",
  "Chế độ Gõ Từ (Typing) yêu cầu độ chính xác tuyệt đối, hãy chú ý chính tả.",
  "Đấu hạng là nơi thể hiện trình độ, giữ vững tâm lý khi gặp đối thủ mạnh nhé.",
];

export function Arena() {
  const { user, updateUser } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // Game state
  const [matchState, setMatchState] = useState<"selecting" | "searching" | "found" | "playing" | "finished">("selecting");
  const [matchData, setMatchData] = useState<{ modes?: string[]; mode?: string; cards: Word[]; x2Indices: number[] } | null>(null);
  const [opponent, setOpponent] = useState<any>(null);

  const [roomCode, setRoomCode] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(10);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [oppAnswered, setOppAnswered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAnsweredRef = useRef(false);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const [rankUpdateStatus, setRankUpdateStatus] = useState<string | null>(null);

  // New tracking states
  const [searchElapsed, setSearchElapsed] = useState(0);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchStartTimeRef = useRef(0);
  const [prepCountdown, setPrepCountdown] = useState(7);
  const [currentTip, setCurrentTip] = useState("");

  useEffect(() => {
    hasAnsweredRef.current = hasAnswered;
  }, [hasAnswered]);

  useEffect(() => {
    if (!socket || !user) return;

    const onMatchFound = (data: any) => {
      // Calculate search duration
      const durationMs = Date.now() - searchStartTimeRef.current;
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);

      // Save duration to backend
      fetch(`${import.meta.env.VITE_API_BACKEND || "http://localhost:3001"}/api/arena/stats/matchmaking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, durationMs, rankId: user.rankId, tier: user.tier }),
      }).catch((err) => console.error(err));

      setRoomCode(data.roomCode);
      setMatchData(data.matchData);
      setOpponent(data.p1.uid === user.uid ? data.p2 : data.p1);
      setMatchState("found");

      // Setup prep countdown (7 seconds)
      setPrepCountdown(7);
      setCurrentTip(ARENA_TIPS[Math.floor(Math.random() * ARENA_TIPS.length)]);

      let count = 7;
      const prepInterval = setInterval(() => {
        count--;
        setPrepCountdown(count);
        // Change tip every 3 seconds (at 4s left)
        if (count === 4) {
          setCurrentTip(ARENA_TIPS[Math.floor(Math.random() * ARENA_TIPS.length)]);
        }
        if (count <= 0) {
          clearInterval(prepInterval);
          setMatchState("playing");
          startTimer();
        }
      }, 1000);
    };

    socket.on("arena_match_found", onMatchFound);
    socket.on("arena_both_answered", () => {
      setTimeout(() => {
        socket.emit("arena_next_question", { roomCode });
      }, 1500);
    });
    socket.on("arena_next_question_sync", (data: { index: number }) => {
      setCurrentQuestionIndex(data.index);
      setHasAnswered(false);
      setOppAnswered(false);
      setTimeLeft(10);
      startTimer();
    });
    socket.on("arena_end_game", async (data: any) => {
      stopTimer();
      setMatchState("finished");

      if (!user || !opponent) return;

      const myScore = data.userScores[user.uid] || 0;
      const oppScore = data.userScores[opponent.uid] || 0;

      setUserScore(myScore);
      setOpponentScore(oppScore);

      try {
        if (myScore > oppScore) {
          const res = await fetch(`${import.meta.env.VITE_API_BACKEND || "http://localhost:3001"}/api/rank/win`, {
            method: "POST",
            credentials: "include",
          });
          if (res.ok) {
            const data = await res.json();
            setRankUpdateStatus("win");
            updateUser({ rankId: data.rankId, tier: data.tier, stars: data.stars });
          }
        } else if (myScore < oppScore) {
          const res = await fetch(`${import.meta.env.VITE_API_BACKEND || "http://localhost:3001"}/api/rank/lose`, {
            method: "POST",
            credentials: "include",
          });
          if (res.ok) {
            const data = await res.json();
            if (data.status === "protected") setRankUpdateStatus("protected");
            else setRankUpdateStatus("lose");
            updateUser({ rankId: data.rankId, tier: data.tier, stars: data.stars });
          }
        }
      } catch (err) {
        console.error("Lỗi cập nhật rank:", err);
      }
    });
    socket.on("arena_opponent_left", async () => {
      alert("Đối thủ đã thoát trận! Bạn được cộng điểm thắng.");
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BACKEND || "http://localhost:3001"}/api/rank/win`, {
          method: "POST",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          updateUser({ rankId: data.rankId, tier: data.tier, stars: data.stars });
        }
      } catch (err) {}
      handleReset();
    });

    return () => {
      socket.off("arena_match_found", onMatchFound);
      socket.off("arena_both_answered");
      socket.off("arena_next_question_sync");
      socket.off("arena_end_game");
      socket.off("arena_opponent_left");
    };
  }, [socket, user, roomCode, opponent]);

  const startTimer = () => {
    stopTimer();
    setTimeLeft(10);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle timeout auto answer
  useEffect(() => {
    if (matchState === "playing" && timeLeft === 0 && !hasAnswered) {
      handleAnswer(false, 0);
    }
  }, [timeLeft, matchState, hasAnswered]);
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startSearch = () => {
    if (!socket || !user) return;
    const rankId = user.rankId || 1;
    const tierNum = user.tier || 3;
    const deck = generateArenaDeck(rankId, tierNum);

    // Calculate readable rankInfo
    const rankConfig = RANK_TOPIC_CONFIG[rankId as keyof typeof RANK_TOPIC_CONFIG];
    const rankName = rankConfig?.name || "Bạc";
    const tierText = rankId === 5 ? "" : ` ${["I", "II", "III", "IV", "V"][tierNum - 1] || tierNum}`;
    const readableRankInfo = `${rankName}${tierText}`;

    socket.emit("find_arena_match", {
      user: { uid: user.uid, name: user.displayName || "User", avatar: user.photoURL, rankInfo: readableRankInfo },
      matchData: deck,
    });
    setMatchState("searching");

    // Start search timer
    setSearchElapsed(0);
    searchStartTimeRef.current = Date.now();
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    searchTimerRef.current = setInterval(() => {
      setSearchElapsed((prev) => prev + 1);
    }, 1000);
  };

  const cancelSearch = () => {
    if (socket) socket.emit("cancel_arena_search");
    setMatchState("selecting");
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
  };

  const handleReset = () => {
    if (socket && roomCode) socket.emit("arena_leave", { roomCode });
    setMatchState("selecting");
    setUserScore(0);
    setOpponentScore(0);
    setRoomCode("");
    setCurrentQuestionIndex(0);
    setHasAnswered(false);
    setOppAnswered(false);
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    stopTimer();
  };

  const handleSurrender = async () => {
    setShowSurrenderModal(false);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BACKEND || "http://localhost:3001"}/api/rank/lose`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "protected") setRankUpdateStatus("protected");
        else setRankUpdateStatus("lose");
        updateUser({ rankId: data.rankId, tier: data.tier, stars: data.stars });
      }
    } catch (err) {}

    // Stop game and show finish screen right away so user sees they lost
    stopTimer();
    setUserScore(0);
    setOpponentScore(100); // Mock win for opp
    setMatchState("finished");
    if (socket && roomCode) socket.emit("arena_leave", { roomCode });
  };

  const handleCloseClick = () => {
    if (matchState === "playing") {
      setShowSurrenderModal(true);
    } else if (matchState !== "selecting" && matchState !== "finished") {
      cancelSearch();
      handleReset();
    } else {
      navigate("/flashcards");
    }
  };

  const handleAnswer = (isCorrect: boolean, timeRem: number = timeLeft) => {
    if (hasAnswered) return;
    setHasAnswered(true);
    socket?.emit("arena_answer", {
      roomCode,
      uid: user?.uid,
      timeRemaining: timeRem,
      isCorrect,
    });
  };

  useEffect(() => {
    if (!socket || !user) return;
    const handleUpdate = (data: any) => {
      if (data.userScores && data.userScores[user.uid] !== undefined) {
        setUserScore(data.userScores[user.uid]);
        setHasAnswered(data.userAnswered[user.uid]);
      }
      if (opponent && data.userScores && data.userScores[opponent.uid] !== undefined) {
        setOpponentScore(data.userScores[opponent.uid]);
        setOppAnswered(data.userAnswered[opponent.uid]);
      }
    };
    socket.on("arena_score_update", handleUpdate);
    return () => {
      socket.off("arena_score_update", handleUpdate);
    };
  }, [socket, user, opponent]);

  const currentCard = matchData?.cards[currentQuestionIndex];
  const isX2 = matchData?.x2Indices?.includes(currentQuestionIndex) || false;

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-black">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-red-600/20 rounded-full blur-3xl"></div>
      </div>

      <button onClick={handleCloseClick} className="absolute top-8 left-8 text-white/50 hover:text-white bg-white/5 p-3 rounded-full backdrop-blur-sm transition-all z-50">
        <X className="w-6 h-6" />
      </button>

      {/* --- SURRENDER MODAL --- */}
      {showSurrenderModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-white mb-4">Bỏ cuộc?</h3>
            <p className="text-gray-400 mb-8">Nếu bạn bỏ cuộc ngay bây giờ, bạn sẽ bị xử thua và trừ sao ngay lập tức. Bạn có chắc chắn muốn thoát?</p>
            <div className="flex gap-4">
              <button onClick={() => setShowSurrenderModal(false)} className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors">
                Tiếp tục chơi
              </button>
              <button onClick={handleSurrender} className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors">
                Chấp nhận thua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SELECTING MODE --- */}
      {matchState === "selecting" && (
        <div className="flex flex-col items-center z-10 w-full max-w-6xl px-4 animate-in fade-in zoom-in duration-500 py-12 overflow-y-auto">
          <h2 className="text-4xl md:text-5xl py-2 font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-4 text-center uppercase tracking-wider drop-shadow-sm">
            Chọn Thể Thức Thi Đấu
          </h2>
          <p className="text-blue-200/80 mb-12 text-center max-w-2xl text-lg">Khẳng định bản lĩnh và leo rank bằng cách đánh bại đối thủ trong các chế độ chơi đa dạng.</p>

          <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
            {/* Solo */}
            <div
              onClick={startSearch}
              className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-2 border-blue-500/50 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] rounded-3xl p-8 md:p-10 cursor-pointer transition-all duration-300 group relative overflow-hidden flex flex-col md:flex-row items-center gap-8 shadow-2xl scale-100 hover:scale-[1.02]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all"></div>
              <div className="absolute top-6 right-6 text-sm font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white px-5 py-2 rounded-full shadow-lg z-20 animate-pulse border border-red-400/50">
                HOT
              </div>

              <div className="w-24 h-24 bg-blue-500/20 rounded-3xl flex items-center justify-center border border-blue-500/30 relative z-10 flex-shrink-0 shadow-inner">
                <User className="w-12 h-12 text-blue-400" />
              </div>

              <div className="flex-1 relative z-10 text-center md:text-left">
                <h3 className="text-3xl font-black text-white mb-3">Solo (1vs1)</h3>
                <div className="text-gray-300 text-base space-y-2 mb-6">
                  <p>
                    <strong>Cách vận hành:</strong> 2 người vào phòng, cùng trả lời 10 câu hỏi.
                  </p>
                  <p>
                    <strong>Tính điểm:</strong> Trả lời đúng và nhanh hơn sẽ được nhiều điểm hơn.
                  </p>
                  <p className="text-blue-300 font-bold">
                    <strong>Phần thưởng:</strong> Người nhiều điểm hơn Thắng (Nhận +1 Sao).
                  </p>
                </div>
                <button className="w-full md:w-auto px-10 py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] text-lg">
                  Chơi ngay
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {/* Team - DISABLED */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col h-full opacity-60 grayscale cursor-not-allowed">
                <div className="absolute inset-0 bg-black/40 z-20 flex items-center justify-center backdrop-blur-[2px]">
                  <div className="bg-black/60 px-4 py-2 rounded-lg border border-white/10 text-white font-bold">Tính năng đang phát triển</div>
                </div>
                <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/30 relative z-10">
                  <Users className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 relative z-10">Đồng đội</h3>
                <div className="text-gray-300 text-sm space-y-3 relative z-10 flex-1">
                  <p>
                    <strong>Thể thức:</strong> 2vs2, 3vs3, 5vs5. Đội Xanh vs Đỏ.
                  </p>
                  <p>
                    <strong>Tính điểm:</strong> Cộng tổng điểm thành viên để phân thắng bại.
                  </p>
                </div>
              </div>

              {/* Tournament - DISABLED */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col h-full opacity-60 grayscale cursor-not-allowed">
                <div className="absolute inset-0 bg-black/40 z-20 flex items-center justify-center backdrop-blur-[2px]">
                  <div className="bg-black/60 px-4 py-2 rounded-lg border border-white/10 text-white font-bold">Tính năng đang phát triển</div>
                </div>
                <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center mb-6 border border-yellow-500/30 relative z-10">
                  <Trophy className="w-7 h-7 text-yellow-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 relative z-10">Giải đấu (16 người)</h3>
                <div className="text-gray-300 text-sm space-y-3 relative z-10 flex-1">
                  <p>
                    <strong>Thể thức:</strong> Chuỗi các trận 1vs1 loại trực tiếp (Knock-out).
                  </p>
                  <p>
                    <strong>Thưởng lớn:</strong> Vô địch sau 4 trận nhận +3 Sao hoặc thăng bậc Rank.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SEARCHING --- */}
      {matchState === "searching" && (
        <div className="flex flex-col items-center z-10 animate-in zoom-in duration-500">
          <div className="relative w-32 h-32 mb-8">
            <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-ping"></div>
            <div className="absolute inset-2 border-4 border-purple-500/40 rounded-full animate-spin" style={{ animationDuration: "3s" }}></div>
            <div className="absolute inset-0 flex items-center justify-center bg-indigo-900/50 rounded-full backdrop-blur-md border border-white/10">
              <Swords className="w-12 h-12 text-blue-400" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">Đang tìm đối thủ...</h2>
          <p className="text-blue-200/60 font-medium">Hệ thống đang ghép cặp bạn với người chơi cùng Rank</p>
          <div className="mt-4 text-xl font-mono text-yellow-300">
            {Math.floor(searchElapsed / 60)
              .toString()
              .padStart(2, "0")}
            :{(searchElapsed % 60).toString().padStart(2, "0")}
          </div>
          <button onClick={cancelSearch} className="mt-8 px-6 py-2 border border-white/20 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors">
            Hủy tìm
          </button>
        </div>
      )}

      {/* --- FOUND --- */}
      {matchState === "found" && opponent && (
        <div className="flex flex-col items-center z-10 w-full max-w-4xl px-4 animate-in fade-in zoom-in duration-500">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6 md:mb-8 tracking-wider shadow-black drop-shadow-lg uppercase text-center">TRẬN ĐẤU SẮP BẮT ĐẦU!</h2>

          <div className="mb-8 md:mb-12 text-center max-w-2xl bg-black/40 p-3 md:p-4 rounded-2xl border border-white/10 animate-in slide-in-from-top-4">
            <p className="text-gray-400 text-xs md:text-sm mb-1">Mẹo:</p>
            <p className="text-yellow-200 font-medium text-sm md:text-base">{currentTip}</p>
          </div>

          <div className="flex items-center justify-between w-full relative">
            <div className="flex flex-col items-center animate-in slide-in-from-left-20 duration-700">
              <div className="w-20 h-20 md:w-32 md:h-32 rounded-full border-4 border-blue-500 p-1 mb-2 md:mb-4 shadow-[0_0_30px_rgba(59,130,246,0.5)] bg-black">
                <img
                  src={user?.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop"}
                  alt="You"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <h3 className="text-sm md:text-xl font-bold text-white text-center line-clamp-1 max-w-[100px] md:max-w-none">{user?.displayName || "Bạn"}</h3>
              <p className="text-blue-400 font-medium text-xs md:text-base text-center line-clamp-1">{user?.rankInfo || "Rank Bạc III"}</p>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-in zoom-in delay-300 duration-500">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-yellow-400 to-red-600 rounded-full flex flex-col items-center justify-center shadow-2xl shadow-red-500/50 relative z-20">
                <span className="text-2xl md:text-3xl font-black text-white">{prepCountdown}</span>
                <span className="text-[10px] md:text-xs font-bold text-white/80">giây</span>
              </div>
            </div>

            <div className="flex flex-col items-center animate-in slide-in-from-right-20 duration-700">
              <div className="w-20 h-20 md:w-32 md:h-32 rounded-full border-4 border-red-500 p-1 mb-2 md:mb-4 shadow-[0_0_30px_rgba(239,68,68,0.5)] bg-black">
                <img
                  src={opponent.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop"}
                  alt="Opponent"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <h3 className="text-sm md:text-xl font-bold text-white text-center line-clamp-1 max-w-[100px] md:max-w-none">{opponent.name}</h3>
              <p className="text-red-400 font-medium text-xs md:text-base text-center line-clamp-1">{opponent.rankInfo || "Rank Bạc III"}</p>
            </div>
          </div>
        </div>
      )}

      {/* --- PLAYING --- */}
      {matchState === "playing" && currentCard && opponent && matchData && (
        <div className="w-full h-full max-w-5xl px-4 flex flex-col z-10 py-8 animate-in fade-in duration-300">
          {/* Top HUD */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            {/* Timer on mobile */}
            <div className="flex md:hidden flex-col items-center order-first w-full bg-white/5 py-2 rounded-2xl border border-white/10">
              <div className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Thời gian ({currentQuestionIndex + 1}/10)</div>
              <div className={cn("text-3xl font-black", timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-white")}>{timeLeft}s</div>
            </div>

            <div className="flex justify-between items-center w-full md:w-auto gap-2 flex-1">
              {/* User Score */}
              <div
                className={cn(
                  "flex items-center gap-2 md:gap-4 bg-blue-950/50 border p-1 md:p-2 pr-4 md:pr-6 rounded-full backdrop-blur-md transition-colors",
                  hasAnswered ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "border-blue-500/30",
                )}
              >
                <img
                  src={user?.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop"}
                  className="w-8 h-8 md:w-12 md:h-12 rounded-full border-2 border-blue-400 object-cover"
                />
                <div>
                  <div className="text-[10px] md:text-sm text-blue-200 hidden md:block">Điểm của bạn</div>
                  <div className="text-lg md:text-2xl font-black text-white flex items-center gap-1 md:gap-2">
                    {userScore}
                    {hasAnswered && <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 animate-in zoom-in" />}
                  </div>
                </div>
              </div>

              {/* Timer on Desktop */}
              <div className="hidden md:flex flex-col items-center mx-4">
                <div className="text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">Thời gian ({currentQuestionIndex + 1}/10)</div>
                <div className={cn("text-5xl font-black", timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-white")}>{timeLeft}s</div>
              </div>

              {/* Opponent Score */}
              <div
                className={cn(
                  "flex items-center gap-2 md:gap-4 bg-red-950/50 border p-1 md:p-2 pl-4 md:pl-6 rounded-full backdrop-blur-md flex-row-reverse transition-colors",
                  oppAnswered ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "border-red-500/30",
                )}
              >
                <img
                  src={opponent.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop"}
                  className="w-8 h-8 md:w-12 md:h-12 rounded-full border-2 border-red-400 object-cover"
                />
                <div className="text-right">
                  <div className="text-[10px] md:text-sm text-red-200 hidden md:block">Đối thủ</div>
                  <div className="text-lg md:text-2xl font-black text-white flex items-center justify-end gap-1 md:gap-2">
                    {oppAnswered && <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 animate-in zoom-in" />}
                    {opponentScore}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ArenaGameRenderer mode={matchData.modes ? matchData.modes[currentQuestionIndex] : (matchData.mode || "quiz")} card={currentCard} allCards={matchData.cards} isX2={isX2} disabled={hasAnswered} onAnswer={handleAnswer} />
        </div>
      )}

      {/* --- FINISHED --- */}
      {matchState === "finished" && opponent && (
        <div className="flex flex-col items-center z-10 w-full max-w-4xl px-4 animate-in fade-in zoom-in duration-500">
          <div className="w-32 h-32 md:w-40 md:h-40 mb-2">
            {userScore > opponentScore ? (
              <img src="/mascot/Lopy (1).png" className="w-full h-full object-contain animate-bounce drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
            ) : userScore < opponentScore ? (
              <img src="/mascot/Lopy (15).png" className="w-full h-full object-contain opacity-80" />
            ) : (
              <img src="/mascot/Lopy (14).png" className="w-full h-full object-contain" />
            )}
          </div>
          <h2 className={cn("text-4xl md:text-5xl font-black mb-2 text-center", userScore > opponentScore ? "text-yellow-400" : userScore < opponentScore ? "text-gray-400" : "text-blue-400")}>
            {userScore > opponentScore ? "CHIẾN THẮNG!" : userScore < opponentScore ? "THẤT BẠI" : "HÒA NHAU"}
          </h2>

          {rankUpdateStatus === "win" && <p className="text-yellow-200 font-bold text-lg md:text-xl mb-6 md:mb-8">+1 Sao Hạng</p>}
          {rankUpdateStatus === "lose" && <p className="text-red-400 font-bold text-lg md:text-xl mb-6 md:mb-8">-1 Sao Hạng</p>}
          {rankUpdateStatus === "protected" && <p className="text-blue-300 font-bold text-lg md:text-xl mb-6 md:mb-8">Bảo hiểm: Không trừ sao</p>}
          {!rankUpdateStatus && <div className="h-8 md:h-14"></div>}

          <RankCard className="max-w-md w-full mb-6 md:mb-8 shadow-[0_0_40px_rgba(59,130,246,0.3)] border border-blue-500/30" />

          <div className="flex flex-row items-center gap-6 md:gap-12 bg-white/5 p-4 md:p-6 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
            <div className="flex flex-col items-center">
              <img
                src={user?.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop"}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-blue-500 mb-2"
              />
              <div className="text-3xl md:text-5xl font-black">{userScore}</div>
              <div className="text-xs md:text-sm text-blue-300 mt-1">Điểm của bạn</div>
            </div>
            <div className="text-xl md:text-3xl font-black text-white/30 italic">VS</div>
            <div className="flex flex-col items-center">
              <img
                src={opponent.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop"}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-red-500 mb-2"
              />
              <div className="text-3xl md:text-5xl font-black">{opponentScore}</div>
              <div className="text-xs md:text-sm text-red-300 mt-1">Điểm đối thủ</div>
            </div>
          </div>

          <div className="mt-8 md:mt-12 flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <button onClick={() => navigate("/flashcards")} className="w-full md:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all text-center">
              Về trang chủ
            </button>
            <button
              onClick={handleReset}
              className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] text-center"
            >
              Chơi trận khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
