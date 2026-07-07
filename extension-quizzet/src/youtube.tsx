import { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { X, ArrowUpDown, Bookmark, Star, Loader2, Volume2, MoveVertical } from "lucide-react";
import { useDebounce } from "use-debounce";
import { LANGUAGE_OPTIONS } from "./App";
import css from "./index.css?inline";
import etcService from "./services/etcService";

const STORAGE_KEY = "quizzet_youtube_settings";

const defaultSettings = {
  lang1: "original",
  lang2: "vi",
  isEnabled: true,
  mode: "dual", // "single" or "dual"
  offsetY: 0,

  textColor1: "#ffffff",
  bgColor1: "rgba(0, 0, 0, 0.7)",
  fontSize1: "22px",
  fontFamily1: "Arial, sans-serif",

  textColor2: "#ffff00", // Vàng cho dễ phân biệt mặc định
  bgColor2: "rgba(0, 0, 0, 0.7)",
  fontSize2: "18px",
  fontFamily2: "Arial, sans-serif",
};

const YoutubeDualSub = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedLine, setSelectedLine] = useState<1 | 2>(1);
  const [originalText, setOriginalText] = useState("");
  const [debouncedText] = useDebounce(originalText, 400);

  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");

  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);

  const observerRef = useRef<MutationObserver | null>(null);
  // Cache bản dịch: key = `${text}__${lang}`, value = translated string
  const translationCache = useRef<Map<string, string>>(new Map());
  // Track xem mình có pause video không (để không resume nếu user đã pause thủ công)

  // Word popover states
  const [selectedWordInfo, setSelectedWordInfo] = useState<{
    word: string;
    x: number;
    y: number;
  } | null>(null);
  const [wordTranslation, setWordTranslation] = useState<any>(null);
  const [isTranslatingWord, setIsTranslatingWord] = useState(false);
  const [isSavingWord, setIsSavingWord] = useState(false);
  const [isSavingBookmark, setIsSavingBookmark] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "waiting";
  }>({ show: false, message: "", type: "waiting" });

  const showToast = (message: string, type: "success" | "error" | "waiting", duration = 3000) => {
    setToast({ show: true, message, type });
    if (type !== "waiting") {
      setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, duration);
    }
  };

  // Load Settings
  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (result[STORAGE_KEY]) {
        setSettings({ ...defaultSettings, ...result[STORAGE_KEY] });
      }
    });
  }, []);

  // Lắng nghe Custom Event từ nút settings bên ngoài shadow DOM
  useEffect(() => {
    const handler = () => setShowSettings((prev) => !prev);
    document.addEventListener("quizzet:toggleSettings", handler);
    return () => document.removeEventListener("quizzet:toggleSettings", handler);
  }, []);

  const saveSettings = (newSettings: any) => {
    setSettings(newSettings);
    chrome.storage.local.set({ [STORAGE_KEY]: newSettings });
  };

  // Drag logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartOffset.current = settings.offsetY || 0;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dy = e.clientY - dragStartY.current;
      const newOffset = dragStartOffset.current + dy;
      setSettings((prev) => ({ ...prev, offsetY: newOffset }));
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Lưu giá trị offsetY cuối cùng vào storage để không bị mất
        chrome.storage.local.get([STORAGE_KEY], (result) => {
          const currentSettings = result[STORAGE_KEY] || defaultSettings;
          chrome.storage.local.set({
            [STORAGE_KEY]: { ...currentSettings, offsetY: settings.offsetY },
          });
        });
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, settings.offsetY]);

  // Observe YouTube Captions
  useEffect(() => {
    // Ẩn subtitle mặc định của youtube bằng css
    const style = document.createElement("style");
    style.innerHTML = `
      .caption-window { opacity: 0; pointer-events: none; }
    `;
    document.head.appendChild(style);

    // Observer theo dõi nội dung caption
    const captionObserver = new MutationObserver(() => {
      let currentText = "";
      const segments = document.querySelectorAll(".ytp-caption-segment");
      segments.forEach((seg) => {
        if (seg.textContent) currentText += seg.textContent + " ";
      });
      currentText = currentText.trim();
      setOriginalText(currentText);
    });

    // Track node đang được observe để phát hiện khi YouTube rebuild DOM
    let currentCaptionNode: Element | null = null;

    // Hàm attach captionObserver vào targetNode
    const attachCaptionObserver = (targetNode: Element) => {
      captionObserver.disconnect();
      captionObserver.observe(targetNode, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      observerRef.current = captionObserver;
      currentCaptionNode = targetNode;
    };

    // Thử attach ngay nếu targetNode đã tồn tại
    const existingTarget = document.querySelector(".ytp-caption-window-container");
    if (existingTarget) {
      attachCaptionObserver(existingTarget);
    }

    // Observer theo dõi document.body để phát hiện khi .ytp-caption-window-container
    // xuất hiện hoặc được tạo lại (xảy ra khi YouTube chuyển video - SPA)
    const domWatcher = new MutationObserver(() => {
      const targetNode = document.querySelector(".ytp-caption-window-container");
      // Re-attach nếu node mới xuất hiện hoặc node cũ đã bị thay thế
      if (targetNode && targetNode !== currentCaptionNode) {
        attachCaptionObserver(targetNode);
      }
    });

    domWatcher.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      captionObserver.disconnect();
      domWatcher.disconnect();
      observerRef.current = null;
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, []);
  // Translate logic
  useEffect(() => {
    if (!settings.isEnabled) return;
    if (!debouncedText) {
      setText1("");
      setText2("");
      return;
    }

    const translateTo = async (text: string, toLang: string, setter: (val: string) => void) => {
      if (toLang === "original") {
        setter(text);
        return;
      }

      const cacheKey = `${text}__${toLang}`;

      // Nếu đã có trong cache thì trả về ngay, không gọi API
      if (translationCache.current.has(cacheKey)) {
        setter(translationCache.current.get(cacheKey)!);
        return;
      }

      // Không xóa text cũ ngay — giữ nguyên cho đến khi API trả về
      // (setter sẽ chỉ được gọi khi có kết quả mới)
      chrome.runtime.sendMessage({ action: "translate", payload: { text, from: "auto", to: toLang, forYoutube: true } }, (res) => {
        if (res && res.success) {
          const translated = res.data.sentences?.[0]?.trans || "";
          translationCache.current.set(cacheKey, translated);
          setter(translated);
        }
      });
    };

    translateTo(debouncedText, settings.lang1, setText1);
    translateTo(debouncedText, settings.lang2, setText2);
  }, [debouncedText, settings.lang1, settings.lang2, settings.isEnabled]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = () => {
      setSelectedWordInfo(null);
    };
    if (selectedWordInfo) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedWordInfo]);

  // Pause/resume YouTube video khi mở/đóng popover
  useEffect(() => {
    const video = document.querySelector<HTMLVideoElement>("video");
    if (!video) return;

    if (selectedWordInfo) {
      video.pause();
    } else {
      video.play();
    }
  }, [selectedWordInfo]);

  const handleWordClick = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    // Vị trí nằm trên từ
    setSelectedWordInfo({
      word: word.replace(/[.,!?()]/g, ""),
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  useEffect(() => {
    if (!selectedWordInfo) {
      setWordTranslation(null);
      return;
    }
    setIsTranslatingWord(true);
    chrome.runtime.sendMessage(
      {
        action: "translate",
        payload: { text: selectedWordInfo.word, from: "auto", to: "vi" },
      }, // Default to VI for word lookup
      (res) => {
        if (res && res.success) {
          setWordTranslation(res.data);
        }
        setIsTranslatingWord(false);
      },
    );
  }, [selectedWordInfo]);

  const handleSaveFlashcard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (!wordTranslation) return;
    setIsSavingWord(true);
    setSelectedWordInfo(null);
    try {
      const { token, list_flashcard_id } = await chrome.storage.local.get(["token", "list_flashcard_id"]);
      if (!token) {
        showToast("Vui lòng đăng nhập", "error");
        setIsSavingWord(false);
        return;
      }
      showToast("Đang lưu...", "waiting");

      const res = await etcService.createFlashcardWithAI(
        "/flashcards/create-ai",
        {
          word: selectedWordInfo?.word,
          list_flashcard_id: list_flashcard_id?._id,
          language: list_flashcard_id?.language || "english",
        },
        token,
      );
      if (res && res.ok !== false) {
        showToast("Lưu Flashcard thành công!", "success");
      } else {
        showToast("Lưu thất bại", "error");
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message, "error");
    }
    setIsSavingWord(false);
  };

  const handleSaveBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (!wordTranslation || !selectedWordInfo) return;
    setIsSavingBookmark(true);
    try {
      const { quizzet_bookmarks } = await chrome.storage.local.get(["quizzet_bookmarks"]);
      const bookmarks = quizzet_bookmarks || [];
      const newBookmark = {
        id: Date.now().toString(),
        word: selectedWordInfo.word,
        trans: wordTranslation.sentences?.[0]?.trans || "No translation",
        dict: wordTranslation.dict,
        phonetics: wordTranslation.sentences?.[1]?.src_translit || "",
        timestamp: Date.now(),
        isFlashcard: false,
      };
      // Check if exists
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
    setSelectedWordInfo(null);
  };

  const SubtitleLine = ({ text, color, bg, size, font }: { text: string; color: string; bg: string; size: string; font: string }) => {
    if (!text) return null;
    const words = text.split(" ");
    return (
      <div
        className="px-4 py-1 mb-1 rounded flex flex-wrap justify-center gap-x-[0.3em]"
        style={{
          backgroundColor: bg,
          color: color,
          fontSize: size,
          fontFamily: font,
          textShadow: "1px 1px 2px black",
          textAlign: "center",
          width: "fit-content",
          margin: "0 auto",
        }}
      >
        {words.map((word, i) => (
          <span key={i} onClick={(e) => handleWordClick(word, e)} className="hover:underline hover:text-teal-400 cursor-pointer transition-colors">
            {word}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-end items-center font-sans" style={{ bottom: "20%" }}>
      <style>{css}</style>

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`absolute top-1/4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-sm font-medium text-white shadow-2xl flex items-center gap-2 z-[9999999] transition-all duration-300 pointer-events-auto ${
            toast.type === "waiting" ? "bg-blue-500" : toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.type === "waiting" && <Loader2 size={16} className="animate-spin" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Subtitles Area */}
      {settings.isEnabled && (text1 || text2) && (
        <div className="flex flex-col items-center pointer-events-auto transition-all group relative" style={{ transform: `translateY(${settings.offsetY || 0}px)` }}>
          <div className="flex flex-col items-center relative select-none">
            {settings.mode === "single" ? (
              <SubtitleLine text={text1} color={settings.textColor1} bg={settings.bgColor1} size={settings.fontSize1} font={settings.fontFamily1} />
            ) : (
              <>
                <SubtitleLine text={text1} color={settings.textColor1} bg={settings.bgColor1} size={settings.fontSize1} font={settings.fontFamily1} />
                <SubtitleLine text={text2} color={settings.textColor2} bg={settings.bgColor2} size={settings.fontSize2} font={settings.fontFamily2} />
              </>
            )}

            {/* Drag Handle */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onMouseDown={handleMouseDown}
                className="p-1.5 bg-black/60 backdrop-blur-sm text-white/90 rounded-full shadow hover:bg-black/80 hover:text-white transition-all hover:scale-110 cursor-grab"
                title="Kéo thả để di chuyển"
              >
                <MoveVertical size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Word Translation Popover */}
      {selectedWordInfo && (
        <div
          ref={popoverRef}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
          className="fixed z-[9999999] pointer-events-auto bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-gray-200 w-[280px] p-4 animate-in zoom-in-95 duration-200"
          style={{
            left: `${selectedWordInfo.x}px`,
            top: `${selectedWordInfo.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          {isTranslatingWord ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="animate-spin text-teal-500" size={24} />
            </div>
          ) : wordTranslation ? (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-gray-800 leading-tight" style={{ fontSize: "20px" }}>
                    {selectedWordInfo.word}
                  </h4>
                  {wordTranslation.sentences?.[1]?.src_translit && <span className="text-gray-500 text-xs! italic">/{wordTranslation.sentences[1].src_translit}/</span>}
                </div>
                <div className="">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      const audioBtn = e.currentTarget;
                      audioBtn.classList.add("opacity-50", "pointer-events-none");
                      try {
                        const audioUrl = await etcService.textToSpeech(selectedWordInfo.word);
                        const audio = new Audio(audioUrl);
                        audio.play();
                      } catch (err) {
                        console.error("Audio error", err);
                        showToast("Lỗi phát âm thanh", "error");
                      } finally {
                        audioBtn.classList.remove("opacity-50", "pointer-events-none");
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors"
                    title="Nghe phát âm"
                  >
                    <Volume2 size={20} />
                  </button>
                  <button onClick={() => setSelectedWordInfo(null)} className="text-red-600 ml-3">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className=" font-medium text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100" style={{ fontSize: "16px" }}>
                {wordTranslation.sentences?.[0]?.trans || "No translation"}
              </div>

              {wordTranslation.dict && wordTranslation.dict.length > 0 && (
                <div className="max-h-[120px] overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2 mt-1">
                  {wordTranslation.dict.map((d: any, i: number) => (
                    <div key={i}>
                      <span className="font-bold text-teal-600 uppercase mr-1" style={{ fontSize: "16px" }}>
                        {d.pos}
                      </span>
                      <span className="text-gray-600" style={{ fontSize: "16px" }}>
                        {d.terms.join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100">
                <button
                  onClick={handleSaveFlashcard}
                  disabled={isSavingWord}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  title="Lưu vào Flashcard"
                  style={{ fontSize: "16px" }}
                >
                  {isSavingWord ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
                  Flashcard
                </button>
                <button
                  onClick={handleSaveBookmark}
                  disabled={isSavingBookmark}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  title="Lưu vào Bookmark"
                  style={{ fontSize: "16px" }}
                >
                  {isSavingBookmark ? <Loader2 size={14} className="animate-spin" /> : <Bookmark size={14} />}
                  Bookmark
                </button>
              </div>
            </div>
          ) : (
            <div className="text-red-500 py-4 text-center text-sm">Translation failed</div>
          )}

          {/* Mũi tên trỏ xuống */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-gray-200 rotate-45 pointer-events-none" />
        </div>
      )}

      {/* Settings Panel - YouTube style */}
      {showSettings && (
        <div className="absolute pointer-events-auto z-[9999999]" style={{ bottom: "60px", right: "8px" }} onMouseDown={(e) => e.stopPropagation()}>
          {/* Backdrop click to close */}
          <div className="fixed inset-0 z-[-1]" onClick={() => setShowSettings(false)} />

          <div
            style={{
              background: "#212121",
              borderRadius: "12px",
              width: "300px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
              color: "#fff",
              fontFamily: "Roboto, Arial, sans-serif",
              fontSize: "14px",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "15px", fontWeight: 500 }}>Phụ đề Song ngữ</span>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "8px 0" }}>
              {/* Enable Toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px" }}>
                <span style={{ color: "rgba(255,255,255,0.87)" }}>Kích hoạt Phụ đề</span>
                <label style={{ position: "relative", display: "inline-block", width: "36px", height: "20px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={settings.isEnabled}
                    onChange={(e) => saveSettings({ ...settings, isEnabled: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: settings.isEnabled ? "#3ea6ff" : "rgba(255,255,255,0.3)",
                      borderRadius: "34px",
                      transition: "0.2s",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      width: "14px",
                      height: "14px",
                      left: settings.isEnabled ? "19px" : "3px",
                      top: "3px",
                      background: "#fff",
                      borderRadius: "50%",
                      transition: "0.2s",
                    }}
                  />
                </label>
              </div>

              {/* Mode */}
              <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Chế độ</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["single", "dual"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => saveSettings({ ...settings, mode: m })}
                      style={{
                        flex: 1,
                        padding: "6px 0",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 500,
                        background: settings.mode === m ? "#3ea6ff" : "rgba(255,255,255,0.1)",
                        color: settings.mode === m ? "#000" : "rgba(255,255,255,0.7)",
                        transition: "all 0.15s",
                      }}
                    >
                      {m === "single" ? "Single Sub" : "Dual Sub"}
                    </button>
                  ))}
                </div>
              </div>

              {settings.isEnabled && (
                <>
                  {/* Languages */}
                  <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Ngôn ngữ</div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", width: "44px", flexShrink: 0 }}>{settings.mode === "dual" ? "Dòng 1" : "Ngôn ngữ"}</span>
                        <select
                          value={settings.lang1}
                          onChange={(e) => saveSettings({ ...settings, lang1: e.target.value })}
                          style={{
                            flex: 1,
                            background: "rgba(255,255,255,0.1)",
                            border: "none",
                            borderRadius: "6px",
                            color: "#fff",
                            padding: "6px 8px",
                            fontSize: "13px",
                            outline: "none",
                            cursor: "pointer",
                          }}
                        >
                          <option value="original" style={{ background: "#212121" }}>
                            Gốc (YouTube)
                          </option>
                          {LANGUAGE_OPTIONS.filter((l) => l.value !== "auto").map((l) => (
                            <option key={l.value} value={l.value} style={{ background: "#212121" }}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {settings.mode === "dual" && (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                              onClick={() =>
                                saveSettings({
                                  ...settings,
                                  lang1: settings.lang2,
                                  lang2: settings.lang1,
                                  textColor1: settings.textColor2,
                                  textColor2: settings.textColor1,
                                  bgColor1: settings.bgColor2,
                                  bgColor2: settings.bgColor1,
                                  fontSize1: settings.fontSize2,
                                  fontSize2: settings.fontSize1,
                                  fontFamily1: settings.fontFamily2,
                                  fontFamily2: settings.fontFamily1,
                                })
                              }
                              style={{
                                marginLeft: "44px",
                                background: "rgba(255,255,255,0.08)",
                                border: "none",
                                borderRadius: "50%",
                                color: "rgba(255,255,255,0.7)",
                                cursor: "pointer",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Đảo vị trí"
                            >
                              <ArrowUpDown size={14} />
                            </button>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", width: "44px", flexShrink: 0 }}>Dòng 2</span>
                            <select
                              value={settings.lang2}
                              onChange={(e) => saveSettings({ ...settings, lang2: e.target.value })}
                              style={{
                                flex: 1,
                                background: "rgba(255,255,255,0.1)",
                                border: "none",
                                borderRadius: "6px",
                                color: "#fff",
                                padding: "6px 8px",
                                fontSize: "13px",
                                outline: "none",
                                cursor: "pointer",
                              }}
                            >
                              <option value="original" style={{ background: "#212121" }}>
                                Gốc (YouTube)
                              </option>
                              {LANGUAGE_OPTIONS.filter((l) => l.value !== "auto").map((l) => (
                                <option key={l.value} value={l.value} style={{ background: "#212121" }}>
                                  {l.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Style */}
                  <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Dịnh dạng</div>
                      {settings.mode === "dual" && (
                        <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: "6px", padding: "2px" }}>
                          {([1, 2] as const).map((n) => (
                            <button
                              key={n}
                              onClick={() => setSelectedLine(n)}
                              style={{
                                padding: "3px 10px",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: 600,
                                background: selectedLine === n ? "#3ea6ff" : "transparent",
                                color: selectedLine === n ? "#000" : "rgba(255,255,255,0.6)",
                                transition: "all 0.15s",
                              }}
                            >
                              Dòng {n}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      {/* Màu chữ */}
                      <div>
                        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginBottom: "4px" }}>Màu chữ</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "6px", padding: "6px 8px" }}>
                          <input
                            type="color"
                            value={selectedLine === 1 ? settings.textColor1 : settings.textColor2}
                            onChange={(e) => saveSettings({ ...settings, [selectedLine === 1 ? "textColor1" : "textColor2"]: e.target.value })}
                            style={{ width: "20px", height: "20px", border: "none", background: "none", cursor: "pointer", padding: 0 }}
                          />
                          <span style={{ fontSize: "11px", fontFamily: "monospace", color: "rgba(255,255,255,0.6)" }}>{selectedLine === 1 ? settings.textColor1 : settings.textColor2}</span>
                        </div>
                      </div>

                      {/* Màu nền */}
                      <div>
                        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginBottom: "4px" }}>Màu nền</div>
                        <select
                          value={selectedLine === 1 ? settings.bgColor1 : settings.bgColor2}
                          onChange={(e) => saveSettings({ ...settings, [selectedLine === 1 ? "bgColor1" : "bgColor2"]: e.target.value })}
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.1)",
                            border: "none",
                            borderRadius: "6px",
                            color: "#fff",
                            padding: "6px 8px",
                            fontSize: "12px",
                            outline: "none",
                            cursor: "pointer",
                          }}
                        >
                          <option value="transparent" style={{ background: "#212121" }}>
                            Trống
                          </option>
                          <option value="rgba(0,0,0,0.25)" style={{ background: "#212121" }}>
                            Đen 25%
                          </option>
                          <option value="rgba(0,0,0,0.5)" style={{ background: "#212121" }}>
                            Đen 50%
                          </option>
                          <option value="rgba(0,0,0,0.7)" style={{ background: "#212121" }}>
                            Đen 70%
                          </option>
                          <option value="rgba(0,0,0,0.9)" style={{ background: "#212121" }}>
                            Đen 90%
                          </option>
                        </select>
                      </div>

                      {/* Cỡ chữ */}
                      <div style={{ gridColumn: "span 2" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>Cỡ chữ</span>
                          <span style={{ color: "#3ea6ff", fontSize: "11px" }}>{selectedLine === 1 ? settings.fontSize1 : settings.fontSize2}</span>
                        </div>
                        <input
                          type="range"
                          min="12"
                          max="48"
                          value={parseInt(selectedLine === 1 ? settings.fontSize1 : settings.fontSize2)}
                          onChange={(e) => saveSettings({ ...settings, [selectedLine === 1 ? "fontSize1" : "fontSize2"]: `${e.target.value}px` })}
                          style={{ width: "100%", accentColor: "#3ea6ff", cursor: "pointer" }}
                        />
                      </div>

                      {/* Font */}
                      <div style={{ gridColumn: "span 2" }}>
                        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginBottom: "4px" }}>Font chữ</div>
                        <select
                          value={selectedLine === 1 ? settings.fontFamily1 : settings.fontFamily2}
                          onChange={(e) => saveSettings({ ...settings, [selectedLine === 1 ? "fontFamily1" : "fontFamily2"]: e.target.value })}
                          style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.1)",
                            border: "none",
                            borderRadius: "6px",
                            color: "#fff",
                            padding: "6px 8px",
                            fontSize: "12px",
                            outline: "none",
                            cursor: "pointer",
                          }}
                        >
                          <option value="Arial, sans-serif" style={{ background: "#212121" }}>
                            Arial
                          </option>
                          <option value="Roboto, sans-serif" style={{ background: "#212121" }}>
                            Roboto
                          </option>
                          <option value="'Courier New', Courier, monospace" style={{ background: "#212121" }}>
                            Courier New
                          </option>
                          <option value="Georgia, serif" style={{ background: "#212121" }}>
                            Georgia
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Inject nút Quizzet vào .ytp-right-controls của YouTube
const injectControlButton = () => {
  if (document.getElementById("quizzet-ctrl-btn")) return;

  const rightControls = document.querySelector(".ytp-right-controls");
  if (!rightControls) {
    setTimeout(injectControlButton, 500);
    return;
  }

  const btn = document.createElement("button");
  btn.id = "quizzet-ctrl-btn";
  btn.className = "ytp-button";
  btn.title = "Quizzet - Phụ đề Song ngữ";
  btn.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    opacity: 0.9;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    transition: opacity 0.15s;
  `;
  btn.onmouseenter = () => (btn.style.opacity = "1");
  btn.onmouseleave = () => (btn.style.opacity = "0.9");

  // SVG icon: subtitle lines với chữ Q
  btn.innerHTML = `
   <img src="${chrome.runtime.getURL("icon64.png")}" alt="" style="width:22px;height:22px" />
  `;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent("quizzet:toggleSettings"));
  });

  // Chèn vào đầu right-controls (trước các nút khác)
  rightControls.prepend(btn);
};

// Injection Logic
const initYoutubeSubtitles = () => {
  if (document.getElementById("quizzet-youtube-root")) return;

  const player = document.getElementById("movie_player");
  if (!player) {
    // If player not found, try again shortly (Youtube is SPA)
    setTimeout(initYoutubeSubtitles, 1000);
    return;
  }

  const container = document.createElement("div");
  container.id = "quizzet-youtube-root";
  container.style.position = "absolute";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.pointerEvents = "none";
  container.style.zIndex = "2147483647";

  // Thêm trực tiếp vào player để đảm bảo nó hiển thị trên video và scale đúng
  player.appendChild(container);

  const shadowRoot = container.attachShadow({ mode: "open" });
  const rootElement = document.createElement("div");
  rootElement.style.width = "100%";
  rootElement.style.height = "100%";
  shadowRoot.appendChild(rootElement);

  const root = createRoot(rootElement);
  root.render(<YoutubeDualSub />);

  // Inject nút settings vào thanh điều khiển YouTube
  injectControlButton();
};

// Wait for page load
if (document.readyState === "complete") {
  initYoutubeSubtitles();
} else {
  window.addEventListener("load", initYoutubeSubtitles);
}

// Lắng nghe thay đổi đường dẫn vì youtube là SPA
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(initYoutubeSubtitles, 2000);
    // Re-inject control button sau khi YouTube rebuild thanh điều khiển
    setTimeout(injectControlButton, 1500);
  }
}).observe(document, { subtree: true, childList: true });
