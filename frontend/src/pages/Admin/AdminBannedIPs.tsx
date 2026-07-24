import React, { useEffect, useState } from "react";
import { ShieldAlert, Trash2, Plus, MessageSquareWarning } from "lucide-react";
import { adminService } from "../../services/adminService";
import { DataTable } from "../../components/Admin/DataTable";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

export function AdminBannedIPs() {
  const [ips, setIps] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ips" | "feedbacks">("ips");

  // Form states
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === "ips") {
      const data = await adminService.getBannedIps();
      setIps(data);
    } else {
      const data = await adminService.getAttackerFeedbacks();
      setFeedbacks(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp) return;
    const success = await adminService.addBannedIp(newIp, newReason || "Hành vi đáng ngờ", true);
    if (success) {
      setNewIp("");
      setNewReason("");
      fetchData();
    }
  };

  const handleDeleteIp = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn gỡ cấm IP này không?")) {
      const success = await adminService.deleteBannedIp(id);
      if (success) fetchData();
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xoá feedback này?")) {
      const success = await adminService.deleteAttackerFeedback(id);
      if (success) fetchData();
    }
  };

  const ipColumns = [
    { header: "Địa chỉ IP", render: (item: any) => <span className="font-mono text-red-600 font-bold">{item.ip}</span> },
    { header: "Lý do", render: (item: any) => <span className="text-gray-700">{item.reason}</span> },
    { header: "Honeypot", render: (item: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.isHoneypot ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
        {item.isHoneypot ? 'Bật' : 'Tắt'}
      </span>
    ) },
    { header: "Ngày cấm", render: (item: any) => <span className="text-sm text-gray-500">{new Date(item.createdAt).toLocaleString("vi-VN")}</span> },
    {
      header: "Hành động",
      align: "right" as const,
      render: (item: any) => (
        <Button onClick={() => handleDeleteIp(item._id)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="Gỡ cấm">
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const feedbackColumns = [
    { header: "Địa chỉ IP", render: (item: any) => <span className="font-mono text-gray-900 font-bold">{item.ip}</span> },
    { header: "Lời nhắn", render: (item: any) => <p className="text-sm text-gray-800 whitespace-pre-wrap max-w-lg">{item.message}</p> },
    { header: "User Agent", render: (item: any) => <span className="text-xs text-gray-400 line-clamp-2 max-w-xs">{item.userAgent}</span> },
    { header: "Ngày gửi", render: (item: any) => <span className="text-sm text-gray-500">{new Date(item.createdAt).toLocaleString("vi-VN")}</span> },
    {
      header: "Hành động",
      align: "right" as const,
      render: (item: any) => (
        <Button onClick={() => handleDeleteFeedback(item._id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Xoá">
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-red-600 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Honeypot & Blacklist</h1>
            <p className="text-gray-500 font-medium">Bẫy ngọt ngào dành cho kẻ tấn công</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200 pb-2">
        <Button
          onClick={() => setActiveTab("ips")}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === "ips" ? "bg-red-50 text-red-700" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <ShieldAlert className="w-4 h-4" /> IP Bị Cấm
        </Button>
        <Button
          onClick={() => setActiveTab("feedbacks")}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === "feedbacks" ? "bg-purple-50 text-purple-700" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <MessageSquareWarning className="w-4 h-4" /> Lời nhắn từ Hacker
        </Button>
      </div>

      {activeTab === "ips" && (
        <>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
              <Plus className="w-5 h-5 text-red-500" /> Thêm IP vào danh sách đen
            </h2>
            <form onSubmit={handleAddIp} className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Địa chỉ IP</label>
                <Input type="text" value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="VD: 192.168.1.1" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" required />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Lý do</label>
                <Input type="text" value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="VD: Scan cổng, DDOS, spam..." className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
              </div>
              <Button type="submit" className="px-6 py-2 h-[42px] bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors whitespace-nowrap">
                Chặn IP
              </Button>
            </form>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <DataTable columns={ipColumns} data={ips} loading={loading} />
          </div>
        </>
      )}

      {activeTab === "feedbacks" && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <DataTable columns={feedbackColumns} data={feedbacks} loading={loading} />
        </div>
      )}
    </div>
  );
}
