import React, { useEffect, useState } from "react";
import { adminService } from "../../services/adminService";
import { format } from "date-fns";
import { Activity, Search, AlertCircle, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import toast from "react-hot-toast";

interface SystemLog {
  id: string;
  method: string;
  url: string;
  body: any;
  ip: string;
  uid: {
    _id: string;
    displayName: string;
    email: string;
  } | null;
  createdAt: string;
}

export function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  const fetchLogs = async (p: number) => {
    try {
      setLoading(true);
      const res = await adminService.getSystemLogs(p, 20);
      setLogs(res.items);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi tải system logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "POST":
        return "bg-green-100 text-green-700";
      case "PUT":
      case "PATCH":
        return "bg-blue-100 text-blue-700";
      case "DELETE":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            System Logs
          </h1>
          <p className="text-gray-500 mt-2">Theo dõi toàn bộ các thao tác ghi dữ liệu (POST, PUT, DELETE) vào hệ thống</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2 font-medium text-gray-600">
          Tổng cộng: <span className="text-blue-600 font-bold">{total}</span> logs
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                <th className="p-4 font-semibold">Thời gian</th>
                <th className="p-4 font-semibold">Method</th>
                <th className="p-4 font-semibold">URL</th>
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">IP</th>
                <th className="p-4 font-semibold text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Không có log nào.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">{format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss")}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getMethodColor(log.method)}`}>{log.method}</span>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-800 max-w-[200px] truncate" title={log.url}>
                      {log.url}
                    </td>
                    <td className="p-4">
                      {log.uid ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{log.uid.displayName || "Unknown"}</span>
                          <span className="text-xs text-gray-500">{log.uid.email}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Khách (Chưa login)</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500 font-mono text-xs">{log.ip || "N/A"}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => setSelectedLog(log)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Xem chi tiết">
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-500">
              Trang {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal chi tiết payload */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className={`px-2 py-0.5 text-sm font-bold rounded-md ${getMethodColor(selectedLog.method)}`}>{selectedLog.method}</span>
                Chi tiết Request
              </h2>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-red-500 transition-colors font-bold text-2xl leading-none">
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <span className="text-sm font-semibold text-gray-500 block mb-1">URL:</span>
                <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm text-gray-800 break-all border border-gray-200">{selectedLog.url}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-semibold text-gray-500 block mb-1">User:</span>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                    {selectedLog.uid ? (
                      <>
                        <p className="font-bold">{selectedLog.uid.displayName}</p>
                        <p className="text-gray-500">{selectedLog.uid.email}</p>
                        <p className="text-gray-400 text-xs mt-1">ID: {selectedLog.uid._id}</p>
                      </>
                    ) : (
                      "Khách (Guest)"
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-500 block mb-1">Thời gian & IP:</span>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100 h-[74px]">
                    <p>{format(new Date(selectedLog.createdAt), "dd/MM/yyyy HH:mm:ss")}</p>
                    <p className="font-mono text-gray-500 mt-1">{selectedLog.ip}</p>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-sm font-semibold text-gray-500 block mb-1">Payload (Body):</span>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto">
                  <pre className="text-green-400 font-mono text-xs">{JSON.stringify(selectedLog.body, null, 2)}</pre>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
              <button onClick={() => setSelectedLog(null)} className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-sm">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
