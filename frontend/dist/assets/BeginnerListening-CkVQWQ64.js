import { j as e } from "./vendor-motion-BTaEx_Rb.js";
import { a as i, Y as E, bd as P, L as $, be as I, a4 as G, bf as W, p as V, av as z } from "./vendor-lucide-BqADmq3J.js";
import { c as D, B as h, e as F, t as f } from "./index-BQKHEK1h.js";
import "./vendor-recharts-Tk3AVDoD.js";
const S = [
    { id: 1, speaker: "School librarian", text: "Hello, what's your name?", voice: "en-US-SteffanNeural" },
    { id: 2, speaker: "Lucy", text: "My name's Lucy.", voice: "en-GB-SoniaNeural" },
    { id: 3, speaker: "School librarian", text: "And what's your surname, Lucy?", voice: "en-US-SteffanNeural" },
    { id: 4, speaker: "Lucy", text: "It's Moore.", voice: "en-GB-SoniaNeural" },
    { id: 5, speaker: "School librarian", text: "Can you spell that?", voice: "en-US-SteffanNeural" },
    { id: 6, speaker: "Lucy", text: "M-O-O-R-E.", voice: "en-GB-SoniaNeural" },
    { id: 7, speaker: "School librarian", text: "Thank you. What class are you in?", voice: "en-US-SteffanNeural" },
    { id: 8, speaker: "Lucy", text: "Class 1B.", voice: "en-GB-SoniaNeural" },
  ],
  m = [
    { id: 1, question: "What is the girl's name?", options: ["Lily", "Lucy", "Linda"], correctAnswer: "Lucy", explanation: "Cô gái trả lời: 'My name's Lucy'." },
    { id: 2, question: "What is her surname?", options: ["More", "Moore", "Moor"], correctAnswer: "Moore", explanation: "Họ của cô ấy là Moore (đánh vần là M-O-O-R-E)." },
    { id: 3, question: "What class is she in?", options: ["1A", "1B", "1C"], correctAnswer: "1B", explanation: "Cô gái nói: 'Class 1B'." },
  ],
  C = (b) => {
    const s = Math.floor(b / 60),
      a = Math.floor(b % 60);
    return `${s}:${a < 10 ? "0" : ""}${a}`;
  };
