import React, { useEffect, useState } from "react";
import { adminService } from "../../services/adminService";
import { Clock, Play, Edit2, CheckCircle2, XCircle } from "lucide-react";
import toastService from "@/src/services/toastService";
import { format } from "date-fns";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

interface BotJob {
  _id: string;
  jobId: string;
  name: string;
  description: string;
  cronExpression: string;
  isActive: boolean;
  lastRun: string | null;
  type: string;
}

export function AdminBotJobs() {
  const [jobs, setJobs] = useState<BotJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState<BotJob | null>(null);
  const [editCron, setEditCron] = useState("");
  const [editActive, setEditActive] = useState(true);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await adminService.getBotJobs();
      setJobs(res);
    } catch (error: any) {
      toastService.error("Lỗi khi tải danh sách Bot Jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSaveEdit = async () => {
    if (!editingJob) return;
    try {
      await adminService.updateBotJob(editingJob.jobId, { cronExpression: editCron, isActive: editActive });
      toastService.success("Cập nhật thành công!");
      setEditingJob(null);
      fetchJobs();
    } catch (err: any) {
      toastService.error(err.message || "Lỗi cập nhật");
    }
  };

  const handleTrigger = async (jobId: string) => {
    try {
      toastService.success(`Đang gửi lệnh kích hoạt ${jobId}...`);
      await adminService.triggerBotJob(jobId);
      toastService.success(`Đã kích hoạt xong ${jobId}!`);
      fetchJobs();
    } catch (err: any) {
      toastService.error(err.message || "Lỗi kích hoạt");
    }
  };

  const handleToggleActive = async (job: BotJob) => {
    try {
      await adminService.updateBotJob(job.jobId, { cronExpression: job.cronExpression, isActive: !job.isActive });
      toastService.success(job.isActive ? "Đã tắt job" : "Đã bật job");
      fetchJobs();
    } catch (err: any) {
      toastService.error(err.message || "Lỗi bật tắt");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Clock className="w-8 h-8 text-indigo-600" />
            Bot Jobs Schedule
          </h1>
          <p className="text-gray-500 mt-2">Quản lý lịch trình các tác vụ tự động của Bot</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                <th className="p-4 font-semibold">Tên Job</th>
                <th className="p-4 font-semibold">Cron Expression</th>
                <th className="p-4 font-semibold">Trạng thái</th>
                <th className="p-4 font-semibold">Lần chạy cuối</th>
                <th className="p-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">Đang tải dữ liệu...</td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">Không có job nào được tìm thấy.</td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{job.name}</div>
                      <div className="text-xs text-gray-500">{job.description} ({job.jobId})</div>
                    </td>
                    <td className="p-4">
                      <code className="px-2 py-1 bg-gray-100 text-pink-600 rounded text-sm font-mono">{job.cronExpression}</code>
                    </td>
                    <td className="p-4">
                      <Button onClick={() => handleToggleActive(job)} className="flex items-center gap-1 focus:outline-none">
                        {job.isActive ? (
                          <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4" /> Bật
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full text-xs font-bold">
                            <XCircle className="w-4 h-4" /> Tắt
                          </span>
                        )}
                      </Button>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {job.lastRun ? format(new Date(job.lastRun), "dd/MM/yyyy HH:mm:ss") : "Chưa từng chạy"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => {
                            setEditingJob(job);
                            setEditCron(job.cronExpression);
                            setEditActive(job.isActive);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Sửa cron expression"
                        >
                          <Edit2 className="w-5 h-5" />
                        </Button>
                        <Button
                          onClick={() => handleTrigger(job.jobId)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Chạy ngay lập tức"
                        >
                          <Play className="w-5 h-5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Chỉnh sửa Job: {editingJob.name}</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cron Expression</label>
              <Input
                type="text"
                value={editCron}
                onChange={(e) => setEditCron(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
              <p className="text-xs text-gray-500 mt-2">
                Format: <code>phút giờ ngày tháng thứ</code>. VD: <code>0 8 * * *</code> (8h sáng mỗi ngày).
              </p>
            </div>
            <div className="mb-6 flex items-center gap-2">
              <Input
                type="checkbox"
                id="isActive"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700 font-medium">Bật / Tắt Job này</label>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setEditingJob(null)}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
              >
                Hủy
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-colors"
              >
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
