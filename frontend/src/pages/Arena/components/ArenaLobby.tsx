import { useState, useEffect, useRef } from "react";
import { Swords, Plus, UserPlus, Bot, Search, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { UserAvatar } from "../../../components/UserAvatar";
import { UserLevelBadge } from "../../../components/UserLevelBadge";
import { ArenaBotSelector } from "./ArenaBotSelector";
import { RANK_TOPIC_CONFIG } from "../../../config/rankTopicConfig";

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
  onClickFull,
  showAnimation,
  canKick,
  onKick,
  isReady,
}: {
  player?: { uid?: string; name: string; avatar: string; rankInfo?: string; rankId?: number; tier?: number; isBot?: boolean; botAccuracyLabel?: string; level?: number };
  side: "left" | "right";
  isEmpty?: boolean;
  onClickEmpty?: () => void;
  onClickFull?: () => void;
  showAnimation?: boolean;
  canKick?: boolean;
  onKick?: () => void;
  isReady?: boolean;
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
      <div
        className={cn("w-24 h-24 md:w-36 md:h-36 rounded-full p-1 mb-2 md:mb-4 bg-black/20 relative group", shadowColor, onClickFull && "cursor-pointer hover:scale-105 transition-transform")}
        onClick={onClickFull}
      >
        <UserAvatar src={player?.avatar || "/mascot/Lopy (1).png"} level={player?.level || 1} disableLink className="w-full h-full" avatarClassName={cn("border-4", borderColor)} />

        {isReady && (
          <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-black shadow-lg z-20 flex items-center justify-center animate-in zoom-in">
            ✓ Sẵn sàng
          </div>
        )}

        {canKick && (
          <button
            onClick={onKick}
            className="absolute -top-2 -right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 hover:scale-110 z-10 shadow-lg"
            title="Đuổi khỏi phòng"
          >
            ✕
          </button>
        )}
      </div>
      <h3 className="text-sm md:text-xl font-bold text-white text-center line-clamp-1 max-w-[100px] md:max-w-none">{player?.name || "???"}</h3>
      <div className="flex flex-col items-center justify-center gap-1 mt-1">
        <div className="flex items-center gap-1.5">{(player?.level || 1) > 0 && <UserLevelBadge level={player?.level || 1} size="sm" />}</div>
        {(player?.rankId || player?.rankInfo) && (
          <div className="flex items-center justify-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
            {player?.rankId && <img src={`/rank/${player.rankId}.png`} alt="Rank" className="w-4 h-4 md:w-5 md:h-5 object-contain drop-shadow-md" />}
            <p className={cn("font-bold text-[10px] md:text-xs text-center line-clamp-1", textColor)}>
              {player?.rankId
                ? `${RANK_TOPIC_CONFIG[player.rankId as keyof typeof RANK_TOPIC_CONFIG]?.name || "Bạc"} ${["I", "II", "III"][Math.max(0, Math.min(2, (player.tier || 3) - 1))]}`
                : player?.rankInfo}
            </p>
          </div>
        )}
      </div>
      {player?.isBot && <p className="mt-1 rounded-full bg-yellow-500/15 px-3 py-1 text-[11px] font-extrabold text-yellow-200">Bot {player.botAccuracyLabel ? `• ${player.botAccuracyLabel}` : ""}</p>}
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
  onMoveSlot,
  onSwapSlot,
  isHost,
  onClose,
}: {
  friends: any[];
  friendsLoading: boolean;
  onInviteFriend: (friendUid: string) => void;
  onSelectBot: () => void;
  onAutoMatch: () => void;
  onMoveSlot?: () => void;
  onSwapSlot?: () => void;
  isHost?: boolean;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFriends = friends.filter(
    (f) => !searchQuery.trim() || (f.displayName || "").toLowerCase().includes(searchQuery.toLowerCase()) || (f.email || "").toLowerCase().includes(searchQuery.toLowerCase()),
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
          {onSwapSlot && (
            <button
              onClick={onSwapSlot}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition-all hover:scale-[1.02] col-span-2"
            >
              <span className="text-sm font-bold text-orange-300">Đổi chỗ</span>
              <span className="text-[10px] text-gray-500">Đổi vị trí của bạn với người chơi này</span>
            </button>
          )}
          {onMoveSlot && !onSwapSlot && (
            <button
              onClick={onMoveSlot}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all hover:scale-[1.02] col-span-2"
            >
              <span className="text-sm font-bold text-emerald-300">Di chuyển tới đây</span>
              <span className="text-[10px] text-gray-500">Chuyển slot của bạn sang vị trí này</span>
            </button>
          )}
          <button onClick={onAutoMatch} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all hover:scale-[1.02]">
            <Search className="w-6 h-6 text-blue-400" />
            <span className="text-sm font-bold text-blue-300">Tự động ghép</span>
            <span className="text-[10px] text-gray-500">Hệ thống tìm đối thủ</span>
          </button>
          {isHost && (
            <button
              onClick={onSelectBot}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-all hover:scale-[1.02]"
            >
              <Bot className="w-6 h-6 text-purple-400" />
              <span className="text-sm font-bold text-purple-300">Thêm Máy</span>
              <span className="text-[10px] text-gray-500">Chọn level bot</span>
            </button>
          )}
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
              <p className="text-center text-sm text-white/30 py-4">{searchQuery ? "Không tìm thấy bạn bè" : "Chưa có bạn bè nào đang online"}</p>
            ) : (
              filteredFriends.map((friend: any) => (
                <button
                  key={friend.uid}
                  onClick={() => onInviteFriend(friend.uid)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-left group"
                >
                  <img src={friend.photoURL || "/mascot/Lopy (1).png"} className="w-9 h-9 rounded-full object-cover border-2 border-white/10" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{friend.displayName || friend.email || "Bạn bè"}</div>
                    {friend.rankInfo && <div className="text-[11px] text-gray-500">{friend.rankInfo}</div>}
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
  isReady?: boolean;
  opponentReady?: boolean;
  readyPlayers?: Record<string, boolean>;
  lobbyMessages?: any[];
  onSendChat?: (text: string) => void;
  onReady?: () => void;
  onStartAutoMatch: () => void;
  onStartBotMatch: (botRankId: number | null, targetSlotIndex?: number) => void;
  onInviteFriend: (friendUid: string, targetSlotIndex?: number) => void;
  onCancelSearch: () => void;
  onBack: () => void;
  onKickPlayer?: (uid: string) => void;
  onMoveSlot?: (slotIndex: number) => void;
  onSwapSlot?: (targetUid: string) => void;
  isHost?: boolean;
  titleOverride?: string;
}

export function ArenaLobby({
  user,
  mode,
  opponent,
  arenaPlayers,
  myTeam,
  lobbyState,
  titleOverride,
  searchElapsed,
  prepCountdown,
  currentTip,
  friends,
  friendsLoading,
  isReady,
  opponentReady,
  readyPlayers = {},
  lobbyMessages = [],
  onSendChat,
  onReady,
  onStartAutoMatch,
  onStartBotMatch,
  onInviteFriend,
  onCancelSearch,
  onBack,
  onKickPlayer,
  onMoveSlot,
  onSwapSlot,
  isHost,
}: ArenaLobbyProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | undefined>();
  const [targetSwapUid, setTargetSwapUid] = useState<string | undefined>();
  const [showBotSelector, setShowBotSelector] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessagesLengthRef = useRef(lobbyMessages.length);

  useEffect(() => {
    if (!isChatOpen) {
      const newMessages = lobbyMessages.length - prevMessagesLengthRef.current;
      if (newMessages > 0) {
        setUnreadCount((prev) => prev + newMessages);
      }
    } else {
      setUnreadCount(0);
    }
    prevMessagesLengthRef.current = lobbyMessages.length;
  }, [lobbyMessages, isChatOpen]);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [lobbyMessages, isChatOpen]);
  const modeTitle = mode === "solo" ? "Solo 1vs1" : mode === "team2v2" ? "Đồng đội 2vs2" : "Giải đấu";
  const modeColor = mode === "solo" ? "text-blue-400" : mode === "team2v2" ? "text-purple-400" : "text-yellow-400";

  const isSearching = lobbyState === "searching";
  const isFound = lobbyState === "found";
  const isRoomFull = mode === "team2v2" ? arenaPlayers.length === 4 : opponent != null;

  const allOthersReady = mode === "team2v2" ? arenaPlayers.filter((p) => p.uid !== user?.uid).every((p) => readyPlayers[p.uid] || p.isBot) : opponentReady;

  let btnText = "";
  let btnGlow = false;
  if (isHost) {
    if (isReady) btnText = "Đang chờ...";
    else if (allOthersReady) {
      btnText = "Bắt đầu ngay!";
      btnGlow = true;
    } else btnText = "Bắt đầu";
  } else {
    if (isReady) btnText = "Đang chờ chủ phòng...";
    else btnText = "Sẵn sàng";
  }

  const handleOpenPicker = (slotIndex: number, targetUid?: string) => {
    setTargetSlotIndex(slotIndex);
    setTargetSwapUid(targetUid);
    setShowPicker(true);
  };

  // Build team slots for 2v2
  const blueTeam = arenaPlayers.filter((p) => p.team === "blue");
  const redTeam = arenaPlayers.filter((p) => p.team === "red");

  const p0 = blueTeam.find((p) => p.slotIndex === 0) || (blueTeam.length > 0 && blueTeam[0].slotIndex === undefined ? blueTeam[0] : undefined);
  const p1 = blueTeam.find((p) => p.slotIndex === 1) || (blueTeam.length > 1 && blueTeam[1].slotIndex === undefined ? blueTeam[1] : undefined);
  const p2 = redTeam.find((p) => p.slotIndex === 2) || (redTeam.length > 0 && redTeam[0].slotIndex === undefined ? redTeam[0] : undefined);
  const p3 = redTeam.find((p) => p.slotIndex === 3) || (redTeam.length > 1 && redTeam[1].slotIndex === undefined ? redTeam[1] : undefined);

  const renderSlot = (player: any, side: "left" | "right", slotIdx: number) => {
    if (player) {
      return (
        <PlayerSlot
          player={{
            uid: player.uid,
            name: player.name || player.displayName || "Bạn",
            avatar: player.avatar || player.photoURL || "",
            rankInfo: player.rankInfo,
            isBot: player.isBot,
            botAccuracyLabel: player.botAccuracyLabel,
            level: player.level,
            rankId: player.rankId,
            tier: player.tier,
          }}
          side={side}
          canKick={isHost && isFound && player.uid !== user?.uid}
          onKick={() => onKickPlayer?.(player.uid)}
          isReady={readyPlayers[player.uid] || (player.uid === opponent?.uid ? opponentReady : false)}
          onClickFull={player.uid !== user?.uid ? () => handleOpenPicker(slotIdx, player.uid) : undefined}
        />
      );
    }
    if (isSearching) {
      return <PlayerSlot side={side} showAnimation />;
    }
    return <PlayerSlot side={side} isEmpty onClickEmpty={() => handleOpenPicker(slotIdx)} />;
  };

  return (
    <>
      <div className="flex flex-col items-center z-10 w-full max-w-4xl px-4 animate-in fade-in zoom-in duration-500">
        {/* Title */}
        <div className="mb-6 md:mb-8 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-wider uppercase">{isFound ? "TRẬN ĐẤU SẮP BẮT ĐẦU!" : modeTitle}</h2>
          <p className={cn("font-bold text-lg", modeColor)}>{titleOverride ? titleOverride : isFound ? "" : isSearching ? "Đang tìm đối thủ..." : "Phòng chờ"}</p>
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
              {renderSlot(p0, "left", 0)}
              {renderSlot(p1, "left", 1)}
            </div>

            {/* VS center */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-in zoom-in delay-300 duration-500">
              {isFound && isRoomFull ? (
                <div className="flex flex-col items-center gap-3 relative z-20">
                  <button
                    onClick={onReady}
                    disabled={isReady}
                    className={cn(
                      "px-8 py-4 rounded-full font-black text-xl md:text-2xl shadow-2xl transition-all whitespace-nowrap",
                      isReady
                        ? "bg-emerald-600 text-white shadow-emerald-500/50 cursor-not-allowed"
                        : btnGlow
                          ? "bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-emerald-500/50 hover:scale-105 active:scale-95 animate-pulse border-2 border-emerald-300"
                          : "bg-gradient-to-br from-yellow-400 to-red-600 text-white shadow-red-500/50 hover:scale-105 active:scale-95",
                    )}
                  >
                    {btnText}
                  </button>
                  {allOthersReady && !isReady && isHost && (
                    <span className="text-emerald-400 text-sm font-bold animate-pulse mt-2 bg-black/60 px-3 py-1 rounded-full border border-emerald-500/30">Mọi người đã sẵn sàng!</span>
                  )}
                  {opponentReady && !isReady && !isHost && mode === "solo" && (
                    <span className="text-emerald-400 text-sm font-bold animate-pulse mt-2 bg-black/60 px-3 py-1 rounded-full border border-emerald-500/30">Đối thủ đã sẵn sàng!</span>
                  )}
                </div>
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center shadow-2xl border border-white/10">
                  <span className="text-2xl md:text-3xl font-black text-white/40">VS</span>
                </div>
              )}
            </div>

            {/* Red team */}
            <div className="flex flex-col gap-4">
              {renderSlot(p2, "right", 2)}
              {renderSlot(p3, "right", 3)}
            </div>
          </div>
        ) : (
          /* --- Solo 1vs1 layout --- */
          <div className="flex items-center justify-between w-full relative">
            {/* Left: Player */}
            <PlayerSlot
              player={{ name: user?.displayName || "Bạn", avatar: user?.photoURL || "", rankInfo: (user as any)?.rankInfo || "", level: user?.level }}
              side="left"
              isReady={readyPlayers[user?.uid] || isReady}
            />

            {/* VS center */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-in zoom-in delay-300 duration-500">
              {isFound && isRoomFull ? (
                <div className="flex flex-col items-center gap-3 relative z-20">
                  <button
                    onClick={onReady}
                    disabled={isReady}
                    className={cn(
                      "px-8 py-4 rounded-full font-black text-xl md:text-2xl shadow-2xl transition-all whitespace-nowrap",
                      isReady
                        ? "bg-emerald-600 text-white shadow-emerald-500/50 cursor-not-allowed"
                        : btnGlow
                          ? "bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-emerald-500/50 hover:scale-105 active:scale-95 animate-pulse border-2 border-emerald-300"
                          : "bg-gradient-to-br from-yellow-400 to-red-600 text-white shadow-red-500/50 hover:scale-105 active:scale-95",
                    )}
                  >
                    {btnText}
                  </button>
                  {allOthersReady && !isReady && isHost && (
                    <span className="text-emerald-400 text-sm font-bold animate-pulse mt-2 bg-black/60 px-3 py-1 rounded-full border border-emerald-500/30">Mọi người đã sẵn sàng!</span>
                  )}
                  {opponentReady && !isReady && !isHost && mode === "solo" && (
                    <span className="text-emerald-400 text-sm font-bold animate-pulse mt-2 bg-black/60 px-3 py-1 rounded-full border border-emerald-500/30">Đối thủ đã sẵn sàng!</span>
                  )}
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
                player={{ uid: opponent.uid, name: opponent.name, avatar: opponent.avatar, rankInfo: opponent.rankInfo, isBot: opponent.isBot, botAccuracyLabel: opponent.botAccuracyLabel }}
                side="right"
                canKick={isHost}
                onKick={() => onKickPlayer?.(opponent.uid)}
                isReady={readyPlayers[opponent.uid] || opponentReady}
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
              {mode === "team2v2" ? "Đang tìm đồng đội và đối thủ. Sau 15 giây có thể ghép bot nếu rank phù hợp." : "Hệ thống đang ghép cặp bạn với người chơi cùng Rank"}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-8 flex gap-4">
          {isSearching ? (
            <button onClick={onCancelSearch} className="px-6 py-2.5 border border-white/20 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors">
              Hủy tìm
            </button>
          ) : !isFound || !isRoomFull ? (
            <button onClick={isFound ? onCancelSearch : onBack} className="px-6 py-2.5 border border-white/20 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors">
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
            onInviteFriend(uid, targetSlotIndex);
            setShowPicker(false);
          }}
          onSelectBot={() => {
            setShowPicker(false);
            setShowBotSelector(true);
          }}
          onAutoMatch={() => {
            onStartAutoMatch();
            setShowPicker(false);
          }}
          onSwapSlot={
            onSwapSlot && targetSwapUid
              ? () => {
                  onSwapSlot(targetSwapUid);
                  setShowPicker(false);
                }
              : undefined
          }
          onMoveSlot={
            onMoveSlot && targetSlotIndex !== undefined
              ? () => {
                  onMoveSlot(targetSlotIndex);
                  setShowPicker(false);
                }
              : undefined
          }
          isHost={isHost}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Bot Selector Modal */}
      {showBotSelector && (
        <ArenaBotSelector
          onSelectBot={(rankId) => {
            setShowBotSelector(false);
            onStartBotMatch(rankId, targetSlotIndex);
          }}
          onClose={() => setShowBotSelector(false)}
        />
      )}

      {/* Lobby Chat Widget */}
      {isFound && (
        <div className={cn("fixed bottom-4 right-4 z-40 transition-all duration-300", isChatOpen ? "w-72 md:w-80 h-[300px]" : "w-14 h-14")}>
          {isChatOpen ? (
            <div className="w-full h-full bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
              <div className="bg-slate-800/80 px-4 py-3 flex items-center justify-between border-b border-white/5 cursor-pointer" onClick={() => setIsChatOpen(false)}>
                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Chat Phòng
                </h4>
                <button className="text-white/50 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar flex flex-col">
                {lobbyMessages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-xs italic text-center">
                    <p>Hãy gửi tin nhắn đầu tiên!</p>
                  </div>
                ) : (
                  lobbyMessages.map((msg, i) => {
                    const isMe = msg.uid === user.uid;
                    return (
                      <div key={i} className={cn("flex flex-col max-w-[85%]", isMe ? "self-end items-end" : "self-start items-start")}>
                        {!isMe && <span className="text-[10px] text-white/40 mb-1 ml-1">{msg.name}</span>}
                        <div className={cn("px-3 py-2 rounded-2xl text-sm break-words", isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-white/10 text-white rounded-bl-sm")}>{msg.text}</div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chatInput.trim() && onSendChat) {
                    onSendChat(chatInput.trim());
                    setChatInput("");
                  }
                }}
                className="p-3 border-t border-white/5 bg-black/20 flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Nhắn tin..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-white/30 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </button>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full h-full bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 relative animate-in zoom-in"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-slate-900 animate-in zoom-in">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </>
  );
}
