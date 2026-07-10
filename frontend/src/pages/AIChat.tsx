import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  MessageCircle,
  Paperclip,
  RefreshCcw,
  Send,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { checkAIBackend, chatWithGemini, generateImageWithHuggingFace, type AIChatMessagePayload } from "../services/aiChatService";

const quickPrompts = [
  "Giải thích ngữ pháp câu này thật dễ hiểu",
  "Tạo 10 câu luyện speaking chủ đề du lịch",
  "Sửa câu tiếng Anh của tôi cho tự nhiên hơn",
  "Nhìn hình và mô tả bằng tiếng Anh đơn giản",
];

type LocalImage = {
  file: File;
  url: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  meta?: string;
  generatedImage?: string;
};

const replyStyles = [
  { label: "Chính xác", value: 0.3 },
  { label: "Cân bằng", value: 0.7 },
  { label: "Sáng tạo", value: 1 },
];

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function toPayload(messages: ChatMessage[]): AIChatMessagePayload[] {
  return messages
    .filter((message) => message.content.trim())
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    }));
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function renderInlineRichText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${part}-${index}`} className="font-bold text-inherit">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderMessageContent(content: string) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: JSX.Element[] = [];
  let pendingList: string[] = [];

  const flushList = () => {
    if (!pendingList.length) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-2 list-disc space-y-1 pl-5">
        {pendingList.map((item, index) => (
          <li key={`${item}-${index}`}>{renderInlineRichText(item)}</li>
        ))}
      </ul>,
    );
    pendingList = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      blocks.push(<div key={`space-${blocks.length}`} className="h-2" />);
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      pendingList.push(trimmed.replace(/^[-*]\s+/, ""));
      return;
    }

    flushList();
    blocks.push(
      <p key={`p-${blocks.length}`} className="mb-2 last:mb-0 leading-relaxed">
        {renderInlineRichText(trimmed)}
      </p>,
    );
  });

  flushList();

  return blocks.length ? blocks : <p className="leading-relaxed">{renderInlineRichText(content)}</p>;
}

export function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "assistant",
      content: "Chào Khải, mình là trợ lý AI của ZenTask. Bạn có thể đặt câu hỏi, gửi hình ảnh để mình xem nội dung, hoặc tạo ảnh minh họa ở khung bên phải.",
      meta: "Trợ lý ZenTask",
    },
  ]);
  const [input, setInput] = useState("");
  const [selectedImages, setSelectedImages] = useState<LocalImage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState("Chưa kiểm tra kết nối");
  const [chatModel] = useState("gemini-2.5-flash");
  const [temperature, setTemperature] = useState(0.7);
  const [imagePrompt, setImagePrompt] = useState("Một góc học tập gọn gàng, ánh sáng dịu, phong cách hiện đại, màu xanh nhẹ nhàng");
  const [negativePrompt, setNegativePrompt] = useState("mờ, méo hình, nhiều chữ, watermark");
  const [imageModel] = useState("black-forest-labs/FLUX.1-dev");
  const [imageProvider] = useState("auto");
  const [imageSize, setImageSize] = useState("1024x1024");
  const [generatedImage, setGeneratedImage] = useState("");
  const [generatedEnglishPrompt, setGeneratedEnglishPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const createdImageUrlsRef = useRef<string[]>([]);

  const canSend = input.trim().length > 0 || selectedImages.length > 0;

  const imageFiles = useMemo(() => selectedImages.map((image) => image.file), [selectedImages]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  useEffect(() => {
    return () => {
      createdImageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      createdImageUrlsRef.current = [];
    };
  }, []);

  async function handleHealthCheck() {
    try {
      setStatus("Đang kiểm tra kết nối...");
      const data = await checkAIBackend();
      setStatus(
        `Trò chuyện: ${data?.gemini?.configured ? "sẵn sàng" : "chưa sẵn sàng"} • Tạo ảnh: ${
          data?.huggingFace?.configured ? "sẵn sàng" : "chưa sẵn sàng"
        }`,
      );
    } catch (error: any) {
      setStatus(`Không thể kết nối lúc này: ${error?.message || error}`);
    }
  }

  function handlePickImages(files: FileList | null) {
    if (!files?.length) return;

    const next = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 6 - selectedImages.length)
      .map((file) => {
        const url = URL.createObjectURL(file);
        createdImageUrlsRef.current.push(url);
        return { file, url };
      });

    setSelectedImages((current) => [...current, ...next].slice(0, 6));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setSelectedImages((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function handleSend() {
    if (!canSend || isSending) return;

    const text = input.trim() || "Hãy giúp mình xem nội dung trong những hình ảnh này.";
    const previews = selectedImages.map((image) => image.url);
    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      images: previews,
    };

    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setSelectedImages([]);
    setIsSending(true);

    try {
      const result = await chatWithGemini({
        messages: toPayload(history),
        images: imageFiles,
        model: chatModel,
        temperature,
        maxOutputTokens: 4096,
      });

      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          content: result.reply,
          meta: "Trợ lý ZenTask",
        },
      ]);
    } catch (error: any) {
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          content: `Mình chưa thể trả lời yêu cầu này. Vui lòng thử lại sau.\n\n**Chi tiết:** ${error?.message || error}`,
          meta: "Trợ lý ZenTask",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function handleGenerateImage() {
    if (!imagePrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setGeneratedImage("");
    setGeneratedEnglishPrompt("");

    const [width, height] = imageSize.split("x").map((item) => Number(item));

    try {
      const result = await generateImageWithHuggingFace({
        prompt: imagePrompt.trim(),
        negativePrompt: negativePrompt.trim(),
        model: imageModel.trim(),
        provider: imageProvider.trim() || "auto",
        width,
        height,
        steps: 28,
        guidanceScale: 7,
      });

      setGeneratedImage(result.image);
      setGeneratedEnglishPrompt(result.translatedPrompt || imagePrompt.trim());
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          content:
            `Mình đã tạo xong ảnh minh họa theo mô tả của bạn.

