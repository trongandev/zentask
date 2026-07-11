import React from "react";
import { Users, Trophy, ChevronLeft, Plus, Play, UserPlus } from "lucide-react";

interface ArenaTournamentBracketProps {
  tournamentTitle: string;
  setTournamentTitle: (v: string) => void;
  tournamentCode: string;
  setTournamentCode: (v: string) => void;
  tournamentRoom: any;
  tournamentFriends: any[];
  selectedInviteIds: string[];
  setSelectedInviteIds: React.Dispatch<React.SetStateAction<string[]>>;
  tournamentParticipants: any[];
  tournamentCanStart: boolean;
  onClose: () => void;
  onCreateRoom: () => void;
  onJoinByCode: () => void;
  onStartMatch: () => void;
}

export function ArenaTournamentBracket({
  tournamentTitle,
  setTournamentTitle,
  tournamentCode,
  setTournamentCode,
  tournamentRoom,
  tournamentFriends,
  selectedInviteIds,
  setSelectedInviteIds,
  tournamentParticipants,
  tournamentCanStart,
  onClose,
  onCreateRoom,
  onJoinByCode,
  onStartMatch,
}: ArenaTournamentBracketProps) {
  // We have 16 slots max
  const maxSlots = 16;
  const leftSlots = Array.from({ length: 8 }, (_, i) => tournamentParticipants[i] || null);
  const rightSlots = Array.from({ length: 8 }, (_, i) => tournamentParticipants[i + 8] || null);

  const renderParticipantSlot = (participant: any, index: number, isRight: boolean) => {
    return (
      <div
        key={`slot-${index}`}
        className={`flex items-center gap-3 p-2 rounded-lg border shadow-lg relative ${
          participant ? "bg-slate-800 border-yellow-500/50" : "bg-slate-800/50 border-white/10"
        } ${isRight ? "flex-row-reverse" : ""}`}
        style={{ width: "220px", height: "56px" }}
      >
        <div className="w-10 h-10 rounded-full border-2 border-slate-700 overflow-hidden flex-shrink-0 bg-slate-900 flex items-center justify-center">
          {participant ? (
            <img src={participant.photoURL || participant.avatar || "/mascot/Lopy (1).png"} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white/20 text-xs font-bold">Slot</span>
          )}
        </div>
        <div className={`flex flex-col flex-1 overflow-hidden ${isRight ? "text-right" : "text-left"}`}>
          <span className={`text-sm font-bold truncate ${participant ? "text-yellow-100" : "text-white/30"}`}>
            {participant ? participant.displayName || participant.name || "Học viên" : "Đang chờ..."}
          </span>
          {participant && <span className="text-[10px] text-white/50 uppercase">Ready</span>}
        </div>
        
        {/* Connection line to next round */}
        <div className={`absolute top-1/2 w-4 border-t-2 border-white/20 ${isRight ? "-left-4" : "-right-4"}`}></div>
      </div>
    );
  };

  const renderRoundBox = (height: string, isRight: boolean) => {
    return (
      <div
        className={`flex flex-col justify-around border-y-2 border-white/20 relative`}
        style={{ width: "20px", height }}
      >
        <div className={`absolute top-0 bottom-0 w-full border-y-2 border-white/20 ${isRight ? "border-l-2 -left-[2px]" : "border-r-2 -right-[2px]"}`}></div>
        {/* Output line to next round */}
        <div className={`absolute top-1/2 w-4 border-t-2 border-white/20 ${isRight ? "-left-4" : "-right-4"}`}></div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-slate-900/50 border-b border-white/5 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 uppercase tracking-wider flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              {tournamentRoom ? tournamentRoom.title : "Giải Đấu Bracket"}
            </h1>
            <p className="text-sm font-medium text-white/50">
              {tournamentRoom ? `Mã phòng: ${tournamentRoom.code} • 16 Slots` : "Đấu loại trực tiếp 16 người"}
            </p>
          </div>
        </div>
        
        {tournamentRoom && (
          <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded-full">
            <Users className="w-5 h-5 text-yellow-500" />
            <span className="font-bold text-yellow-500">{tournamentParticipants.length} / {maxSlots}</span>
          </div>
        )}
      </div>

      {/* Main Bracket Area */}
      <div className="flex-1 relative flex items-center justify-center p-8 overflow-auto min-w-[1200px]">
        {/* Background Decorative */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/10 via-slate-950 to-black pointer-events-none"></div>

        <div className="flex items-center justify-between w-full max-w-7xl z-10 gap-8">
          
          {/* LEFT BRACKET */}
          <div className="flex items-center gap-4">
            {/* Round 1 (8 slots = 4 matches) */}
            <div className="flex flex-col gap-4">
              {leftSlots.map((p, i) => renderParticipantSlot(p, i, false))}
            </div>
            {/* Round 2 Connections */}
            <div className="flex flex-col gap-[72px] justify-center">
              {renderRoundBox("128px", false)}
              {renderRoundBox("128px", false)}
              {renderRoundBox("128px", false)}
              {renderRoundBox("128px", false)}
            </div>
            {/* Round 3 Connections */}
             <div className="flex flex-col gap-[200px] justify-center">
              {renderRoundBox("256px", false)}
              {renderRoundBox("256px", false)}
            </div>
          </div>

          {/* CENTER TROPHY */}
          <div className="flex flex-col items-center justify-center relative">
             {/* Final connection line left */}
             <div className="absolute left-[-40px] w-10 border-t-2 border-white/20"></div>
             {/* Final connection line right */}
             <div className="absolute right-[-40px] w-10 border-t-2 border-white/20"></div>

            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-yellow-600 to-yellow-300 p-1 shadow-[0_0_50px_rgba(234,179,8,0.3)] animate-pulse">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center relative">
                <Trophy className="w-16 h-16 text-yellow-400" />
              </div>
            </div>
            <div className="mt-4 text-xl font-black text-yellow-400 tracking-widest drop-shadow-md">CHAMPION</div>
          </div>

          {/* RIGHT BRACKET */}
          <div className="flex items-center gap-4 flex-row-reverse">
            {/* Round 1 */}
            <div className="flex flex-col gap-4">
              {rightSlots.map((p, i) => renderParticipantSlot(p, i, true))}
            </div>
            {/* Round 2 Connections */}
            <div className="flex flex-col gap-[72px] justify-center">
              {renderRoundBox("128px", true)}
              {renderRoundBox("128px", true)}
              {renderRoundBox("128px", true)}
              {renderRoundBox("128px", true)}
            </div>
             {/* Round 3 Connections */}
             <div className="flex flex-col gap-[200px] justify-center">
              {renderRoundBox("256px", true)}
              {renderRoundBox("256px", true)}
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel Footer */}
      {!tournamentRoom ? (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[800px] bg-slate-800/90 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 flex gap-6 z-20">
          <div className="flex-1 bg-slate-900/50 p-5 rounded-2xl border border-white/5">
            <h3 className="font-bold text-lg mb-4 text-white/80 flex items-center gap-2"><Plus className="w-5 h-5 text-yellow-500" /> Tạo Giải Đấu Mới</h3>
            <input
              value={tournamentTitle}
              onChange={(e) => setTournamentTitle(e.target.value)}
              placeholder="Tên giải đấu"
              className="w-full rounded-xl bg-slate-800 px-4 py-3 outline-none text-sm mb-4 border border-white/10 focus:border-yellow-500/50 transition-colors"
            />
            {tournamentFriends.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-white/50 mb-2">MỜI BẠN BÈ</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {tournamentFriends.map((friend) => {
                    const isSelected = selectedInviteIds.includes(friend.uid);
                    return (
                      <button
                        key={friend.uid}
                        onClick={() => setSelectedInviteIds(prev => isSelected ? prev.filter(id => id !== friend.uid) : [...prev, friend.uid])}
                        className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                          isSelected ? "bg-yellow-500 text-black border-yellow-500" : "bg-slate-800 text-white/70 border-white/10 hover:border-white/30"
                        }`}
                      >
                        <img src={friend.photoURL || "/mascot/Lopy (1).png"} alt="" className="w-5 h-5 rounded-full" />
                        {friend.displayName?.split(" ")[0] || "Bạn"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              onClick={onCreateRoom}
              className="w-full bg-yellow-500 text-black font-black py-3 rounded-xl hover:bg-yellow-400 transition-colors"
            >
              TẠO PHÒNG CỐ ĐỊNH
            </button>
          </div>

          <div className="w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

          <div className="flex-1 bg-slate-900/50 p-5 rounded-2xl border border-white/5">
            <h3 className="font-bold text-lg mb-4 text-white/80 flex items-center gap-2"><UserPlus className="w-5 h-5 text-blue-400" /> Vào Phóng Đã Có</h3>
            <input
              value={tournamentCode}
              onChange={(e) => setTournamentCode(e.target.value)}
              placeholder="Nhập mã phòng 6 số"
              className="w-full rounded-xl bg-slate-800 px-4 py-3 outline-none text-sm mb-4 border border-white/10 focus:border-blue-400/50 transition-colors text-center font-mono tracking-widest text-xl"
            />
            <button
              onClick={onJoinByCode}
              className="w-full bg-blue-600 text-white font-black py-3 rounded-xl hover:bg-blue-500 transition-colors"
            >
              VÀO PHÒNG
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl p-2 pr-8 flex items-center gap-6 z-20">
           <div className="bg-yellow-500/20 text-yellow-400 px-6 py-4 rounded-full font-mono text-xl font-black tracking-widest">
            {tournamentRoom.code}
           </div>
           <div className="flex flex-col">
              <span className="text-sm font-bold text-white/80">Trạng thái: Đang chờ</span>
              <span className="text-xs text-white/50">{tournamentParticipants.length < 2 ? "Cần tối thiểu 2 người để bắt đầu" : "Đã có thể bắt đầu!"}</span>
           </div>
           <button
            onClick={onStartMatch}
            disabled={!tournamentCanStart || tournamentParticipants.length < 2}
            className="ml-4 flex items-center gap-2 bg-yellow-500 text-black px-8 py-3 rounded-full font-black disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
           >
             <Play className="w-5 h-5 fill-current" />
             BẮT ĐẦU NGAY
           </button>
        </div>
      )}
    </div>
  );
}
