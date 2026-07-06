import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2 } from "lucide-react";

type ThemeColors = {
  bg: string;
  text: string;
  lightBg: string;
  colorName: string;
};

const THEMES: Record<string, ThemeColors> = {
  purple: { bg: "bg-purple-500", text: "text-purple-600", lightBg: "bg-purple-50", colorName: "purple" },
  indigo: { bg: "bg-indigo-500", text: "text-indigo-600", lightBg: "bg-indigo-50", colorName: "indigo" },
  blue: { bg: "bg-blue-500", text: "text-blue-600", lightBg: "bg-blue-50", colorName: "blue" },
  teal: { bg: "bg-teal-500", text: "text-teal-600", lightBg: "bg-teal-50", colorName: "teal" },
  emerald: { bg: "bg-emerald-500", text: "text-emerald-600", lightBg: "bg-emerald-50", colorName: "emerald" },
  green: { bg: "bg-green-500", text: "text-green-600", lightBg: "bg-green-50", colorName: "green" },
  orange: { bg: "bg-orange-500", text: "text-orange-600", lightBg: "bg-orange-50", colorName: "orange" },
  red: { bg: "bg-red-500", text: "text-red-600", lightBg: "bg-red-50", colorName: "red" },
};

type Tense = {
  id: string;
  name: string;
  position: number;
  shortDef: string;
  theme: string;
  formulas: { affirmative: string; negative: string; interrogative: string };
  example: { en: string; vi: string };
  graphicType: string;
};

const TENSES: Tense[] = [
  {
    id: "past-perfect",
    name: "Quá khứ hoàn thành",
    position: 10,
    shortDef: "Xảy ra trước một hành động khác trong quá khứ",
    theme: "purple",
    formulas: {
      affirmative: "S + had + V3/ed",
      negative: "S + had + not + V3/ed",
      interrogative: "Had + S + V3/ed?",
    },
    example: { en: "By the time he arrived, I had left.", vi: "Vào lúc anh ấy đến, tôi đã rời đi rồi." },
    graphicType: "past-perfect",
  },
  {
    id: "past-continuous",
    name: "Quá khứ tiếp diễn",
    position: 25,
    shortDef: "Đang xảy ra tại một thời điểm cụ thể trong quá khứ",
    theme: "indigo",
    formulas: {
      affirmative: "S + was/were + V-ing",
      negative: "S + was/were + not + V-ing",
      interrogative: "Was/Were + S + V-ing?",
    },
    example: { en: "I was watching TV at 8 PM yesterday.", vi: "Tôi đang xem TV lúc 8 giờ tối hôm qua." },
    graphicType: "past-continuous",
  },
  {
    id: "past-simple",
    name: "Quá khứ đơn",
    position: 38,
    shortDef: "Đã xảy ra và chấm dứt hoàn toàn trong quá khứ",
    theme: "blue",
    formulas: {
      affirmative: "S + V2/ed",
      negative: "S + did + not + V(nguyên thể)",
      interrogative: "Did + S + V(nguyên thể)?",
    },
    example: { en: "I visited my grandparents last weekend.", vi: "Tôi đã thăm ông bà vào cuối tuần trước." },
    graphicType: "past-simple",
  },
  {
    id: "present-perfect",
    name: "Hiện tại hoàn thành",
    position: 45,
    shortDef: "Bắt đầu ở quá khứ và kéo dài đến hiện tại",
    theme: "teal",
    formulas: {
      affirmative: "S + have/has + V3/ed",
      negative: "S + have/has + not + V3/ed",
      interrogative: "Have/Has + S + V3/ed?",
    },
    example: { en: "I have lived here for 5 years.", vi: "Tôi đã sống ở đây được 5 năm." },
    graphicType: "present-perfect",
  },
  {
    id: "present-simple",
    name: "Hiện tại đơn",
    position: 50,
    shortDef: "Sự thật hiển nhiên, thói quen hiện tại",
    theme: "emerald",
    formulas: {
      affirmative: "S + V(s/es)",
      negative: "S + do/does + not + V(nguyên thể)",
      interrogative: "Do/Does + S + V(nguyên thể)?",
    },
    example: { en: "The sun rises in the east.", vi: "Mặt trời mọc ở hướng đông." },
    graphicType: "present-simple",
  },
  {
    id: "present-continuous",
    name: "Hiện tại tiếp diễn",
    position: 55,
    shortDef: "Đang xảy ra ngay lúc nói",
    theme: "green",
    formulas: {
      affirmative: "S + am/is/are + V-ing",
      negative: "S + am/is/are + not + V-ing",
      interrogative: "Am/Is/Are + S + V-ing?",
    },
    example: { en: "I am studying English right now.", vi: "Tôi đang học tiếng Anh ngay bây giờ." },
    graphicType: "present-continuous",
  },
  {
    id: "future-simple",
    name: "Tương lai đơn",
    position: 70,
    shortDef: "Quyết định tại thời điểm nói, dự đoán",
    theme: "orange",
    formulas: {
      affirmative: "S + will + V(nguyên thể)",
      negative: "S + will + not + V(nguyên thể)",
      interrogative: "Will + S + V(nguyên thể)?",
    },
    example: { en: "I think it will rain tomorrow.", vi: "Tôi nghĩ ngày mai trời sẽ mưa." },
    graphicType: "future-simple",
  },
  {
    id: "future-perfect",
    name: "Tương lai hoàn thành",
    position: 88,
    shortDef: "Sẽ hoàn thành trước một thời điểm trong tương lai",
    theme: "red",
    formulas: {
      affirmative: "S + will + have + V3/ed",
      negative: "S + will + not + have + V3/ed",
      interrogative: "Will + S + have + V3/ed?",
    },
    example: { en: "I will have finished the report by 8 PM.", vi: "Tôi sẽ hoàn thành báo cáo trước 8 giờ tối." },
    graphicType: "future-perfect",
  },
];

