import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

type Item = { id: string; text: string; correctLayer: "IN" | "ON" | "AT" };

const ALL_ITEMS: Item[] = [
  { id: "1", text: "Monday", correctLayer: "ON" },
  { id: "2", text: "2026", correctLayer: "IN" },
  { id: "3", text: "7 o'clock", correctLayer: "AT" },
  { id: "4", text: "Vietnam", correctLayer: "IN" },
  { id: "5", text: "Baker Street", correctLayer: "ON" },
  { id: "6", text: "123 Main St", correctLayer: "AT" },
];

export function Prepositions() {
  const [activeLayer, setActiveLayer] = useState<"IN" | "ON" | "AT" | null>(null);
  const [placedItems, setPlacedItems] = useState<{ [key: string]: string[] }>({ IN: [], ON: [], AT: [] });
  const [unplacedItems, setUnplacedItems] = useState<Item[]>(ALL_ITEMS);
  const [feedback, setFeedback] = useState<{ id: string, type: "success" | "error" } | null>(null);

  const handlePlaceItem = (item: Item, targetLayer: "IN" | "ON" | "AT") => {
    if (item.correctLayer === targetLayer) {
      setPlacedItems(prev => ({ ...prev, [targetLayer]: [...prev[targetLayer], item.id] }));
      setUnplacedItems(prev => prev.filter(i => i.id !== item.id));
      setFeedback({ id: item.id, type: "success" });
      setTimeout(() => setFeedback(null), 1000);
    } else {
      setFeedback({ id: item.id, type: "error" });
      setTimeout(() => setFeedback(null), 1000);
      
      // Play a ting sound (simulated by visual shake)
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm col-span-1 md:col-span-2">
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 text-lg mb-1">1. Giới từ IN - ON - AT</h3>
        <p className="text-gray-500 text-sm">Mô hình Tam giác ngược (Inverted Triangle)</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center">
        {/* Interaction Side */}
        <div className="flex-1 w-full max-w-md">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              Kho từ vựng <span className="text-xs font-normal text-gray-500">(Chọn từ và xếp vào đúng tầng)</span>
            </h4>
            <div className="flex flex-wrap gap-2 min-h-[100px] p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <AnimatePresence>
                {unplacedItems.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={
                      feedback?.id === item.id && feedback.type === "error" 
                        ? { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } }
                        : { opacity: 1, scale: 1 }
                    }
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="relative group"
                  >
                    <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 shadow-sm cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors">
                      {item.text}
                    </div>
                    {/* Action buttons on hover to simulate placement */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg flex p-1 gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button onClick={() => handlePlaceItem(item, "IN")} className="px-2 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded">IN</Button>
                      <Button onClick={() => handlePlaceItem(item, "ON")} className="px-2 py-1 text-xs font-bold text-teal-600 hover:bg-teal-50 rounded">ON</Button>
                      <Button onClick={() => handlePlaceItem(item, "AT")} className="px-2 py-1 text-xs font-bold text-orange-600 hover:bg-orange-50 rounded">AT</Button>
                    </div>
                    {feedback?.id === item.id && feedback.type === "error" && (
                      <XCircle className="absolute -top-2 -right-2 w-5 h-5 text-red-500 bg-white rounded-full" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {unplacedItems.length === 0 && (
                <div className="w-full text-center py-4 text-green-500 font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Bạn đã xếp xong tất cả!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Triangle Side */}
        <div className="flex-1 w-full max-w-sm relative">
          {/* Side Context Bubbles */}
          <AnimatePresence>
            {activeLayer && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute -left-12 sm:-left-24 top-1/2 -translate-y-1/2 hidden sm:flex flex-col gap-4"
              >
                <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400">THỜI GIAN</p>
                    <p className="text-sm font-medium text-gray-900">
                      {activeLayer === "IN" ? "Năm, Tháng, Mùa" : activeLayer === "ON" ? "Ngày, Thứ" : "Giờ cụ thể"}
                    </p>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400">NƠI CHỐN</p>
                    <p className="text-sm font-medium text-gray-900">
                      {activeLayer === "IN" ? "Quốc gia, Thành phố" : activeLayer === "ON" ? "Tên đường, Bề mặt" : "Địa chỉ, Số nhà"}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col items-center">
            {/* IN (Top) */}
            <div 
              className={`w-full h-24 mb-1 rounded-t-2xl cursor-pointer transition-all flex flex-col items-center justify-center relative overflow-hidden group ${
                activeLayer === "IN" ? "bg-blue-500 text-white shadow-lg scale-105 z-10" : "bg-blue-100 text-blue-900 hover:bg-blue-200"
              }`}
              style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 15% 100%)" }}
              onMouseEnter={() => setActiveLayer("IN")}
              onMouseLeave={() => setActiveLayer(null)}
            >
              <span className="text-2xl font-black mb-1">IN</span>
              <span className="text-xs font-medium opacity-80 uppercase tracking-widest">Tổng quát</span>
              <div className="absolute bottom-2 flex gap-1">
                {placedItems["IN"].map(id => (
                  <span key={id} className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {ALL_ITEMS.find(i => i.id === id)?.text}
                  </span>
                ))}
              </div>
            </div>

            {/* ON (Middle) */}
            <div 
              className={`w-[70%] h-20 mb-1 cursor-pointer transition-all flex flex-col items-center justify-center relative overflow-hidden group ${
                activeLayer === "ON" ? "bg-teal-500 text-white shadow-lg scale-105 z-10" : "bg-teal-100 text-teal-900 hover:bg-teal-200"
              }`}
              style={{ clipPath: "polygon(0 0, 100% 0, 80% 100%, 20% 100%)" }}
              onMouseEnter={() => setActiveLayer("ON")}
              onMouseLeave={() => setActiveLayer(null)}
            >
              <span className="text-xl font-black mb-1">ON</span>
              <span className="text-[10px] font-medium opacity-80 uppercase tracking-widest">Cụ thể hơn</span>
              <div className="absolute bottom-2 flex gap-1">
                {placedItems["ON"].map(id => (
                  <span key={id} className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {ALL_ITEMS.find(i => i.id === id)?.text}
                  </span>
                ))}
              </div>
            </div>

            {/* AT (Bottom) */}
            <div 
              className={`w-[40%] h-20 rounded-b-2xl cursor-pointer transition-all flex flex-col items-center justify-center relative overflow-hidden group ${
                activeLayer === "AT" ? "bg-orange-500 text-white shadow-lg scale-105 z-10" : "bg-orange-100 text-orange-900 hover:bg-orange-200"
              }`}
              style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%, 50% 100%)" }}
              onMouseEnter={() => setActiveLayer("AT")}
              onMouseLeave={() => setActiveLayer(null)}
            >
              <span className="text-lg font-black mt-2">AT</span>
              <span className="text-[9px] font-medium opacity-80 uppercase tracking-widest">Chính xác</span>
              <div className="absolute bottom-6 flex gap-1">
                {placedItems["AT"].map(id => (
                  <span key={id} className="text-[9px] bg-white/20 px-1 py-0.5 rounded backdrop-blur-sm">
                    {ALL_ITEMS.find(i => i.id === id)?.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

