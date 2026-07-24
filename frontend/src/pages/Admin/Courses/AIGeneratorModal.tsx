import React, { useState } from "react";
import { Sparkles, X, RefreshCw } from "lucide-react";
import axiosInstance from "../../../services/axiosConfig";
import toastService from "../../../services/toastService";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

interface Props {
  onClose: () => void;
  onSuccess: (words: any[]) => void;
}

export function AIGeneratorModal({ onClose, onSuccess }: Props) {
  const [topic, setTopic] = useState("");
  const [languageCode, setLanguageCode] = useState("English");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return toastService.error("Vui lòng nhập chủ đề");
    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/admin/courses/ai-generate", { topic, languageCode, count });
      toastService.success("Tạo thành công!");
      onSuccess(res.data.data);
      onClose();
    } catch (err: any) {
      toastService.error(err.response?.data?.error || "Lỗi khi tạo bằng AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Tạo Từ Vựng Bằng AI
          </h2>
          <Button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Ngôn ngữ</label>
            <Input 
              type="text" 
              value={languageCode} 
              onChange={e => setLanguageCode(e.target.value)} 
              className="w-full p-2.5 border rounded-lg outline-none focus:border-blue-500" 
              placeholder="Ví dụ: English, Tiếng Nhật, v.v..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Chủ đề (Topic)</label>
            <Input 
              type="text" 
              value={topic} 
              onChange={e => setTopic(e.target.value)} 
              className="w-full p-2.5 border rounded-lg outline-none focus:border-blue-500" 
              placeholder="Ví dụ: Family, Shopping, Daily Life..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Số lượng từ vựng</label>
            <Input 
              type="number" 
              value={count} 
              onChange={e => setCount(Number(e.target.value))} 
              className="w-full p-2.5 border rounded-lg outline-none focus:border-blue-500" 
              min={1} max={50}
            />
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 rounded-lg">
            Hủy
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Tạo Bằng AI
          </Button>
        </div>
      </div>
    </div>
  );
}