function MiniGraphic({ type, theme }: { type: string; theme: ThemeColors }) {
  // Common tailwind color for SVG strokes based on theme
  const strokeColors: Record<string, string> = {
    purple: "#a855f7",
    indigo: "#6366f1",
    blue: "#3b82f6",
    teal: "#14b8a6",
    emerald: "#10b981",
    green: "#22c55e",
    orange: "#f97316",
    red: "#ef4444",
  };
  const strokeColor = strokeColors[theme.colorName];

  return (
    <div className="relative w-full h-16 flex items-center">
      {/* Background timeline */}
      <div className="absolute w-full h-0.5 bg-gray-300" />
      
      {/* Center dot (Now) */}
      <div className="absolute left-1/2 w-0.5 h-6 bg-gray-400 -translate-x-1/2" />
      <span className="absolute left-1/2 top-8 -translate-x-1/2 text-[9px] font-bold text-gray-400">NOW</span>

      {type === "past-simple" && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`absolute left-1/4 w-4 h-4 rounded-full ${theme.bg} -translate-y-1/2 shadow-md`} />
      )}
      
      {type === "past-perfect" && (
        <>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`absolute left-[10%] w-4 h-4 rounded-full ${theme.bg} -translate-y-1/2 z-10 shadow-md`} />
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`absolute left-[30%] w-3 h-3 rounded-full bg-gray-400 -translate-y-1/2 z-10`} />
          <motion.div initial={{ width: 0 }} animate={{ width: "20%" }} className={`absolute left-[10%] h-1 ${theme.bg} -translate-y-1/2`} />
        </>
      )}

      {type === "past-continuous" && (
        <svg className="absolute left-[15%] w-1/4 h-8 -translate-y-1/2 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 20">
          <motion.path 
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8 }}
            d="M0,10 Q12.5,0 25,10 T50,10 T75,10 T100,10" 
            fill="none" 
            stroke={strokeColor} 
            strokeWidth="3" 
            strokeLinecap="round"
          />
        </svg>
      )}

      {type === "present-perfect" && (
        <>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`absolute left-1/4 w-3 h-3 rounded-full bg-gray-400 -translate-y-1/2 z-10`} />
          <motion.div initial={{ width: 0 }} animate={{ width: "25%" }} transition={{ duration: 0.6 }} className={`absolute left-1/4 h-1 ${theme.bg} -translate-y-1/2`} />
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} className={`absolute left-1/2 w-4 h-4 rounded-full ${theme.bg} -translate-x-1/2 -translate-y-1/2 z-10 shadow-md`} />
        </>
      )}

      {type === "present-simple" && (
        <div className="absolute left-[20%] right-[20%] flex justify-between -translate-y-1/2 items-center h-4">
           {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }} className={`w-2.5 h-2.5 rounded-full ${theme.bg}`} />
           ))}
        </div>
      )}

      {type === "present-continuous" && (
        <svg className="absolute left-[37.5%] w-1/4 h-8 -translate-y-1/2 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 20">
          <motion.path 
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8 }}
            d="M0,10 Q12.5,0 25,10 T50,10 T75,10 T100,10" 
            fill="none" 
            stroke={strokeColor} 
            strokeWidth="3" 
            strokeLinecap="round"
          />
        </svg>
      )}

      {type === "future-simple" && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`absolute left-[75%] w-4 h-4 rounded-full ${theme.bg} -translate-y-1/2 shadow-md`} />
      )}

      {type === "future-perfect" && (
        <>
          <motion.div initial={{ width: 0 }} animate={{ width: "35%" }} transition={{ duration: 0.6 }} className={`absolute left-1/2 h-1 ${theme.bg} -translate-y-1/2`} />
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} className={`absolute left-[85%] w-4 h-4 rounded-full ${theme.bg} -translate-y-1/2 z-10 shadow-md`} />
        </>
      )}
    </div>
  );
}

