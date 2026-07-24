import React, { useState, useEffect, useRef, useCallback } from "react";
import { Swords, Trophy, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import axiosInstance from "../../services/axiosConfig";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { UserLevelBadge } from "@/src/components/ui/UserLevelBadge";
import { ArenaPlayingHUD } from "../Arena/components/ArenaPlayingHUD";
import { ArenaResult } from "../Arena/components/ArenaResult";
import { RANK_NAMES } from "../../config/rankTopicConfig";
import { cn } from "../../lib/utils";
import { BeginnerArenaLobby } from "./components/BeginnerArenaLobby";
import { Button } from "@/src/components/ui/Button";

const TIER_NAMES: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };

export function BeginnerArena() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { socket } = useSocket();

  const [matchState, setMatchState] = useState<"lobby" | "searching" | "found" | "playing" | "finished">("lobby");
  const [roomCode, setRoomCode] = useState<string>("");
  const [matchData, setMatchData] = useState<any>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const [prepCountdown, setPrepCountdown] = useState(7);
  const [timeLeft, setTimeLeft] = useState(10);
  const [userScore, setUserScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [oppAnswered, setOppAnswered] = useState(false);
  const [rankUpdateStatus, setRankUpdateStatus] = useState<any>(null);

  const matchStateRef = useRef(matchState);
  const roomCodeRef = useRef(roomCode);
  const searchTimerRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const prepIntervalRef = useRef<number | null>(null);
  const isLeavingArenaRef = useRef(false);

  useEffect(() => {
    matchStateRef.current = matchState;
  }, [matchState]);

  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  // Clean up on leave
  const cleanupArenaSession = useCallback(
    (reason: "leave" | "cancel" | "surrender" = "leave") => {
      if (!socket || isLeavingArenaRef.current) return;
      if (matchStateRef.current === "searching") socket.emit("cancel_arena_search");
      if (roomCodeRef.current) socket.emit("arena_leave", { roomCode: roomCodeRef.current, reason });
    },
    [socket],
  );

  useEffect(() => {
    return () => {
      if (matchStateRef.current !== "lobby") {
        cleanupArenaSession("leave");
      }
      if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
    };
  }, [cleanupArenaSession]);

  const stopTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
  };

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(10);
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (matchState === "playing" && timeLeft === 0 && !hasAnswered) handleAnswer(false, 0);
  }, [timeLeft, matchState, hasAnswered]);

  useEffect(() => {
    if (!socket || !user) return;

    const onMatchFound = (data: any) => {
      setRoomCode(data.roomCode);
      setMatchData(data.matchData);
      setOpponent(data.p1.uid === user.uid ? data.p2 : data.p1);
      setMatchState("found");

      setPrepCountdown(7);
      let countdown = 7;
      if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
      prepIntervalRef.current = window.setInterval(() => {
        countdown--;
        setPrepCountdown(countdown);
        if (countdown <= 0) {
          if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
          socket.emit("arena_ready", { roomCode: data.roomCode });
        }
      }, 1000);
    };

    socket.on("arena_match_found", onMatchFound);

    socket.on("arena_start_match", () => {
      setMatchState("playing");
      startTimer();
    });

    socket.on("arena_score_update", (data: any) => {
      if (data.userScores?.[user.uid] !== undefined) {
        setUserScore(data.userScores[user.uid]);
        setHasAnswered(data.userAnswered[user.uid]);
      }
      if (opponent && data.userScores?.[opponent.uid] !== undefined) {
        setOpponentScore(data.userScores[opponent.uid]);
        setOppAnswered(data.userAnswered[opponent.uid]);
      }
    });

    socket.on("arena_both_answered", () => {
      setTimeout(() => socket.emit("arena_next_question", { roomCode: roomCodeRef.current }), 1500);
    });

    socket.on("arena_next_question_sync", (data: { index: number }) => {
      setCurrentQuestionIndex(data.index);
      setHasAnswered(false);
      setLastAnswerCorrect(null);
      setOppAnswered(false);
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
          const res = await axiosInstance.post(`/api/rank/win`);
          if (res.status === 200) {
            const d = await res.data;
            setRankUpdateStatus("win");
            updateUser({ rankId: d.rankId, tier: d.tier, stars: d.stars });
          }
        } else if (myScore < oppScore) {
          const res = await axiosInstance.post(`/api/rank/lose`);
          if (res.status === 200) {
            const d = await res.data;
            setRankUpdateStatus(d.status === "protected" ? "protected" : "lose");
            updateUser({ rankId: d.rankId, tier: d.tier, stars: d.stars });
          }
        }
      } catch (err) {
        console.error("Lỗi cập nhật rank:", err);
      }
    });

    return () => {
      socket.off("arena_match_found", onMatchFound);
      socket.off("arena_start_match");
      socket.off("arena_score_update");
      socket.off("arena_both_answered");
      socket.off("arena_next_question_sync");
      socket.off("arena_end_game");
    };
  }, [socket, user, opponent, updateUser, startTimer]);

  const startMatch = () => {
    if (!socket || !user) return;
    setMatchState("searching");
    socket.emit("find_arena_match", {
      mode: "solo",
      botRankOverride: user.rankId || 1, // Instant bot match
      user: {
        uid: user.uid,
        name: user.displayName || "User",
        avatar: user.photoURL,
        rankInfo: RANK_NAMES[(user.rankId as keyof typeof RANK_NAMES) || 1] || "Bạc",
        rankId: user.rankId || 1,
        tier: user.tier || 3,
        arenaMatchesPlayed: (user as any).arenaMatchesPlayed || 0,
      },
    });
  };

  const handleAnswer = (isCorrect: boolean, timeRem?: number) => {
    if (hasAnswered) return;
    setHasAnswered(true);
    setLastAnswerCorrect(isCorrect);
    socket?.emit("arena_answer", { roomCode, uid: user?.uid, timeRemaining: timeRem, isCorrect });
  };

  const handleReset = () => {
    setMatchState("lobby");
    setRoomCode("");
    setMatchData(null);
    setOpponent(null);
    setUserScore(0);
    setOpponentScore(0);
    setCurrentQuestionIndex(0);
    setHasAnswered(false);
    setLastAnswerCorrect(null);
    setOppAnswered(false);
    setRankUpdateStatus(null);
  };

  const handleCloseClick = () => {
    if (matchState === "playing") {
      const ok = window.confirm("Bạn có chắc muốn thoát không? Nếu thoát, bạn sẽ rời khỏi phòng đấu hạng.");
      if (ok) {
        cleanupArenaSession("leave");
        isLeavingArenaRef.current = true;
        stopTimer();
        navigate("/beginner");
      }
    } else {
      cancelSearch();
      handleReset();
      navigate("/beginner");
    }
  };

  const cancelSearch = () => {
    if (socket) socket.emit("cancel_arena_search");
    setMatchState("lobby");
  };

  if (matchState === "lobby") {
    return <BeginnerArenaLobby user={user} startMatch={startMatch} />;
  }

  if (matchState === "searching" || matchState === "found") {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-black mb-12 animate-pulse text-indigo-300">{matchState === "searching" ? "Đang tìm đối thủ..." : "Đã tìm thấy trận!"}</h2>

        <div className="flex items-center gap-8 md:gap-16">
          <div className="flex flex-col items-center">
            <UserAvatar src={user?.photoURL || ""} level={user?.level || 1} className="w-20 h-20 md:w-28 md:h-28" />
            <span className="font-bold mt-4">{user?.displayName}</span>
          </div>

          <div className="font-black text-4xl text-red-500 italic">VS</div>

          {opponent ? (
            <div className="flex flex-col items-center animate-in zoom-in">
              <UserAvatar src={opponent.avatar} level={opponent.level || 1} className="w-20 h-20 md:w-28 md:h-28" />
              <span className="font-bold mt-4">{opponent.name}</span>
            </div>
          ) : (
            <div className="w-20 h-20 md:w-28 md:h-28 bg-slate-800 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-4xl">?</span>
            </div>
          )}
        </div>

        {matchState === "found" && (
          <div className="mt-16 text-center flex flex-col items-center">
            <p className="text-slate-400 mb-2 font-bold uppercase tracking-widest">Trận đấu bắt đầu sau</p>
            <div className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] mb-8">{prepCountdown}</div>
            <Button
              onClick={() => {
                if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
                socket?.emit("arena_ready", { roomCode });
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-600/30"
            >
              Bắt đầu ngay
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col items-center overflow-y-auto">
      {/* Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-red-600/20 rounded-full blur-3xl"></div>
      </div>

      <Button onClick={handleCloseClick} className="absolute top-4 left-4 text-white/50 hover:text-white bg-white/5 p-3 rounded-full backdrop-blur-sm transition-all z-50">
        <X className="w-6 h-6" />
      </Button>

      {matchState === "playing" && (
        <ArenaPlayingHUD
          user={user}
          opponent={opponent}
          userScore={userScore}
          opponentScore={opponentScore}
          hasAnswered={hasAnswered}
          oppAnswered={oppAnswered}
          timeLeft={timeLeft}
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={matchData?.cards?.length || 10}
          currentCard={matchData?.cards[currentQuestionIndex]}
          matchData={matchData}
          isX2={matchData?.x2Indices?.includes(currentQuestionIndex) || false}
          lastAnswerCorrect={lastAnswerCorrect}
          arenaMode="solo"
          arenaPlayers={[]}
          myTeam="blue"
          teamHint=""
          teamHints={[]}
          onTeamHintChange={() => {}}
          onSendTeamHint={() => {}}
          onAnswer={handleAnswer}
        />
      )}

      {import.meta.env.VITE_NODE === "development" && matchState === "playing" && (
        <div className="absolute bottom-4 left-4 flex gap-2 z-50">
          <Button
            onClick={async () => {
              stopTimer();
              setMatchState("finished");
              setUserScore(999);
              setOpponentScore(0);
              const res = await axiosInstance.post(`/api/rank/win`);
              if (res.status === 200) {
                const d = await res.data;
                setRankUpdateStatus("win");
                updateUser({ rankId: d.rankId, tier: d.tier, stars: d.stars });
              }
            }}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded shadow-lg"
          >
            Thắng ngay
          </Button>
          <Button
            onClick={async () => {
              stopTimer();
              setMatchState("finished");
              setUserScore(0);
              setOpponentScore(999);
              const res = await axiosInstance.post(`/api/rank/lose`);
              if (res.status === 200) {
                const d = await res.data;
                setRankUpdateStatus(d.status === "protected" ? "protected" : "lose");
                updateUser({ rankId: d.rankId, tier: d.tier, stars: d.stars });
              }
            }}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded shadow-lg"
          >
            Thua ngay
          </Button>
        </div>
      )}

      {matchState === "finished" && opponent && (
        <ArenaResult user={user} opponent={opponent} userScore={userScore} opponentScore={opponentScore} rankUpdateStatus={rankUpdateStatus} onReset={handleReset} />
      )}
    </div>
  );
}
