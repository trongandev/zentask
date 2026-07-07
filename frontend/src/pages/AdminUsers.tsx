import React, { useState, useEffect } from "react";
import { Users, Edit2, Check, X } from "lucide-react";

export function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  // const fetchData = async () => {
  //   setLoading(true);
  //   try {
  //     const { db } = await getFirebaseInstances();
  //     const usersSnapshot = await getDocs(collection(db, "users"));
  //     const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  //     setUsers(usersList);
  //   } catch (error) {
  //     console.error("Error fetching users:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // useEffect(() => {
  //   fetchData();
  // }, []);

  // const handleUpdateRole = async (userId: string, newRole: string) => {
  //   try {
  //     const { db } = await getFirebaseInstances();
  //     await updateDoc(doc(db, "users", userId), {
  //       role: newRole
  //     });
  //     setEditingRole(null);
  //     fetchData();
  //   } catch (error) {
  //     console.error("Error updating user role:", error);
  //     alert("Có lỗi xảy ra khi cập nhật vai trò.");
  //   }
  // };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-red-600 shadow-sm">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Người dùng</h1>
          <p className="text-gray-500 font-medium">Quản lý và phân quyền người dùng</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Người dùng</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Vai trò</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Cấp độ</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500">Kinh nghiệm</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-500 text-right">Ngày tham gia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={u.photoURL} alt={u.displayName} className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <p className="font-bold text-gray-900">{u.displayName}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingRole === u.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-medium focus:outline-none focus:border-red-500"
                            defaultValue={u.role || "user"}
                            // onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            onBlur={() => setEditingRole(null)}
                            autoFocus
                          >
                            <option value="user">USER</option>
                            <option value="admin">ADMIN</option>
                          </select>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingRole(u.id)}
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-80 ${
                            u.role === "admin" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {u.role || "user"}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-700">Level {u.level || 1}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-blue-600">{u.xp?.toLocaleString() || 0} XP</span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-500">{u.createdAt?.toDate ? new Date(u.createdAt.toDate()).toLocaleDateString("vi-VN") : "Không rõ"}</td>
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
