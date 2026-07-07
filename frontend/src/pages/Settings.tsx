import { useState, useEffect } from "react";
import { UserAvatar } from "../components/UserAvatar";
import { User, Bell, Shield, Key, Moon, Volume2, Globe, HelpCircle, LogOut, Settings as SettingsIconLucide, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

export function Settings() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("account");

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Avatar Modal State
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [tempPhotoURL, setTempPhotoURL] = useState("");

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setUsername(user.username || user.email?.split("@")[0] || "");
      setBio(user.bio || "");
      setPhotoURL(user.photoURL || "");
    }
  }, [user]);

  const handleChangeAvatar = () => {
    setTempPhotoURL(photoURL);
    setShowAvatarModal(true);
  };

  const handleConfirmAvatar = () => {
    setPhotoURL(tempPhotoURL.trim());
    setShowAvatarModal(false);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BACKEND}/api/user/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName, username, bio, photoURL }),
      });
      if (res.ok) {
        updateUser({ displayName, username, bio, photoURL });
        toast.success("Đã cập nhật hồ sơ thành công!");
      } else {
        toast.error("Lỗi khi cập nhật hồ sơ");
      }
    } catch (err) {
      toast.error("Đã xảy ra lỗi");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "account", label: "Tài khoản", icon: User },
    { id: "notifications", label: "Thông báo", icon: Bell },
    { id: "privacy", label: "Quyền riêng tư", icon: Shield },
    { id: "security", label: "Bảo mật", icon: Key },
    { id: "appearance", label: "Giao diện", icon: Moon },
    { id: "audio", label: "Âm thanh", icon: Volume2 },
    { id: "language", label: "Ngôn ngữ", icon: Globe },
    { id: "help", label: "Trợ giúp", icon: HelpCircle },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Cài đặt</h1>
        <p className="text-gray-500 font-medium">Quản lý tài khoản và các tùy chọn cá nhân của bạn.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="md:w-64 flex-shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-colors",
                activeTab === tab.id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-blue-600" : "text-gray-400")} />
              {tab.label}
            </button>
          ))}
          <div className="h-px bg-gray-100 my-4" />
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5 text-red-500" />
            Đăng xuất
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          {activeTab === "account" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Thông tin cá nhân</h2>
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="relative cursor-pointer group" onClick={handleChangeAvatar}>
                    <UserAvatar
                      src={photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop"}
                      level={user?.level || 1}
                      className="w-24 h-24 transition-opacity group-hover:opacity-80"
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-900">Ảnh đại diện</h3>
                    <p className="text-sm text-gray-500">Bạn có thể dán đường dẫn hình ảnh (URL) để làm ảnh đại diện.</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={handleChangeAvatar} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors">
                        Thay đổi
                      </button>
                      <button onClick={() => setPhotoURL("")} className="px-4 py-2 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors">
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Tên hiển thị</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Tên người dùng (@)</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Tiểu sử</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Mô tả ngắn gọn về bản thân hoặc mục tiêu học tập của bạn..."
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Email</label>
                  <input type="email" defaultValue={user?.email || ""} disabled className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-500 cursor-not-allowed" />
                  <p className="text-xs text-gray-500">Email được liên kết với tài khoản đăng nhập của bạn.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Thông báo</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <h3 className="font-bold text-gray-900">Nhắc nhở học tập</h3>
                      <p className="text-sm text-gray-500">Thông báo khi bạn chưa hoàn thành mục tiêu ngày</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <h3 className="font-bold text-gray-900">Thành tích và Cấp độ</h3>
                      <p className="text-sm text-gray-500">Thông báo khi bạn đạt thành tích hoặc lên cấp mới</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <h3 className="font-bold text-gray-900">Hoạt động cộng đồng</h3>
                      <p className="text-sm text-gray-500">Thông báo khi có người tương tác với bài đăng của bạn</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <h3 className="font-bold text-gray-900">Cập nhật hệ thống</h3>
                      <p className="text-sm text-gray-500">Tin tức về tính năng mới và bảo trì từ Zentask</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Quyền riêng tư</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <h3 className="font-bold text-gray-900">Hiển thị hồ sơ công khai</h3>
                      <p className="text-sm text-gray-500">Cho phép người khác xem hồ sơ và thành tích của bạn</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <h3 className="font-bold text-gray-900">Hiện trạng thái hoạt động</h3>
                      <p className="text-sm text-gray-500">Người khác có thể thấy khi bạn đang online</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Bảo mật</h2>
                <div className="space-y-4">
                  <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl border border-gray-100">
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900">Đổi mật khẩu</h3>
                      <p className="text-sm text-gray-500">Cập nhật mật khẩu mới cho tài khoản</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl border border-gray-100">
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900">Xác thực 2 bước (2FA)</h3>
                      <p className="text-sm text-gray-500">Tăng cường bảo mật với mã xác nhận qua điện thoại</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-400">Chưa bật</span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                  <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl border border-gray-100">
                    <div className="text-left">
                      <h3 className="font-bold text-red-600">Xóa tài khoản</h3>
                      <p className="text-sm text-gray-500">Xóa vĩnh viễn dữ liệu và tiến trình học</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Giao diện</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button className="flex flex-col items-center gap-3 p-4 bg-blue-50 border-2 border-blue-600 rounded-2xl transition-all">
                    <div className="w-full h-24 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                      <div className="h-6 bg-gray-100 border-b border-gray-200"></div>
                      <div className="flex-1 p-2 flex gap-2">
                        <div className="w-1/3 h-full bg-gray-100 rounded"></div>
                        <div className="w-2/3 h-full bg-blue-50 rounded"></div>
                      </div>
                    </div>
                    <span className="font-bold text-blue-700">Sáng</span>
                  </button>
                  <button className="flex flex-col items-center gap-3 p-4 bg-gray-50 border-2 border-transparent hover:border-gray-200 rounded-2xl transition-all">
                    <div className="w-full h-24 bg-gray-900 rounded-xl shadow-sm border border-gray-800 overflow-hidden flex flex-col">
                      <div className="h-6 bg-gray-800 border-b border-gray-700"></div>
                      <div className="flex-1 p-2 flex gap-2">
                        <div className="w-1/3 h-full bg-gray-800 rounded"></div>
                        <div className="w-2/3 h-full bg-gray-800/50 rounded"></div>
                      </div>
                    </div>
                    <span className="font-bold text-gray-600">Tối</span>
                  </button>
                  <button className="flex flex-col items-center gap-3 p-4 bg-gray-50 border-2 border-transparent hover:border-gray-200 rounded-2xl transition-all">
                    <div className="w-full h-24 bg-gradient-to-br from-white to-gray-900 rounded-xl shadow-sm border border-gray-300 overflow-hidden flex flex-col">
                      <div className="h-6 bg-gray-200 border-b border-gray-300"></div>
                      <div className="flex-1 flex">
                        <div className="w-1/2 h-full bg-white"></div>
                        <div className="w-1/2 h-full bg-gray-900"></div>
                      </div>
                    </div>
                    <span className="font-bold text-gray-600">Hệ thống</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "audio" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Âm thanh</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <h3 className="font-bold text-gray-900">Hiệu ứng âm thanh</h3>
                      <p className="text-sm text-gray-500">Phát âm thanh khi hoàn thành bài tập hoặc lên cấp</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <h3 className="font-bold text-gray-900">Đọc từ vựng tự động</h3>
                      <p className="text-sm text-gray-500">Tự động phát âm thanh khi lật thẻ từ vựng</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "language" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Ngôn ngữ</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🇻🇳</span>
                        <span className="font-bold text-blue-900">Tiếng Việt</span>
                      </div>
                      <div className="w-5 h-5 rounded-full border-4 border-blue-600 bg-white"></div>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🇬🇧</span>
                        <span className="font-bold text-gray-700">English</span>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "help" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Trợ giúp & Hỗ trợ</h2>
                <div className="space-y-4">
                  <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl border border-gray-100">
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900">Trung tâm trợ giúp</h3>
                      <p className="text-sm text-gray-500">Các câu hỏi thường gặp và hướng dẫn sử dụng</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl border border-gray-100">
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900">Liên hệ hỗ trợ</h3>
                      <p className="text-sm text-gray-500">Gửi tin nhắn cho đội ngũ phát triển Zentask</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl border border-gray-100">
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900">Góp ý & Báo lỗi</h3>
                      <p className="text-sm text-gray-500">Giúp chúng tôi cải thiện ứng dụng tốt hơn</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Thay đổi ảnh đại diện</h3>
              <p className="text-sm text-gray-500 mt-1">Dán đường dẫn (URL) hình ảnh bạn muốn sử dụng.</p>
            </div>

            <div className="p-6">
              <textarea
                type="text"
                placeholder="https://example.com/avatar.jpg"
                value={tempPhotoURL}
                onChange={(e) => setTempPhotoURL(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 h-32 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                autoFocus
              ></textarea>

              {tempPhotoURL && (
                <div className="mt-4 flex justify-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 shadow-sm">
                    <img
                      src={tempPhotoURL}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop";
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowAvatarModal(false)} className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
                Hủy
              </button>
              <button onClick={handleConfirmAvatar} className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return <SettingsIconLucide className={className} />;
}
