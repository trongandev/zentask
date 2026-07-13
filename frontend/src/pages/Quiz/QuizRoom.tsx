import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users, Play, Copy, Check, BarChart2, CheckCircle2, LogOut, X } from "lucide-react";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { useQuizStore, QuizRoom as QuizRoomType, Quiz } from "../../services/quizService";
import toastService from "@/src/services/toastService";

interface ParticipantProgress {
  uid: string;
  name: string;
  avatar: string;
  answeredCount: number;
  totalQuestions: number;
  correctCount: number;
  score?: number;
  finished: boolean;
}

export function QuizRoom() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();
  const { getRoomByCode, getQuizById } = useQuizStore();

  const [room, setRoom] = useState<QuizRoomType | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState<"waiting" | "playing" | "finished">("waiting");
  const [copied, setCopied] = useState(false);

  const [participants, setParticipants] = useState<Record<string, ParticipantProgress>>({});

  useEffect(() => {
    const init = async () => {
      if (!code) return;
      try {
        const roomData = await getRoomByCode(code);
        if (!roomData) {
          navigate("/quiz");
          return;
        }
        setRoom(roomData);
        setStatus(roomData.status);

        const quizData = await getQuizById(roomData.quizId);
        setQuiz(quizData);

        if (socket && user) {
          socket.emit("join_quiz_room", {
            roomCode: code,
            user: { uid: user.uid, name: user.displayName || "User", avatar: user.photoURL },
          });
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [code, socket, user, navigate, getRoomByCode, getQuizById]);

  useEffect(() => {
    if (!socket || !room) return;

    socket.on("room_participants_update", (usersList: any[]) => {
      setParticipants((prev) => {
        const newMap: Record<string, ParticipantProgress> = {};
        usersList.forEach((u) => {
          newMap[u.uid] = prev[u.uid] || {
            uid: u.uid,
            name: u.name,
            avatar: u.avatar,
            answeredCount: 0,
            totalQuestions: quiz?.questions.length || 0,
            correctCount: 0,
            finished: false,
          };
        });
        return newMap;
      });
    });

    socket.on("room_kicked_student", (data: any) => {
      if (data.uid === user?.uid) {
        toastService.error("Bạn đã bị mời ra khỏi phòng thi.");
        navigate("/quiz");
      }
    });

    socket.on("quiz_started", (quizId: string) => {
      setStatus("playing");
      if (user?.uid !== room.creatorId) {
        navigate(`/quiz/play/${quizId}?roomCode=${code}`);
      }
    });

    socket.on("student_progress_update", (data: any) => {
      setParticipants((prev) => ({
        ...prev,
        [data.uid]: {
          ...prev[data.uid],
          ...data,
        },
      }));
    });

    socket.on("student_finished_update", (data: any) => {
      setParticipants((prev) => ({
        ...prev,
        [data.uid]: {
          ...prev[data.uid],
          finished: true,
          score: data.score,
        },
      }));
    });

    return () => {
      socket.off("room_participants_update");
      socket.off("room_kicked_student");
      socket.off("quiz_started");
      socket.off("student_progress_update");
      socket.off("student_finished_update");
    };
  }, [socket, navigate, room, user, quiz]);

  const handleStart = () => {
    if (socket && quiz && room) {
      socket.emit("teacher_start_quiz", { roomCode: code, quizId: quiz.id });
      setStatus("playing");
    }
  };

  const handleExit = () => {
    if (socket && user && code) {
      socket.emit("leave_quiz_room", { roomCode: code, uid: user.uid });
    }
    navigate("/quiz");
  };

  const handleKick = (uid: string) => {
    if (socket && code) {
      socket.emit("teacher_kick_student", { roomCode: code, uid });
    }
  };

  const handleEndQuiz = () => {
    const finishedCount = participantList.filter((p) => p.finished).length;
    const totalStudents = participantList.length;

    if (finishedCount < totalStudents) {
      if (!window.confirm("Vẫn còn học viên chưa làm xong bài. Bạn có chắc chắn muốn kết thúc phòng thi không?")) {
        return;
      }
    }

    if (socket && code) {
      socket.emit("teacher_end_quiz", { roomCode: code });
    }
    navigate("/quiz");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!room || !quiz) return null;

  const isCreator = room.creatorId === user?.uid;
  const participantList = Object.values(participants).filter((p) => p.uid !== room.creatorId);

  if (status === "playing" && isCreator) {
    // TEACHER DASHBOARD
    const totalStudents = participantList.length;
    const finishedCount = participantList.filter((p) => p.finished).length;

    // Global stats calculation
    const globalTotalQuestions = quiz.questions.length * totalStudents;
    const globalCorrectCount = participantList.reduce((acc, p) => acc + (p.correctCount || 0), 0);
    const globalAnsweredCount = participantList.reduce((acc, p) => acc + (p.answeredCount || 0), 0);
    const globalWrongCount = globalAnsweredCount - globalCorrectCount;

    const correctPercent = globalTotalQuestions > 0 ? (globalCorrectCount / globalTotalQuestions) * 100 : 0;
    const wrongPercent = globalTotalQuestions > 0 ? (globalWrongCount / globalTotalQuestions) * 100 : 0;
    const totalProgressPercent = correctPercent + wrongPercent;

    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Bảng điều khiển (Teacher Dashboard)</h1>
            <p className="text-gray-500 mb-4">
              Mã phòng: <strong className="text-gray-900">{code}</strong> | Bài thi: <strong>{quiz.title}</strong>
            </p>

            {/* Global Progress Bar */}
            <div className="w-full md:w-96">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-gray-600">Tiến độ cả lớp ({Math.round(totalProgressPercent)}%)</span>
                <span className="text-gray-500">
                  {globalAnsweredCount} / {globalTotalQuestions} câu
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                <div className="bg-green-500 h-full transition-all duration-500 ease-out" style={{ width: `${correctPercent}%` }} title={`Đúng: ${globalCorrectCount} câu`} />
                <div className="bg-red-500 h-full transition-all duration-500 ease-out" style={{ width: `${wrongPercent}%` }} title={`Sai: ${globalWrongCount} câu`} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <div className="text-right border-r border-gray-100 pr-6">
              <div className="text-3xl font-black text-blue-600">
                {finishedCount}/{totalStudents}
              </div>
              <div className="text-sm font-bold text-gray-500 uppercase">Đã hoàn thành</div>
            </div>
            <button onClick={handleEndQuiz} className="px-6 py-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl font-bold flex items-center gap-2 transition-colors shadow-sm">
              <LogOut className="w-5 h-5" /> Kết thúc chơi
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {participantList.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-3xl border border-dashed border-gray-300">Chưa có học viên nào tham gia.</div>
          ) : (
            participantList.map((p) => {
              const progress = p.totalQuestions > 0 ? (p.answeredCount / p.totalQuestions) * 100 : 0;
              return (
                <div key={p.uid} className={`bg-white rounded-3xl p-6 border-2 transition-all ${p.finished ? "border-green-500 shadow-md" : "border-gray-100 shadow-sm"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img src={p.avatar || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80"} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <div className="font-bold text-gray-900 line-clamp-1">{p.name}</div>
                        {p.finished ? (
                          <div className="text-xs font-bold text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Hoàn thành
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-blue-600 animate-pulse">Đang làm bài...</div>
                        )}
                      </div>
                    </div>
                    {p.finished && <div className="text-xl font-black text-gray-900">{p.score}đ</div>}
                  </div>

                  {!p.finished && (
                    <div>
                      <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                        <span>Tiến độ</span>
                        <span>
                          {p.answeredCount}/{p.totalQuestions}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="mt-3 flex justify-between text-xs font-medium">
                        <span className="text-green-600">Đúng: {p.correctCount}</span>
                        <span className="text-red-500">Sai: {p.answeredCount - p.correctCount}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // WAITING LOBBY
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-extrabold text-gray-900">{quiz.title}</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">{quiz.description}</p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500" />

        <p className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">Mã phòng tham gia</p>
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="text-5xl md:text-7xl font-black text-gray-900 tracking-[0.2em] font-mono">{code}</div>
          <button onClick={copyCode} className="p-3 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-xl transition-colors" title="Copy mã phòng">
            {copied ? <Check className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6" />}
          </button>
        </div>

        {isCreator ? (
          <div className="space-y-4">
            <button
              onClick={handleStart}
              className="px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 mx-auto text-lg"
            >
              <Play className="w-6 h-6 fill-current" />
              Bắt đầu bài thi
            </button>
            <p className="text-sm text-gray-500">Học viên sẽ không thể vào thi sau khi bạn bấm Bắt đầu.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 bg-blue-50/50 rounded-2xl border border-blue-100 text-blue-900 mx-auto max-w-md">
            <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <h3 className="font-bold">Đang chờ giáo viên bắt đầu...</h3>
            <p className="text-sm text-blue-700/80">Vui lòng không thoát khỏi màn hình này.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          Người tham gia ({participantList.length})
        </h3>
        {!isCreator && (
          <button
            onClick={handleExit}
            className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm border border-transparent hover:border-red-100"
          >
            <LogOut className="w-4 h-4" /> Thoát phòng
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {participantList.map((p) => (
          <div
            key={p.uid}
            className={`bg-white p-4 rounded-2xl border ${p.uid === user?.uid ? "border-blue-300 ring-2 ring-blue-500/20" : "border-gray-100"} shadow-sm flex items-center gap-3 animate-in fade-in group relative`}
          >
            <img src={p.avatar || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80"} className="w-10 h-10 rounded-full object-cover" />
            <div className="font-bold text-sm text-gray-900 line-clamp-1">
              {p.name} {p.uid === user?.uid && "(Bạn)"}
            </div>

            {isCreator && p.uid !== user?.uid && (
              <button
                onClick={() => handleKick(p.uid)}
                title="Mời ra khỏi phòng"
                className="absolute -top-2 -right-2 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
