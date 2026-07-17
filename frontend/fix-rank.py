import re

filepath = 'src/pages/BeginnerRank.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace from `const top3` down to the end of the return statement.
# We will use regex to find the start of `const top3` and the end of the file.

new_ui = """  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-24 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
      {/* Header */}
      <div className="text-center space-y-2 mb-12">
        <h1 className="text-4xl font-black text-slate-800 flex items-center justify-center gap-3">
          <Trophy className="w-10 h-10 text-yellow-500" />
          Bảng Vàng Thành Tích
        </h1>
        <p className="text-slate-500 text-lg">Top những học viên chăm chỉ và xuất sắc nhất</p>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-10">Đang tải dữ liệu...</div>
      ) : (
        <div className="space-y-4">
          {leaderboard.map((lbUser, index) => {
            const rank = index + 1;
            const isMe = lbUser.id === user?.uid;
            
            const isTop1 = rank === 1;
            const isTop2 = rank === 2;
            const isTop3 = rank === 3;
            
            const bgClass = isTop1 ? "bg-gradient-to-r from-yellow-50 to-white border-yellow-300" :
                            isTop2 ? "bg-gradient-to-r from-slate-50 to-white border-slate-300" :
                            isTop3 ? "bg-gradient-to-r from-amber-50 to-white border-amber-300" :
                            isMe ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100 hover:border-slate-200";

            return (
              <div
                key={lbUser.id}
                className={cn(
                  "flex items-center gap-3 md:gap-4 p-3 md:p-5 rounded-2xl border-2 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md",
                  bgClass
                )}
              >
                <div className="w-12 flex justify-center shrink-0">
                  {isTop1 ? <img src="/top/top1.png" alt="Top 1" className="w-10 h-10 object-contain drop-shadow-md" /> :
                   isTop2 ? <img src="/top/top2.png" alt="Top 2" className="w-10 h-10 object-contain drop-shadow-md" /> :
                   isTop3 ? <img src="/top/top3.png" alt="Top 3" className="w-10 h-10 object-contain drop-shadow-md" /> :
                   <span className="font-black text-slate-400 text-xl">{rank}</span>}
                </div>
                
                <div className="relative shrink-0">
                  <UserAvatar src={lbUser.avatar} level={lbUser.level} className={cn("w-12 h-12", (isTop1 || isTop2 || isTop3) ? "md:w-16 md:h-16" : "md:w-12 md:h-12")} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 text-base md:text-lg truncate flex items-center gap-2">
                    {lbUser.name}
                    {isMe && <span className="bg-blue-100 text-blue-600 text-[10px] uppercase font-black px-2 py-0.5 rounded-full">Bạn</span>}
                  </div>
                  <div className="text-xs md:text-sm text-slate-500 mt-1 flex gap-2 items-center">
                    <UserLevelBadge level={lbUser.level} size="sm" showText={true} />
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600 font-medium truncate">
                      {RANK_NAMES[lbUser.rankId || 1] || "Không xác định"} {TIER_NAMES[lbUser.tier || 3] || "III"}
                    </span>
                  </div>
                </div>
                
                <div className="font-black text-yellow-500 text-base md:text-xl flex items-center gap-1 shrink-0">
                  {lbUser.stars || 0} ⭐
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
"""

# Replace everything from `const top3 = ...` to the end.
content = re.sub(r'const top3 = leaderboard\.slice\(0, 3\);.*', new_ui, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
