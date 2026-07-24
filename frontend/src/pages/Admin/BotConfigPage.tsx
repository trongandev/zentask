import React, { useState, useEffect } from "react";
import { adminService } from "../../services/adminService";
import { Bot, Save, Plus, Trash2, BarChart2, Settings2 } from "lucide-react";
import toastService from "@/src/services/toastService";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

interface TimeDistribution {
  [key: string]: number;
}

interface BotConfig {
  id?: string;
  _id?: string;
  rankId: number;
  rankName: string;
  correctRate: number;
  fastResponseRate: number;
  timeDistribution: TimeDistribution;
  slowResponseRate: number;
}

const DEFAULT_RANKS = [
  { id: 1, name: "Bạc" },
  { id: 2, name: "Lục Bảo" },
  { id: 3, name: "Tinh Anh" },
  { id: 4, name: "Kim Cương" },
  { id: 5, name: "Cao Thủ" },
];

export default function BotConfigPage() {
  const [configs, setConfigs] = useState<BotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"config" | "visual">("config");

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await adminService.getBotConfigs();
      setConfigs(res.items || []);
    } catch (err: any) {
      toastService.error("Lỗi khi tải cấu hình: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDefaultConfigs = async () => {
    try {
      for (const rank of DEFAULT_RANKS) {
        if (!configs.find((c) => c.rankId === rank.id)) {
          const newConfig: BotConfig = {
            rankId: rank.id,
            rankName: rank.name,
            correctRate: 50,
            fastResponseRate: 50,
            timeDistribution: {
              "1": 5,
              "2": 5,
              "3": 5,
              "4": 5,
              "5": 5,
              "6": 5,
              "7": 5,
              "8": 5,
              "9": 5,
              "10": 5,
            },
            slowResponseRate: 50,
          };
          await adminService.saveBotConfig(newConfig);
        }
      }
      toastService.success("Đã thêm các cấu hình Rank còn thiếu!");
      fetchConfigs();
    } catch (err: any) {
      toastService.error("Lỗi khi thêm: " + err.message);
    }
  };

  const handleSave = async (config: BotConfig) => {
    try {
      await adminService.saveBotConfig(config);
      toastService.success(`Đã lưu cấu hình Rank ${config.rankName}`);
      fetchConfigs();
    } catch (err: any) {
      toastService.error("Lỗi khi lưu: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa cấu hình này?")) return;
    try {
      await adminService.deleteBotConfig(id);
      toastService.success("Đã xóa cấu hình");
      fetchConfigs();
    } catch (err: any) {
      toastService.error("Lỗi khi xóa: " + err.message);
    }
  };

  const handleChange = (index: number, field: keyof BotConfig, value: any) => {
    const updated = [...configs];
    updated[index] = { ...updated[index], [field]: value };
    setConfigs(updated);
  };

  const handleTimeDistChange = (index: number, sec: string, value: number) => {
    const updated = [...configs];
    updated[index].timeDistribution = {
      ...updated[index].timeDistribution,
      [sec]: value,
    };
    setConfigs(updated);
  };

  if (loading) return <div className="text-center py-10">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-6 h-6 text-indigo-600" />
            Cấu hình cân bằng Bot
          </h1>
          <p className="text-gray-500 mt-1">Điều chỉnh tỷ lệ chính xác và tốc độ phản hồi của Bot khi solo theo Rank</p>
        </div>
        <Button onClick={handleAddDefaultConfigs} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
          <Plus className="w-4 h-4" />
          Thêm Rank còn thiếu
        </Button>
      </div>

      <div className="flex gap-6 border-b border-gray-200">
        <Button
          onClick={() => setActiveTab("config")}
          className={`pb-3 px-2 flex items-center gap-2 font-medium transition-colors ${activeTab === "config" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500 hover:text-gray-800"}`}
        >
          <Settings2 className="w-4 h-4" /> Cấu hình
        </Button>
        <Button
          onClick={() => setActiveTab("visual")}
          className={`pb-3 px-2 flex items-center gap-2 font-medium transition-colors ${activeTab === "visual" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500 hover:text-gray-800"}`}
        >
          <BarChart2 className="w-4 h-4" /> Trực quan hóa
        </Button>
      </div>

      {configs.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center text-gray-500">Chưa có cấu hình Bot nào. Hãy ấn nút "Thêm Rank còn thiếu" để tạo mặc định.</div>
      ) : activeTab === "config" ? (
        <div className="space-y-8">
          {configs.map((config, idx) => (
            <div key={config.id || config.rankId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <img src={`/rank/${config.rankId}.png`} alt={`Rank ${config.rankId}`} className="w-10 h-10 object-contain drop-shadow-sm" onError={(e) => (e.currentTarget.style.display = "none")} />
                  <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-sm">Rank ID: {config.rankId}</span>
                  <Input
                    type="text"
                    value={config.rankName}
                    onChange={(e) => handleChange(idx, "rankName", e.target.value)}
                    className="font-bold text-lg text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:ring-0 px-1 outline-none"
                    placeholder="Tên Rank"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {config.id && (
                    <Button onClick={() => handleDelete(config.id as string)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  )}
                  <Button onClick={() => handleSave(config)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors">
                    <Save className="w-4 h-4" />
                    Lưu Rank này
                  </Button>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* General Stats */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Chỉ số chung</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tỷ lệ trả lời ĐÚNG (%)</label>
                    <Input
                      type="number"
                      value={config.correctRate}
                      onChange={(e) => handleChange(idx, "correctRate", Number(e.target.value))}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      min="0"
                      max="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tỷ lệ phản hồi nhanh {"<="} 10 giây (%)</label>
                    <Input
                      type="number"
                      value={config.fastResponseRate}
                      onChange={(e) => handleChange(idx, "fastResponseRate", Number(e.target.value))}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      min="0"
                      max="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tỷ lệ phản hồi chậm {">"} 10 giây (%)</label>
                    <Input
                      type="number"
                      value={config.slowResponseRate}
                      onChange={(e) => handleChange(idx, "slowResponseRate", Number(e.target.value))}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                {/* Time Distribution */}
                <div>
                  <div className="flex justify-between items-end border-b pb-2 mb-4">
                    <h3 className="font-semibold text-gray-900">Phân bổ thời gian (Giây 1 đến 10)</h3>
                    <span className="text-xs text-gray-500">Tổng % nên tương đương tỷ lệ nhanh</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((sec) => (
                      <div key={sec} className="flex items-center gap-2">
                        <label className="w-20 text-sm text-gray-600">Giây {sec}:</label>
                        <div className="relative flex-1">
                          <Input
                            type="number"
                            value={config.timeDistribution?.[String(sec)] || 0}
                            onChange={(e) => handleTimeDistChange(idx, String(sec), Number(e.target.value))}
                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-right pr-6"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {configs.map((config) => (
            <div key={config.id || config.rankId} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div className="flex flex-col items-center justify-center min-w-[140px] shrink-0">
                <img src={`/rank/${config.rankId}.png`} alt={config.rankName} className="w-28 h-28 object-contain drop-shadow-xl" onError={(e) => (e.currentTarget.style.display = "none")} />
                <h3 className="font-black text-2xl mt-3 text-gray-800 tracking-tight">{config.rankName}</h3>
              </div>

              <div className="flex-1 w-full space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-bold text-gray-700">Tỷ lệ trả lời Đúng</span>
                    <span className="font-black text-indigo-600">{config.correctRate}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className="bg-indigo-600 h-3 rounded-full transition-all duration-500" style={{ width: `${config.correctRate}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-bold text-green-700">Phản hồi Nhanh (≤10s)</span>
                      <span className="font-black text-green-600">{config.fastResponseRate}%</span>
                    </div>
                    <div className="w-full bg-green-100 rounded-full h-3">
                      <div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{ width: `${config.fastResponseRate}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-bold text-red-700">Phản hồi Chậm ({">"}10s)</span>
                      <span className="font-black text-red-600">{config.slowResponseRate}%</span>
                    </div>
                    <div className="w-full bg-red-100 rounded-full h-3">
                      <div className="bg-red-500 h-3 rounded-full transition-all duration-500" style={{ width: `${config.slowResponseRate}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-sm font-bold text-gray-700 mb-4">Mô phỏng phản xạ trong 10 giây đầu:</h4>
                  <div className="flex gap-2 h-24 items-end">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sec) => {
                      const val = config.timeDistribution?.[String(sec)] || 0;
                      // Max height relative to the highest point or 100% of fastResponseRate
                      const maxVal = Math.max(...Object.values(config.timeDistribution || {}).map(Number), 1);
                      const height = (val / maxVal) * 100;

                      return (
                        <div key={sec} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                          <div className="absolute -top-8 bg-gray-900 text-white text-xs py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all scale-95 group-hover:scale-100 whitespace-nowrap z-10 shadow-xl font-bold">
                            Giây {sec}: {val}%
                          </div>

                          <div
                            className={`w-full rounded-t-md transition-all duration-500 ${val > 0 ? "bg-blue-500 group-hover:bg-blue-400 cursor-pointer shadow-sm" : "bg-transparent"}`}
                            style={{ height: `${Math.max(height, val > 0 ? 5 : 0)}%` }}
                          ></div>
                          <div className="text-[11px] font-bold text-gray-400 mt-2">{sec}s</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