export function Tenses() {
  const [activeTense, setActiveTense] = useState<Tense>(TENSES[4]); // Default to Present Simple
  const activeTheme = THEMES[activeTense.theme];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <img src="/mascot/Lopy (14).png" className="w-16 h-16 object-contain drop-shadow-md" alt="Mascot" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Thì (Tenses)</h1>
          <p className="text-gray-500">Khám phá 12 thì cơ bản qua trục thời gian trực quan.</p>
        </div>
      </div>

      {/* 1. Interactive Timeline */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm overflow-hidden">
        <h3 className="font-bold text-gray-900 text-lg mb-2">Trục thời gian tương tác (Interactive Timeline)</h3>
        <p className="text-gray-500 text-sm mb-12">Click vào các mốc để xem chi tiết từng thì</p>
        
        <div className="relative h-24 w-full flex items-center mb-4">
          {/* Main Axis Line */}
          <div className="absolute left-0 right-0 h-1.5 bg-gray-100 rounded-full" />
          
          {/* Zones Labels */}
          <div className="absolute top-12 left-[15%] text-xs font-bold text-gray-400 tracking-wider">QUÁ KHỨ (PAST)</div>
          <div className="absolute top-12 left-1/2 -translate-x-1/2 text-xs font-bold text-blue-500 tracking-wider">HIỆN TẠI (NOW)</div>
          <div className="absolute top-12 right-[15%] text-xs font-bold text-gray-400 tracking-wider">TƯƠNG LAI (FUTURE)</div>
          
          {/* Present Marker Line */}
          <div className="absolute left-1/2 -translate-x-1/2 h-20 w-0.5 bg-blue-200" />

          {/* Nodes */}
          {TENSES.map((tense) => (
            <div 
              key={tense.id}
              className="absolute top-1/2 -translate-y-1/2 group cursor-pointer"
              style={{ left: `${tense.position}%` }}
              onClick={() => setActiveTense(tense)}
            >
              <div 
                className={`w-5 h-5 rounded-full transition-all duration-300 transform -translate-x-1/2 ${
                  tense.id === activeTense.id 
                    ? `${THEMES[tense.theme].bg} scale-150 ring-4 ring-offset-2 ${THEMES[tense.theme].text.replace('text', 'ring').replace('600', '100')} shadow-lg z-20` 
                    : `bg-white border-2 border-gray-300 hover:border-gray-500 hover:scale-110 z-10`
                }`} 
              />
              
              {/* Tooltip */}
              <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-56 bg-gray-900 text-white text-xs p-3 rounded-xl shadow-xl z-30 text-center">
                <p className="font-bold mb-1 text-sm">{tense.name}</p>
                <p className="text-gray-300">{tense.shortDef}</p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Dynamic Content Panel */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTense.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3 mb-2">
             <div className={`w-3 h-8 rounded-full ${activeTheme.bg}`} />
             <h2 className="text-3xl font-extrabold text-gray-900">{activeTense.name}</h2>
          </div>

          {/* Formula Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:border-green-200 transition-colors">
              <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center font-bold text-lg mb-3">+</div>
              <span className="font-mono text-sm text-gray-800 font-bold tracking-tight">{activeTense.formulas.affirmative}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:border-red-200 transition-colors">
              <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg mb-3">-</div>
              <span className="font-mono text-sm text-gray-800 font-bold tracking-tight">{activeTense.formulas.negative}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:border-blue-200 transition-colors">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-3">?</div>
              <span className="font-mono text-sm text-gray-800 font-bold tracking-tight">{activeTense.formulas.interrogative}</span>
            </div>
          </div>

          {/* Contextual Examples & Mini Graphic */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-8 items-center justify-between">
            <div className="flex-1 max-w-xl">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Ví dụ minh họa</h4>
              <div className="flex items-start gap-4">
                <button className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${activeTheme.lightBg} ${activeTheme.text} hover:${activeTheme.bg} hover:text-white shadow-sm active:scale-95`}>
                  <Volume2 className="w-5 h-5" />
                </button>
                <div>
                  <p className="text-xl md:text-2xl font-bold text-gray-900 mb-2 leading-tight">"{activeTense.example.en}"</p>
                  <p className="text-gray-500 font-medium">{activeTense.example.vi}</p>
                </div>
              </div>
            </div>
            
            <div className="w-full lg:w-1/3 bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col items-center justify-center min-h-[160px]">
              <MiniGraphic type={activeTense.graphicType} theme={activeTheme} />
              <p className="text-xs font-bold text-gray-400 mt-6 text-center">{activeTense.shortDef}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
