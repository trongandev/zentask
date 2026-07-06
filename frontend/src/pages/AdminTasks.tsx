import React, { useState, useEffect } from "react";
import { getFirebaseInstances } from "../lib/firebase";
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, query, orderBy, writeBatch } from "firebase/firestore";
import { Plus, Trash2, Edit2, Check, ListTodo, DownloadCloud } from "lucide-react";

export function AdminTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Task form state
  const [isEditingTask, setIsEditingTask] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    xpReward: 10,
    type: "grammar", // grammar, vocabulary, quiz, etc.
    icon: "/daily-task/material-init.png",
    total: 10,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { db } = await getFirebaseInstances();
      const tasksQuery = query(collection(db, "daily_tasks"), orderBy("createdAt", "desc"));
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasksList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksList);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { db } = await getFirebaseInstances();
      if (isEditingTask) {
        await updateDoc(doc(db, "daily_tasks", isEditingTask), {
          ...taskForm,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "daily_tasks"), {
          ...taskForm,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setIsEditingTask(null);
      setTaskForm({ title: "", description: "", xpReward: 10, type: "grammar", icon: "/daily-task/material-init.png", total: 10 });
      fetchData();
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Có lỗi xảy ra khi lưu task.");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa task này?")) return;
    try {
      const { db } = await getFirebaseInstances();
      await deleteDoc(doc(db, "daily_tasks", id));
      fetchData();
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Có lỗi xảy ra khi xóa task.");
    }
  };

  const startEditTask = (task: any) => {
    setIsEditingTask(task.id);
    setTaskForm({
      title: task.title,
      description: task.description,
      xpReward: task.xpReward,
      type: task.type,
      icon: task.icon || "/daily-task/material-init.png",
      total: task.total || 1,
    });
  };

  const cancelEdit = () => {
    setIsEditingTask(null);
    setTaskForm({ title: "", description: "", xpReward: 10, type: "grammar", icon: "/daily-task/material-init.png", total: 10 });
  };

  const handleImportDefaultTasks = async () => {
    if (!window.confirm("Bạn có muốn thêm các nhiệm vụ mặc định?")) return;
    try {
      const { db } = await getFirebaseInstances();
      const defaultTasks = [
        { title: "Khởi Tạo Chất Liệu", total: 10, icon: "/daily-task/material-init.png", xpReward: 20, description: "Thêm mới thành công 10 từ vựng vào bộ Thẻ lật cá nhân của bạn.", type: "vocabulary" },
        { title: "Bậc Thầy Đố Vui", total: 2, icon: "/daily-task/master-of-riddles.png", xpReward: 20, description: "Tự thiết kế và xuất bản thành công 2 câu hỏi trắc nghiệm (Quiz) mới lên hệ thống.", type: "quiz" },
        { title: "Điểm Tĩnh Mỗi Ngày", total: 1, icon: "/daily-task/calm-every-day.png", xpReward: 10, description: "Nhấn nút Điểm danh hàng ngày ngay khi đăng nhập ứng dụng để tích lũy chuỗi ngày học (Streak).", type: "system" },
        { title: "Ôn Cố Tri Tân", total: 10, icon: "/daily-task/learn-past.png", xpReward: 20, description: "Hoàn thành việc lật và ôn tập lại 10 từ vựng cũ đã học trong kho dữ liệu.", type: "vocabulary" },
        { title: "Kẻ Gieo Hạt Tri Thức", total: 1, icon: "/daily-task/sower-of-knl.png", xpReward: 30, description: "Tạo và đăng tải 1 bài viết chia sẻ trong phần Cộng đồng.", type: "community" },
        { title: "Người Bạn Đồng Hành", total: 3, icon: "/daily-task/companion.png", xpReward: 15, description: "Tặng 3 lượt tương tác vào các bài đăng của thành viên khác trong phần Cộng đồng.", type: "community" },
      ];
      
      const batch = writeBatch(db);
      for (const t of defaultTasks) {
        const newDocRef = doc(collection(db, "daily_tasks"));
        batch.set(newDocRef, {
          ...t,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
      fetchData();
      alert("Đã thêm các nhiệm vụ mặc định thành công!");
    } catch (error) {
      console.error("Error importing default tasks:", error);
      alert("Có lỗi xảy ra khi nhập dữ liệu.");
    }
  };

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
        <button
          onClick={handleImportDefaultTasks}
          className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2"
        >
          <DownloadCloud className="w-5 h-5 text-blue-600" />
          Import Mặc định
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {isEditingTask ? "Chỉnh sửa nhiệm vụ" : "Thêm nhiệm vụ mới"}
          </h3>
          <form onSubmit={handleSaveTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 h-24 resize-none"
                placeholder="VD: Tham gia ít nhất 1 bài trắc nghiệm nhanh để nhận phần thưởng."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Phần thưởng (XP)</label>
              <input
                type="number"
                required
                min="1"
                value={taskForm.xpReward}
                onChange={(e) => setTaskForm({ ...taskForm, xpReward: parseInt(e.target.value) || 0 })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Loại nhiệm vụ</label>
              <select
                value={taskForm.type}
                onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              >
                <option value="grammar">Ngữ pháp</option>
                <option value="vocabulary">Từ vựng</option>
                <option value="quiz">Trắc nghiệm</option>
                <option value="community">Cộng đồng</option>
              </select>
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
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Icon URL</label>
              <input
                type="text"
                required
                value={taskForm.icon}
                onChange={(e) => setTaskForm({ ...taskForm, icon: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              {isEditingTask && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  Hủy
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
              >
                {isEditingTask ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {isEditingTask ? "Lưu thay đổi" : "Thêm nhiệm vụ"}
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Tiêu đề</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Loại</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">XP</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">Đang tải...</td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">Chưa có nhiệm vụ nào.</td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{task.title}</p>
                      <p className="text-sm text-gray-500 line-clamp-1">{task.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider">
                        {task.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-blue-600">+{task.xpReward} XP</span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => startEditTask(task)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors inline-block"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors inline-block"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