` +
            `**Mô tả đã dùng:** ${result.translatedPrompt || imagePrompt.trim()}`,
          generatedImage: result.image,
          meta: result.translated ? "Đã tự chuyển mô tả sang tiếng Anh" : "Ảnh minh họa mới",
        },
      ]);
    } catch (error: any) {
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          content: `Mình chưa tạo được ảnh ở lần này. Vui lòng thử lại với mô tả ngắn gọn hơn hoặc đợi một chút rồi thử lại.\n\n**Chi tiết:** ${error?.message || error}`,
          meta: "Ảnh minh họa",
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  }

  function clearChat() {
    for (const message of messages) {
      for (const imageUrl of message.images || []) {
        URL.revokeObjectURL(imageUrl);
        createdImageUrlsRef.current = createdImageUrlsRef.current.filter((url) => url !== imageUrl);
      }
    }
    setMessages([
      {
        id: uid(),
        role: "assistant",
        content: "Mình đã dọn cuộc trò chuyện cũ. Bạn có thể bắt đầu câu hỏi mới hoặc gửi ảnh để mình hỗ trợ.",
        meta: "Cuộc trò chuyện mới",
      },
    ]);
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-xl md:p-8">
        <div className="absolute right-8 top-8 opacity-20">
          <Bot className="h-32 w-32" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-sm font-semibold">
            <Sparkles className="h-4 w-4" /> Không gian hỗ trợ học tập
          </div>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight md:text-4xl">Trò chuyện cùng AI cho ZenTask</h1>
          <p className="leading-relaxed text-blue-50">
            Hỏi bài, sửa câu tiếng Anh, nhờ AI xem nội dung trong ảnh hoặc tạo ảnh minh họa nhanh ngay trong cùng một nơi.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="flex min-h-[680px] flex-col overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                <MessageCircle className="h-5 w-5 text-blue-600" /> Trò chuyện cùng trợ lý AI
              </h2>
              <p className="mt-1 text-sm text-gray-500">Nhập câu hỏi hoặc gửi ảnh để nhận hỗ trợ.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleHealthCheck} className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100">
                <RefreshCcw className="h-4 w-4" /> Kiểm tra kết nối
              </button>
              <button onClick={clearChat} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100">
                <Trash2 className="h-4 w-4" /> Làm mới cuộc trò chuyện
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-gray-100 bg-slate-50 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-xs font-medium text-gray-600 md:text-sm">{status}</div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-500">
                Cách trả lời
                <select
                  value={String(temperature)}
                  onChange={(event) => setTemperature(Number(event.target.value))}
                  className="bg-transparent font-semibold text-gray-800 outline-none"
                >
                  {replyStyles.map((item) => (
                    <option key={item.label} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto bg-[#F8FAFF] p-4 md:p-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-3xl px-5 py-4 shadow-sm md:max-w-[78%] ${message.role === "user" ? "bg-blue-600 text-white" : "border border-gray-100 bg-white text-gray-800"}`}>
                  <div className="text-sm md:text-base">{renderMessageContent(message.content)}</div>
                  {!!message.images?.length && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {message.images.map((src, index) => (
                        <img key={`${src}_${index}`} src={src} alt="uploaded" className="max-h-48 rounded-2xl border border-white/20 object-cover" />
                      ))}
                    </div>
                  )}
                  {message.generatedImage && (
                    <div className="mt-3">
                      <img src={message.generatedImage} alt="generated" className="max-h-[420px] rounded-2xl border border-gray-100 bg-gray-50 object-contain" />
                      <button
                        onClick={() => downloadDataUrl(message.generatedImage!, "zentask-ai-image.png")}
                        className="mt-3 rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-gray-800"
                      >
                        Tải ảnh
                      </button>
                    </div>
                  )}
                  {message.meta && <div className={`mt-2 text-[11px] ${message.role === "user" ? "text-blue-100" : "text-gray-400"}`}>{message.meta}</div>}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3 rounded-3xl border border-gray-100 bg-white px-5 py-4 text-gray-600 shadow-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> Trợ lý đang trả lời...
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <div className="border-t border-gray-100 bg-white p-4 md:p-5">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button key={prompt} onClick={() => setInput(prompt)} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100">
                  {prompt}
                </button>
              ))}
            </div>

            {!!selectedImages.length && (
              <div className="mb-3 flex flex-wrap gap-3">
                {selectedImages.map((image, index) => (
                  <div key={image.url} className="group relative">
                    <img src={image.url} alt={image.file.name} className="h-20 w-20 rounded-2xl border border-gray-200 object-cover" />
                    <button onClick={() => removeImage(index)} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-3">
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => handlePickImages(event.target.files)} />
              <button onClick={() => fileInputRef.current?.click()} className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200" title="Thêm hình ảnh">
                <Paperclip className="h-5 w-5" />
              </button>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Nhập câu hỏi cho trợ lý... Shift + Enter để xuống dòng"
                className="min-h-[52px] max-h-36 flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={() => void handleSend()}
                disabled={!canSend || isSending}
                className="flex h-12 flex-shrink-0 items-center gap-2 rounded-2xl bg-blue-600 px-5 font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                <span className="hidden md:inline">Gửi</span>
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Tạo ảnh minh họa</h2>
                <p className="text-sm text-gray-500">Nhập mô tả để tạo ảnh mới</p>
              </div>
            </div>

            <label className="mb-2 block text-sm font-bold text-gray-700">Mô tả ảnh</label>
            <p className="mb-2 text-xs leading-relaxed text-gray-500">Bạn có thể nhập tiếng Việt. ZenTask sẽ tự chuyển mô tả sang tiếng Anh trước khi tạo ảnh.</p>
            <textarea
              value={imagePrompt}
              onChange={(event) => setImagePrompt(event.target.value)}
              className="h-28 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              placeholder="Ví dụ: Một lớp học vui nhộn với nhiều màu sắc..."
            />

            <label className="mb-2 mt-4 block text-sm font-bold text-gray-700">Điều bạn không muốn xuất hiện</label>
            <input
              value={negativePrompt}
              onChange={(event) => setNegativePrompt(event.target.value)}
              className="h-11 w-full rounded-2xl border border-gray-200 px-4 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              placeholder="Ví dụ: mờ, thiếu chi tiết, có chữ..."
            />

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">Kích thước</label>
                <select value={imageSize} onChange={(event) => setImageSize(event.target.value)} className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm focus:outline-none">
                  <option value="1024x1024">Vuông 1024</option>
                  <option value="768x1024">Dọc 3:4</option>
                  <option value="1024x768">Ngang 4:3</option>
                  <option value="720x1280">Story 9:16</option>
                </select>
              </div>
              <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/60 px-4 py-3 text-xs leading-relaxed text-purple-700">
                Ảnh sẽ được tạo tự động theo chế độ phù hợp nhất để bạn sử dụng nhanh và dễ dàng.
              </div>
            </div>

            <button
              onClick={() => void handleGenerateImage()}
              disabled={isGenerating || !imagePrompt.trim()}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 font-bold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
              Tạo ảnh
            </button>

            {generatedImage && (
              <div className="mt-5">
                <img src={generatedImage} alt="AI generated" className="w-full rounded-3xl border border-gray-100 bg-gray-50 object-contain" />
                {generatedEnglishPrompt && (
                  <div className="mt-3 rounded-2xl bg-purple-50 px-4 py-3 text-xs leading-relaxed text-purple-800">
                    <span className="font-bold">Mô tả tiếng Anh đã dùng:</span> {generatedEnglishPrompt}
                  </div>
                )}
                <button onClick={() => downloadDataUrl(generatedImage, "zentask-ai-image.png")} className="mt-3 h-10 w-full rounded-xl bg-gray-900 text-sm font-bold text-white transition-colors hover:bg-gray-800">
                  Tải ảnh PNG
                </button>
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-blue-100 bg-blue-50 p-5 text-blue-900">
            <h3 className="mb-3 flex items-center gap-2 font-bold">
              <Lightbulb className="h-4 w-4" /> Mẹo sử dụng
            </h3>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-blue-800/80">
              <li>Bạn có thể gửi ảnh để nhờ AI mô tả, giải thích hoặc đọc nội dung.</li>
              <li>Nếu câu trả lời có dấu ** **, phần chữ bên trong sẽ được làm nổi bật để dễ đọc hơn.</li>
              <li>Muốn tạo ảnh đẹp hơn, hãy mô tả rõ bối cảnh, nhân vật, màu sắc và góc chụp.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default AIChat;
