import { useState, useEffect } from "react";
import { Swords, Plus, UserPlus, Bot, Search, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { UserAvatar } from "../../../components/UserAvatar";
import { ArenaBotSelector } from "./ArenaBotSelector";

const ARENA_TIPS = [
  "Tập trung và phản xạ nhanh sẽ mang lại cho bạn nhiều điểm số hơn!",
  "Cố gắng trả lời nhanh nhưng hãy chắc chắn, sai lầm có thể khiến bạn mất cơ hội lật kèo.",
  "Từ vựng X2 Điểm có thể là chìa khóa giúp bạn chiến thắng, đừng bỏ lỡ!",
  "Càng leo lên Rank cao, độ khó của từ vựng sẽ càng tăng lên. Hãy chuẩn bị tinh thần!",
  "Chế độ Gõ Từ (Typing) yêu cầu độ chính xác tuyệt đối, hãy chú ý chính tả.",
  "Đấu hạng là nơi thể hiện trình độ, giữ vững tâm lý khi gặp đối thủ mạnh nhé.",
];

// --- Player slot component ---
function PlayerSlot({
  player,
  side,
  isEmpty,
  onClickEmpty,
  showAnimation,
}: {
  player?: { name: string; avatar: string; rankInfo?: string; isBot?: boolean; botAccuracyLabel?: string; level?: number };
  side: "left" | "right";
  isEmpty?: boolean;
  onClickEmpty?: () => void;
  showAnimation?: boolean;
}) {
  const borderColor = side === "left" ? "border-blue-500" : "border-red-500";
  const shadowColor = side === "left" ? "shadow-[0_0_30px_rgba(59,130,246,0.5)]" : "shadow-[0_0_30px_rgba(239,68,68,0.5)]";
  const textColor = side === "left" ? "text-blue-400" : "text-red-400";
  const animSide = side === "left" ? "animate-in slide-in-from-left-20 duration-700" : "animate-in slide-in-from-right-20 duration-700";

  if (isEmpty) {
    return (
      <div className={cn("flex flex-col items-center", animSide)}>
        <button
          onClick={onClickEmpty}
          className={cn(
            "w-20 h-20 md:w-32 md:h-32 rounded-full border-4 border-dashed mb-2 md:mb-4 flex items-center justify-center transition-all hover:scale-105 group",
            side === "left" ? "border-blue-500/40 hover:border-blue-400" : "border-red-500/40 hover:border-red-400",
          )}
        >
          <Plus className={cn("w-8 h-8 md:w-12 md:h-12 transition-colors", side === "left" ? "text-blue-500/50 group-hover:text-blue-400" : "text-red-500/50 group-hover:text-red-400")} />
        </button>
        <h3 className="text-sm md:text-lg font-bold text-white/40">Chọn đối thủ</h3>
      </div>
    );
  }

  if (showAnimation) {
    return (
      <div className={cn("flex flex-col items-center", animSide)}>
        <div className={cn("w-20 h-20 md:w-32 md:h-32 rounded-full border-4 mb-2 md:mb-4 flex items-center justify-center relative", borderColor, "bg-black/50")}>
          <div className="absolute inset-0 border-4 border-white/10 rounded-full animate-ping"></div>
          <Loader2 className="w-8 h-8 md:w-12 md:h-12 text-white/30 animate-spin" />
        </div>
        <h3 className="text-sm md:text-lg font-bold text-white/60">Đang tìm...</h3>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center", animSide)}>
      <div className={cn("w-20 h-20 md:w-32 md:h-32 rounded-full border-4 p-1 mb-2 md:mb-4 bg-black", borderColor, shadowColor)}>
        <img src={player?.avatar || "/mascot/Lopy (1).png"} alt={player?.name} className="w-full h-full rounded-full object-cover" />
      </div>
      <h3 className="text-sm md:text-xl font-bold text-white text-center line-clamp-1 max-w-[100px] md:max-w-none">
        {player?.name || "???"}
      </h3>
      <p className={cn("font-medium text-xs md:text-base text-center line-clamp-1", textColor)}>
        {player?.rankInfo || ""}
      </p>
      {player?.isBot && (
        <p className="mt-1 rounded-full bg-yellow-500/15 px-3 py-1 text-[11px] font-extrabold text-yellow-200">
          Bot {player.botAccuracyLabel ? `• ${player.botAccuracyLabel}` : ""}
        </p>
      )}
    </div>
  );
}

// --- Opponent Picker (submenu when clicking +) ---
function OpponentPicker({
  friends,
  friendsLoading,
  onInviteFriend,
  onSelectBot,
  onAutoMatch,
  onClose,
}: {
  friends: any[];
  friendsLoading: boolean;
  onInviteFriend: (friendUid: string) => void;
  onSelectBot: () => void;
  onAutoMatch: () => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFriends = friends.filter(
    (f) =>
      !searchQuery.trim() ||
      (f.displayName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.email || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-black">Chọn đối thủ</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Quick options */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={onAutoMatch}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all hover:scale-[1.02]"
          >
            <Search className="w-6 h-6 text-blue-400" />
            <span className="text-sm font-bold text-blue-300">Tự động ghép</span>
            <span className="text-[10px] text-gray-500">Hệ thống tìm đối thủ</span>
          </button>
          <button
            onClick={onSelectBot}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-all hover:scale-[1.02]"
          >
            <Bot className="w-6 h-6 text-purple-400" />
            <span className="text-sm font-bold text-purple-300">Chọn Máy</span>
            <span className="text-[10px] text-gray-500">Chọn level bot</span>
          </button>
        </div>

        {/* Friend list */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-300">Mời bạn bè Solo</span>
          </div>

          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm bạn bè..."
            className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm outline-none placeholder:text-white/30 mb-3"
          />

          <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar">
            {friendsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
              </div>
            ) : filteredFriends.length === 0 ? (
              <p className="text-center text-sm text-white/30 py-4">
                {searchQuery ? "Không tìm thấy bạn bè phù hợp" : "Chưa có bạn bè nào"}
              </p>
            ) : (
              filteredFriends.map((friend: any) => (
                <button
                  key={friend.uid}
                  onClick={() => onInviteFriend(friend.uid)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-left group"
                >
                  <img
                    src={friend.photoURL || "/mascot/Lopy (1).png"}
                    className="w-9 h-9 rounded-full object-cover border-2 border-white/10"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {friend.displayName || friend.email || "Bạn bè"}
                    </div>
                    {friend.rankInfo && (
                      <div className="text-[11px] text-gray-500">{friend.rankInfo}</div>
                    )}
                  </div>
                  <Swords className="w-4 h-4 text-yellow-500/50 group-hover:text-yellow-400 transition-colors" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main lobby component ---

type LobbyState = "idle" | "picking" | "searching" | "found";

interface ArenaLobbyProps {
  user: any;
  mode: "solo" | "team2v2" | "tournament";
  opponent: any | null;
  arenaPlayers: any[];
  myTeam: "blue" | "red";
  lobbyState: LobbyState;
  searchElapsed: number;
  prepCountdown: number;
  currentTip: string;
  friends: any[];
  friendsLoading: boolean;
  onStartAutoMatch: () => void;
  onStartBotMatch: (botRankId: number | null) => void;
  onInviteFriend: (friendUid: string) => void;
  onCancelSearch: () => void;
  onBack: () => void;
}

export function ArenaLobby({
  user,
  mode,
  opponent,
  arenaPlayers,
  myTeam,
  lobbyState,
  searchElapsed,
  prepCountdown,
  currentTip,
  friends,
  friendsLoading,
  onStartAutoMatch,
  onStartBotMatch,
  onInviteFriend,
  onCancelSearch,
  onBack,
}: ArenaLobbyProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [showBotSelector, setShowBotSelector] = useState(false);

  const modeTitle = mode === "solo" ? "Solo 1vs1" : mode === "team2v2" ? "Đồng đội 2vs2" : "Giải đấu";
  const modeColor = mode === "solo" ? "text-blue-400" : mode === "team2v2" ? "text-purple-400" : "text-yellow-400";

  const isSearching = lobbyState === "searching";
  const isFound = lobbyState === "found";

  // Build team slots for 2v2
  const blueTeam = arenaPlayers.filter((p) => p.team === "blue");
  const redTeam = arenaPlayers.filter((p) => p.team === "red");

  return (
    <>
      <div className="flex flex-col items-center z-10 w-full max-w-4xl px-4 animate-in fade-in zoom-in duration-500">
        {/* Title */}
        <div className="mb-6 md:mb-8 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-wider uppercase">
            {isFound ? "TRẬN ĐẤU SẮP BẮT ĐẦU!" : modeTitle}
          </h2>
          <p className={cn("font-bold text-lg", modeColor)}>
            {isFound ? "" : isSearching ? "Đang tìm đối thủ..." : "Phòng chờ"}
          </p>
        </div>

        {/* Tip */}
        {isFound && currentTip && (
          <div className="mb-8 md:mb-12 text-center max-w-2xl bg-black/40 p-3 md:p-4 rounded-2xl border border-white/10 animate-in slide-in-from-top-4">
            <p className="text-gray-400 text-xs md:text-sm mb-1">Mẹo:</p>
            <p className="text-yellow-200 font-medium text-sm md:text-base">{currentTip}</p>
          </div>
        )}

        {/* VS Layout */}
        {mode === "team2v2" ? (
          /* --- 2v2 layout: 2 slots left VS 2 slots right --- */
          <div className="flex items-center justify-between w-full relative">
            {/* Blue team */}
            <div className="flex flex-col gap-4">
              <PlayerSlot
                player={{ name: user?.displayName || "Bạn", avatar: user?.photoURL || "", rankInfo: (user as any)?.rankInfo || "" }}
                side="left"
              />
              {blueTeam.length > 1 ? (
                <PlayerSlot
                  player={{ name: blueTeam[1]?.name, avatar: blueTeam[1]?.avatar, rankInfo: blueTeam[1]?.rankInfo, isBot: blueTeam[1]?.isBot, botAccuracyLabel: blueTeam[1]?.botAccuracyLabel }}
                  side="left"
                />
              ) : isSearching ? (
                <PlayerSlot side="left" showAnimation />
              ) : (
                <PlayerSlot side="left" isEmpty onClickEmpty={() => setShowPicker(true)} />
              )}
            </div>

            {/* VS center */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-in zoom-in delay-300 duration-500">
              {isFound ? (
                <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-yellow-400 to-red-600 rounded-full flex flex-col items-center justify-center shadow-2xl shadow-red-500/50 relative z-20">
                  <span className="text-2xl md:text-3xl font-black text-white">{prepCountdown}</span>
                  <span className="text-[10px] md:text-xs font-bold text-white/80">giây</span>
                </div>
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center shadow-2xl border border-white/10">
                  <span className="text-2xl md:text-3xl font-black text-white/40">VS</span>
                </div>
              )}
            </div>

            {/* Red team */}
            <div className="flex flex-col gap-4">
              {redTeam.length > 0 ? (
                <>
                  <PlayerSlot
                    player={{ name: redTeam[0]?.name, avatar: redTeam[0]?.avatar, rankInfo: redTeam[0]?.rankInfo, isBot: redTeam[0]?.isBot, botAccuracyLabel: redTeam[0]?.botAccuracyLabel }}
                    side="right"
                  />
                  {redTeam.length > 1 && (
                    <PlayerSlot
                      player={{ name: redTeam[1]?.name, avatar: redTeam[1]?.avatar, rankInfo: redTeam[1]?.rankInfo, isBot: redTeam[1]?.isBot, botAccuracyLabel: redTeam[1]?.botAccuracyLabel }}
                      side="right"
                    />
                  )}
                </>
              ) : isSearching ? (
                <>
                  <PlayerSlot side="right" showAnimation />
                  <PlayerSlot side="right" showAnimation />
                </>
              ) : (
                <>
                  <PlayerSlot side="right" isEmpty onClickEmpty={() => setShowPicker(true)} />
                  <PlayerSlot side="right" isEmpty onClickEmpty={() => setShowPicker(true)} />
                </>
              )}
            </div>
          </div>
        ) : (
          /* --- Solo 1vs1 layout --- */
          <div className="flex items-center justify-between w-full relative">
            {/* Left: Player */}
            <PlayerSlot
              player={{ name: user?.displayName || "Bạn", avatar: user?.photoURL || "", rankInfo: (user as any)?.rankInfo || "", level: user?.level }}
              side="left"
            />

            {/* VS center */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-in zoom-in delay-300 duration-500">
              {isFound ? (
                <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-yellow-400 to-red-600 rounded-full flex flex-col items-center justify-center shadow-2xl shadow-red-500/50 relative z-20">
                  <span className="text-2xl md:text-3xl font-black text-white">{prepCountdown}</span>
                  <span className="text-[10px] md:text-xs font-bold text-white/80">giây</span>
                </div>
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center shadow-2xl border border-white/10">
                  <span className="text-2xl md:text-3xl font-black text-white/40">VS</span>
                </div>
              )}
            </div>

            {/* Right: Opponent */}
            {isFound && opponent ? (
              <PlayerSlot
                player={{ name: opponent.name, avatar: opponent.avatar, rankInfo: opponent.rankInfo, isBot: opponent.isBot, botAccuracyLabel: opponent.botAccuracyLabel }}
                side="right"
              />
            ) : isSearching ? (
              <PlayerSlot side="right" showAnimation />
            ) : (
              <PlayerSlot side="right" isEmpty onClickEmpty={() => setShowPicker(true)} />
            )}
          </div>
        )}

        {/* Search timer */}
        {isSearching && (
          <div className="mt-8 flex flex-col items-center animate-in fade-in duration-300">
            <div className="text-xl font-mono text-yellow-300">
              {Math.floor(searchElapsed / 60)
                .toString()
                .padStart(2, "0")}
              :{(searchElapsed % 60).toString().padStart(2, "0")}
            </div>
            <p className="text-sm text-blue-200/60 mt-2 max-w-md text-center">
              {mode === "team2v2"
                ? "Đang tìm đồng đội và đối thủ. Sau 15 giây có thể ghép bot nếu rank phù hợp."
                : "Hệ thống đang ghép cặp bạn với người chơi cùng Rank"}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-8 flex gap-4">
          {isSearching ? (
            <button
              onClick={onCancelSearch}
              className="px-6 py-2.5 border border-white/20 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              Hủy tìm
            </button>
          ) : !isFound ? (
            <button
              onClick={onBack}
              className="px-6 py-2.5 border border-white/20 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              Quay lại
            </button>
          ) : null}
        </div>
      </div>

      {/* Opponent Picker Modal */}
      {showPicker && (
        <OpponentPicker
          friends={friends}
          friendsLoading={friendsLoading}
          onInviteFriend={(uid) => {
            setShowPicker(false);
            onInviteFriend(uid);
          }}
          onSelectBot={() => {
            setShowPicker(false);
            setShowBotSelector(true);
          }}
          onAutoMatch={() => {
            setShowPicker(false);
            onStartAutoMatch();
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Bot Selector Modal */}
      {showBotSelector && (
        <ArenaBotSelector
          onSelectBot={(rankId) => {
            setShowBotSelector(false);
            onStartBotMatch(rankId);
          }}
          onClose={() => setShowBotSelector(false)}
        />
      )}
    </>
  );
}
