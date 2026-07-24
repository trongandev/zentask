import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTTSAudio } from "../hooks/useTTSAudio";
import { cn } from "../lib/utils";
import { Volume2, Send, Lightbulb, Target, Languages } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

const normalizeAnswer = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "'")
    .replace(/[.,!?;:()\[\]{}"“”]/g, "")
    .replace(/\s+/g, " ");

const escapeRegExp = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getTermParts = (term = "") => String(term).trim().split(/\s+/).filter(Boolean);

const countLetters = (part = "") => String(part).replace(/[^a-zA-Z]/g, "").length || String(part).length;

const getLengthHint = (term = "") => {
  const parts = getTermParts(term);
  if (!parts.length) return "Chưa có dữ liệu độ dài";
  const letters = parts.map(countLetters);
  const wordLabel = parts.length === 1 ? "1 từ" : `${parts.length} từ`;
  const letterLabel = letters.length === 1 ? `${letters[0]} ký tự` : letters.map((len, idx) => `từ ${idx + 1}: ${len} ký tự`).join(" • ");
  return `${wordLabel} • ${letterLabel}`;
};

const buildMaskedTerm = (term = "") => {
  const parts = getTermParts(term);
  return parts.length ? parts.map((part) => "_".repeat(Math.max(1, countLetters(part)))).join(" ") : "____";
};

const renderBlankBoxes = (term = "") => {
  const parts = getTermParts(term);
  if (!parts.length) return null;

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-3" aria-label={`Đáp án gồm ${getLengthHint(term)}`}>
      {parts.map((part, partIndex) => (
        <div key={`${part}-${partIndex}`} className="flex max-w-full flex-wrap items-center justify-center gap-1.5">
          {Array.from({ length: Math.max(1, countLetters(part)) }).map((_, idx) => (
            <span key={idx} className="inline-flex h-10 w-8 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-lg font-black text-white/80 sm:h-11 sm:w-9">
              _
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

const findBestExample = (card: any) => {
  const examples = Array.isArray(card.examples) ? card.examples : [];
  const term = String(card.term || "").trim();
  if (!term) return examples[0] || null;
  return examples.find((example) => new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(example.en || "")) || examples[0] || null;
};

const buildBlankSentence = (card: any) => {
  const term = String(card.term || "").trim();
  const example = findBestExample(card);
  const mask = buildMaskedTerm(term);

  if (example?.en) {
    const escaped = escapeRegExp(term);
    const exactWordRegex = new RegExp(`\\b${escaped}\\b`, "i");
    const looseRegex = new RegExp(escaped, "i");
    const source = example.en;
    if (exactWordRegex.test(source)) {
      return { text: source.replace(exactWordRegex, mask), example };
    }
    if (looseRegex.test(source)) {
      return { text: source.replace(looseRegex, mask), example };
    }
    return { text: `${source}  →  ${mask}`, example };
  }

  return { text: `Hoàn thiện câu bằng từ/cụm từ phù hợp: ${mask}`, example: null };
};

function InfoChip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-bold text-blue-100">
      {icon}
      {children}
    </span>
  );
}

export function ArenaGameRenderer({ mode, card, allCards, isX2, onAnswer, disabled, answerStatus = null }: any) {
  const { playAudio } = useTTSAudio();
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // For Quiz mode
  const options = useMemo(() => {
    if (mode !== "quiz") return [];
    const wrong = allCards
      .filter((c) => c.id !== card.id && c.translation && normalizeAnswer(c.translation) !== normalizeAnswer(card.translation))
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    return [card, ...wrong].sort(() => 0.5 - Math.random());
  }, [card, allCards, mode]);

  useEffect(() => {
    setInputValue("");
    if (!disabled && inputRef.current && mode !== "quiz") {
      inputRef.current.focus();
    }
  }, [card, disabled, mode]);

  // Auto play audio for listening mode
  useEffect(() => {
    if (mode === "listening" && !disabled) {
      playAudio(card.term);
    }
  }, [card, disabled, mode, playAudio]);

  const checkTypedAnswer = () => normalizeAnswer(inputValue) === normalizeAnswer(card.term);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (disabled || !inputValue.trim()) return;
    onAnswer(checkTypedAnswer());
  };

  const renderAnswerFeedback = (kind: "word" | "translation" = "word") => {
    if (!disabled || answerStatus !== false) return null;
    const correctText = kind === "translation" ? card.translation : card.term;

    return (
      <div className="mt-5 w-full rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-4 text-center shadow-[0_0_20px_rgba(16,185,129,0.18)] animate-in fade-in slide-in-from-bottom-2 duration-200">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-200">Đáp án đúng</p>
        <p className="mt-1 break-words text-2xl font-black text-emerald-100">{correctText}</p>
        {kind === "word" && <p className="mt-2 text-sm font-semibold text-emerald-50/80">{card.translation}</p>}
      </div>
    );
  };

  const renderQuiz = () => (
    <div className="w-full flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 sm:p-10 rounded-3xl w-full text-center mb-8 shadow-2xl relative overflow-hidden">
        {isX2 && <div className="absolute top-0 right-0 bg-yellow-500 text-black font-black px-6 py-2 rounded-bl-3xl">X2 ĐIỂM</div>}
        <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-blue-200">Chọn nghĩa đúng</p>
        <h2 className="break-words text-4xl sm:text-5xl font-black text-white mb-3 tracking-wide">{card.term}</h2>
        {card.phonetic && <p className="mb-4 text-lg font-semibold text-white/60">/{card.phonetic}/</p>}
        <Button onClick={() => playAudio(card.term)} className="mx-auto p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
          <Volume2 className="w-6 h-6" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {options.map((opt, idx) => (
          <Button
            key={`${opt.id}-${idx}`}
            disabled={disabled}
            onClick={() => onAnswer(opt.id === card.id)}
            className={cn(
              "p-5 sm:p-6 rounded-2xl border-2 text-lg sm:text-xl font-bold transition-all duration-300 text-white text-left sm:text-center break-words",
              disabled && opt.id === card.id ? "border-emerald-400 bg-emerald-500/25 shadow-[0_0_18px_rgba(16,185,129,0.25)]" : "bg-white/5 border-white/10 hover:bg-white/20",
              disabled && opt.id !== card.id ? "opacity-50" : "",
            )}
          >
            {opt.translation}
          </Button>
        ))}
      </div>
      {renderAnswerFeedback("translation")}
    </div>
  );

  const renderTyping = (promptText: string, subText: string, extra?: React.ReactNode) => (
    <div className="w-full flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 sm:p-12 rounded-3xl w-full text-center mb-8 shadow-2xl relative">
        {isX2 && <div className="absolute top-0 right-0 bg-yellow-500 text-black font-black px-6 py-2 rounded-bl-3xl">X2 ĐIỂM</div>}
        <p className="text-blue-200 text-base sm:text-lg mb-2 uppercase tracking-widest font-bold">{subText}</p>
        <h2 className="break-words text-3xl sm:text-4xl font-black text-white leading-tight">{promptText}</h2>
        {extra}
      </div>
      <form onSubmit={handleSubmit} className="w-full relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={disabled}
          placeholder="Gõ đáp án tiếng Anh vào đây..."
          className="w-full bg-white/10 border-2 border-white/30 rounded-2xl px-6 py-5 pr-16 text-xl font-bold text-white outline-none focus:border-blue-500 focus:bg-white/20 transition-all placeholder:text-white/30"
        />
        <Button
          type="submit"
          disabled={disabled || !inputValue.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
      {renderAnswerFeedback("word")}
    </div>
  );

  const renderListening = () => (
    <div className="w-full flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 sm:p-12 rounded-3xl w-full text-center mb-8 shadow-2xl relative">
        {isX2 && <div className="absolute top-0 right-0 bg-yellow-500 text-black font-black px-6 py-2 rounded-bl-3xl">X2 ĐIỂM</div>}
        <Button onClick={() => playAudio(card.term)} className="mx-auto p-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-[0_0_30px_rgba(37,99,235,0.5)] animate-pulse">
          <Volume2 className="w-12 h-12" />
        </Button>
        <p className="text-blue-200 text-lg mt-6 uppercase tracking-widest font-bold">Nghe và gõ lại từ/cụm từ</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <InfoChip icon={<Target className="h-4 w-4" />}>{getLengthHint(card.term)}</InfoChip>
          {card.translation && <InfoChip icon={<Languages className="h-4 w-4" />}>Nghĩa: {card.translation}</InfoChip>}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="w-full relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={disabled}
          placeholder="Gõ từ bạn nghe được..."
          className="w-full bg-white/10 border-2 border-white/30 rounded-2xl px-6 py-5 pr-16 text-xl font-bold text-white outline-none focus:border-blue-500 focus:bg-white/20 transition-all placeholder:text-white/30"
        />
        <Button
          type="submit"
          disabled={disabled || !inputValue.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
      {renderAnswerFeedback("word")}
    </div>
  );

  const renderFillBlank = () => {
    const { text: blankSentence, example } = buildBlankSentence(card);
    const hintVi = example?.vi || card.notes || "Hãy chọn từ/cụm từ tiếng Anh phù hợp với nghĩa và ngữ cảnh.";

    const extra = (
      <div className="mt-5 space-y-4">
        {renderBlankBoxes(card.term)}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <InfoChip icon={<Target className="h-4 w-4" />}>{getLengthHint(card.term)}</InfoChip>
          {card.translation && <InfoChip icon={<Languages className="h-4 w-4" />}>Nghĩa: {card.translation}</InfoChip>}
        </div>
        <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-left text-sm font-semibold text-amber-50">
          <div className="mb-1 flex items-center gap-2 font-black uppercase tracking-wide text-amber-200">
            <Lightbulb className="h-4 w-4" /> Gợi ý ngữ cảnh
          </div>
          <p className="leading-relaxed">{hintVi}</p>
        </div>
      </div>
    );

    return renderTyping(blankSentence, "Điền từ/cụm từ còn thiếu để hoàn thiện câu", extra);
  };

  const renderTranslateToEnglish = () => {
    const extra = (
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <InfoChip icon={<Target className="h-4 w-4" />}>{getLengthHint(card.term)}</InfoChip>
        {card.phonetic && <InfoChip>Phát âm: /{card.phonetic}/</InfoChip>}
      </div>
    );
    return renderTyping(card.translation, "Dựa vào nghĩa, gõ từ/cụm từ tiếng Anh", extra);
  };

  switch (mode) {
    case "quiz":
      return renderQuiz();
    case "fill_blank":
      return renderFillBlank();
    case "listening":
      return renderListening();
    case "guess":
      return renderTranslateToEnglish();
    case "typing":
      return renderTranslateToEnglish();
    default:
      return renderQuiz();
  }
}
