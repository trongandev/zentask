import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "../../../lib/utils";
import { ArenaGameRenderer } from "../../ArenaGameRenderer";
import { UserAvatar } from "../../../components/ui/UserAvatar";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

interface ArenaPlayingHUDProps {
  user: any;
  opponent: any;
  userScore: number;
  opponentScore: number;
  hasAnswered: boolean;
  oppAnswered: boolean;
  timeLeft: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentCard: any;
  matchData: { modes?: string[]; mode?: string; cards: any[]; x2Indices: number[] };
  isX2: boolean;
  lastAnswerCorrect: boolean | null;
  arenaMode: "solo" | "team2v2" | "tournament";
  arenaPlayers: any[];
  myTeam: "blue" | "red";
  teamHint: string;
  teamHints: Array<{ from: string; message: string }>;
  onTeamHintChange: (v: string) => void;
  onSendTeamHint: () => void;
  onAnswer: (isCorrect: boolean, timeRem?: number) => void;
}

export function ArenaPlayingHUD({
  user,
  opponent,
  userScore,
  opponentScore,
  hasAnswered,
  oppAnswered,
  timeLeft,
  currentQuestionIndex,
  totalQuestions,
  currentCard,
  matchData,
  isX2,
  lastAnswerCorrect,
  arenaMode,
  arenaPlayers,
  myTeam,
  teamHint,
  teamHints,
  onTeamHintChange,
  onSendTeamHint,
  onAnswer,
}: ArenaPlayingHUDProps) {
  return (
    <div className="w-full h-full max-w-5xl px-4 flex flex-col z-10 py-8 animate-in fade-in duration-300">
      {/* Top HUD */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        {/* Timer on mobile */}
        <div className="flex md:hidden flex-col items-center order-first w-full bg-white/5 py-2 rounded-2xl border border-white/10">
          <div className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
            Thời gian ({currentQuestionIndex + 1}/{totalQuestions})
          </div>
          <div className={cn("text-3xl font-black", timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-white")}>{timeLeft}s</div>
        </div>

        <div className="flex justify-between items-center w-full md:w-auto gap-2 flex-1">
          {/* User Score */}
          <div
            className={cn(
              "flex items-center gap-2 md:gap-4 border p-1 md:p-2 pr-4 md:pr-6 rounded-full backdrop-blur-md transition-colors",
              hasAnswered
                ? lastAnswerCorrect
                  ? "border-green-500 bg-green-950/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  : "border-red-500 bg-red-950/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-shake"
                : "border-blue-500/30 bg-blue-950/50",
            )}
          >
            <UserAvatar src={user?.photoURL || "/mascot/Lopy (1).png"} level={user?.level || 1} disableLink className="w-10 h-10 md:w-14 md:h-14 shrink-0" avatarClassName="border-2 border-blue-400" />
            <div>
              <div className={cn("text-[10px] md:text-sm hidden md:block", hasAnswered && !lastAnswerCorrect ? "text-red-200" : "text-blue-200")}>Điểm của bạn</div>
              <div className="text-lg md:text-2xl font-black text-white flex items-center gap-1 md:gap-2">
                {userScore}
                {hasAnswered &&
                  (lastAnswerCorrect ? (
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 animate-in zoom-in" />
                  ) : (
                    <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500 animate-in zoom-in" />
                  ))}
              </div>
            </div>
          </div>

          {/* Timer on Desktop */}
          <div className="hidden md:flex flex-col items-center mx-4">
            <div className="text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">
              Thời gian ({currentQuestionIndex + 1}/{totalQuestions})
            </div>
            <div className={cn("text-5xl font-black", timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-white")}>{timeLeft}s</div>
          </div>

          {/* Opponent Score */}
          <div
            className={cn(
              "flex items-center gap-2 md:gap-4 bg-red-950/50 border p-1 md:p-2 pl-4 md:pl-6 rounded-full backdrop-blur-md flex-row-reverse transition-colors",
              oppAnswered ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "border-red-500/30",
            )}
          >
            <UserAvatar
              src={opponent?.avatar || "/mascot/Lopy (3).png"}
              level={opponent?.level || 1}
              disableLink
              className="w-10 h-10 md:w-14 md:h-14 shrink-0"
              avatarClassName="border-2 border-red-400"
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

      {/* Team 2v2 panel */}
      {arenaMode === "team2v2" && (
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-blue-300">Đội của bạn</p>
            <div className="flex flex-wrap gap-2">
              {arenaPlayers
                .filter((p: any) => p.team === myTeam)
                .map((p: any) => (
                  <span key={p.uid} className="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-bold">
                    {p.name}
                    {p.isBot ? " 🤖" : ""}
                  </span>
                ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-purple-300">Gợi ý cho đồng đội</p>
            <div className="flex gap-2">
              <Input
                value={teamHint}
                onChange={(e) => onTeamHintChange(e.target.value)}
                placeholder="Gửi gợi ý ngắn..."
                className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold outline-none placeholder:text-white/30"
              />
              <Button onClick={onSendTeamHint} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold">
                Gửi
              </Button>
            </div>
            {teamHints.length > 0 && (
              <div className="mt-2 space-y-1 text-xs text-purple-100">
                {teamHints.map((h, i) => (
                  <div key={i}>
                    <b>{h.from}:</b> {h.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ArenaGameRenderer
        mode={matchData.modes ? matchData.modes[currentQuestionIndex] : matchData.mode || "quiz"}
        card={currentCard}
        allCards={matchData.cards}
        isX2={isX2}
        disabled={hasAnswered}
        answerStatus={hasAnswered ? lastAnswerCorrect : null}
        onAnswer={onAnswer}
      />
    </div>
  );
}
