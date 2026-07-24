import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

export function PassiveVoice() {
  const [isPassive, setIsPassive] = useState(false);

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm col-span-1 md:col-span-2">
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 text-lg mb-1">4. Câu bị động (Passive Voice)</h3>
        <p className="text-gray-500 text-sm">Hoán đổi vị trí khối (Block Swapping Animation)</p>
      </div>

      <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 overflow-hidden relative min-h-[300px] flex flex-col justify-center items-center">
        
        {/* The Blocks Container */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12 h-20 w-full max-w-2xl relative">
          
          {/* Active Voice Layout */}
          {!isPassive && (
             <motion.div 
               layoutId="sentence-container"
               className="flex items-center gap-3 w-full justify-center absolute"
             >
                <motion.div layoutId="subject" className="bg-blue-500 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-md flex flex-col items-center">
                  <span>The dog</span>
                  <span className="text-[10px] bg-blue-700/50 px-2 py-0.5 rounded mt-1 opacity-80 uppercase">Chủ ngữ (S)</span>
                </motion.div>
                
                <motion.div layoutId="verb" className="bg-yellow-500 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-md flex flex-col items-center">
                  <span>ate</span>
                  <span className="text-[10px] bg-yellow-600/50 px-2 py-0.5 rounded mt-1 opacity-80 uppercase">Động từ (V)</span>
                </motion.div>
                
                <motion.div layoutId="object" className="bg-red-500 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-md flex flex-col items-center">
                  <span>the cake</span>
                  <span className="text-[10px] bg-red-700/50 px-2 py-0.5 rounded mt-1 opacity-80 uppercase">Tân ngữ (O)</span>
                </motion.div>
             </motion.div>
          )}

          {/* Passive Voice Layout */}
          {isPassive && (
             <motion.div 
               layoutId="sentence-container"
               className="flex items-center gap-2 sm:gap-3 w-full justify-center absolute flex-wrap"
             >
                <motion.div layoutId="object" className="bg-red-500 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-md flex flex-col items-center">
                  <span>The cake</span>
                  <span className="text-[10px] bg-red-700/50 px-2 py-0.5 rounded mt-1 opacity-80 uppercase">Chủ ngữ mới (S')</span>
                </motion.div>
                
                <div className="flex gap-2">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-yellow-400 text-yellow-900 px-4 py-4 rounded-xl font-bold text-lg shadow-md border-2 border-yellow-500 flex flex-col items-center"
                  >
                    <span>was</span>
                    <span className="text-[10px] bg-yellow-300/50 px-2 py-0.5 rounded mt-1 opacity-80 uppercase">To-be</span>
                  </motion.div>

                  <motion.div layoutId="verb" className="bg-yellow-500 text-white px-4 py-4 rounded-xl font-bold text-lg shadow-md flex flex-col items-center">
                    <span>eaten</span>
                    <span className="text-[10px] bg-yellow-600/50 px-2 py-0.5 rounded mt-1 opacity-80 uppercase">V3/ed</span>
                  </motion.div>
                </div>

                <div className="flex gap-2 items-center">
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-slate-400 font-black text-xl italic"
                  >
                    by
                  </motion.div>

                  <motion.div layoutId="subject" className="bg-blue-500 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-md flex flex-col items-center">
                    <span>the dog</span>
                    <span className="text-[10px] bg-blue-700/50 px-2 py-0.5 rounded mt-1 opacity-80 uppercase">Tân ngữ mới (O')</span>
                  </motion.div>
                </div>
             </motion.div>
          )}

        </div>

        <Button 
          onClick={() => setIsPassive(!isPassive)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"
        >
          <ArrowRightLeft className="w-5 h-5" />
          {isPassive ? "Trở về Chủ động (Active)" : "Chuyển sang Bị động (Passive)"}
        </Button>

      </div>
    </div>
  );
}
