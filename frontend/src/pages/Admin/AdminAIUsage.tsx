import React, { useEffect, useState } from "react";
import { adminService } from "../../services/adminService";
import { format } from "date-fns";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import toastService from "@/src/services/toastService";
import { Button } from "@/src/components/ui/Button";

interface AIUsage {
  id: string;
  uid: {
    _id: string;
    displayName: string;
    email: string;
  } | null;
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  status: string;
  errorMessage: string;
  createdAt: string;
}

export function AdminAIUsage() {
  const [usages, setUsages] = useState<AIUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchUsages = async (p: number) => {
    try {
      setLoading(true);
      const res = await adminService.getAIUsage(p, 20);
      setUsages(res.items);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (error: any) {
      toastService.error(error.message || "Lỗi khi tải AI usage logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsages(page);
  }, [page]);

  const getStatusColor = (status: string) => {
    return status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            AI Token Usage
          </h1>
          <p className="text-gray-500 mt-2">Theo dõi lịch sử gọi API AI và sử dụng token</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2 font-medium text-gray-600">
          Tổng cộng: <span className="text-blue-600 font-bold">{total}</span> lượt gọi
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                <th className="p-4 font-semibold">Thời gian</th>
                <th className="p-4 font-semibold">Tính năng</th>
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Model</th>
                <th className="p-4 font-semibold">Tokens</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Đang tải dữ liệu...</td>
                </tr>
              ) : usages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Không có dữ liệu.</td>
                </tr>
              ) : (
                usages.map((usage) => (
                  <tr key={usage.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                      {usage.createdAt ? format(new Date(usage.createdAt), "dd/MM/yyyy HH:mm:ss") : "N/A"}
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-800">{usage.feature}</td>
                    <td className="p-4">
                      {usage.uid ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{usage.uid.displayName || "Unknown"}</span>
                          <span className="text-xs text-gray-500">{usage.uid.email}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">System</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500">{usage.model}</td>
                    <td className="p-4 text-sm text-gray-500">
                      <div className="flex flex-col text-xs">
                        <span>P: {usage.promptTokens}</span>
                        <span>C: {usage.completionTokens}</span>
                        <span className="font-bold text-gray-700">T: {usage.totalTokens}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(usage.status)}`}>
                        {usage.status}
                      </span>
                      {usage.status === "error" && usage.errorMessage && (
                        <div className="text-xs text-red-500 mt-1 truncate max-w-xs" title={usage.errorMessage}>
                          {usage.errorMessage}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-500">Trang {page} / {totalPages}</span>
            <div className="flex gap-2">
              <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
