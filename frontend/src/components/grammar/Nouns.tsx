import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus, GlassWater, Apple, Droplets, Banknote, Coffee, Droplet } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

type WordType = {
  id: string;
  word: string;
  isCountable: boolean;
  icon: any;
  color: string;
};

const WORDS: WordType[] = [
  { id: "1", word: "Apple", isCountable: true, icon: Apple, color: "text-red-500 bg-red-50" },
  { id: "2", word: "Water", isCountable: false, icon: Droplets, color: "text-blue-500 bg-blue-50" },
  { id: "3", word: "Money", isCountable: false, icon: Banknote, color: "text-green-500 bg-green-50" },
  { id: "4", word: "Coffee", isCountable: false, icon: Coffee, color: "text-amber-600 bg-amber-50" },
];

export function Nouns() {
  const [selectedWord, setSelectedWord] = useState<WordType | null>(null);
  const [count, setCount] = useState(1);
  const [container, setContainer] = useState<string | null>(null);

  const handleSelectWord = (word: WordType) => {
    setSelectedWord(word);
    setCount(1);
    setContainer(null);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm col-span-1 md:col-span-2">
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 text-lg mb-1">3. Danh từ Đếm được & Không đếm được</h3>
        <p className="text-gray-500 text-sm">Bộ lọc Cân bằng & Giỏ hàng (Interactive Baskets)</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        {/* Words Tray */}
        <div className="w-full md:w-1/3 bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col">
          <h4 className="text-sm font-bold text-gray-700 mb-3 text-center">Khay Từ Vựng</h4>
          <div className="grid grid-cols-2 gap-2">
            {WORDS.map(w => {
              const Icon = w.icon;
              return (
                <Button 
                  key={w.id}
                  onClick={() => handleSelectWord(w)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                    selectedWord?.id === w.id ? "bg-white border-blue-400 shadow-md ring-2 ring-blue-100" : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${w.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-gray-800">{w.word}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Processing Area */}
        <div className="flex-1 bg-white rounded-2xl p-6 border-2 border-dashed border-gray-200 min-h-[300px] flex flex-col items-center justify-center relative">
          <AnimatePresence mode="wait">
            {!selectedWord ? (
              <motion.div key="empty" className="text-gray-400 font-medium text-sm flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                  <Apple className="w-6 h-6 opacity-50" />
                </div>
                Chọn một từ vựng để bắt đầu
              </motion.div>
            ) : (
              <motion.div 
                key="active"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full flex flex-col items-center"
              >
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold mb-6 border ${selectedWord.isCountable ? "bg-green-50 text-green-700 border-green-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                  {selectedWord.isCountable ? "ĐẾM ĐƯỢC (COUNTABLE)" : "KHÔNG ĐẾM ĐƯỢC (UNCOUNTABLE)"}
                </div>
                
                {/* Visualizer */}
                <div className="h-32 mb-6 flex items-center justify-center gap-2 flex-wrap max-w-sm">
                  {selectedWord.isCountable ? (
                    // Countable Visualizer
                    Array.from({ length: Math.min(count, 5) }).map((_, i) => {
                      const Icon = selectedWord.icon;
                      return (
                        <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedWord.color}`}>
                          <Icon className="w-6 h-6" />
                        </motion.div>
                      );
                    })
                  ) : (
                    // Uncountable Visualizer
                    <div className="flex flex-col items-center">
                      {container === "glass" ? (
                        <div className="relative">
                          <GlassWater className={`w-16 h-16 ${selectedWord.color.split(" ")[0]}`} />
                          <motion.div 
                            initial={{ height: 0 }} animate={{ height: "60%" }} 
                            className={`absolute bottom-1 left-3 right-3 rounded-b ${selectedWord.color.split(" ")[1]}`}
                            style={{ zIndex: -1 }}
                          />
                        </div>
                      ) : container === "bottle" ? (
                        <div className={`w-12 h-20 rounded-md border-2 border-gray-300 relative overflow-hidden flex flex-col justify-end p-0.5`}>
                           <div className="w-4 h-4 border-2 border-b-0 border-gray-300 absolute -top-4 left-1/2 -translate-x-1/2 rounded-t-sm" />
                           <motion.div 
                            initial={{ height: 0 }} animate={{ height: "80%" }} 
                            className={`w-full rounded-sm ${selectedWord.color.split(" ")[1]}`}
                          />
                        </div>
                      ) : (
                        <motion.div 
                          animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}
                          className={`w-16 h-16 rounded-full flex items-center justify-center ${selectedWord.color}`}
                        >
                          <selectedWord.icon className="w-8 h-8" />
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>

                {/* Final Text Display */}
                <div className="text-2xl font-black text-gray-900 mb-8 h-10">
                  {selectedWord.isCountable ? (
                    `${count} ${selectedWord.word}${count > 1 ? "s" : ""}`
                  ) : (
                    container ? `A ${container} of ${selectedWord.word.toLowerCase()}` : selectedWord.word
                  )}
                </div>

                {/* Controls */}
                <div className="flex justify-center w-full">
                  {selectedWord.isCountable ? (
                    <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-xl border border-gray-200">
                      <Button 
                        onClick={() => setCount(Math.max(1, count - 1))}
                        className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-600"
                      >
                        <Minus className="w-5 h-5" />
                      </Button>
                      <span className="w-8 text-center font-bold text-lg">{count}</span>
                      <Button 
                        onClick={() => setCount(Math.min(5, count + 1))}
                        className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-600"
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setContainer("glass")}
                        className={`px-4 py-2 rounded-xl border text-sm font-bold transition-colors ${container === "glass" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"}`}
                      >
                        A glass of...
                      </Button>
                      <Button 
                        onClick={() => setContainer("bottle")}
                        className={`px-4 py-2 rounded-xl border text-sm font-bold transition-colors ${container === "bottle" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"}`}
                      >
                        A bottle of...
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