function Y() {
  const b = D(),
    s = i.useRef(null),
    [a, k] = i.useState(null),
    [d, w] = i.useState(!0),
    [g, j] = i.useState(!1),
    [N, L] = i.useState(0),
    [u, A] = i.useState(0),
    [p, B] = i.useState({}),
    [o, T] = i.useState(!1);
  i.useEffect(
    () => (
      (async () => {
        w(!0);
        try {
          const r = S.map(async (l) => {
              const v = await fetch(`https://python.zentask.io.vn/edge-tts-stream?text=${encodeURIComponent(l.text)}&voice=${encodeURIComponent(l.voice)}`);
              if (!v.ok) throw new Error("Audio fetch failed");
              return await v.blob();
            }),
            n = await Promise.all(r),
            x = new Blob(n, { type: "audio/mpeg" }),
            c = URL.createObjectURL(x);
          (k(c), s.current && s.current.load());
        } catch (r) {
          (console.error(r), f.error("Không thể tải audio."));
        } finally {
          w(!1);
        }
      })(),
      () => {
        a && URL.revokeObjectURL(a);
      }
    ),
    [],
  );
  const R = () => {
      !s.current || !a || (g ? s.current.pause() : s.current.play(), j(!g));
    },
    y = (t) => {
      !s.current || !a || (s.current.currentTime = Math.max(0, Math.min(s.current.currentTime + t, u)));
    },
    M = (t) => {
      if (!s.current || !a) return;
      const r = t.currentTarget.getBoundingClientRect(),
        n = (t.clientX - r.left) / r.width;
      s.current.currentTime = n * u;
    },
    U = (t, r) => {
      o || B((n) => ({ ...n, [t]: r }));
    },
    O = () => {
      if (Object.keys(p).length < m.length) {
        f.error("Vui lòng trả lời hết tất cả câu hỏi trước khi nộp!");
        return;
      }
      T(!0);
      const t = m.filter((r) => r.correctAnswer === p[r.id]).length;
      t === m.length ? f.success("Tuyệt vời! Bạn đã trả lời đúng tất cả.") : f.info(`Bạn trả lời đúng ${t}/${m.length} câu.`);
    };
  return e.jsxs("div", {
    className: "w-full max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500",
    children: [
      e.jsxs(h, {
        onClick: () => b("/beginner/skills"),
        className: "inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 bg-transparent shadow-none hover:bg-slate-100 border-none",
        children: [e.jsx(E, { className: "w-5 h-5" }), " Quay lại"],
      }),
      e.jsxs("div", {
        className: "bg-white rounded-3xl p-8 border-2 border-indigo-100 shadow-xl w-full",
        children: [
          e.jsx("h1", { className: "text-3xl font-black text-slate-800 mb-2", children: "Bài luyện nghe: Daily Life" }),
          e.jsx("p", { className: "text-slate-500 mb-8", children: "Chủ đề: Tại thư viện trường. Lắng nghe và trả lời câu hỏi bên dưới." }),
          e.jsxs("div", {
            className: "bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-8",
            children: [
              e.jsx("audio", { ref: s, src: a || "", onTimeUpdate: (t) => L(t.currentTarget.currentTime), onLoadedMetadata: (t) => A(t.currentTarget.duration), onEnded: () => j(!1) }),
              e.jsxs("div", {
                className: "flex flex-col md:flex-row items-center gap-6",
                children: [
                  e.jsxs("div", {
                    className: "flex items-center gap-4",
                    children: [
                      e.jsx(h, {
                        disabled: d,
                        onClick: () => y(-5),
                        className: "w-12 h-12 rounded-full bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-all disabled:opacity-50",
                        children: e.jsx(P, { className: "w-5 h-5" }),
                      }),
                      e.jsx(h, {
                        disabled: d,
                        onClick: R,
                        className: "w-16 h-16 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl flex items-center justify-center transition-all disabled:opacity-50",
                        children: d ? e.jsx($, { className: "w-6 h-6 animate-spin" }) : g ? e.jsx(I, { className: "w-6 h-6" }) : e.jsx(G, { className: "w-6 h-6 ml-1" }),
                      }),
                      e.jsx(h, {
                        disabled: d,
                        onClick: () => y(5),
                        className: "w-12 h-12 rounded-full bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-all disabled:opacity-50",
                        children: e.jsx(W, { className: "w-5 h-5" }),
                      }),
                    ],
                  }),
                  e.jsxs("div", {
                    className: "flex-1 w-full flex flex-col gap-2",
                    children: [
                      e.jsx("div", {
                        className: "w-full h-3 bg-slate-200 rounded-full cursor-pointer overflow-hidden",
                        onClick: M,
                        children: e.jsx("div", { className: "h-full bg-indigo-500 transition-all duration-100 ease-linear", style: { width: `${u > 0 ? (N / u) * 100 : 0}%` } }),
                      }),
                      e.jsxs("div", { className: "flex justify-between text-xs font-bold text-slate-400", children: [e.jsx("span", { children: C(N) }), e.jsx("span", { children: C(u) })] }),
                    ],
                  }),
                ],
              }),
              d && e.jsx("p", { className: "text-center text-sm font-bold text-indigo-500 mt-4 animate-pulse", children: "Đang tải audio từ server (Streaming)... Vui lòng đợi." }),
            ],
          }),
          e.jsxs("div", {
            className: "mb-10",
            children: [
              e.jsx("h2", { className: "text-xl font-bold text-slate-800 mb-4", children: "Nội dung (Transcript)" }),
              e.jsx("div", {
                className: "bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50 space-y-3 max-h-60 overflow-y-auto custom-scrollbar",
                children: S.map((t) =>
                  e.jsxs(
                    "div",
                    {
                      className: "flex gap-3",
                      children: [
                        e.jsxs("span", { className: "font-bold text-indigo-900 whitespace-nowrap", children: [t.speaker, ":"] }),
                        e.jsx("span", { className: "text-slate-700", children: t.text }),
                      ],
                    },
                    t.id,
                  ),
                ),
              }),
            ],
          }),
          e.jsxs("div", {
            children: [
              e.jsx("h2", { className: "text-xl font-bold text-slate-800 mb-6", children: "Câu hỏi trắc nghiệm" }),
              e.jsx("div", {
                className: "space-y-8",
                children: m.map((t, r) =>
                  e.jsxs(
                    "div",
                    {
                      className: "bg-slate-50 rounded-2xl p-6 border border-slate-200",
                      children: [
                        e.jsxs("h3", { className: "font-bold text-lg text-slate-800 mb-4", children: ["Câu ", r + 1, ": ", t.question] }),
                        e.jsx("div", {
                          className: "space-y-3",
                          children: t.options.map((n) => {
                            const x = p[t.id] === n,
                              c = t.correctAnswer === n;
                            let l = "border-slate-200 bg-white hover:border-indigo-300";
                            return (
                              o
                                ? c
                                  ? (l = "border-green-500 bg-green-50 text-green-700 font-bold")
                                  : x && !c && (l = "border-red-500 bg-red-50 text-red-700")
                                : x && (l = "border-indigo-500 bg-indigo-50 text-indigo-700 font-bold"),
                              e.jsxs(
                                "div",
                                {
                                  onClick: () => U(t.id, n),
                                  className: F("p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between", l),
                                  children: [
                                    e.jsx("span", { children: n }),
                                    o && c && e.jsx(V, { className: "w-5 h-5 text-green-600" }),
                                    o && x && !c && e.jsx(z, { className: "w-5 h-5 text-red-600" }),
                                  ],
                                },
                                n,
                              )
                            );
                          }),
                        }),
                        o &&
                          e.jsxs("div", {
                            className: "mt-4 p-4 bg-indigo-50 text-indigo-900 text-sm rounded-xl border border-indigo-100",
                            children: [e.jsx("span", { className: "font-bold", children: "Giải thích: " }), t.explanation],
                          }),
                      ],
                    },
                    t.id,
                  ),
                ),
              }),
              !o && e.jsx(h, { onClick: O, className: "w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg text-lg", children: "Kiểm tra đáp án" }),
            ],
          }),
        ],
      }),
    ],
  });
}
export { Y as BeginnerListening };
