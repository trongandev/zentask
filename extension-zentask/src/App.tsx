import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { useDebounce } from "use-debounce";
import { Settings, ArrowLeftRight, X, Volume2, Copy, Bookmark, Home, Bug, ScrollText, Loader2, FolderHeart, Play, Star, CheckSquare, Square, Trash2 } from "lucide-react";
import etcService from "./services/etcService";
import { UserAvatar } from "./UserAvatar";

const ICON_URL = chrome.runtime.getURL("icon64.png");

export const LANGUAGE_OPTIONS = [
  {
    label: "Detect language",
    value: "auto",
    audioCharacter: "en-US-JennyNeural",
  },
  { label: "English", value: "en", audioCharacter: "en-US-JennyNeural" },
  { label: "Vietnamese", value: "vi", audioCharacter: "vi-VN-HoaiMyNeural" },
  { label: "Spanish", value: "es", audioCharacter: "es-ES-ElviraNeural" },
  { label: "French", value: "fr", audioCharacter: "fr-FR-DeniseNeural" },
  { label: "German", value: "de", audioCharacter: "de-DE-KatjaNeural" },
  { label: "Chinese", value: "zh", audioCharacter: "zh-CN-XiaoxiaoNeural" },
  { label: "Japanese", value: "ja", audioCharacter: "ja-JP-NanamiNeural" },
  { label: "Korean", value: "ko", audioCharacter: "ko-KR-SunHiNeural" },
  { label: "Thai", value: "th", audioCharacter: "th-TH-NichapaNeural" },
];

