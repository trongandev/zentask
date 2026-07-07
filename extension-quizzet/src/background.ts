let translationCache: Record<string, any> = {};

// Load existing history from storage on startup to keep it in memory
chrome.storage.local.get(["translationHistory"]).then((result) => {
  if (result.translationHistory) {
    translationCache = result.translationHistory;
  }
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "translate") {
    const { text, from = "auto", to = "vi", forYoutube = false } = request.payload;
    const wordKey = text.trim().toLowerCase();

    // Lấy data ngay lập tức từ bộ nhớ (O(1)) nếu ngôn ngữ trùng khớp
    if (translationCache[wordKey] && translationCache[wordKey].from === from && translationCache[wordKey].to === to) {
      sendResponse({ success: true, data: translationCache[wordKey] });
      return false;
    }

    const url = `https://translate.google.com/translate_a/single?q=${encodeURIComponent(text)}&sl=${from}&tl=${to}&hl=en&client=gtx&otf=2&dj=1&ie=UTF-8&oe=UTF-8&dt=t&dt=rmt&dt=bd&dt=rms&dt=qca`;

    fetch(url, {
      headers: {
        "User-Agent": "GoogleTranslate/quizzet.id.vn",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        // Chỉ trích xuất và lưu những trường cần thiết
        const filteredData = {
          sentences:
            data.sentences
              ?.map((s: any) => {
                const res: any = {};
                if (s.trans) res.trans = s.trans;
                if (s.src_translit) res.src_translit = s.src_translit;
                return res;
              })
              .filter((s: any) => Object.keys(s).length > 0) || [],

          dict:
            data.dict?.map((d: any) => ({
              pos: d.pos,
              terms: d.terms,
            })) || [],
        };

        // Chỉ lưu cache với các từ/câu ngắn (VD: dưới 100 ký tự) để tránh đầy bộ nhớ
        if (wordKey.length <= 100) {
          // Lưu vào in-memory object
          const cacheData = { ...filteredData, from, to };
          translationCache[wordKey] = cacheData;

          // Đồng bộ backup xuống storage (không chặn response)
          if (forYoutube) {
            chrome.storage.local.set({ translateYtp: translationCache });
          } else {
            chrome.storage.local.set({ translationHistory: translationCache });
          }
        }

        sendResponse({ success: true, data: filteredData });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // Báo hiệu async response
  } else if (request.action === "reload") {
    fetchTokens().then((result) => {
      sendResponse({ result });
    });
    return true;
  } else if (request.action === "POPUP_OPENED") {
    fetchTokens().then((result) => {
      sendResponse(result);
    });
    return true;
  }
});
const urls = ["https://www.quizzet.id.vn", "https://quizzet.id.vn"];
const fetchTokens = async () => {
  try {
    const [cookieWww, cookieRoot] = await Promise.all(urls.map((url) => chrome.cookies.get({ url, name: "token" })));
    const cookie = cookieWww || cookieRoot;
    console.log(cookie);
    if (!cookie) {
      await chrome.storage.local.clear();
      return false;
    }
    const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/list-flashcards/exten`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cookie.value}`,
      },
    });
    if (response.ok) {
      const profile = await response.json();
      let list_flashcard_id = null;
      if (profile.listFlashCards && profile.listFlashCards.length > 0) {
        list_flashcard_id = profile.listFlashCards[0];
      }
      const newStorage = {
        token: cookie.value,
        user: profile.user,
        list_flashcard: profile.listFlashCards,
        list_flashcard_id,
      };

      await chrome.storage.local.set(newStorage);
      return newStorage;
    }
    return false;
  } catch (error) {
    console.error("Failed to fetch tokens and profile", error);
    return false;
  }
};

chrome.runtime.onInstalled.addListener(fetchTokens);
chrome.runtime.onStartup.addListener(fetchTokens);
// Kiểm tra khi có thay đổi cookie
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.name === "token" && changeInfo.cookie.domain.includes(import.meta.env.VITE_API_FRONTEND)) {
    fetchTokens();
  }
});
