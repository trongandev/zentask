import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  Eye,
  FolderOpen,
  HelpCircle,
  Loader2,
  MessageCircle,
  Plus,
  Save,
  Search,
  Send,
  Share2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { friendsService, type FriendMessage, type FriendRequestItem, type FriendUser, type ShareOptions } from "../services/friendsService";
import { cn, timeAgo } from "../lib/utils";

function Avatar({ user, size = "md" }: { user?: Partial<FriendUser> | null; size?: "sm" | "md" | "lg" }) {
  const cls = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  return user?.photoURL ? (
    <img src={user.photoURL} alt={user.displayName || "Bạn bè"} className={`${cls} rounded-2xl object-cover ring-2 ring-white`} />
  ) : (
    <div className={`${cls} rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold ring-2 ring-white`}>
      {(user?.displayName || user?.email || "Z").slice(0, 1).toUpperCase()}
    </div>
  );
}

function emptySharePreview() {
  return null as any;
}

export default function Friends() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"friends" | "requests" | "discover">("friends");
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [activeFriend, setActiveFriend] = useState<FriendUser | null>(null);
  const [messages, setMessages] = useState<FriendMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [shareOptions, setShareOptions] = useState<ShareOptions>({ folders: [], quizzes: [] });
  const [shareType, setShareType] = useState<"flashcard_folder" | "quiz">("flashcard_folder");
  const [shareId, setShareId] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<any>(emptySharePreview());

  const activeFriendId = activeFriend?.friendId || activeFriend?.uid || "";

  const loadFriends = useCallback(async () => {
    const data = await friendsService.listFriends();
    setFriends(data);
    if (!activeFriend && data.length) setActiveFriend(data[0]);
  }, [activeFriend]);

  const loadRequests = useCallback(async () => {
    const data = await friendsService.getRequests();
    setIncoming(data.incoming || []);
    setOutgoing(data.outgoing || []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsData, requestsData, optionsData] = await Promise.all([
        friendsService.listFriends(),
        friendsService.getRequests(),
        friendsService.getShareOptions().catch(() => ({ folders: [], quizzes: [] })),
      ]);
      setFriends(friendsData);
      setIncoming(requestsData.incoming || []);
      setOutgoing(requestsData.outgoing || []);
      setShareOptions(optionsData);
      if (!activeFriend && friendsData.length) setActiveFriend(friendsData[0]);
    } catch (error: any) {
      toast.error(error.message || "Không tải được trang bạn bè");
    } finally {
      setLoading(false);
    }
  }, [activeFriend]);

  const loadMessages = useCallback(async () => {
    if (!activeFriendId) return;
    try {
      const data = await friendsService.getMessages(activeFriendId);
      setMessages(data);
    } catch (error: any) {
      toast.error(error.message || "Không tải được tin nhắn");
    }
  }, [activeFriendId]);

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!activeFriendId) return;
    setMessageLoading(true);
    friendsService
      .getMessages(activeFriendId)
      .then(setMessages)
      .catch((error) => toast.error(error.message || "Không tải được tin nhắn"))
      .finally(() => setMessageLoading(false));

    const timer = window.setInterval(() => {
      void loadMessages();
    }, 6000);
    return () => window.clearInterval(timer);
  }, [activeFriendId, loadMessages]);

  useEffect(() => {
    const keyword = search.trim();
    if (keyword.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const data = await friendsService.searchUsers(keyword);
        setSearchResults(data);
      } catch (error: any) {
        toast.error(error.message || "Không tìm được người dùng");
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const latestFlashcardShare = useMemo(() => {
    return [...messages].reverse().find((message) => message.type === "share" && message.share?.type === "flashcard_folder");
  }, [messages]);

  async function sendFriendRequest(target: FriendUser) {
    try {
      await friendsService.sendRequest(target.uid);
      toast.success("Đã gửi lời mời kết bạn");
      setSearchResults((prev) => prev.map((item) => (item.uid === target.uid ? { ...item, friendStatus: "sent" } : item)));
      await loadRequests();
    } catch (error: any) {
      toast.error(error.message || "Không gửi được lời mời");
    }
  }

  async function respondRequest(requestId: string, action: "accept" | "decline") {
    try {
      await friendsService.respondRequest(requestId, action);
      toast.success(action === "accept" ? "Đã chấp nhận kết bạn" : "Đã từ chối lời mời");
      await Promise.all([loadFriends(), loadRequests()]);
      setTab(action === "accept" ? "friends" : "requests");
    } catch (error: any) {
      toast.error(error.message || "Không xử lý được lời mời");
    }
  }

  async function openSharePreview(messageId: string) {
    setPreviewLoading(true);
    try {
      const data = await friendsService.previewShare(messageId);
      setPreview(data);
    } catch (error: any) {
      toast.error(error.message || "Không xem trước được nội dung");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function sendMessage() {
    if (!activeFriendId || !messageText.trim()) return;
    const text = messageText.trim();

    if (/^lưu\s+flashcard$/i.test(text) || /^luu\s+flashcard$/i.test(text)) {
      if (latestFlashcardShare) {
        setMessageText("");
        await openSharePreview(latestFlashcardShare.id);
        toast("Mình đã mở bản xem trước. Bạn kiểm tra rồi bấm lưu nhé.", { icon: "👀" });
        return;
      }
      toast.error("Chưa có thư mục flashcard nào được chia sẻ trong cuộc trò chuyện này.");
      return;
    }

    try {
      const msg = await friendsService.sendMessage(activeFriendId, text);
      setMessages((prev) => [...prev, msg]);
      setMessageText("");
    } catch (error: any) {
      toast.error(error.message || "Không gửi được tin nhắn");
    }
  }

  async function shareContent() {
    if (!activeFriendId || !shareId) return toast.error("Hãy chọn nội dung muốn chia sẻ.");
    try {
      const msg = await friendsService.shareContent(activeFriendId, shareType, shareId, shareNote);
      setMessages((prev) => [...prev, msg]);
      setShareNote("");
      toast.success("Đã chia sẻ nội dung học tập");
    } catch (error: any) {
      toast.error(error.message || "Không chia sẻ được nội dung");
    }
  }

  async function savePreview() {
    if (!preview?.messageId) return;
    try {
      const result = await friendsService.saveShare(preview.messageId);
      toast.success(preview.share?.type === "flashcard_folder" ? "Đã lưu flashcard vào cá nhân" : "Đã lưu quiz vào cá nhân");
      setPreview({ ...preview, saved: true, saveResult: result });
      await loadMessages();
    } catch (error: any) {
      toast.error(error.message || "Không lưu được nội dung");
    }
  }

  const shareItems = shareType === "flashcard_folder" ? shareOptions.folders : shareOptions.quizzes;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-6 text-white shadow-xl md:p-8">
        <div className="absolute right-8 top-8 opacity-20"><Users className="h-32 w-32" /></div>
        <div className="relative z-10 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-sm font-bold">
            <Bell className="h-4 w-4" /> Kết bạn, nhắn tin và chia sẻ học liệu
          </div>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight md:text-4xl">Bạn bè</h1>
          <p className="leading-relaxed text-blue-50">Gửi lời mời kết bạn, trò chuyện, chia sẻ thư mục flashcard hoặc quiz. Người nhận có thể xem trước rồi mới lưu vào tài khoản cá nhân.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex gap-2 rounded-2xl bg-gray-50 p-1.5">
              {([
                ["friends", "Bạn bè", friends.length],
                ["requests", "Lời mời", incoming.length],
                ["discover", "Tìm bạn", searchResults.length],
              ] as const).map(([key, label, count]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn("flex-1 rounded-xl px-3 py-2 text-xs font-extrabold transition", tab === key ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-white")}
                >
                  {label} {count > 0 && <span className="ml-1">{count}</span>}
                </button>
              ))}
            </div>

            {tab === "friends" && (
              <div className="space-y-2">
                {friends.length ? friends.map((friend) => (
                  <button key={friend.uid} onClick={() => setActiveFriend(friend)} className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition", activeFriendId === (friend.friendId || friend.uid) ? "border-blue-200 bg-blue-50" : "border-gray-100 bg-gray-50 hover:bg-white")}>
                    <Avatar user={friend} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold text-gray-900">{friend.displayName}</p>
                      <p className="truncate text-xs text-gray-500">{friend.email || "Bạn học Zentask"}</p>
                    </div>
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                  </button>
                )) : (
                  <div className="rounded-2xl bg-gray-50 p-5 text-center text-sm text-gray-500">Bạn chưa có bạn bè. Hãy tìm người học để gửi lời mời.</div>
                )}
              </div>
            )}

            {tab === "requests" && (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-extrabold text-gray-800">Lời mời nhận được</h3>
                  {incoming.length ? incoming.map((request) => (
                    <div key={request.id} className="mb-2 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                      <div className="mb-3 flex items-center gap-3">
                        <Avatar user={request.user} />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-gray-900">{request.user?.displayName}</p>
                          <p className="text-xs text-gray-500">{request.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => respondRequest(request.id, "accept")} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Check className="h-4 w-4" /> Chấp nhận</button>
                        <button onClick={() => respondRequest(request.id, "decline")} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-600"><X className="h-4 w-4" /> Từ chối</button>
                      </div>
                    </div>
                  )) : <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">Không có lời mời mới.</p>}
                </div>
                {!!outgoing.length && (
                  <div>
                    <h3 className="mb-2 text-sm font-extrabold text-gray-800">Đã gửi</h3>
                    {outgoing.map((request) => (
                      <div key={request.id} className="mb-2 flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
                        <Avatar user={request.user} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-gray-900">{request.user?.displayName}</p>
                          <p className="text-xs text-gray-500">Đang chờ phản hồi</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "discover" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc email..." className="h-11 w-full rounded-2xl border border-gray-200 pl-10 pr-3 text-sm outline-none focus:border-blue-300" />
                </div>
                {searchResults.map((item) => (
                  <div key={item.uid} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3">
                    <Avatar user={item} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-gray-900">{item.displayName}</p>
                      <p className="truncate text-xs text-gray-500">{item.email}</p>
                    </div>
                    {item.friendStatus === "friend" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : item.friendStatus === "sent" ? <span className="text-xs font-bold text-gray-400">Đã gửi</span> : (
                      <button onClick={() => sendFriendRequest(item)} className="rounded-xl bg-blue-600 p-2 text-white"><UserPlus className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>

        <main className="grid min-h-[720px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="flex min-h-[620px] flex-col overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
            {activeFriend ? (
              <>
                <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                  <Avatar user={activeFriend} />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-extrabold text-gray-900">{activeFriend.displayName}</h2>
                    <p className="truncate text-sm text-gray-500">Bạn bè học tập</p>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto bg-[#f8faff] p-4">
                  {messageLoading && <div className="text-center text-sm text-gray-400">Đang tải tin nhắn...</div>}
                  {messages.map((message) => {
                    const mine = message.senderId === user?.uid;
                    return (
                      <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[86%] rounded-3xl px-4 py-3 shadow-sm", mine ? "bg-blue-600 text-white" : "border border-gray-100 bg-white text-gray-800")}>
                          {message.type === "share" && message.share ? (
                            <div className="space-y-3">
                              {!!message.text && <p className="text-sm leading-relaxed">{message.text}</p>}
                              <div className={cn("rounded-2xl p-4", mine ? "bg-white/15" : "bg-blue-50")}>
                                <div className="mb-2 flex items-center gap-2 font-extrabold">
                                  {message.share.type === "flashcard_folder" ? <FolderOpen className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
                                  {message.share.type === "flashcard_folder" ? "Thư mục flashcard" : "Quiz"}
                                </div>
                                <p className="font-bold">{message.share.title}</p>
                                <p className={cn("text-xs", mine ? "text-blue-100" : "text-gray-500")}>{message.share.summary}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button onClick={() => openSharePreview(message.id)} className={cn("flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold", mine ? "bg-white text-blue-700" : "bg-blue-600 text-white")}><Eye className="h-4 w-4" /> Xem trước</button>
                                  {!mine && (
                                    <button onClick={() => openSharePreview(message.id)} className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><Save className="h-4 w-4" /> Lưu</button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
                          )}
                          <div className={cn("mt-2 text-[10px] font-semibold", mine ? "text-blue-100" : "text-gray-400")}>{message.createdAt ? timeAgo(message.createdAt) : "vừa xong"}</div>
                        </div>
                      </div>
                    );
                  })}
                  {!messages.length && <div className="rounded-3xl bg-white p-8 text-center text-gray-500 shadow-sm">Hãy gửi tin nhắn đầu tiên hoặc chia sẻ học liệu cho bạn bè.</div>}
                </div>

                <div className="border-t border-gray-100 bg-white p-4">
                  <div className="flex gap-3">
                    <input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void sendMessage();
                      }}
                      placeholder='Nhập tin nhắn... hoặc gõ "lưu flashcard" để mở bản xem trước gần nhất'
                      className="h-12 min-w-0 flex-1 rounded-2xl border border-gray-200 px-4 text-sm outline-none focus:border-blue-300"
                    />
                    <button onClick={() => void sendMessage()} className="flex h-12 items-center gap-2 rounded-2xl bg-blue-600 px-5 font-bold text-white"><Send className="h-5 w-5" /> Gửi</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <Users className="mb-4 h-16 w-16 text-gray-300" />
                <h2 className="text-xl font-extrabold text-gray-900">Chọn một người bạn để bắt đầu</h2>
                <p className="mt-2 max-w-md text-gray-500">Bạn có thể tìm người học mới, gửi lời mời kết bạn và bắt đầu chia sẻ học liệu.</p>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Share2 className="h-5 w-5 text-blue-600" />
                <h3 className="font-extrabold text-gray-900">Chia sẻ học liệu</h3>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-1.5">
                <button onClick={() => { setShareType("flashcard_folder"); setShareId(""); }} className={cn("rounded-xl px-3 py-2 text-xs font-bold", shareType === "flashcard_folder" ? "bg-blue-600 text-white" : "text-gray-600")}>Flashcard</button>
                <button onClick={() => { setShareType("quiz"); setShareId(""); }} className={cn("rounded-xl px-3 py-2 text-xs font-bold", shareType === "quiz" ? "bg-blue-600 text-white" : "text-gray-600")}>Quiz</button>
              </div>
              <select value={shareId} onChange={(e) => setShareId(e.target.value)} className="mb-3 h-11 w-full rounded-2xl border border-gray-200 px-3 text-sm outline-none">
                <option value="">Chọn {shareType === "flashcard_folder" ? "thư mục flashcard" : "quiz"}</option>
                {shareItems.map((item: any) => (
                  <option key={item.id} value={item.id}>{item.name || item.title} {item.setCount !== undefined ? `• ${item.setCount} bộ` : item.questionCount !== undefined ? `• ${item.questionCount} câu` : ""}</option>
                ))}
              </select>
              <textarea value={shareNote} onChange={(e) => setShareNote(e.target.value)} placeholder="Lời nhắn kèm theo..." className="mb-3 h-24 w-full resize-none rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none" />
              <button disabled={!activeFriend || !shareId} onClick={() => void shareContent()} className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" /> Gửi chia sẻ</button>
              <p className="mt-3 text-xs leading-relaxed text-gray-500">Người nhận sẽ thấy trong tin nhắn và chuông thông báo. Khi lưu flashcard, hệ thống luôn mở bản xem trước trước.</p>
            </section>
          </aside>
        </main>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Xem trước trước khi lưu</h2>
                <p className="text-sm text-gray-500">Kiểm tra nội dung rồi mới lưu vào tài khoản cá nhân.</p>
              </div>
              <button onClick={() => setPreview(null)} className="rounded-full bg-gray-100 p-2 text-gray-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-5">
              {previewLoading ? (
                <div className="flex min-h-[260px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
              ) : preview.preview?.type === "flashcard_folder" ? (
                <div className="space-y-4">
                  <div className="rounded-3xl bg-blue-50 p-4">
                    <h3 className="text-lg font-extrabold text-blue-900">{preview.preview.folder?.name}</h3>
                    <p className="text-sm text-blue-700">{preview.preview.totalSets} bộ thẻ • {preview.preview.totalCards} thẻ</p>
                  </div>
                  {preview.preview.sets?.map((set: any) => (
                    <div key={set.id} className="rounded-3xl border border-gray-100 p-4">
                      <h4 className="mb-3 font-extrabold text-gray-900"><BookOpen className="mr-2 inline h-5 w-5 text-blue-600" />{set.title}</h4>
                      <div className="grid gap-2 md:grid-cols-2">
                        {set.cards?.slice(0, 12).map((card: any) => (
                          <div key={card.id} className="rounded-2xl bg-gray-50 p-3">
                            <p className="font-bold text-gray-900">{card.term}</p>
                            <p className="text-sm text-gray-600">{card.translation}</p>
                            {!!card.phonetic && <p className="text-xs text-gray-400">{card.phonetic}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : preview.preview?.type === "quiz" ? (
                <div className="space-y-4">
                  <div className="rounded-3xl bg-purple-50 p-4">
                    <h3 className="text-lg font-extrabold text-purple-900">{preview.preview.quiz?.title}</h3>
                    <p className="text-sm text-purple-700">{preview.preview.quiz?.questions?.length || 0} câu hỏi • {preview.preview.quiz?.difficulty}</p>
                  </div>
                  {preview.preview.quiz?.questions?.slice(0, 20).map((q: any, index: number) => (
                    <div key={q.id || index} className="rounded-2xl border border-gray-100 p-4">
                      <p className="mb-2 font-bold text-gray-900">{index + 1}. {q.text}</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {q.options?.map((opt: string) => <div key={opt} className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">{opt}</div>)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 border-t border-gray-100 p-5 sm:flex-row sm:justify-end">
              <button onClick={() => setPreview(null)} className="rounded-2xl bg-gray-100 px-5 py-3 font-bold text-gray-700">Đóng</button>
              <button disabled={preview.saved} onClick={() => void savePreview()} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-60">
                {preview.saved ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />}
                {preview.saved ? "Đã lưu" : preview.share?.type === "flashcard_folder" ? "Lưu flashcard" : "Lưu quiz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
