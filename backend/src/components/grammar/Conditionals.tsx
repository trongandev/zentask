import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Power, Settings2, Clock, AlertCircle } from "lucide-react";

type ConditionalInfo = {
  type: number;
  tabLabel: string;
  smallLabel: string;
  activeClass: string;
  knobClass: string;
  accentText: string;
  timeLabel: string;
  formula: string;
  factTitle: string;
  ifTitle: string;
  factLine: string;
  factResult: string;
  ifLine: string;
  ifResult: string;
  usage: string;
  examples: Array<{ en: string; vi: string }>;
};

const conditionalData: ConditionalInfo[] = [
  {
    type: 0,
    tabLabel: "Loại 0 (Zero Conditional)",
    smallLabel: "SỰ THẬT HIỂN NHIÊN",
    activeClass: "bg-blue-500 text-white border-blue-600 shadow-md",
    knobClass: "bg-blue-500",
    accentText: "text-blue-400",
    timeLabel: "LUÔN ĐÚNG",
    formula: "If + S + V(s/es), S + V(s/es)",
    factTitle: "SỰ THẬT",
    ifTitle: "QUY LUẬT",
    factLine: "Nước đạt 100°C (Water reaches 100°C)",
    factResult: "Nước sôi. (Water boils.)",
    ifLine: "If water reaches 100°C,",
    ifResult: "it boils.",
    usage: "Dùng cho sự thật hiển nhiên, quy luật tự nhiên, thói quen hoặc điều luôn đúng.",
    examples: [
      { en: "If you heat ice, it melts.", vi: "Nếu bạn làm nóng đá, nó tan." },
      { en: "If people don't drink water, they get thirsty.", vi: "Nếu con người không uống nước, họ sẽ khát." },
    ],
  },
  {
    type: 1,
    tabLabel: "Loại 1 (First Conditional)",
    smallLabel: "CÓ THỂ XẢY RA",
    activeClass: "bg-teal-500 text-white border-teal-600 shadow-md",
    knobClass: "bg-teal-500",
    accentText: "text-teal-400",
    timeLabel: "TƯƠNG LAI",
    formula: "If + S + V(s/es), S + will + V",
    factTitle: "KHẢ NĂNG",
    ifTitle: "KẾ HOẠCH",
    factLine: "Ngày mai có thể mưa. (It may rain tomorrow.)",
    factResult: "Tôi có thể ở nhà.",
    ifLine: "If it rains tomorrow,",
    ifResult: "I will stay at home.",
    usage: "Dùng cho điều có khả năng xảy ra ở hiện tại hoặc tương lai và kết quả có thể xảy ra theo sau.",
    examples: [
      { en: "If I finish my homework, I will watch a movie.", vi: "Nếu tôi làm xong bài tập, tôi sẽ xem phim." },
      { en: "If she studies hard, she will pass the exam.", vi: "Nếu cô ấy học chăm, cô ấy sẽ đậu kỳ thi." },
    ],
  },
  {
    type: 2,
    tabLabel: "Loại 2 (Second Conditional)",
    smallLabel: "KHÔNG CÓ THẬT Ở HIỆN TẠI",
    activeClass: "bg-orange-500 text-white border-orange-600 shadow-md",
    knobClass: "bg-orange-500",
    accentText: "text-orange-400",
    timeLabel: "HIỆN TẠI GIẢ ĐỊNH",
    formula: "If + S + V2/were, S + would + V",
    factTitle: "THỰC TẾ",
    ifTitle: "GIẢ ĐỊNH",
    factLine: "Tôi không có 1 triệu đô. (I don't have a million dollars.)",
    factResult: "Tôi chưa thể đi vòng quanh thế giới.",
    ifLine: "If I had a million dollars,",
    ifResult: "I would travel the world.",
    usage: "Dùng cho điều không có thật, khó xảy ra ở hiện tại hoặc lời khuyên giả định. Với động từ to be, thường dùng were cho mọi ngôi.",
    examples: [
      { en: "If I were you, I would study harder.", vi: "Nếu tôi là bạn, tôi sẽ học chăm hơn." },
      { en: "If he had more time, he would learn English.", vi: "Nếu anh ấy có nhiều thời gian hơn, anh ấy sẽ học tiếng Anh." },
    ],
  },
  {
    type: 3,
    tabLabel: "Loại 3 (Third Conditional)",
    smallLabel: "KHÔNG CÓ THẬT Ở QUÁ KHỨ",
    activeClass: "bg-purple-500 text-white border-purple-600 shadow-md",
    knobClass: "bg-purple-500",
    accentText: "text-purple-400",
    timeLabel: "QUÁ KHỨ GIẢ ĐỊNH",
    formula: "If + S + had + V3, S + would have + V3",
    factTitle: "THỰC TẾ",
    ifTitle: "GIẢ ĐỊNH",
    factLine: "Tôi không học bài. (I didn't study.)",
    factResult: "Tôi đã thi rớt! (I failed!)",
    ifLine: "If I had studied,",
    ifResult: "I would have passed!",
    usage: "Dùng để nói về điều đã không xảy ra trong quá khứ và kết quả tưởng tượng trái với sự thật quá khứ.",
    examples: [
      { en: "If I had left earlier, I would have caught the bus.", vi: "Nếu tôi đi sớm hơn, tôi đã bắt kịp xe buýt." },
      { en: "If she had known the answer, she would have told us.", vi: "Nếu cô ấy biết câu trả lời, cô ấy đã nói với chúng tôi." },
    ],
  },
];

