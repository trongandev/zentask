import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { Word } from "../../config/rankTopicConfig";

const RANK_NAMES: Record<number, string> = {
  1: "Bạc",
  2: "Lục bảo",
  3: "Tinh Anh",
  4: "Kim cương",
  5: "Cao Thủ",
};

import { ArenaModeSelector } from "./components/ArenaModeSelector";
import { ArenaLobby } from "./components/ArenaLobby";
import { ArenaPlayingHUD } from "./components/ArenaPlayingHUD";
import { ArenaResult } from "./components/ArenaResult";
import { ArenaSurrenderModal } from "./components/ArenaSurrenderModal";
import { ArenaTournamentBracket } from "./components/ArenaTournamentBracket";
import { ArenaChallengeModal } from "./components/ArenaChallengeModal";
import { Modal } from "../../components/shared/Modal";
import { useEtcStore } from "../../services/etcService";
import { toastService } from "../../services/toastService";
import { useTTSAudio } from "../../hooks/useTTSAudio";

const API = import.meta.env.VITE_API_BACKEND || "http://localhost:3001";

export function Arena() {
  const { user, updateUser } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // Core game state
  const [matchState, setMatchState] = useState<"selecting" | "lobby" | "searching" | "found" | "playing" | "finished" | "tournament_bracket">("selecting");
  const [matchData, setMatchData] = useState<{ modes?: string[]; mode?: string; cards: Word[]; x2Indices: number[] } | null>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const [arenaMode, setArenaMode] = useState<"solo" | "team2v2" | "tournament">("solo");
  const [arenaPlayers, setArenaPlayers] = useState<any[]>([]);
  const [myTeam, setMyTeam] = useState<"blue" | "red">("blue");

  const { playAudio, stopAudio, preloadAudio } = useTTSAudio();

  // Game play state
  const [roomCode, setRoomCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(10);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [oppAnswered, setOppAnswered] = useState(false);
  const [rankUpdateStatus, setRankUpdateStatus] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [queueTimeoutData, setQueueTimeoutData] = useState<any>(null);

  // Team hints
  const [teamHint, setTeamHint] = useState("");
  const [teamHints, setTeamHints] = useState<Array<{ from: string; message: string }>>([]);

  // UI modals
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);

  // Tournament state
  const [tournamentCode, setTournamentCode] = useState("");
  const [tournamentTitle, setTournamentTitle] = useState("Giải đấu ZenTask");
  const [tournamentRoom, setTournamentRoom] = useState<any>(null);
  const [tournamentFriends, setTournamentFriends] = useState<any[]>([]);
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [tournamentParticipants, setTournamentParticipants] = useState<any[]>([]);
  const [tournamentCanStart, setTournamentCanStart] = useState(false);

  // History & search
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [searchElapsed, setSearchElapsed] = useState(0);
  const [prepCountdown, setPrepCountdown] = useState(0);
  const [currentTip, setCurrentTip] = useState("");

  // Friends for lobby
  const [lobbyFriends, setLobbyFriends] = useState<any[]>([]);
  const [lobbyFriendsLoading, setLobbyFriendsLoading] = useState(false);

  // Challenge system
  const [incomingChallenge, setIncomingChallenge] = useState<any>(null);
  const [waitingChallenge, setWaitingChallenge] = useState<boolean>(false);

  // Lobby Chat and Ready States
  const [readyPlayers, setReadyPlayers] = useState<Record<string, boolean>>({});
  const [lobbyMessages, setLobbyMessages] = useState<Array<{ uid: string; name: string; avatar: string; text: string; time: number }>>([]);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAnsweredRef = useRef(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchStartTimeRef = useRef(0);
  const matchStateRef = useRef(matchState);
  const roomCodeRef = useRef(roomCode);
  const isLeavingArenaRef = useRef(false);

  // --- Ref syncs ---
  useEffect(() => {
    hasAnsweredRef.current = hasAnswered;
  }, [hasAnswered]);
  useEffect(() => {
    matchStateRef.current = matchState;
  }, [matchState]);
  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  // --- Fetch tournament friends ---
  useEffect(() => {
    if (matchState !== "tournament_bracket") return;
    fetch(`${API}/api/arena/friends`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTournamentFriends(Array.isArray(data) ? data : []))
      .catch(() => setTournamentFriends([]));
  }, [matchState]);

  // --- Fetch match history ---
  useEffect(() => {
    if (matchState !== "selecting") return;
    const token = localStorage.getItem("token");
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${API}/api/arena/history`, { headers, credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMatchHistory(Array.isArray(data) ? data : []))
      .catch(() => setMatchHistory([]));
  }, [matchState]);

  // --- Fetch lobby friends ---
  const fetchLobbyFriends = useCallback(() => {
    setLobbyFriendsLoading(true);
    fetch(`${API}/api/friends/online`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setLobbyFriends(Array.isArray(data) ? data : []))
      .catch(() => setLobbyFriends([]))
      .finally(() => setLobbyFriendsLoading(false));
  }, []);

  // --- Presence heartbeat ---
  useEffect(() => {
    if (!socket) return;
    const activeState = ["searching", "found", "playing"].includes(matchState) || !!tournamentRoom?.code;
    if (!activeState) return;
    const sendPresence = () => {
      socket.emit("arena_presence", {
        state: matchState,
        roomCode: roomCodeRef.current,
        mode: arenaMode,
        tournamentCode: tournamentRoom?.code || tournamentCode || "",
      });
    };
    sendPresence();
    const timer = window.setInterval(sendPresence, 3000);
    return () => window.clearInterval(timer);
  }, [socket, matchState, arenaMode, tournamentRoom?.code, tournamentCode]);

  // --- Cleanup ---
  const cleanupArenaSession = useCallback(
    (reason: "leave" | "cancel" | "surrender" = "leave") => {
      if (!socket || isLeavingArenaRef.current) return;
      if (matchStateRef.current === "searching") socket.emit("cancel_arena_search");
      if (roomCodeRef.current) socket.emit("arena_leave", { roomCode: roomCodeRef.current, reason });
    },
    [socket],
  );

  // --- Timer ---
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
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

  // --- Timeout auto answer ---
  useEffect(() => {
    if (matchState === "playing" && timeLeft === 0 && !hasAnswered) handleAnswer(false, 0);
  }, [timeLeft, matchState, hasAnswered]);

  // --- Socket events ---
  useEffect(() => {
    if (!socket || !user) return;

    const ARENA_TIPS = [
      "Tập trung và phản xạ nhanh sẽ mang lại cho bạn nhiều điểm số hơn!",
      "Cố gắng trả lời nhanh nhưng hãy chắc chắn, sai lầm có thể khiến bạn mất cơ hội lật kèo.",
      "Từ vựng X2 Điểm có thể là chìa khóa giúp bạn chiến thắng, đừng bỏ lỡ!",
      "Càng leo lên Rank cao, độ khó của từ vựng sẽ càng tăng lên. Hãy chuẩn bị tinh thần!",
      "Chế độ Gõ Từ (Typing) yêu cầu độ chính xác tuyệt đối, hãy chú ý chính tả.",
      "Đấu hạng là nơi thể hiện trình độ, giữ vững tâm lý khi gặp đối thủ mạnh nhé.",
    ];

    const onMatchFound = (data: any) => {
      const durationMs = Date.now() - searchStartTimeRef.current;
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);

      fetch(`${API}/api/arena/stats/matchmaking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(localStorage.getItem("token") ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {}) },
        credentials: "include",
        body: JSON.stringify({ uid: user.uid, durationMs, rankId: user.rankId, tier: user.tier }),
      }).catch(console.error);

      setRoomCode(data.roomCode);
      setMatchData(data.matchData);
      setArenaMode(data.arenaMode || data.mode || "solo");
      if ((data.arenaMode || data.mode) === "tournament") setMatchState("playing");
      setArenaPlayers(data.players || []);
      setMyTeam(data.myTeam || "blue");

      if ((data.arenaMode || data.mode) === "team2v2") {
        const enemyTeam = data.myTeam === "blue" ? "red" : "blue";
        const enemyPlayers = (data.players || []).filter((p: any) => p.team === enemyTeam);
        setOpponent({ uid: enemyTeam, name: enemyPlayers.map((p: any) => p.name).join(" + ") || "Đội đối thủ", avatar: enemyPlayers[0]?.avatar, isTeam: true });
      } else {
        setOpponent(data.p1.uid === user.uid ? data.p2 : data.p1);
      }

      setMatchState("found");
      setIsReady(false);
      setOpponentReady(false);
      setReadyPlayers({});
      setLobbyMessages([]);
      setCurrentTip(ARENA_TIPS[Math.floor(Math.random() * ARENA_TIPS.length)]);
    };

    socket.on("arena_match_found", onMatchFound);
    socket.on("arena_both_answered", () => {
      setTimeout(() => socket.emit("arena_next_question", { roomCode: roomCodeRef.current }), 1500);
    });
    socket.on("arena_next_question_sync", (data: { index: number }) => {
      setCurrentQuestionIndex(data.index);
      setHasAnswered(false);
      setLastAnswerCorrect(null);
      setOppAnswered(false);
      setTeamHints([]);
      setTimeLeft(10);
      startTimer();
    });
    socket.on("arena_end_game", async (data: any) => {
      stopTimer();
      setMatchState("finished");
      if (!user || !opponent) return;

      const finalMode = data.arenaMode || arenaMode;
      const myScore = finalMode === "team2v2" ? data.teamScores?.[myTeam] || 0 : data.userScores[user.uid] || 0;
      const enemyTeam = myTeam === "blue" ? "red" : "blue";
      const oppScore = finalMode === "team2v2" ? data.teamScores?.[enemyTeam] || 0 : data.userScores[opponent.uid] || 0;
      setUserScore(myScore);
      setOpponentScore(oppScore);

      if (finalMode === "tournament") {
        try {
          const code = tournamentRoom?.code || tournamentCode;
          if (code) {
            const res = await fetch(`${API}/api/arena/tournaments/${code}/complete`, { method: "POST", credentials: "include" });
            const xpData = await res.json();
            if (res.ok && xpData.xpResult) updateUser({ xp: xpData.xpResult.xp, level: xpData.xpResult.level });
            if (res.ok) toastService.success(xpData.awardedXp ? "+10XP giải đấu" : "Giải đấu không tính rank");
          }
        } catch (err) {
          console.error("Lỗi nhận XP giải đấu:", err);
        }
        setRankUpdateStatus("tournament");
        return;
      }

      try {
        if (myScore > oppScore) {
          const res = await fetch(`${API}/api/rank/win`, { method: "POST", credentials: "include" });
          if (res.ok) {
            const d = await res.json();
            setRankUpdateStatus("win");
            updateUser({ rankId: d.rankId, tier: d.tier, stars: d.stars });
          }
        } else if (myScore < oppScore) {
          const res = await fetch(`${API}/api/rank/lose`, { method: "POST", credentials: "include" });
          if (res.ok) {
            const d = await res.json();
            setRankUpdateStatus(d.status === "protected" ? "protected" : "lose");
            updateUser({ rankId: d.rankId, tier: d.tier, stars: d.stars });
          }
        }
      } catch (err) {
        console.error("Lỗi cập nhật rank:", err);
      }
    });
    socket.on("arena_team_hint", (data: any) => {
      setTeamHints((prev) => [...prev.slice(-4), { from: data.from || "Đồng đội", message: data.message || "" }]);
      toastService.info(`${data.from || "Đồng đội"}: ${data.message || "đã gửi gợi ý"}`);
    });
    socket.on("arena_tournament_lobby_update", (data: any) => {
      setTournamentRoom(data.room || null);
      setTournamentCode(data.code || data.room?.code || "");
      setTournamentParticipants(Array.isArray(data.participants) ? data.participants : []);
      setTournamentCanStart(!!data.canStart);
    });
    socket.on("arena_tournament_error", (data: any) => toastService.error(data?.message || "Lỗi phòng giải đấu"));
    socket.on("arena_matchmaking_error", (data: any) => {
      toastService.error(data?.message || "Không ghép được trận");
      setMatchState("lobby");
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    });
    socket.on("arena_queue_status", (data: any) => {
      if (data?.status === "waiting_human") toastService.info("Rank hiện tại chỉ ghép người thật, hệ thống sẽ tiếp tục chờ đối thủ.");
    });
    socket.on("arena_queue_timeout", (data: any) => {
      setQueueTimeoutData(data);
    });
    socket.on("arena_player_kicked", (data: any) => {
      if (data.targetUid === user.uid) {
        toastService.info("Bạn đã bị đưa ra khỏi phòng");
        cancelSearch();
      } else {
        if (arenaMode === "solo") {
          setOpponent(null);
          setMatchState("lobby");
          setRoomCode("");
          if (socket) socket.emit("cancel_arena_search");
        } else {
          setArenaPlayers((prev) => prev.filter((p) => p.uid !== data.targetUid));
          if (opponent?.uid === data.targetUid) setOpponent(null);
        }
        setIsReady(false);
        setOpponentReady(false);
      }
    });
    socket.on("arena_player_added", (data: any) => {
      if (arenaMode === "solo") {
        setOpponent(data.player);
      } else {
        setArenaPlayers((prev) => {
          if (data.players) return data.players; // If backend sent full list, use it
          const existingIdx = prev.findIndex((p) => p.uid === data.player.uid);
          if (existingIdx !== -1) {
            const next = [...prev];
            next[existingIdx] = data.player;
            return next;
          }
          return [...prev, data.player];
        });
      }
    });
    socket.on("arena_player_ready", (data: any) => {
      const isReadyState = data.ready !== false; // default true for backwards compat
      if (opponent && data.uid === opponent.uid) {
        setOpponentReady(isReadyState);
      }
      setReadyPlayers((prev) => ({ ...prev, [data.uid]: isReadyState }));
    });

    socket.on("arena_lobby_chat_received", (msg: any) => {
      setLobbyMessages((prev) => [...prev, msg]);
    });
    socket.on("arena_start_match", () => {
      setPrepCountdown(3);
      const prepInterval = setInterval(() => {
        setPrepCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(prepInterval);
            setMatchState("playing");
            startTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });
    socket.on("arena_opponent_left", async (payload: any = {}) => {
      if (payload?.mode === "tournament" || arenaMode === "tournament") {
        toastService.info("Đối thủ đã thoát");
        handleReset();
        return;
      }

      if (matchStateRef.current === "playing") {
        toastService.info("Đối thủ đã thoát trận! Bạn được cộng điểm thắng.");
        stopTimer();
        setRankUpdateStatus("win");
        setUserScore((prev) => Math.max(prev, 100));
        setOpponentScore(0);
        setMatchState("finished");
        try {
          const res = await fetch(`${API}/api/rank/win`, { method: "POST", credentials: "include" });
          if (res.ok) {
            const d = await res.json();
            updateUser({ rankId: d.rankId, tier: d.tier, stars: d.stars });
          }
        } catch (err) {}
      } else {
        toastService.info("Đối thủ đã rời khỏi phòng chờ.");
        if (arenaMode === "solo") {
          setOpponent(null);
          setMatchState("lobby");
          setRoomCode("");
          if (socket) socket.emit("cancel_arena_search");
          setIsReady(false);
          setOpponentReady(false);
        } else {
          handleReset();
        }
      }
    });

    // Challenge events
    socket.on("arena_challenge_received", (data: any) => {
      setIncomingChallenge(data);
    });
    socket.on("arena_challenge_result", (data: any) => {
      setWaitingChallenge(false);
      if (data.accepted) {
        toastService.success("Đối thủ đã chấp nhận lời thách đấu!");
      } else {
        toastService.error("Đối thủ đã từ chối lời thách đấu.");
        cancelSearch();
      }
    });
    socket.on("arena_challenge_declined", (data: any) => {
      toastService.error(`${data?.name || "Đối thủ"} đã từ chối lời thách đấu`);
    });
    socket.on("arena_challenge_expired", () => {
      toastService.info("Lời thách đấu đã hết hạn");
      setWaitingChallenge(false);
      setIncomingChallenge(null);
      if (matchState === "searching") setMatchState("lobby");
    });

    return () => {
      socket.off("arena_match_found", onMatchFound);
      socket.off("arena_both_answered");
      socket.off("arena_next_question_sync");
      socket.off("arena_end_game");
      socket.off("arena_team_hint");
      socket.off("arena_tournament_lobby_update");
      socket.off("arena_tournament_error");
      socket.off("arena_matchmaking_error");
      socket.off("arena_queue_status");
      socket.off("arena_opponent_left");
      socket.off("arena_challenge_received");
      socket.off("arena_challenge_result");
      socket.off("arena_challenge_declined");
      socket.off("arena_challenge_expired");
      socket.off("arena_queue_timeout");
      socket.off("arena_player_ready");
      socket.off("arena_start_match");
      socket.off("arena_lobby_chat_received");
    };
  }, [socket, user, roomCode, opponent, arenaMode, myTeam, updateUser, tournamentRoom, tournamentCode]);

  // Preload TTS audio for current and next question
  useEffect(() => {
    if (matchState === "playing" && matchData?.cards) {
      const currentWord = matchData.cards[currentQuestionIndex];
      if (currentWord) preloadAudio(currentWord.term);
      const nextWord = matchData.cards[currentQuestionIndex + 1];
      if (nextWord) preloadAudio(nextWord.term);
    }
  }, [currentQuestionIndex, matchState, matchData, preloadAudio]);

  // --- Navigation guard ---
  useEffect(() => {
    const shouldGuard = ["searching", "found", "playing"].includes(matchState);
    if (!shouldGuard) return;
    window.history.pushState({ arenaGuard: true }, "", window.location.href);
    const handlePopState = () => {
      const state = matchStateRef.current;
      if (!["searching", "found", "playing"].includes(state)) return;
      const ok = window.confirm("Bạn có chắc muốn thoát không? Nếu thoát, bạn sẽ rời khỏi phòng đấu hạng.");
      if (ok) {
        cleanupArenaSession("leave");
        isLeavingArenaRef.current = true;
        stopTimer();
        if (searchTimerRef.current) clearInterval(searchTimerRef.current);
        navigate("/flashcards", { replace: true });
      } else {
        window.history.pushState({ arenaGuard: true }, "", window.location.href);
      }
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      cleanupArenaSession("leave");
      event.preventDefault();
      event.returnValue = "Bạn có chắc muốn thoát không?";
      return event.returnValue;
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [matchState, cleanupArenaSession, navigate]);

  useEffect(() => {
    return () => {
      const state = matchStateRef.current;
      if (["searching", "found", "playing"].includes(state) && !isLeavingArenaRef.current) cleanupArenaSession("leave");
    };
  }, [cleanupArenaSession]);

  // --- Score sync ---
  useEffect(() => {
    if (!socket || !user) return;
    const handleUpdate = (data: any) => {
      if (arenaMode === "team2v2") {
        const enemyTeam = myTeam === "blue" ? "red" : "blue";
        setUserScore(data.teamScores?.[myTeam] || 0);
        setOpponentScore(data.teamScores?.[enemyTeam] || 0);
        if (data.userAnswered && user?.uid) setHasAnswered(!!data.userAnswered[user.uid]);
        const enemyAnswered = arenaPlayers.filter((p: any) => p.team === enemyTeam).some((p: any) => data.userAnswered?.[p.uid]);
        setOppAnswered(enemyAnswered);
        return;
      }
      if (data.userScores?.[user.uid] !== undefined) {
        setUserScore(data.userScores[user.uid]);
        setHasAnswered(data.userAnswered[user.uid]);
      }
      if (opponent && data.userScores?.[opponent.uid] !== undefined) {
        setOpponentScore(data.userScores[opponent.uid]);
        setOppAnswered(data.userAnswered[opponent.uid]);
      }
    };
    socket.on("arena_score_update", handleUpdate);
    return () => {
      socket.off("arena_score_update", handleUpdate);
    };
  }, [socket, user, opponent, arenaMode, myTeam, arenaPlayers]);

  // --- Actions ---
  const startSearch = (selectedMode: "solo" | "team2v2" = "solo", botRankOverride?: number | null, targetSlotIndex?: number) => {
    if (!socket || !user) return;
    const rankId = user.rankId || 1;
    const tierNum = user.tier || 3;
    const rankName = RANK_NAMES[rankId] || "Bạc";
    const tierText = rankId === 5 ? "" : ` ${["I", "II", "III", "IV", "V"][tierNum - 1] || tierNum}`;
    const readableRankInfo = `${rankName}${tierText}`;

    setArenaMode(selectedMode);
    setMatchState("searching");
    socket.emit("arena_presence", { state: "searching", mode: selectedMode, roomCode: "" });
    socket.emit("find_arena_match", {
      mode: selectedMode,
      botRankOverride: botRankOverride !== undefined ? botRankOverride : undefined,
      targetSlotIndex,
      user: {
        uid: user.uid,
        name: user.displayName || "User",
        avatar: user.photoURL,
        rankInfo: readableRankInfo,
        rankId,
        tier: tierNum,
        arenaMatchesPlayed: (user as any).arenaMatchesPlayed || 0,
        slotIndex: arenaPlayers.find((p) => p.uid === user.uid)?.slotIndex,
        team: arenaPlayers.find((p) => p.uid === user.uid)?.team,
      },
    });

    setSearchElapsed(0);
    searchStartTimeRef.current = Date.now();
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    searchTimerRef.current = setInterval(() => setSearchElapsed((prev) => prev + 1), 1000);
  };

  const cancelSearch = () => {
    if (socket) socket.emit("cancel_arena_search");
    setMatchState("lobby");
    setWaitingChallenge(false);
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
  };

  const handleReset = () => {
    if (matchStateRef.current === "playing") cleanupArenaSession("cancel");
    setMatchState("selecting");
    setRoomCode("");
    setMatchData(null);
    setOpponent(null);
    setIsReady(false);
    setOpponentReady(false);
    setReadyPlayers({});
    setLobbyMessages([]);
    setUserScore(0);
    setOpponentScore(0);
    setTimeLeft(10);
    setCurrentQuestionIndex(0);
    setHasAnswered(false);
    setLastAnswerCorrect(null);
    setOppAnswered(false);
    setRankUpdateStatus(null);
    setArenaPlayers([]);
    setWaitingChallenge(false);
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    stopTimer();
  };

  // Ready
  const handleReady = () => {
    if (!socket || !user || !roomCodeRef.current) return;

    if (isReady) {
      setIsReady(false);
      setReadyPlayers((prev) => ({ ...prev, [user.uid]: false }));
      socket.emit("arena_unready", { roomCode: roomCodeRef.current });
    } else {
      setIsReady(true);
      setReadyPlayers((prev) => ({ ...prev, [user.uid]: true }));
      socket.emit("arena_ready", { roomCode: roomCodeRef.current });
    }
  };

  const handleSendLobbyChat = (text: string) => {
    if (!socket || !user || !roomCode) return;
    const msg = { uid: user.uid, name: user.displayName || "Tôi", avatar: user.photoURL, text, time: Date.now() };
    socket.emit("arena_lobby_chat", { roomCode, text });
    setLobbyMessages((prev) => [...prev, msg]);
  };

  const handleKickPlayer = (targetUid: string) => {
    if (socket && roomCode) socket.emit("arena_kick_player", { roomCode, targetUid });
  };

  const handleStartBotMatch = (botRankId: number | null, targetSlotIndex?: number) => {
    if (socket && roomCode && matchState === "found") {
      socket.emit("arena_add_bot", { roomCode, botRankId, targetSlotIndex });
    } else {
      startSearch(arenaMode as "solo" | "team2v2", botRankId, targetSlotIndex);
    }
  };

  const handleMoveSlot = (targetSlotIndex: number) => {
    if (socket && roomCode && matchState === "found") {
      socket.emit("arena_move_slot", { roomCode, targetSlotIndex });
    } else {
      setArenaPlayers((prev) => {
        const newPlayers = prev.length > 0 ? [...prev] : [{ uid: user?.uid, name: user?.displayName, avatar: user?.photoURL, rankInfo: (user as any)?.rankInfo || "", level: user?.level }];
        const me = newPlayers.find((p) => p.uid === user?.uid);
        if (me) {
          me.slotIndex = targetSlotIndex;
          me.team = targetSlotIndex < 2 ? "blue" : "red";
        }
        return [...newPlayers];
      });
    }
  };

  const handleSwapSlot = (targetUid: string) => {
    if (socket && roomCode && matchState === "found") {
      socket.emit("arena_swap_slots", { roomCode, targetUid });
    }
  };

  const handleAnswer = (isCorrect: boolean, timeRem?: number) => {
    if (hasAnswered) return;
    setHasAnswered(true);
    setLastAnswerCorrect(isCorrect);
    socket?.emit("arena_answer", { roomCode, uid: user?.uid, timeRemaining: timeRem, isCorrect });

    const currentWord = matchData?.cards[currentQuestionIndex];
    if (currentWord) {
      playAudio(currentWord.term, undefined, isCorrect ? "correct" : "wrong");
    }
  };

  const handleSurrender = async () => {
    setShowSurrenderModal(false);
    try {
      const res = await fetch(`${API}/api/rank/lose`, { method: "POST", credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setRankUpdateStatus(d.status === "protected" ? "protected" : "lose");
        updateUser({ rankId: d.rankId, tier: d.tier, stars: d.stars });
      }
    } catch (err) {}
    stopTimer();
    setUserScore(0);
    setOpponentScore(100);
    setMatchState("finished");
    cleanupArenaSession("surrender");
  };

  const handleCloseClick = () => {
    if (matchState === "playing") setShowSurrenderModal(true);
    else if (!["selecting", "finished"].includes(matchState)) {
      cancelSearch();
      handleReset();
    } else navigate(-1);
  };

  const handleSelectMode = (mode: "solo" | "team2v2") => {
    setArenaMode(mode);
    setMatchState("lobby");
    fetchLobbyFriends();
  };

  const joinTournamentLobby = useCallback(
    (room: any) => {
      if (!socket || !user || !room?.code) return;
      socket.emit("join_arena_tournament_lobby", {
        code: room.code,
        user: {
          uid: user.uid,
          name: user.displayName || "Học viên",
          displayName: user.displayName || "Học viên",
          avatar: user.photoURL || "",
          photoURL: user.photoURL || "",
          rankId: user.rankId || 1,
          tier: user.tier || 3,
        },
      });
    },
    [socket, user],
  );

  const createTournamentRoom = async () => {
    const res = await fetch(`${API}/api/arena/tournaments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: tournamentTitle, inviteUserIds: selectedInviteIds }),
    });
    const data = await res.json();
    if (!res.ok) return toastService.error(data.error || "Không tạo được giải đấu");
    setTournamentRoom(data);
    setTournamentCode(data.code);
    setTournamentParticipants([]);
    setTournamentCanStart(false);
    joinTournamentLobby(data);
    toastService.success(`Đã tạo phòng ${data.code}. Chờ ít nhất 2 người để bắt đầu.`);
  };

  const joinTournamentByCode = async () => {
    if (!tournamentCode.trim()) return;
    const res = await fetch(`${API}/api/arena/tournaments/${tournamentCode.trim()}/join`, { method: "POST", credentials: "include" });
    const data = await res.json();
    if (!res.ok) return toastService.error(data.error || "Không vào được phòng");
    setTournamentRoom(data);
    joinTournamentLobby(data);
    toastService.success("Đã vào phòng chờ giải đấu");
  };

  const startTournamentMatch = () => {
    if (!socket || !tournamentRoom?.code) return;
    if (!tournamentCanStart || tournamentParticipants.length < 2) {
      toastService.error("Cần ít nhất 2 người trong phòng chờ mới bắt đầu được");
      return;
    }
    socket.emit("start_arena_tournament_match", { code: tournamentRoom.code });
  };

  // Challenge friend
  const handleInviteFriend = (friendUid: string, targetSlotIndex?: number) => {
    if (!socket || !user) return;

    // Generate match data for the challenge
    const rankId = Number(user.rankId) || 1;

    socket.emit("arena_challenge_invite", {
      targetUid: friendUid,
      challenger: {
        uid: user.uid,
        name: user.displayName || "User",
        avatar: user.photoURL || "",
        rankInfo: RANK_NAMES[user.rankId || 1] || "Bạc",
        rankId: user.rankId || 1,
        tier: user.tier || 3,
        level: user.level || 1,
        slotIndex: arenaPlayers.find((p) => p.uid === user.uid)?.slotIndex,
        team: arenaPlayers.find((p) => p.uid === user.uid)?.team,
      },
      mode: arenaMode,
      roomCode: roomCode || undefined,
      targetSlotIndex,
    });
    setWaitingChallenge(true);
    toastService.success("Đã gửi lời thách đấu! Đang chờ phản hồi...");
    setMatchState("searching");
    setSearchElapsed(0);
    searchStartTimeRef.current = Date.now();
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    searchTimerRef.current = setInterval(() => setSearchElapsed((prev) => prev + 1), 1000);
  };

  const handleAcceptChallenge = () => {
    if (!socket || !incomingChallenge || !user) return;
    socket.emit("arena_challenge_response", {
      challengerUid: incomingChallenge.uid,
      accepted: true,
      mode: incomingChallenge.challengeMode,
      matchData: incomingChallenge.matchData,
      responder: {
        uid: user.uid,
        name: user.displayName || "Bạn",
        avatar: user.photoURL || "",
        rankInfo: `${(user as any)?.rankInfo || ""}`,
        rankId: user.rankId || 1,
        tier: user.tier || 3,
        level: user.level,
      },
    });
    setIncomingChallenge(null);
  };

  const handleDeclineChallenge = () => {
    if (!socket || !incomingChallenge) return;
    socket.emit("arena_challenge_response", { challengerUid: incomingChallenge.uid, accepted: false });
    setIncomingChallenge(null);
  };

  // Send team hint
  const handleSendTeamHint = () => {
    if (teamHint.trim()) {
      socket?.emit("arena_team_hint", { roomCode, uid: user?.uid, message: teamHint.trim() });
      setTeamHints((prev) => [...prev.slice(-4), { from: "Bạn", message: teamHint.trim() }]);
      setTeamHint("");
    }
  };

  // Derived
  const currentCard = matchData?.cards[currentQuestionIndex];
  const totalQuestions = matchData?.cards?.length || 10;
  const isX2 = matchData?.x2Indices?.includes(currentQuestionIndex) || false;

  // Lobby state mapping
  const lobbyState = matchState === "found" ? "found" : matchState === "searching" ? "searching" : "idle";
  const lobbyTitleOverride = waitingChallenge ? "Đang chờ đối thủ đồng ý..." : undefined;

  return (
    <div className="min-h-[100vh] flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-black">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-red-600/20 rounded-full blur-3xl"></div>
      </div>

      {/* Close button */}
      <button onClick={handleCloseClick} className="absolute top-8 left-8 text-white/50 hover:text-white bg-white/5 p-3 rounded-full backdrop-blur-sm transition-all z-50">
        <X className="w-6 h-6" />
      </button>

      {/* Modals */}
      {showSurrenderModal && <ArenaSurrenderModal onCancel={() => setShowSurrenderModal(false)} onSurrender={handleSurrender} />}

      {matchState === "tournament_bracket" && (
        <ArenaTournamentBracket
          tournamentTitle={tournamentTitle}
          setTournamentTitle={setTournamentTitle}
          tournamentCode={tournamentCode}
          setTournamentCode={setTournamentCode}
          tournamentRoom={tournamentRoom}
          tournamentFriends={tournamentFriends}
          selectedInviteIds={selectedInviteIds}
          setSelectedInviteIds={setSelectedInviteIds}
          tournamentParticipants={tournamentParticipants}
          tournamentCanStart={tournamentCanStart}
          onClose={() => setMatchState("selecting")}
          onCreateRoom={createTournamentRoom}
          onJoinByCode={joinTournamentByCode}
          onStartMatch={startTournamentMatch}
        />
      )}

      {incomingChallenge && <ArenaChallengeModal challenger={incomingChallenge} onAccept={handleAcceptChallenge} onDecline={handleDeclineChallenge} />}

      {/* Mode selection */}
      {matchState === "selecting" && <ArenaModeSelector matchHistory={matchHistory} onSelectMode={handleSelectMode} onOpenTournament={() => setMatchState("tournament_bracket")} />}

      {/* Lobby / Searching / Found */}
      {(matchState === "lobby" || matchState === "searching" || matchState === "found") && (
        <ArenaLobby
          user={user}
          mode={arenaMode}
          opponent={opponent}
          arenaPlayers={arenaPlayers}
          myTeam={myTeam}
          lobbyState={matchState as any}
          titleOverride={tournamentCode ? tournamentTitle : undefined}
          searchElapsed={searchElapsed}
          prepCountdown={prepCountdown}
          currentTip={currentTip}
          friends={lobbyFriends}
          friendsLoading={lobbyFriendsLoading}
          isReady={isReady}
          opponentReady={opponentReady}
          readyPlayers={readyPlayers}
          lobbyMessages={lobbyMessages}
          onSendChat={handleSendLobbyChat}
          onReady={handleReady}
          onStartAutoMatch={() => {
            if (matchState === "found") {
              cancelSearch();
            }
            startSearch(arenaMode as "solo" | "team2v2");
          }}
          onStartBotMatch={handleStartBotMatch}
          onInviteFriend={handleInviteFriend}
          onCancelSearch={cancelSearch}
          onKickPlayer={handleKickPlayer}
          onMoveSlot={handleMoveSlot}
          onSwapSlot={handleSwapSlot}
          isHost={arenaPlayers.length > 0 ? arenaPlayers[0].uid === user.uid : true}
          onBack={() => setMatchState("selecting")}
        />
      )}

      {/* Playing */}
      {matchState === "playing" && currentCard && opponent && matchData && (
        <ArenaPlayingHUD
          user={user}
          opponent={opponent}
          userScore={userScore}
          opponentScore={opponentScore}
          hasAnswered={hasAnswered}
          oppAnswered={oppAnswered}
          timeLeft={timeLeft}
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={totalQuestions}
          currentCard={currentCard}
          matchData={matchData}
          isX2={isX2}
          lastAnswerCorrect={lastAnswerCorrect}
          arenaMode={arenaMode}
          arenaPlayers={arenaPlayers}
          myTeam={myTeam}
          teamHint={teamHint}
          teamHints={teamHints}
          onTeamHintChange={setTeamHint}
          onSendTeamHint={handleSendTeamHint}
          onAnswer={handleAnswer}
        />
      )}

      {/* Finished */}
      {matchState === "finished" && opponent && (
        <ArenaResult user={user} opponent={opponent} userScore={userScore} opponentScore={opponentScore} rankUpdateStatus={rankUpdateStatus} onReset={handleReset} />
      )}

      {/* Queue Timeout Modal */}
      <Modal
        isOpen={!!queueTimeoutData}
        onClose={() => {
          setQueueTimeoutData(null);
          cancelSearch();
        }}
        title="Không tìm thấy đối thủ"
        desc={queueTimeoutData?.message || "Hiện tại hệ thống không có ai đang online, bạn có muốn chuyển qua đấu với bot không?"}
      >
        <div className="p-5 flex gap-3 justify-end border-t border-slate-100 mt-4">
          <button
            onClick={() => {
              setQueueTimeoutData(null);
              cancelSearch();
            }}
            className="px-6 py-2 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              const botRank = queueTimeoutData?.botRank || user.rankId;
              setQueueTimeoutData(null);
              cancelSearch();
              startSearch(arenaMode as "solo" | "team2v2", botRank);
            }}
            className="px-6 py-2 rounded-xl font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-colors"
          >
            Đấu với Bot
          </button>
        </div>
      </Modal>
    </div>
  );
}
