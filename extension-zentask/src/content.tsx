import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Volume2, Star, Settings, X, RotateCcw, Clock, Sparkles, HistoryIcon, Loader2, FolderHeart, Bookmark } from "lucide-react";
import css from "./index.css?inline";
import etcService from "./services/etcService";

const ICON_URL = chrome.runtime.getURL("icon64.png");

interface TranslateResult {
  sentences?: { trans?: string; orig?: string; src_translit?: string }[];
  dict?: { pos: string; terms: string[] }[];
}

const ContentApp = () => {
  const [iconPos, setIconPos] = useState({ top: 0, left: 0 });
  const [showIcon, setShowIcon] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectionRect, setSelectionRect] = useState<{
    top: number;
    bottom: number;
    left: number;
    width: number;
  } | null>(null);
  const [result, setResult] = useState<TranslateResult | null>(null);

  // New States
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isEnhancingAI, setIsEnhancingAI] = useState(false);
  const [isSavingBookmark, setIsSavingBookmark] = useState(false);
  const [activeView, setActiveView] = useState<"translate" | "history" | "settings">("translate");

  type ToastState = {
    show: boolean;
    message: string;
    type: "waiting" | "success" | "error";
  };
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    type: "waiting",
  });

  const showToast = (message: string, type: ToastState["type"]) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  };

  const [userToken, setUserToken] = useState("");
  const [listFlashcard, setListFlashcard] = useState<any[]>([]);
  const [listFlashcardId, setListFlashcardId] = useState<any>({});
  const [userInfo, setUserInfo] = useState<any>(null);

  const [historyItems, setHistoryItems] = useState<{ word: string; trans: string }[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);

  // Load History when activeView changes to history.
  useEffect(() => {
    if (activeView === "history") {
      chrome.storage.local.get(["translationHistory"], (result) => {
        if (result.translationHistory) {
          const items = Object.entries(result.translationHistory)
            .map(([word, data]: [string, any]) => ({
              word,
              trans: data.sentences?.[0]?.trans || "No translation",
            }))
            .reverse(); // Đảo ngược để hiển thị từ mới nhất
          setHistoryItems(items);
        }
      });
    }
  }, [activeView]);
  useEffect(() => {
    chrome.runtime.sendMessage({ action: "reload" }, (response) => {
      if (!response.result) {
        setUserToken("");
        setListFlashcard([]);
        setListFlashcardId({});
        setUserInfo(null);
      } else {
        setUserToken(response.result.token);
        setListFlashcard(response.result.list_flashcard);
        setListFlashcardId(response.result.list_flashcard_id);
        setUserInfo(response.result.user);
      }
    });
  }, []);

  const handleSyncData = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    chrome.runtime.sendMessage({ action: "reload" }, (response) => {
      setIsSyncing(false);
      if (response && response.success) {
        showToast("Đồng bộ dữ liệu thành công", "success");
      } else {
        showToast("Đồng bộ thất bại, vui lòng thử lại", "error");
      }
    });
  };

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // If clicking inside our shadow DOM modal, ignore
      if ((e.target as HTMLElement).closest("quizzet-translator-root")) return;

      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 0 && selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          setSelectedText(text);
          setSelectionRect({
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
          });

          setIconPos({
            top: rect.top + window.scrollY - 40,
            left: rect.left + window.scrollX + rect.width / 2 - 16,
          });
          setShowIcon(true);
        } else if (!showModal) {
          setShowIcon(false);
        }
      }, 10);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Hide icon/modal if clicking outside
      const target = e.target as HTMLElement;
      if (!target.closest("quizzet-translator-root")) {
        setShowIcon(false);
        setShowModal(false);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [showModal]);

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowIcon(false);
    setShowModal(true);
    setActiveView("translate");
    fetchTranslation(selectedText);
  };

  const fetchTranslation = (text: string) => {
    setLoading(true);
    setResult(null);
    chrome.runtime.sendMessage({ action: "translate", payload: { text } }, (response) => {
      setLoading(false);
      if (response && response.success) {
        setResult(response.data);
      } else {
        console.error("Translation error:", response?.error);
      }
    });
  };

  const handlePlayAudio = async () => {
    if (!selectedText) return;
    setIsPlayingAudio(true);
    try {
      const audioUrl = await etcService.textToSpeech(selectedText);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (e) {
      console.error("Audio play failed", e);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const handleSaveBookmark = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    }
    if (!result || !selectedText) return;
    setIsSavingBookmark(true);
    try {
      const { quizzet_bookmarks } = await chrome.storage.local.get(["quizzet_bookmarks"]);
      const bookmarks = quizzet_bookmarks || [];
      const newBookmark = {
        id: Date.now().toString(),
        word: selectedText,
        trans: result.sentences?.[0]?.trans || "No translation",
        dict: result.dict,
        phonetics: result.sentences?.[1]?.src_translit || "",
        timestamp: Date.now(),
        isFlashcard: false,
      };

      if (!bookmarks.some((b: any) => b.word.toLowerCase() === newBookmark.word.toLowerCase())) {
        bookmarks.unshift(newBookmark);
        await chrome.storage.local.set({ quizzet_bookmarks: bookmarks });
        showToast("Đã lưu vào Bookmark!", "success");
      } else {
        showToast("Từ đã có trong Bookmark", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Có lỗi xảy ra", "error");
    }
    setIsSavingBookmark(false);
  };

  const handleEnhanceAI = async () => {
    if (!selectedText) return;
    setIsEnhancingAI(true);
    setToast({ show: true, message: "Đang dịch bằng AI...", type: "waiting" });

    try {
      chrome.runtime.sendMessage(
        {
          action: "ENHANCE_WITH_AI",
          payload: { text: selectedText, target_language: "tiếng việt" },
        },
        (aiResult) => {
          if (aiResult && aiResult.ok) {
            setToast({
              show: true,
              message: aiResult.message || "Dịch thuật thành công!",
              type: "success",
            });
            setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);

            if (aiResult.parse) {
              setResult((prev) => {
                if (!prev) return prev;
                const newSentences = [...(prev.sentences || [])];
                if (newSentences.length > 0) {
                  newSentences[0] = { ...newSentences[0], trans: aiResult.parse };
                } else {
                  newSentences.push({ trans: aiResult.parse });
                }
                return { ...prev, sentences: newSentences };
              });
            }
          } else {
            setToast({
              show: true,
              message: aiResult?.message || "Có lỗi từ server",
              type: "error",
            });
            setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
          }
          setIsEnhancingAI(false);
        }
      );
    } catch (e: any) {
      console.error("AI Enhance failed", e);
      setToast({
        show: true,
        message: e.message || "Kết nối API thất bại",
        type: "error",
      });
      setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
      setIsEnhancingAI(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToFlashcard = async () => {
    if (!selectedText || !userToken || !listFlashcardId) {
      setToast({
        show: true,
        message: "Vui lòng đăng nhập và chọn thư mục",
        type: "error",
      });
      setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
      return;
    }

    setIsSaving(true);
    setToast({
      show: true,
      message: "Đang lưu từ " + selectedText,
      type: "waiting",
    });

    try {
      chrome.runtime.sendMessage(
        {
          action: "GENERATE_FLASHCARD_AI",
          payload: {
            term: selectedText,
            setId: listFlashcardId.id || listFlashcardId._id || listFlashcardId,
          },
        },
        (res) => {
          if (res && res.ok !== false) {
            setToast({
              show: true,
              message: `Lưu thành công từ ${selectedText} vào thư mục ${listFlashcardId.title || "đã chọn"}`,
              type: "success",
            });
          } else {
            setToast({
              show: true,
              message: res?.message || "Có lỗi từ server",
              type: "error",
            });
          }
          setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
          setIsSaving(false);
        }
      );
    } catch (e: any) {
      console.error("Save to flashcard failed", e);
      setToast({
        show: true,
        message: e.message || "Kết nối API thất bại",
        type: "error",
      });
      setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
      setIsSaving(false);
    }
  };

  if (!showIcon && !showModal && !toast.show) return null;

  return (
    <div style={{ position: "absolute", top: 0, left: 0, zIndex: 2147483647 }} className="quizzet-translator-root font-sans text-gray-800">
      <style>{css}</style>

      {/* Toast Notification (Top Center) */}
      {toast.show && (
        <div
          className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium text-white shadow-2xl flex items-center gap-2 z-[2147483647] transition-all duration-300 ${
            toast.type === "waiting" ? "bg-blue-500" : toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.type === "waiting" && <Loader2 size={16} className="animate-spin" />}
          <span>{toast.message}</span>
        </div>
      )}

      {showIcon && (
        <div
          onClick={handleIconClick}
          style={{
            position: "absolute",
            top: `${iconPos.top}px`,
            left: `${iconPos.left}px`,
          }}
          className="cursor-pointer hover:scale-110 transition-transform bg-white rounded-lg shadow-lg border border-gray-200 p-1 w-max"
        >
          <img src={ICON_URL} alt="Translate" className="w-6 h-6 object-contain rounded-lg" />
        </div>
      )}

      {showModal && (
        <div
          ref={modalRef}
          style={{
            position: "absolute",
            width: "320px",
            ...(selectionRect
              ? (() => {
                  const modalWidth = 320;
                  const estimatedMaxHeight = 450;

                  let left = selectionRect.left + window.scrollX + selectionRect.width / 2 - modalWidth / 2;
                  if (left < 10) left = 10;
                  if (left + modalWidth > document.documentElement.clientWidth) left = document.documentElement.clientWidth - modalWidth - 10;

                  const spaceBelow = window.innerHeight - selectionRect.bottom;
                  const spaceAbove = selectionRect.top;

                  if (spaceBelow < estimatedMaxHeight && spaceAbove > spaceBelow) {
                    return {
                      top: `${selectionRect.top + window.scrollY - 10}px`,
                      left: `${left}px`,
                      transform: "translateY(-100%)",
                    };
                  }

                  return {
                    top: `${selectionRect.bottom + window.scrollY + 10}px`,
                    left: `${left}px`,
                  };
                })()
              : {
                  top: `${iconPos.top + 50}px`,
                  left: `${iconPos.left - 150}px`,
                }),
          }}
          className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col text-sm animate-in fade-in zoom-in duration-200"
        >
          <div className="flex justify-between items-center p-3 border-b border-gray-100 text-teal-600 bg-teal-50/30">
            <button title="Phát âm thanh" onClick={handlePlayAudio} disabled={isPlayingAudio} className="hover:text-teal-600 hover:bg-teal-50 p-1 rounded-md transition-colors disabled:opacity-50">
              {isPlayingAudio ? <Loader2 size={16} className="animate-spin text-teal-600" /> : <Volume2 size={16} />}
            </button>
            {userInfo ? (
              <>
                <div className="flex gap-2 text-gray-500">
                  <button title="Dịch bằng AI" onClick={handleEnhanceAI} disabled={isEnhancingAI} className="hover:text-teal-600 hover:bg-teal-50 p-1 rounded-md transition-colors disabled:opacity-50">
                    {isEnhancingAI ? <Loader2 size={16} className="animate-spin text-teal-600" /> : <Sparkles size={16} />}
                  </button>

                  <button
                    title="Lưu vào Bookmark"
                    onClick={handleSaveBookmark}
                    disabled={isSavingBookmark}
                    className="hover:text-teal-600 hover:bg-teal-50 p-1 rounded-md transition-colors disabled:opacity-50"
                  >
                    {isSavingBookmark ? <Loader2 size={16} className="animate-spin text-teal-600" /> : <Bookmark size={16} />}
                  </button>
                </div>
                <div className="flex gap-2 text-gray-500">
                  <button
                    title="Xem lại lịch sử"
                    onClick={() => setActiveView("history")}
                    className={`hover:text-teal-600 hover:bg-teal-50 p-1 rounded-md transition-colors ${activeView === "history" ? "bg-teal-100 text-teal-600" : ""}`}
                  >
                    <HistoryIcon size={16} />
                  </button>
                  <button
                    title="Cài đặt"
                    onClick={() => setActiveView("settings")}
                    className={`hover:text-gray-700 hover:bg-gray-100 p-1 rounded-md transition-colors ${activeView === "settings" ? "bg-gray-200 text-gray-700" : ""}`}
                  >
                    <Settings size={16} />
                  </button>
                </div>
              </>
            ) : (
              <a href={`${import.meta.env.VITE_API_FRONTEND}/auth`} target="_blank" rel="noreferrer" className="text-teal-600 text-sm font-medium hover:underline text-center w-full">
                Đăng nhập để sử dụng tính năng
              </a>
            )}
            <button onClick={() => setShowModal(false)} className="hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {activeView === "translate" && (
              <>
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="loader"></div>
                  </div>
                ) : result ? (
                  <div className="flex flex-col gap-4">
                    <div className="mb-2">
                      <div className="text-lg font-medium text-gray-800 mb-1">{result.sentences?.[0]?.trans || "No translation"}</div>
                      {result.sentences?.[1]?.src_translit && <div className="text-gray-500 italic text-xs">/{result.sentences[1].src_translit}/</div>}
                    </div>

                    {result.dict?.map((d, i) => (
                      <div key={i} className="border-t border-dashed border-gray-200 pt-3">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{d.pos}</div>
                        <div className="text-gray-700 italic">{d.terms.join(", ")}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-red-500 py-4 text-center">Translation failed</div>
                )}
              </>
            )}

            {activeView === "history" && (
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {historyItems.length > 0 ? (
                  historyItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col p-2 bg-gray-50 rounded-md border border-gray-100 hover:border-teal-300 hover:bg-teal-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedText(item.word);
                        setActiveView("translate");
                        fetchTranslation(item.word);
                      }}
                    >
                      <span className="font-semibold text-gray-800 text-sm line-clamp-1">{item.word}</span>
                      <span className="text-gray-500 text-xs truncate mt-0.5 line-clamp-1">{item.trans}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 py-6 text-center text-xs flex flex-col gap-2">
                    <Clock className="mx-auto text-gray-200" size={24} />
                    <span>Chưa có lịch sử tra từ nào</span>
                  </div>
                )}
              </div>
            )}

            {activeView === "settings" && (
              <div className="text-gray-600 flex flex-col gap-4">
                <h3 className="font-bold text-gray-800 text-base border-b border-gray-100 pb-2">Cài đặt mở rộng</h3>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  <span className="text-gray-700">Vị trí lưu từ vựng</span>
                  <select
                    className="border border-gray-200 rounded-lg p-2 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-shadow bg-white"
                    value={listFlashcardId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setListFlashcardId(newId);
                      chrome.storage.local.set({ list_flashcard_id: newId });
                    }}
                  >
                    {listFlashcard.length > 0 ? (
                      listFlashcard.map((item) => (
                        <option key={item._id || item.id} value={item._id || item.id}>
                          {item.name || item.title || "Thư mục không tên"}
                        </option>
                      ))
                    ) : (
                      <option value="">Mặc định</option>
                    )}
                  </select>
                </label>
                <label
                  className={`flex items-center gap-2 text-sm font-medium mt-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-colors ${isSyncing ? "opacity-50" : ""}`}
                  onClick={handleSyncData}
                >
                  <span className="text-gray-700">Đồng bộ Data</span>
                  <RotateCcw size={14} className={`text-teal-600 ml-auto ${isSyncing ? "animate-spin" : ""}`} />
                </label>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            {userInfo ? (
              <div className="flex items-center gap-2">
                <img src={userInfo.photoURL || ICON_URL} alt="Avatar" className="w-8 h-8 rounded-full border border-gray-200 bg-white object-cover" />
                <div>
                  <div className="font-semibold text-gray-700 text-xs">{userInfo.displayName || "User"}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 line-clamp-1">
                    <FolderHeart size={14} /> {listFlashcardId?.title}
                  </div>
                </div>
              </div>
            ) : (
              <a href={`${import.meta.env.VITE_API_FRONTEND}/auth`} target="_blank" rel="noreferrer" className="text-teal-600 text-sm font-medium hover:underline text-center w-full">
                Bấm vào đây để đăng nhập và lưu từ vựng vào tài khoản của bạn
              </a>
            )}
          </div>
          {userInfo && (
            <button
              onClick={handleSaveToFlashcard}
              disabled={isSaving || !userToken}
              className={`m-3 mt-0 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 ${isSaving || !userToken ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin text-white" /> : <Star fill="currentColor" size={16} className="text-yellow-400" />}
              Lưu vào flashcard
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Inject React App into Shadow DOM
const init = () => {
  const container = document.createElement("quizzet-translator-root");
  document.body.appendChild(container);

  const shadowRoot = container.attachShadow({ mode: "open" });
  const rootElement = document.createElement("div");
  shadowRoot.appendChild(rootElement);

  const root = createRoot(rootElement);
  root.render(<ContentApp />);
};

init();

// Lắng nghe sự kiện từ trang web Zentask (không cần Extension ID cố định)
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data && event.data.type === "ZENTASK_SYNC_AUTH") {
    chrome.runtime.sendMessage(
      {
        action: "SYNC_FIREBASE_AUTH_FROM_CONTENT",
        token: event.data.token,
        user: event.data.user,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Lỗi khi đồng bộ auth sang background:", chrome.runtime.lastError);
        } else {
          console.log("Đã đồng bộ auth thành công sang background!", response);
        }
      },
    );
  } else if (event.data && event.data.type === "ZENTASK_SYNC_LOGOUT") {
    chrome.runtime.sendMessage(
      {
        action: "SYNC_FIREBASE_LOGOUT_FROM_CONTENT",
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Lỗi khi đồng bộ logout sang background:", chrome.runtime.lastError);
        } else {
          console.log("Đã đồng bộ logout thành công sang background!", response);
        }
      },
    );
  }
});