function getButtonIdleClass(type: number) {
  if (type === 0) return "bg-white border-gray-200 hover:border-blue-300";
  if (type === 1) return "bg-white border-gray-200 hover:border-teal-300";
  if (type === 2) return "bg-white border-gray-200 hover:border-orange-300";
  return "bg-white border-gray-200 hover:border-purple-300";
}

export function Conditionals() {
  const [conditionalType, setConditionalType] = useState<number>(3);
  const [isHypothetical, setIsHypothetical] = useState(false);
  const current = conditionalData.find((item) => item.type === conditionalType) || conditionalData[3];

  return (
    <div className="col-span-1 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:col-span-2">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="mb-1 text-lg font-bold text-gray-900">2. Câu điều kiện (Conditionals)</h3>
          <p className="text-sm text-gray-500">Chọn từng loại để xem công thức, tình huống thật và câu giả định.</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex w-full flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 lg:w-1/3">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
            <Settings2 className="h-4 w-4 text-gray-500" /> Bảng chọn loại câu
          </h4>

          {conditionalData.map((item) => (
            <button
              key={item.type}
              onClick={() => {
                setConditionalType(item.type);
                setIsHypothetical(false);
              }}
              className={`rounded-xl border p-3 text-left transition-all ${conditionalType === item.type ? item.activeClass : getButtonIdleClass(item.type)}`}
            >
              <div className="mb-1 text-xs font-bold opacity-80">{item.smallLabel}</div>
              <div className="text-sm font-medium">{item.tabLabel}</div>
            </button>
          ))}
        </div>

        <div className="relative flex-1 overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-900 p-6 text-white shadow-inner">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

          <div className="relative z-10 flex h-full flex-col">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className={`flex items-center gap-2 font-mono text-sm ${current.accentText}`}>
                <Power className="h-4 w-4" />
                <span>ĐANG MÔ PHỎNG</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                <Clock className="h-3.5 w-3.5" />
                {current.timeLabel}
              </div>
            </div>

            <div className="flex-1 space-y-5">
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center font-mono text-sm font-bold text-slate-300">
                <span className={current.accentText}>{current.formula.split(",")[0]}</span>
                {current.formula.includes(",") ? `,${current.formula.split(",").slice(1).join(",")}` : ""}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <span className={`text-sm font-bold ${!isHypothetical ? "text-white" : "text-slate-500"}`}>{current.factTitle}</span>

                  <button
                    onClick={() => setIsHypothetical(!isHypothetical)}
                    className="relative h-7 w-14 rounded-full border border-slate-600 bg-slate-900 transition-colors focus:outline-none"
                    aria-label="Chuyển giữa thực tế và câu If"
                  >
                    <motion.div
                      animate={{ x: isHypothetical ? 28 : 2 }}
                      className={`absolute top-[1.5px] h-6 w-6 rounded-full shadow-md ${isHypothetical ? current.knobClass : "bg-slate-400"}`}
                    />
                  </button>

                  <span className={`text-sm font-bold ${isHypothetical ? current.accentText : "text-slate-500"}`}>{current.ifTitle}</span>
                </div>

                <div className="relative h-28 w-full">
                  <AnimatePresence mode="wait">
                    {!isHypothetical ? (
                      <motion.div
                        key={`${current.type}-fact`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute inset-0 flex flex-col items-center justify-center text-center"
                      >
                        <p className="mb-1 flex items-center gap-1.5 text-slate-400"><AlertCircle className="h-4 w-4" /> {current.factLine}</p>
                        <p className="text-lg font-bold text-red-400">{current.factResult}</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`${current.type}-if`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute inset-0 flex flex-col items-center justify-center text-center"
                      >
                        <p className={`mb-1 text-lg ${current.accentText}`}>{current.ifLine}</p>
                        <p className="text-xl font-bold text-green-400">{current.ifResult}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
                  <div className={`mb-2 text-xs font-bold uppercase tracking-[0.2em] ${current.accentText}`}>Cách dùng</div>
                  <p className="text-sm leading-relaxed text-slate-300">{current.usage}</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
                  <div className={`mb-2 text-xs font-bold uppercase tracking-[0.2em] ${current.accentText}`}>Ví dụ</div>
                  <div className="space-y-2 text-sm">
                    {current.examples.map((example) => (
                      <div key={example.en}>
                        <p className="font-bold text-white">{example.en}</p>
                        <p className="text-slate-400">{example.vi}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