export default function App() {
  const [inputFrom, setInputFrom] = useState("");
  const [inputTo, setInputTo] = useState("");
  const [from, setFrom] = useState("auto");
  const [to, setTo] = useState("vi");
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const [disableAudio, setDisableAudio] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userToken, setUserToken] = useState<string>("");
  const [tab, setTab] = useState<"home" | "setting" | "bookmark">("home");

  const [listFlashcard, setListFlashcard] = useState<any[]>([]);
  const [listFlashcardId, setListFlashcardId] = useState<any>({});

  const [testVoiceLang, setTestVoiceLang] = useState("vi");
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingBookmark, setIsSavingBookmark] = useState(false);
  const [checkinTime, setCheckinTime] = useState("08:00");

  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [selectedBookmarks, setSelectedBookmarks] = useState<string[]>([]);
  const [isSelectingBookmarks, setIsSelectingBookmarks] = useState(false);
  const [isSavingSelected, setIsSavingSelected] = useState(false);

  const [value] = useDebounce(inputFrom, 300);

  // Load ngôn ngữ và user
  useEffect(() => {
    chrome.storage.local.get(["languageFrom", "languageTo", "user", "list_flashcard", "list_flashcard_id", "token", "quizzet_bookmarks"], (result) => {
      if (result.languageFrom) setFrom(result.languageFrom);
      if (result.languageTo) setTo(result.languageTo);
      if (result.user) setUser(result.user);
      if (result.list_flashcard) setListFlashcard(result.list_flashcard);
      if (result.list_flashcard_id) setListFlashcardId(result.list_flashcard_id);
      if (result.token) setUserToken(result.token);
      if (result.quizzet_bookmarks) setBookmarks(result.quizzet_bookmarks);
      if (result.checkinTime) setCheckinTime(result.checkinTime);
    });
  }, []);

  useEffect(() => {
    chrome.runtime.sendMessage({ action: "reload" }, (response) => {
      if (!response.result) {
        setUserToken("");
        setListFlashcard([]);
        setListFlashcardId("");
        setUser(null);
        setBookmarks([]);
        setFrom("auto");
        setTo("vi");
      } else {
        setUserToken(response.result.token);
        setListFlashcard(response.result.list_flashcard);
        setListFlashcardId(response.result.list_flashcard_id);
        setUser(response.result.user);
        chrome.storage.local.get(["languageFrom", "languageTo", "user", "list_flashcard", "list_flashcard_id", "token", "quizzet_bookmarks"], (result) => {
          setFrom(result.languageFrom);
          setTo(result.languageTo);
          setBookmarks(result.quizzet_bookmarks);
        });
      }
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.set({ languageFrom: from, languageTo: to });
  }, [from, to]);

  const handleExchangeSelect = () => {
    setFrom(to);
    setTo(from);
    setInputFrom(inputTo);
    setInputTo(inputFrom);
  };

  // Translate
  useEffect(() => {
    if (value.trim() === "") {
      setInputTo("");
      return;
    }

    const translate = async () => {
      setIsTranslating(true);
      chrome.runtime.sendMessage(
        {
          action: "translate",
          payload: { text: value, from, to },
        },
        function (response) {
          if (response && response.success) {
            setInputTo(response.data.sentences?.[0]?.trans || "");
          } else {
            toast.error("Có lỗi xảy ra", { position: "bottom-center" });
          }
          setIsTranslating(false);
        },
      );
    };

    translate();
  }, [value, from, to]);

  const handleClearOutputs = () => {
    setInputFrom("");
    setInputTo("");
    toast.success("Đã xóa các ô input", { position: "bottom-center" });
  };

  const handleSaveWord = async () => {
    if (!inputFrom) {
      toast.error("Bản dịch chưa có từ nào để lưu", {
        position: "top-center",
      });
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    const toastId = toast.loading(`Đang lưu từ "${inputFrom}"...`, {
      position: "bottom-center",
    });

    try {
      chrome.runtime.sendMessage(
        {
          action: "GENERATE_FLASHCARD_AI",
          payload: {
            term: inputFrom,
            setId: listFlashcardId?._id || listFlashcardId?.id || listFlashcardId,
          },
        },
        (res) => {
          if (res && res.ok !== false) {
            toast.success(`Lưu thành công từ "${inputFrom}"`, {
              id: toastId,
              position: "bottom-center",
            });
          } else {
            toast.error(res?.message || "Có lỗi từ server", {
              id: toastId,
              position: "bottom-center",
            });
          }
          setIsSaving(false);
        },
      );
    } catch (e: any) {
      console.error("Save to flashcard failed", e);
      toast.error(e.message || "Kết nối API thất bại", {
        id: toastId,
        position: "bottom-center",
      });
      setIsSaving(false);
    }
  };

  const handleSaveBookmark = async () => {
    if (!inputFrom || !inputTo) {
      toast.error("Chưa có bản dịch để lưu", { position: "top-center" });
      return;
    }
    setIsSavingBookmark(true);

    try {
      const newBookmark = {
        id: Date.now().toString(),
        word: inputFrom,
        trans: inputTo,
        timestamp: Date.now(),
        isFlashcard: false,
      };

      const exists = bookmarks.some((b) => b.word.toLowerCase() === newBookmark.word.toLowerCase());
      if (!exists) {
        const updated = [newBookmark, ...bookmarks];
        setBookmarks(updated);
        await chrome.storage.local.set({ quizzet_bookmarks: updated });
        toast.success("Đã lưu vào Bookmark", { position: "bottom-center" });
      } else {
        toast.error("Từ này đã có trong Bookmark", {
          position: "bottom-center",
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi khi lưu Bookmark");
    }
    setIsSavingBookmark(false);
  };

  const toggleSelectBookmark = (id: string) => {
    if (selectedBookmarks.includes(id)) {
      setSelectedBookmarks((prev) => prev.filter((item) => item !== id));
    } else {
      if (selectedBookmarks.length >= 10) {
        toast.error("Chỉ được chọn tối đa 10 từ", {
          position: "bottom-center",
        });
        return;
      }
      setSelectedBookmarks((prev) => [...prev, id]);
    }
  };

  const notFlashcardBookmarks = bookmarks?.filter((b) => !b.isFlashcard);
  const flashcardBookmarks = bookmarks?.filter((b) => b.isFlashcard);

  const handleSelectAllBookmarks = () => {
    if (selectedBookmarks.length === Math.min(bookmarks.length, 10)) {
      setSelectedBookmarks([]);
    } else {
      const top10 = bookmarks.slice(0, 10).map((b) => b.id);
      setSelectedBookmarks(top10);
    }
  };

  const handleDeleteSelectedBookmarks = async () => {
    if (selectedBookmarks.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedBookmarks.length} từ này khỏi Bookmark?`)) return;

    const updatedBookmarks = bookmarks.filter((b) => !selectedBookmarks.includes(b.id));
    setBookmarks(updatedBookmarks);
    await chrome.storage.local.set({ quizzet_bookmarks: updatedBookmarks });
    setSelectedBookmarks([]);
    setIsSelectingBookmarks(false);
    toast.success("Đã xóa từ khỏi Bookmark", { position: "bottom-center" });
  };

  const handleSaveSelectedToFlashcard = async () => {
    if (selectedBookmarks.length === 0) return;
    if (!userToken || !listFlashcardId) {
      toast.error("Vui lòng đăng nhập và chọn danh sách Flashcard", {
        position: "bottom-center",
      });
      return;
    }

    setIsSavingSelected(true);

    toast.loading("Đang lưu vào Flashcard...", { id: "save-selected" });

    const wordsToSave = selectedBookmarks
      .map((id) => bookmarks.find((item) => item.id === id))
      .filter(Boolean)
      .map((b) => b.word);

    if (wordsToSave.length > 0) {
      try {
        await etcService.createFlashcardWithAI(
          "/flashcards/create-ai-list",
          {
            words: wordsToSave,
            list_flashcard_id: listFlashcardId._id,
            language: listFlashcardId?.language,
          },
          userToken,
        );

        // Update bookmarks in local storage to set isFlashcard = true
        const updatedBookmarks = bookmarks.map((b) => {
          if (selectedBookmarks.includes(b.id)) {
            return { ...b, isFlashcard: true };
          }
          return b;
        });
        setBookmarks(updatedBookmarks);
        await chrome.storage.local.set({ quizzet_bookmarks: updatedBookmarks });

        toast.success(`Đã lưu ${wordsToSave.length} từ vào Flashcard`, {
          id: "save-selected",
        });
      } catch (e) {
        console.error(e);
        toast.error("Có lỗi xảy ra khi lưu", { id: "save-selected" });
      }
    }

    setIsSavingSelected(false);
    setSelectedBookmarks([]);
    setIsSelectingBookmarks(false);
  };

  const handleCopyOutputs = (position: number) => {
    if (position === 1) {
      navigator.clipboard.writeText(inputFrom);
    } else {
      navigator.clipboard.writeText(inputTo);
    }
    toast.success("Đã sao chép thành công", { position: "bottom-center" });
  };

  const handleChangeValueOptions = (position: number, value: string) => {
    if (position === 1) {
      setFrom(value);
    } else {
      setTo(value);
    }
  };

  const handleClickVoice = async (position: number) => {
    const lang = position === 1 ? from : to;
    const langOption = LANGUAGE_OPTIONS.find((option) => option.value === lang) || LANGUAGE_OPTIONS[1];

    if (disableAudio) return;

    try {
      setLoadingAudio(position.toString());
      setDisableAudio(true);

      const audioUrl = await etcService.textToSpeech(position === 1 ? inputFrom : inputTo, langOption.audioCharacter);

      const audio = new Audio(audioUrl);

      audio.addEventListener("ended", () => {
        // Tắt loading nếu cần thiết (optional)
      });

      audio.play();
    } catch (error: any) {
      console.error("TTS Error:", error);
      toast.error("Có lỗi xảy ra", {
        description: error?.message || "Lỗi không xác định",
        position: "top-center",
      });
    } finally {
      setLoadingAudio(null);
      setTimeout(() => {
        setDisableAudio(false);
      }, 1000);
    }
  };

  const handleTestVoice = async () => {
    const langOption = LANGUAGE_OPTIONS.find((option) => option.value === testVoiceLang) || LANGUAGE_OPTIONS[1];

    if (isTestingVoice) return;

    try {
      setIsTestingVoice(true);
      const textToSay = testVoiceLang === "vi" ? "Xin chào, đây là giọng đọc thử nghiệm." : testVoiceLang === "en" ? "Hello, this is a test voice." : "Hello, this is a test voice.";

      const audioUrl = await etcService.textToSpeech(textToSay, langOption.audioCharacter);
      const audio = new Audio(audioUrl);

      audio.addEventListener("ended", () => setIsTestingVoice(false));
      audio.play();
    } catch (error: any) {
      console.error("TTS Error:", error);
      toast.error("Lỗi khi nghe thử", { position: "top-center" });
      setIsTestingVoice(false);
    }
  };

  return (
    <div className="w-[450px] min-h-[500px] flex flex-col font-sans">
      {/* Header */}
      <div className="bg-teal-600 text-white flex items-center justify-between px-5 py-3 shadow-md z-10">
        <a href={import.meta.env.VITE_API_FRONTEND} target="_blank" rel="noopener noreferrer" className="text-2xl font-extrabold ">
          Zentask Extension
        </a>
        {user ? (
          <div className="flex gap-3 items-center">
            <UserAvatar src={user.photoURL || ICON_URL} level={user.level || 1} uid={user.uid} className="w-10 h-10" avatarClassName="border-2 border-white" />
          </div>
        ) : (
          <a
            href={`${import.meta.env.VITE_API_FRONTEND}/auth`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm bg-white text-teal-600 px-3 py-1.5 rounded-full font-bold hover:bg-gray-100 transition-colors"
          >
            Đăng nhập
          </a>
        )}
      </div>

      <div className="flex bg-white border-b border-gray-200">
        {user && (
          <>
            <button
              onClick={() => setTab("home")}
              className={`flex-1 flex justify-center items-center gap-2 py-3 text-sm font-medium transition-all ${tab === "home" ? "text-teal-600 border-b-2 border-teal-600 bg-teal-50/30" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
            >
              <Home size={18} strokeWidth={tab === "home" ? 2.5 : 2} />
              Dịch
            </button>
            <button
              onClick={() => setTab("bookmark")}
              className={`flex-1 flex justify-center items-center gap-2 py-3 text-sm font-medium transition-all ${tab === "bookmark" ? "text-teal-600 border-b-2 border-teal-600 bg-teal-50/30" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
            >
              <Bookmark size={18} strokeWidth={tab === "bookmark" ? 2.5 : 2} />
              Bookmark
            </button>
            <button
              onClick={() => setTab("setting")}
              className={`flex-1 flex justify-center items-center gap-2 py-3 text-sm font-medium transition-all ${tab === "setting" ? "text-teal-600 border-b-2 border-teal-600 bg-teal-50/30" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
            >
              <Settings size={18} strokeWidth={tab === "setting" ? 2.5 : 2} />
              Cài đặt
            </button>
          </>
        )}
      </div>

      {tab === "home" && (
        <>
          {/* Language Selection */}
          <div className="bg-gray-100 p-4 border-b border-gray-200 flex items-center gap-4">
            <select
              value={from}
              onChange={(e) => handleChangeValueOptions(1, e.target.value)}
              className="flex-1 bg-white h-10 px-3 py-2 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.value} value={lang.value} disabled={lang.value === to}>
                  {lang.label}
                </option>
              ))}
            </select>

            <button onClick={handleExchangeSelect} className="h-10 w-10 flex items-center justify-center bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
              <ArrowLeftRight size={18} className="text-gray-600" />
            </button>

            <select
              value={to}
              onChange={(e) => handleChangeValueOptions(2, e.target.value)}
              className="flex-1 bg-white h-10 px-3 py-2 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.value} value={lang.value} disabled={lang.value === from}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Translators Text Areas */}
          <div className="p-4 space-y-4 bg-gray-50 flex-1">
            {/* Input Box */}
            <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all">
              <textarea
                className="w-full text-lg h-32 resize-none p-4 focus:outline-none placeholder-gray-400"
                placeholder="Nhập bất kỳ cái gì..."
                value={inputFrom}
                onChange={(e) => setInputFrom(e.target.value)}
              ></textarea>
              <div className="border-t border-gray-100 p-2 px-3 flex justify-between bg-gray-50/50">
                <div className="flex gap-2">
                  <button onClick={() => handleClickVoice(1)} className="w-9 h-9 flex justify-center items-center rounded-lg hover:bg-gray-200 text-gray-600 transition-colors">
                    {loadingAudio === "1" ? <Loader2 size={18} className="animate-spin" /> : <Volume2 size={18} />}
                  </button>
                  <button onClick={() => handleCopyOutputs(1)} className="w-9 h-9 flex justify-center items-center rounded-lg hover:bg-gray-200 text-gray-600 transition-colors">
                    <Copy size={18} />
                  </button>
                </div>
                <button onClick={handleClearOutputs} className="w-9 h-9 flex justify-center items-center rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-600 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Output Box */}
            <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all">
              <textarea
                className="w-full text-lg h-32 resize-none p-4 focus:outline-none placeholder-gray-400 text-teal-800"
                placeholder={isTranslating ? "Đang dịch..." : "Bản dịch sẽ hiện ở đây..."}
                value={inputTo}
                readOnly
                onChange={(e) => setInputTo(e.target.value)}
              ></textarea>
              <div className="border-t border-gray-100 p-2 px-3 flex justify-between bg-gray-50/50">
                <div className="flex gap-2">
                  <button onClick={() => handleClickVoice(2)} className="w-9 h-9 flex justify-center items-center rounded-lg hover:bg-gray-200 text-gray-600 transition-colors">
                    {loadingAudio === "2" ? <Loader2 size={18} className="animate-spin" /> : <Volume2 size={18} />}
                  </button>
                  <button onClick={() => handleCopyOutputs(2)} className="w-9 h-9 flex justify-center items-center rounded-lg hover:bg-gray-200 text-gray-600 transition-colors">
                    <Copy size={18} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveWord()}
                    disabled={isSaving}
                    className={`flex items-center gap-1.5 px-3 h-9 rounded-lg hover:bg-amber-50 hover:text-amber-600 text-gray-600 transition-colors text-sm font-medium ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                    title="Lưu vào Flashcard"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Star size={18} />}
                  </button>
                  <button
                    onClick={() => handleSaveBookmark()}
                    disabled={isSavingBookmark}
                    className={`flex items-center gap-1.5 px-3 h-9 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-gray-600 transition-colors text-sm font-medium ${isSavingBookmark ? "opacity-50 cursor-not-allowed" : ""}`}
                    title="Lưu vào Bookmark"
                  >
                    {isSavingBookmark ? <Loader2 size={18} className="animate-spin" /> : <Bookmark size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "bookmark" && (
        <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
          {bookmarks?.length > 0 && (
            <div className="p-3 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm">
              {!isSelectingBookmarks ? (
                <button
                  onClick={() => setIsSelectingBookmarks(true)}
                  className="text-teal-600 text-sm font-medium hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors"
                  disabled={bookmarks?.length === 0}
                >
                  Chọn từ
                </button>
              ) : (
                <>
                  <button onClick={handleSelectAllBookmarks} className="text-gray-600 text-sm font-medium hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
                    {selectedBookmarks.length === Math.min(bookmarks?.length || 0, 10) ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">{selectedBookmarks.length}/10</span>
                    <button
                      onClick={() => {
                        setIsSelectingBookmarks(false);
                        setSelectedBookmarks([]);
                      }}
                      className="text-red-500 text-sm font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex-1 p-4 space-y-5 overflow-y-auto custom-scrollbar">
            {bookmarks?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <Bookmark size={40} className="text-gray-200" />
                <div className="text-sm font-medium">Chưa có bookmark nào</div>
              </div>
            ) : (
              <>
                {notFlashcardBookmarks && notFlashcardBookmarks?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Chưa tạo Flashcard</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {notFlashcardBookmarks &&
                        notFlashcardBookmarks?.map((b) => (
                          <div
                            key={b.id}
                            className={`bg-white p-3 rounded-xl border shadow-sm transition-all flex items-center gap-2 cursor-pointer hover:border-teal-300 ${selectedBookmarks.includes(b.id) ? "border-teal-500 bg-teal-50/30" : "border-gray-200"}`}
                            onClick={() => (isSelectingBookmarks ? toggleSelectBookmark(b.id) : null)}
                          >
                            {isSelectingBookmarks && (
                              <div className="text-teal-600 flex-shrink-0">{selectedBookmarks.includes(b.id) ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-300" />}</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800 text-sm line-clamp-1">{b.word}</p>
                              <p className="text-xs text-gray-500 truncate line-clamp-1">{b.trans}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {flashcardBookmarks && flashcardBookmarks?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider mt-2">Đã tạo Flashcard</h3>
                    <div className="grid grid-cols-2 gap-3 opacity-60">
                      {flashcardBookmarks &&
                        flashcardBookmarks?.map((b) => (
                          <div
                            key={b.id}
                            className={`bg-gray-100 p-3 rounded-xl border transition-all flex items-center gap-2 cursor-pointer hover:border-teal-300 ${selectedBookmarks.includes(b.id) ? "border-teal-500 bg-teal-50/50 opacity-100" : "border-gray-200"}`}
                            onClick={() => (isSelectingBookmarks ? toggleSelectBookmark(b.id) : null)}
                          >
                            {isSelectingBookmarks && (
                              <div className="text-teal-600 flex-shrink-0">{selectedBookmarks.includes(b.id) ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-300" />}</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-700 text-sm line-clamp-1 flex items-center gap-1">
                                {b.word} <Star size={12} className="text-amber-500 fill-amber-500" />
                              </p>
                              <p className="text-xs text-gray-500 truncate line-clamp-1">{b.trans}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {isSelectingBookmarks && selectedBookmarks.length > 0 && (
            <div className="p-3 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex gap-2">
              <button
                onClick={handleDeleteSelectedBookmarks}
                className={`flex justify-center items-center gap-1.5 py-2.5 rounded-xl font-medium transition-colors ${
                  selectedBookmarks.some((id) => bookmarks.find((b) => b.id === id)?.isFlashcard) ? "w-full bg-red-100 text-red-600 hover:bg-red-200" : "w-1/3 bg-red-50 text-red-500 hover:bg-red-100"
                }`}
              >
                <Trash2 size={18} />
                {selectedBookmarks.some((id) => bookmarks.find((b) => b.id === id)?.isFlashcard) ? `Xóa ${selectedBookmarks.length} từ` : ""}
              </button>

              {!selectedBookmarks.some((id) => bookmarks.find((b) => b.id === id)?.isFlashcard) && (
                <button
                  onClick={handleSaveSelectedToFlashcard}
                  disabled={isSavingSelected}
                  className="w-2/3 bg-teal-600 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {isSavingSelected ? <Loader2 size={18} className="animate-spin" /> : <Star size={18} />}
                  Lưu {selectedBookmarks.length} từ
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "setting" && (
        <div className="flex-1 bg-gray-50 flex flex-col">
          <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FolderHeart size={16} className="text-teal-600" /> Thư mục lưu từ vựng mặc định
              </h2>
              <select
                value={listFlashcardId?._id || listFlashcardId?.id || listFlashcardId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedObj = listFlashcard.find((f: any) => (f._id || f.id) === selectedId) || selectedId;
                  setListFlashcardId(selectedObj);
                  chrome.storage.local.set({
                    list_flashcard_id: selectedObj,
                  });
                  toast.success("Đã cập nhật thư mục lưu!", {
                    position: "top-center",
                  });
                }}
                className="w-full bg-gray-50 h-10 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer text-sm"
              >
                {listFlashcard?.length > 0 ? (
                  listFlashcard.map((f: any) => (
                    <option key={f._id || f.id} value={f._id || f.id}>
                      {f.name || f.title || "Thư mục không tên"}
                    </option>
                  ))
                ) : (
                  <option value="">Chưa có thư mục nào</option>
                )}
              </select>
              <p className="mt-2 text-xs text-gray-500">Khi bấm lưu từ vựng (biểu tượng Bookmark), từ vựng sẽ được lưu trực tiếp vào thư mục này.</p>
            </div>

            {/* Giọng nói + nghe thử */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Volume2 size={16} className="text-teal-600" /> Giọng đọc phát âm
              </h2>

              <div className="flex flex-col gap-3">
                <select
                  value={testVoiceLang}
                  onChange={(e) => setTestVoiceLang(e.target.value)}
                  className="w-full bg-gray-50 h-10 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer text-sm"
                >
                  {LANGUAGE_OPTIONS.filter((l) => l.value !== "auto").map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label} ({lang.audioCharacter})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleTestVoice}
                  disabled={isTestingVoice}
                  className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {isTestingVoice ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  Nghe thử giọng đọc này
                </button>
                <p className=" text-xs text-gray-500">Hệ thống tự động chọn giọng đọc mặc định dựa trên ngôn ngữ bạn chọn.</p>
              </div>
            </div>

            {/* Giờ nhận tin nhắn Zalo */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <CheckSquare size={16} className="text-teal-600" /> Cài đặt Bot Zalo
              </h2>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-700">Giờ hỏi thăm buổi sáng (Mood Check-in)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={checkinTime}
                    onChange={(e) => setCheckinTime(e.target.value)}
                    className="flex-1 bg-gray-50 h-10 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                  <button
                    onClick={async () => {
                      if (!userToken) {
                        toast.error("Vui lòng đăng nhập để cài đặt", { position: "top-center" });
                        return;
                      }
                      try {
                        const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/api/user/checkin-time`, {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${userToken}`,
                          },
                          body: JSON.stringify({ checkinTime }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          chrome.storage.local.set({ checkinTime });
                          toast.success("Lưu giờ hỏi thăm thành công!", { position: "top-center" });
                        } else {
                          toast.error(data.error || "Lỗi lưu cấu hình", { position: "top-center" });
                        }
                      } catch (err) {
                        toast.error("Lỗi kết nối máy chủ", { position: "top-center" });
                      }
                    }}
                    className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm transition-colors"
                  >
                    Lưu
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Bot Zalo sẽ nhắn tin nhắc nhở học tập và kiểm tra tâm trạng vào thời gian này mỗi ngày.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Links */}
      <div className="border-t border-gray-200 bg-white p-3 flex items-center justify-center gap-4 text-sm">
        <a
          href={import.meta.env.VITE_API_FRONTEND}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-gray-600 hover:text-teal-600 transition-colors font-medium px-2 py-1 rounded-md hover:bg-teal-50"
        >
          <Home size={16} /> Trang chủ
        </a>
        <a href="mailto:trongandev@gmail.com" className="flex items-center gap-1.5 text-gray-600 hover:text-teal-600 transition-colors font-medium px-2 py-1 rounded-md hover:bg-teal-50">
          <Bug size={16} /> Báo lỗi
        </a>
        <a
          href={`${import.meta.env.VITE_API_FRONTEND}/explore/privacy`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-gray-600 hover:text-teal-600 transition-colors font-medium px-2 py-1 rounded-md hover:bg-teal-50"
        >
          <ScrollText size={16} /> Chính sách
        </a>
      </div>

      <Toaster />
    </div>
  );
}
