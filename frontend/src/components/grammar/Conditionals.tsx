import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Power, Settings2, Clock, AlertCircle } from "lucide-react";

export function Conditionals() {
  const [conditionalType, setConditionalType] = useState<number>(3);
  const [isHypothetical, setIsHypothetical] = useState(false);

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm col-span-1 md:col-span-2">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">2. Câu điều kiện (Conditionals)</h3>
          <p className="text-gray-500 text-sm">Bảng mạch Logic & Hộp mô phỏng (Simulation Box)</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Logic Circuit (Simplified) */}
        <div className="w-full lg:w-1/3 bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col gap-3">
          <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2">
            <Settings2 className="w-4 h-4 text-gray-500" /> Bảng mạch Logic
          </h4>
          
          <button 
            onClick={() => setConditionalType(0)}
            className={`text-left p-3 rounded-xl border transition-all ${conditionalType === 0 ? "bg-blue-500 text-white border-blue-600 shadow-md" : "bg-white border-gray-200 hover:border-blue-300"}`}
          >
            <div className="text-xs font-bold opacity-80 mb-1">SỰ THẬT HIỂN NHIÊN</div>
            <div className="font-medium text-sm">Loại 0 (Zero Conditional)</div>
          </button>

          <button 
            onClick={() => setConditionalType(1)}
            className={`text-left p-3 rounded-xl border transition-all ${conditionalType === 1 ? "bg-teal-500 text-white border-teal-600 shadow-md" : "bg-white border-gray-200 hover:border-teal-300"}`}
          >
            <div className="text-xs font-bold opacity-80 mb-1">CÓ THỂ XẢY RA (HIỆN TẠI/TƯƠNG LAI)</div>
            <div className="font-medium text-sm">Loại 1 (First Conditional)</div>
          </button>

          <button 
            onClick={() => setConditionalType(2)}
            className={`text-left p-3 rounded-xl border transition-all ${conditionalType === 2 ? "bg-orange-500 text-white border-orange-600 shadow-md" : "bg-white border-gray-200 hover:border-orange-300"}`}
          >
            <div className="text-xs font-bold opacity-80 mb-1">KHÔNG CÓ THẬT (HIỆN TẠI)</div>
            <div className="font-medium text-sm">Loại 2 (Second Conditional)</div>
          </button>
          
          <button 
            onClick={() => setConditionalType(3)}
            className={`text-left p-3 rounded-xl border transition-all ${conditionalType === 3 ? "bg-purple-500 text-white border-purple-600 shadow-md" : "bg-white border-gray-200 hover:border-purple-300"}`}
          >
            <div className="text-xs font-bold opacity-80 mb-1">KHÔNG CÓ THẬT (QUÁ KHỨ)</div>
            <div className="font-medium text-sm">Loại 3 (Third Conditional)</div>
          </button>
        </div>

        {/* Simulation Box */}
        <div className="flex-1 bg-slate-900 rounded-2xl p-6 border-2 border-slate-800 text-white shadow-inner relative overflow-hidden">
          {/* Background grid effect */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-purple-400 font-mono text-sm">
                <Power className="w-4 h-4" />
                <span>SIMULATION_ACTIVE</span>
              </div>
              <div className="bg-slate-800 px-3 py-1 rounded-lg text-xs font-medium text-slate-300 flex items-center gap-1.5 border border-slate-700">
                <Clock className="w-3.5 h-3.5" />
                {conditionalType === 0 && "BẤT KỲ LÚC NÀO"}
                {conditionalType === 1 && "TƯƠNG LAI"}
                {conditionalType === 2 && "HIỆN TẠI"}
                {conditionalType === 3 && "QUÁ KHỨ"}
              </div>
            </div>

            {conditionalType === 3 && (
              <div className="flex-1 flex flex-col justify-center gap-6">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 font-mono text-sm text-center font-bold text-slate-300">
                  <span className="text-purple-400">If</span> + S + had + V3, S + <span className="text-purple-400">would have</span> + V3
                </div>

                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col items-center">
                  <div className="flex items-center justify-between w-full mb-6">
                    <span className={`text-sm font-bold ${!isHypothetical ? "text-white" : "text-slate-500"}`}>THỰC TẾ (FACT)</span>
                    
                    {/* Toggle Switch */}
                    <button 
                      onClick={() => setIsHypothetical(!isHypothetical)}
                      className="w-14 h-7 bg-slate-900 rounded-full relative border border-slate-600 transition-colors focus:outline-none"
                    >
                      <motion.div 
                        animate={{ x: isHypothetical ? 28 : 2 }} 
                        className={`absolute top-[1.5px] w-6 h-6 rounded-full shadow-md ${isHypothetical ? "bg-purple-500" : "bg-slate-400"}`}
                      />
                    </button>
                    
                    <span className={`text-sm font-bold ${isHypothetical ? "text-purple-400" : "text-slate-500"}`}>GIẢ ĐỊNH (IF)</span>
                  </div>

                  <div className="h-24 w-full relative">
                    <AnimatePresence mode="wait">
                      {!isHypothetical ? (
                        <motion.div 
                          key="fact"
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                          className="absolute inset-0 flex flex-col items-center justify-center text-center"
                        >
                          <p className="text-slate-400 mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4"/> Tôi không học bài (I didn't study)</p>
                          <p className="text-red-400 font-bold text-lg">Tôi đã thi rớt! (I failed!)</p>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="hypo"
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                          className="absolute inset-0 flex flex-col items-center justify-center text-center"
                        >
                          <p className="text-purple-300 mb-1 text-lg">If I <span className="font-bold text-white">had studied</span>,</p>
                          <p className="text-green-400 font-bold text-xl">I <span className="font-bold text-white">would have passed</span>!</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
            
            {/* Show simple messages for others since instructions focused on Type 3 */}
            {conditionalType !== 3 && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
                <Settings2 className="w-8 h-8 mb-3 opacity-50" />
                <p>Hãy chọn "Loại 3" để xem mô phỏng Cỗ máy thời gian.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
