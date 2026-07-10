import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Check, ListTodo, DownloadCloud } from "lucide-react";
import { adminService } from "@/src/services/adminService";
import { DataTable } from "@/src/components/Admin/DataTable";
import { Modal } from "@/src/components/Admin/Modal";
import { useAdminStore } from "@/src/store/useAdminStore";

export function AdminTasks() {
  const { tasks, fetchTasks } = useAdminStore();

  // Task form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({
    id: "",
    title: "",
    desc: "",
    xpPerItem: 10,
    total: 10,
    icon: "/daily-task/material-init.png",
  });

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const startEditTask = (task: any) => {
    setIsEditingTask(task.id);
    setTaskForm({
      id: task.id || "",
      title: task.title,
      desc: task.desc || task.description || "",
      xpPerItem: task.xpPerItem || task.xpReward || 10,
      icon: task.icon || "/daily-task/material-init.png",
      total: task.total || 1,
    });
    setIsModalOpen(true);
  };

  const startCreateTask = () => {
    setIsEditingTask(null);
    setTaskForm({ id: "", title: "", desc: "", xpPerItem: 10, icon: "/daily-task/material-init.png", total: 10 });
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = isEditingTask ? await adminService.updateTask(isEditingTask, taskForm) : await adminService.createTask(taskForm);

    if (success) {
      setIsModalOpen(false);
      fetchTasks(true);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa nhiệm vụ này?")) return;
    const success = await adminService.deleteTask(id);
    if (success) fetchTasks(true);
  };

  const handleImportDefaultTasks = async () => {
    if (!window.confirm("Bạn có muốn thêm các nhiệm vụ mặc định?")) return;
    try {
      const defaultTasks = [
        {
          id: "create_material",
          title: "Khởi Tạo Chất Liệu",
          total: 10,
          icon: "/daily-task/material-init.png",
          xpPerItem: 5,
          desc: "Thêm mới thành công từ vựng vào bộ Thẻ lật cá nhân của bạn (+5XP/từ).",
        },
        {
          id: "quiz_master",
          title: "Bậc Thầy Đố Vui",
          total: 2,
          icon: "/daily-task/master-of-riddles.png",
          xpPerItem: 20,
          desc: "Tự thiết kế và xuất bản thành công câu hỏi trắc nghiệm mới (+20XP/câu).",
        },
        {
          id: "daily_checkin",
          title: "Điểm Tĩnh Mỗi Ngày",
          total: 1,
          icon: "/daily-task/calm-every-day.png",
          xpPerItem: 10,
          desc: "Nhấn nút Điểm danh hàng ngày ngay khi đăng nhập ứng dụng (+10XP).",
        },
        { id: "learn_past", title: "Ôn Cố Tri Tân", total: 10, icon: "/daily-task/learn-past.png", xpPerItem: 2, desc: "Hoàn thành việc lật và ôn tập lại từ vựng cũ đã học (+2XP/từ)." },
        {
          id: "community_share",
          title: "Kẻ Gieo Hạt Tri Thức",
          total: 1,
          icon: "/daily-task/sower-of-knl.png",
          xpPerItem: 30,
          desc: "Tạo và đăng tải bài viết chia sẻ trong phần Cộng đồng (+30XP/bài).",
        },
      ];

      for (const task of defaultTasks) {
        await adminService.createTask(task);
      }
      fetchTasks(true);
    } catch (error) {
      console.error("Error importing default tasks:", error);
      alert("Có lỗi xảy ra khi nhập dữ liệu.");
    }
  };

  const columns = [
    {
      header: "Tiêu đề",
      render: (task: any) => (
        <div>
          <p className="font-bold text-gray-900">{task.title}</p>
          <p className="text-sm text-gray-500 line-clamp-1">{task.desc || task.description}</p>
        </div>
      ),
    },
    {
      header: "Mã (ID)",
      render: (task: any) => <span className="inline-flex px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold font-mono">{task.id}</span>,
    },
    {
      header: "Phần thưởng",
      render: (task: any) => <span className="font-extrabold text-blue-600">+{task.xpPerItem || task.xpReward} XP / lần</span>,
    },
    {
      header: "Mục tiêu",
      render: (task: any) => <span className="font-bold text-gray-700">{task.total} lần</span>,
    },
    {
      header: "Thao tác",
      align: "right" as const,
      render: (task: any) => (
        <div className="space-x-2">
          <button onClick={() => startEditTask(task)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors inline-block">
            <Edit2 className="w-5 h-5" />
          </button>
          <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors inline-block">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-red-600 shadow-sm">
            <ListTodo className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Nhiệm vụ hàng ngày</h1>
            <p className="text-gray-500 font-medium">Quản lý và tạo mới các nhiệm vụ</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleImportDefaultTasks}
            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2"
          >
            <DownloadCloud className="w-5 h-5 text-blue-600" />
            Import Mặc định
          </button>
          <button onClick={startCreateTask} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-md flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Thêm mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <DataTable columns={columns} data={tasks.items} loading={tasks.loading} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditingTask ? "Chỉnh sửa nhiệm vụ" : "Thêm nhiệm vụ mới"}>
        <form onSubmit={handleSaveTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">Mã nhiệm vụ (ID)</label>
            <input
              type="text"
              required
              value={taskForm.id}
              onChange={(e) => setTaskForm({ ...taskForm, id: e.target.value })}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="VD: daily_login"
              disabled={!!isEditingTask} // ID shouldn't be changed if editing (in NoSQL, ID is document ID, but here we can store it inside doc or use it as doc ID. For simplicity we store inside)
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">Tiêu đề</label>
            <input
              type="text"
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              placeholder="VD: Hoàn thành 1 bài trắc nghiệm"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">Mô tả</label>
            <textarea
              required
              value={taskForm.desc}
              onChange={(e) => setTaskForm({ ...taskForm, desc: e.target.value })}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 h-24 resize-none"
              placeholder="VD: Tham gia ít nhất 1 bài trắc nghiệm nhanh để nhận phần thưởng."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Phần thưởng (XP mỗi lần)</label>
            <input
              type="number"
              required
              min="1"
              value={taskForm.xpPerItem}
              onChange={(e) => setTaskForm({ ...taskForm, xpPerItem: parseInt(e.target.value) || 0 })}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Mục tiêu (Total)</label>
            <input
              type="number"
              required
              min="1"
              value={taskForm.total}
              onChange={(e) => setTaskForm({ ...taskForm, total: parseInt(e.target.value) || 1 })}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">Icon URL</label>
            <input
              type="text"
              required
              value={taskForm.icon}
              onChange={(e) => setTaskForm({ ...taskForm, icon: e.target.value })}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">
              Hủy
            </button>
            <button type="submit" className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-md hover:shadow-lg flex items-center gap-2">
              {isEditingTask ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {isEditingTask ? "Lưu thay đổi" : "Thêm nhiệm vụ"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
