import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Swords, Trophy, Clock, X, Zap, Shield, Target } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";

const OPPONENT = {
  name: "Minh Anh",
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
  rank: 3,
};

const MOCK_QUESTION = {
  word: "Accommodate",
  type: "verb",
  options: ["Cung cấp chỗ ở", "Từ chối", "Tăng tốc", "Hoàn thành"],
  correctIndex: 0,
};

export function Arena() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matchState, setMatchState] = useState<"searching" | "found" | "playing" | "finished">("searching");
  
  // Game state
  const [timeLeft, setTimeLeft] = useState(15);
  const [userScore, setUserScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    if (matchState === "searching") {
      const t = setTimeout(() => setMatchState("found"), 3000);
      return () => clearTimeout(t);
    }
    if (matchState === "found") {
      const t = setTimeout(() => setMatchState("playing"), 3000);
      return () => clearTimeout(t);
    }
    if (matchState === "playing") {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setMatchState("finished");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Simulate opponent answering after 5s
      const oppTimer = setTimeout(() => {
        setOpponentScore(150);
      }, 5000);
      
      return () => {
        clearInterval(timer);
        clearTimeout(oppTimer);
      };
    }
  }, [matchState]);

  const handleAnswer = (index: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    if (index === MOCK_QUESTION.correctIndex) {
      // Score based on time left
      setUserScore(timeLeft * 10 + 50);
    }
    setTimeout(() => {
      setMatchState("finished");
    }, 1500);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-indigo-950 via-slate-900 to-black">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-red-600/20 rounded-full blur-3xl"></div>
      </div>

      <button 
        onClick={() => navigate('/flashcards')}
        className="absolute top-8 left-8 text-white/50 hover:text-white bg-white/5 p-3 rounded-full backdrop-blur-sm transition-all"
      >
        <X className="w-6 h-6" />
      </button>

      {/* --- SEARCHING --- */}
      {matchState === "searching" && (
        <div className="flex flex-col items-center z-10 animate-in zoom-in duration-500">
          <div className="relative w-32 h-32 mb-8">
            <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-ping"></div>
            <div className="absolute inset-2 border-4 border-purple-500/40 rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
            <div className="absolute inset-0 flex items-center justify-center bg-indigo-900/50 rounded-full backdrop-blur-md border border-white/10">
              <Swords className="w-12 h-12 text-blue-400" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            Đang tìm đối thủ...
          </h2>
          <p className="text-blue-200/60 font-medium">Hệ thống đang ghép cặp bạn với người chơi cùng Rank</p>
        </div>
      )}

      {/* --- FOUND --- */}
      {matchState === "found" && (
        <div className="flex flex-col items-center z-10 w-full max-w-4xl px-4 animate-in fade-in zoom-in duration-500">
          <h2 className="text-4xl font-black text-white mb-16 tracking-wider shadow-black drop-shadow-lg uppercase text-center">
            TRẬN ĐẤU SẮP BẮT ĐẦU!
          </h2>
          
          <div className="flex items-center justify-between w-full relative">
            {/* User */}
            <div className="flex flex-col items-center animate-in slide-in-from-left-20 duration-700">
              <div className="w-32 h-32 rounded-full border-4 border-blue-500 p-1 mb-4 shadow-[0_0_30px_rgba(59,130,246,0.5)] bg-black">
                <img src={user?.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop"} alt="You" className="w-full h-full rounded-full object-cover" />
              </div>
              <h3 className="text-xl font-bold text-white">{user?.displayName || "Bạn"}</h3>
              <p className="text-blue-400 font-medium">Rank Bạc III</p>
            </div>
            
            {/* VS */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-in zoom-in delay-300 duration-500 scale-150">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/50 rotate-12">
                <span className="text-3xl font-black text-white italic">VS</span>
              </div>
            </div>

            {/* Opponent */}
            <div className="flex flex-col items-center animate-in slide-in-from-right-20 duration-700">
              <div className="w-32 h-32 rounded-full border-4 border-red-500 p-1 mb-4 shadow-[0_0_30px_rgba(239,68,68,0.5)] bg-black">
                <img src={OPPONENT.avatar} alt="Opponent" className="w-full h-full rounded-full object-cover" />
              </div>
              <h3 className="text-xl font-bold text-white">{OPPONENT.name}</h3>
              <p className="text-red-400 font-medium">Rank Bạc III</p>
            </div>
          </div>
        </div>
      )}

      {/* --- PLAYING --- */}
      {matchState === "playing" && (
        <div className="w-full h-full max-w-5xl px-4 flex flex-col z-10 py-8 animate-in fade-in duration-300">
          
          {/* Top HUD */}
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-4 bg-blue-950/50 border border-blue-500/30 p-2 pr-6 rounded-full backdrop-blur-md">
              <img src={user?.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop"} className="w-12 h-12 rounded-full border-2 border-blue-400" />
              <div>
                <div className="text-sm text-blue-200">Điểm của bạn</div>
                <div className="text-2xl font-black text-white">{userScore}</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">Thời gian</div>
              <div className={cn("text-5xl font-black", timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-white")}>
                {timeLeft}s
              </div>
            </div>

            <div className="flex items-center gap-4 bg-red-950/50 border border-red-500/30 p-2 pl-6 rounded-full backdrop-blur-md flex-row-reverse">
              <img src={OPPONENT.avatar} className="w-12 h-12 rounded-full border-2 border-red-400" />
              <div className="text-right">
                <div className="text-sm text-red-200">Đối thủ</div>
                <div className="text-2xl font-black text-white">{opponentScore}</div>
              </div>
            </div>
          </div>

          {/* Question Area */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl w-full text-center mb-8 shadow-2xl">
              <div className="inline-block bg-white/20 text-white px-3 py-1 rounded-lg text-sm font-bold mb-4 uppercase tracking-widest">
                {MOCK_QUESTION.type}
              </div>
              <h2 className="text-5xl font-black text-white mb-4 tracking-wide">{MOCK_QUESTION.word}</h2>
              <p className="text-blue-200 text-lg">Chọn nghĩa tiếng Việt chính xác nhất</p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              {MOCK_QUESTION.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === MOCK_QUESTION.correctIndex;
                const showStatus = selectedOption !== null;
                
                let btnClass = "bg-white/5 border-white/10 hover:bg-white/10 text-white";
                if (showStatus) {
                  if (isCorrect) btnClass = "bg-green-500/20 border-green-500 text-green-400 scale-[1.02]";
                  else if (isSelected) btnClass = "bg-red-500/20 border-red-500 text-red-400 scale-[0.98]";
                  else btnClass = "bg-white/5 border-white/5 text-white/30";
                }

                return (
                  <button
                    key={idx}
                    disabled={showStatus}
                    onClick={() => handleAnswer(idx)}
                    className={cn(
                      "p-6 rounded-2xl border-2 text-xl font-bold transition-all duration-300",
                      btnClass
                    )}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- FINISHED --- */}
      {matchState === "finished" && (
        <div className="flex flex-col items-center z-10 animate-in slide-in-from-bottom-10 duration-500">
          <div className="w-32 h-32 mb-6">
            {userScore >= opponentScore ? (
              <img src="/mascot/Lopy (1).png" className="w-full h-full object-contain animate-bounce" />
            ) : (
              <img src="/mascot/Lopy (6).png" className="w-full h-full object-contain opacity-80" />
            )}
          </div>
          <h2 className={cn("text-5xl font-black mb-4", userScore >= opponentScore ? "text-yellow-400" : "text-gray-400")}>
            {userScore >= opponentScore ? "CHIẾN THẮNG!" : "THẤT BẠI"}
          </h2>
          <div className="flex gap-12 mt-8 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md">
            <div className="text-center">
              <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Điểm của bạn</div>
              <div className="text-4xl font-black text-blue-400">{userScore}</div>
            </div>
            <div className="w-px bg-white/20"></div>
            <div className="text-center">
              <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Đối thủ</div>
              <div className="text-4xl font-black text-red-400">{opponentScore}</div>
            </div>
          </div>
          
          <div className="mt-12 flex gap-4">
            <button onClick={() => navigate('/flashcards')} className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all">
              Về trang chủ
            </button>
            <button onClick={() => { setMatchState("searching"); setUserScore(0); setOpponentScore(0); setSelectedOption(null); setTimeLeft(15); }} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              Tìm trận mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
