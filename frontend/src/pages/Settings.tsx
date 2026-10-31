import { useState, useEffect } from "react";
import { UserAvatar } from "../components/ui/UserAvatar";
import { User, Bell, Shield, Key, Moon, Volume2, Globe, HelpCircle, LogOut, ChevronRight, Sun, Monitor, Palette } from "lucide-react";
import { cn } from "../lib/utils";
import { applyAppAppearance, type AppAccentColor, type AppThemeMode, useAuth } from "../contexts/AuthContext";
import { useFlashcardStore } from "../services/flashcardService";
import toastService from "@/src/services/toastService";
import axiosInstance from "@/src/services/axiosConfig";
import { Button } from "@/src/components/ui/Button";
import { Select } from "@/src/components/ui/Select";
import { Textarea } from "@/src/components/ui/Textarea";
import { Input } from "@/src/components/ui/Input";
import { ChangePasswordModal } from "@/src/components/Settings/ChangePasswordModal";

export function Settings() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  // Form states
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Avatar Modal State
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [tempPhotoURL, setTempPhotoURL] = useState("");

  // App Settings State
  const { sets, fetchSets } = useFlashcardStore();
  const [defaultSetId, setDefaultSetId] = useState("");
  const [themeMode, setThemeMode] = useState<AppThemeMode>("light");
  const [accentColor, setAccentColor] = useState<AppAccentColor>("blue");
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);

  // Fake states for UI interaction
  const [notifyReminder, setNotifyReminder] = useState(true);
  const [notifyAchievement, setNotifyAchievement] = useState(true);
  const [notifyCommunity, setNotifyCommunity] = useState(true);
  const [notifySystem, setNotifySystem] = useState(false);

  const [privacyPublic, setPrivacyPublic] = useState(true);
  const [privacyOnline, setPrivacyOnline] = useState(false);

  const [audioEffects, setAudioEffects] = useState(true);
  const [audioAutoPlay, setAudioAutoPlay] = useState(true);
  
  const [activeLanguage, setActiveLanguage] = useState("vi");

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setUsername(user.username || user.email?.split("@")[0] || "");
      setBio(user.bio || "");
      setPhotoURL(user.photoURL || "");
      const settings = user.appSettings || {};
      setThemeMode(settings.theme || "light");
      setAccentColor(settings.accentColor || "blue");
      applyAppAppearance(settings);
    }
    fetchSets();
    const savedDefault = localStorage.getItem("defaultFlashcardSetId");
    if (savedDefault) {
      setDefaultSetId(savedDefault);
    }
  }, [user, fetchSets]);

  const handleChangeAvatar = () => {
    setTempPhotoURL(photoURL);
    setShowAvatarModal(true);
  };

  const handleConfirmAvatar = () => {
    setPhotoURL(tempPhotoURL.trim());
    setShowAvatarModal(false);
  };

  const handlePreviewAppearance = (nextTheme = themeMode, nextAccent = accentColor) => {
    setThemeMode(nextTheme);
    setAccentColor(nextAccent);
    applyAppAppearance({ theme: nextTheme, accentColor: nextAccent });
  };

  const handleSaveAppearance = async () => {
    setIsSavingAppearance(true);
    try {
      const res = await axiosInstance.put(`/api/user/settings`, {
        appSettings: { theme: themeMode, accentColor },
      });
      updateUser({ appSettings: res.data.appSettings || { theme: themeMode, accentColor } });
      applyAppAppearance(res.data.appSettings || { theme: themeMode, accentColor });
      toastService.success("Đã lưu giao diện cho tài khoản của bạn!");
    } catch (error: any) {
      toastService.error(error?.message || "Lưu giao diện thất bại");
    } finally {
      setIsSavingAppearance(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await axiosInstance.put(`/api/user/profile`, {
        displayName,
        username,
        bio,
        photoURL,
      });
      if (!res.data.error) {
        updateUser({ displayName, username, bio, photoURL });
        toastService.success("Đã cập nhật hồ sơ thành công!");
      } else {
        toastService.error("Đã xảy ra lỗi");
      }
    } catch (error: any) {
      toastService.error("Đã xảy ra lỗi");
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
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-[3px] border-slate-100 shadow-[0_8px_0_0_#e2e8f0]">
        <h1 className="text-2xl font-black text-slate-800 mb-2">Cài đặt</h1>
        <p className="text-slate-500 font-bold">Quản lý tài khoản và các tùy chọn cá nhân của bạn.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar / Top Nav on Mobile */}
        <div className="flex overflow-x-auto whitespace-nowrap pb-2 md:pb-0 md:whitespace-normal md:flex-col md:w-64 flex-shrink-0 gap-2 md:gap-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-sm transition-all border-[2px]",
                activeTab === tab.id ? "bg-blue-50 text-blue-600 border-white shadow-[0_4px_0_0_#e2e8f0]" : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800",
              )}
            >
              <tab.icon className={cn("w-5 h-5 stroke-[2.5]", activeTab === tab.id ? "text-blue-600" : "text-slate-400")} />
              {tab.label}
            </Button>
          ))}
          <div className="hidden md:block h-0.5 bg-slate-100 my-4" />
          <Button className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-sm text-red-500 hover:bg-red-50 border-[2px] border-transparent hover:border-white hover:shadow-[0_4px_0_0_#fecaca] transition-all">
            <LogOut className="w-5 h-5 stroke-[2.5]" />
            Đăng xuất
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-[2rem] p-6 md:p-8 border-[3px] border-slate-100 shadow-[0_8px_0_0_#e2e8f0]">
          {activeTab === "account" && (
            <div className="space-y-8 animate-in fade-in zoom-in-[0.98] duration-300">
              <div>
                <h2 className="text-xl font-black text-slate-800 mb-6">Thông tin cá nhân</h2>
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="relative cursor-pointer group" onClick={handleChangeAvatar}>
                    <UserAvatar
                      src={photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg"}
                      level={user?.level || 1}
                      className="w-24 h-24 transition-opacity group-hover:opacity-80 border-4 border-white shadow-[0_4px_0_0_#e2e8f0]"
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-slate-800">Ảnh đại diện</h3>
                    <p className="text-sm font-medium text-slate-500">Bạn có thể dán đường dẫn hình ảnh (URL) để làm ảnh đại diện.</p>
                    <div className="flex gap-2 mt-2">
                      <Button onClick={handleChangeAvatar} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors">
                        Thay đổi
                      </Button>
                      <Button onClick={() => setPhotoURL("")} className="px-4 py-2 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors">
                        Xóa
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Tên hiển thị</label>
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Tên người dùng (@)</label>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Tiểu sử</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Mô tả ngắn gọn về bản thân hoặc mục tiêu học tập của bạn..."
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Email</label>
                  <Input type="email" defaultValue={user?.email || ""} disabled className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-500 cursor-not-allowed" />
                  <p className="text-xs text-gray-500">Email được liên kết với tài khoản đăng nhập của bạn.</p>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Cài đặt Ứng dụng</h3>
                <div className="space-y-1.5 max-w-md">
                  <label className="text-sm font-bold text-gray-700">Bộ thẻ mặc định</label>
                  <Select
                    value={defaultSetId}
                    onChange={(e) => {
                      setDefaultSetId(e.target.value);
                      if (e.target.value) {
                        localStorage.setItem("defaultFlashcardSetId", e.target.value);
                        toastService.success("Đã cập nhật bộ thẻ mặc định!");
                      } else {
                        localStorage.removeItem("defaultFlashcardSetId");
                      }
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                  >
                    <option value="">-- Không có --</option>
                    {sets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">Được sử dụng khi lưu từ vựng nhanh từ danh sách Người mới bắt đầu.</p>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-slate-100 flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-6 py-3.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center gap-2 border-[3px] border-white shadow-[0_6px_0_0_#2563eb] hover:-translate-y-1 hover:shadow-[0_10px_0_0_#2563eb] active:translate-y-1 active:shadow-[0_0px_0_0_#2563eb]"
                >
                  {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-8 animate-in fade-in zoom-in-[0.98] duration-300">
              <div>
                <h2 className="text-xl font-black text-slate-800 mb-6">Thông báo</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border-2 border-slate-100">
                    <div>
                      <h3 className="font-black text-slate-800">Nhắc nhở học tập</h3>
                      <p className="text-sm font-medium text-slate-500">Thông báo khi bạn chưa hoàn thành mục tiêu ngày</p>
                    </div>
                    <GamifiedToggle checked={notifyReminder} onChange={setNotifyReminder} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border-2 border-slate-100">
                    <div>
                      <h3 className="font-black text-slate-800">Thành tích và Cấp độ</h3>
                      <p className="text-sm font-medium text-slate-500">Thông báo khi bạn đạt thành tích hoặc lên cấp mới</p>
                    </div>
                    <GamifiedToggle checked={notifyAchievement} onChange={setNotifyAchievement} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border-2 border-slate-100">
                    <div>
                      <h3 className="font-black text-slate-800">Hoạt động cộng đồng</h3>
                      <p className="text-sm font-medium text-slate-500">Thông báo khi có người tương tác với bài đăng của bạn</p>
                    </div>
                    <GamifiedToggle checked={notifyCommunity} onChange={setNotifyCommunity} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border-2 border-slate-100">
                    <div>
                      <h3 className="font-black text-slate-800">Cập nhật hệ thống</h3>
                      <p className="text-sm font-medium text-slate-500">Tin tức về tính năng mới và bảo trì từ Zentask</p>
                    </div>
                    <GamifiedToggle checked={notifySystem} onChange={setNotifySystem} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-8 animate-in fade-in zoom-in-[0.98] duration-300">
              <div>
                <h2 className="text-xl font-black text-slate-800 mb-6">Quyền riêng tư</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border-2 border-slate-100">
                    <div>
                      <h3 className="font-black text-slate-800">Hiển thị hồ sơ công khai</h3>
                      <p className="text-sm font-medium text-slate-500">Cho phép người khác xem hồ sơ và thành tích của bạn</p>
                    </div>
                    <GamifiedToggle checked={privacyPublic} onChange={setPrivacyPublic} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border-2 border-slate-100">
                    <div>
                      <h3 className="font-black text-slate-800">Hiện trạng thái hoạt động</h3>
                      <p className="text-sm font-medium text-slate-500">Người khác có thể thấy khi bạn đang online</p>
                    </div>
                    <GamifiedToggle checked={privacyOnline} onChange={setPrivacyOnline} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-8 animate-in fade-in zoom-in-[0.98] duration-300">
              <div>
                <h2 className="text-xl font-black text-slate-800 mb-6">Bảo mật</h2>
                <div className="space-y-4">
                  <Button
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border-2 border-slate-100 shadow-[0_4px_0_0_#e2e8f0] hover:-translate-y-1 hover:shadow-[0_6px_0_0_#e2e8f0] active:translate-y-1 active:shadow-[0_0px_0_0_#e2e8f0]"
                  >
                    <div className="text-left">
                      <h3 className="font-black text-slate-800">Đổi mật khẩu</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">Cập nhật mật khẩu mới cho tài khoản</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 stroke-[3]" />
                  </Button>
                  <Button className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border-2 border-slate-100 shadow-[0_4px_0_0_#e2e8f0] hover:-translate-y-1 hover:shadow-[0_6px_0_0_#e2e8f0] active:translate-y-1 active:shadow-[0_0px_0_0_#e2e8f0]">
                    <div className="text-left">
                      <h3 className="font-black text-slate-800">Xác thực 2 bước (2FA)</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">Tăng cường bảo mật với mã xác nhận qua điện thoại</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Chưa bật</span>
                      <ChevronRight className="w-5 h-5 text-slate-400 stroke-[3]" />
                    </div>
                  </Button>
                  <Button className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 transition-colors rounded-2xl border-2 border-red-100 shadow-[0_4px_0_0_#fee2e2] hover:-translate-y-1 hover:shadow-[0_6px_0_0_#fee2e2] active:translate-y-1 active:shadow-[0_0px_0_0_#fee2e2]">
                    <div className="text-left">
                      <h3 className="font-black text-red-600">Xóa tài khoản</h3>
                      <p className="text-sm font-medium text-red-500 mt-1">Xóa vĩnh viễn dữ liệu và tiến trình học</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-red-400 stroke-[3]" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-8 animate-in fade-in zoom-in-[0.98] duration-300">
              <div>
                <h2 className="text-xl font-black text-slate-800 mb-2">Giao diện</h2>
                <p className="text-sm font-medium text-slate-500 mb-6">Chọn giao diện sáng/tối và màu nhấn. Lựa chọn này sẽ được lưu theo tài khoản của bạn.</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: "light" as AppThemeMode, label: "Sáng", icon: Sun, preview: "light" },
                    { id: "dark" as AppThemeMode, label: "Tối", icon: Moon, preview: "dark" },
                    { id: "system" as AppThemeMode, label: "Theo máy", icon: Monitor, preview: "system" },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = themeMode === item.id;
                    return (
                      <Button
                        key={item.id}
                        type="button"
                        onClick={() => handlePreviewAppearance(item.id, accentColor)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-4 rounded-[1.5rem] border-[3px] transition-all text-left group",
                          active ? "border-blue-500 shadow-[0_6px_0_0_#2563eb] -translate-y-1 bg-blue-500/10" : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100 hover:shadow-[0_4px_0_0_#e2e8f0]",
                        )}
                        style={active ? { borderColor: 'var(--zt-accent)', backgroundColor: 'color-mix(in srgb, var(--zt-accent) 10%, transparent)', boxShadow: '0 6px 0 0 var(--zt-accent)' } : undefined}
                      >
                        <div
                          className={cn("w-full h-24 rounded-[1rem] shadow-sm border-2 overflow-hidden flex flex-col transition-transform group-hover:scale-105", item.preview === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}
                        >
                          <div className={cn("h-6 border-b-2", item.preview === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200")}></div>
                          <div className="flex-1 p-2 flex gap-2">
                            <div className={cn("w-1/3 h-full rounded-md", item.preview === "dark" ? "bg-slate-800" : "bg-slate-100")}></div>
                            <div className={cn("w-2/3 h-full rounded-md", item.preview === "dark" ? "bg-slate-800/60" : "bg-blue-50")}></div>
                          </div>
                        </div>
                        <span 
                          className={cn("font-black flex items-center gap-2 text-[15px]", active ? "" : "text-slate-600")}
                          style={active ? { color: 'var(--zt-accent)' } : undefined}
                        >
                          <Icon className="w-5 h-5 stroke-[2.5]" /> {item.label}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6 border-t-2 border-slate-100">
                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-500 stroke-[2.5]" /> Màu nhấn
                </h3>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: "blue" as AppAccentColor, label: "Xanh dương", color: "#3b82f6" },
                    { id: "purple" as AppAccentColor, label: "Tím", color: "#8b5cf6" },
                    { id: "green" as AppAccentColor, label: "Xanh lá", color: "#58cc02" },
                    { id: "orange" as AppAccentColor, label: "Cam", color: "#f97316" },
                    { id: "pink" as AppAccentColor, label: "Hồng", color: "#ec4899" },
                    { id: "slate" as AppAccentColor, label: "Ghi", color: "#64748b" },
                  ].map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      onClick={() => handlePreviewAppearance(themeMode, item.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-2xl border-[3px] px-4 py-2.5 text-sm font-black transition-all",
                        accentColor === item.id ? "shadow-[0_4px_0_0_var(--zt-accent)] -translate-y-1" : "border-slate-100 bg-white text-slate-600 hover:bg-slate-50 hover:shadow-[0_4px_0_0_#e2e8f0]",
                      )}
                      style={accentColor === item.id ? { 
                        borderColor: 'var(--zt-accent)', 
                        backgroundColor: 'color-mix(in srgb, var(--zt-accent) 10%, transparent)',
                        color: 'var(--zt-accent)'
                      } : undefined}
                    >
                      <span className="w-5 h-5 rounded-full shadow-sm border-2 border-white" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t-2 border-slate-100 flex justify-end">
                <Button
                  onClick={handleSaveAppearance}
                  disabled={isSavingAppearance}
                  className="px-6 py-3.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center gap-2 border-[3px] border-white shadow-[0_6px_0_0_#2563eb] hover:-translate-y-1 hover:shadow-[0_10px_0_0_#2563eb] active:translate-y-1 active:shadow-[0_0px_0_0_#2563eb]"
                >
                  {isSavingAppearance ? "Đang lưu..." : "Lưu giao diện"}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "audio" && (
            <div className="space-y-8 animate-in fade-in zoom-in-[0.98] duration-300">
              <div>
                <h2 className="text-xl font-black text-slate-800 mb-6">Âm thanh</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border-2 border-slate-100">
                    <div>
                      <h3 className="font-black text-slate-800">Hiệu ứng âm thanh</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">Phát âm thanh khi hoàn thành bài tập hoặc lên cấp</p>
                    </div>
                    <GamifiedToggle checked={audioEffects} onChange={setAudioEffects} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border-2 border-slate-100">
                    <div>
                      <h3 className="font-black text-slate-800">Đọc từ vựng tự động</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">Tự động phát âm thanh khi lật thẻ từ vựng</p>
                    </div>
                    <GamifiedToggle checked={audioAutoPlay} onChange={setAudioAutoPlay} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "language" && (
            <div className="space-y-8 animate-in fade-in zoom-in-[0.98] duration-300">
              <div>
                <h2 className="text-xl font-black text-slate-800 mb-6">Ngôn ngữ</h2>
                <div className="space-y-4">
                  <div 
                    className={cn("p-4 border-[3px] rounded-2xl cursor-pointer transition-all", activeLanguage === "vi" ? "bg-blue-50 border-blue-400 shadow-[0_4px_0_0_#93c5fd]" : "bg-slate-50 border-slate-100 hover:bg-slate-100 hover:shadow-[0_4px_0_0_#e2e8f0]")}
                    onClick={() => setActiveLanguage("vi")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🇻🇳</span>
                        <span className={cn("font-black text-lg", activeLanguage === "vi" ? "text-blue-600" : "text-slate-700")}>Tiếng Việt</span>
                      </div>
                      <div className={cn("w-6 h-6 rounded-full border-[3px]", activeLanguage === "vi" ? "border-blue-500 bg-blue-500 shadow-[inset_0_0_0_4px_#eff6ff]" : "border-slate-300")}></div>
                    </div>
                  </div>
                  <div 
                    className={cn("p-4 border-[3px] rounded-2xl cursor-pointer transition-all", activeLanguage === "en" ? "bg-blue-50 border-blue-400 shadow-[0_4px_0_0_#93c5fd]" : "bg-slate-50 border-slate-100 hover:bg-slate-100 hover:shadow-[0_4px_0_0_#e2e8f0]")}
                    onClick={() => setActiveLanguage("en")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🇬🇧</span>
                        <span className={cn("font-black text-lg", activeLanguage === "en" ? "text-blue-600" : "text-slate-700")}>English</span>
                      </div>
                      <div className={cn("w-6 h-6 rounded-full border-[3px]", activeLanguage === "en" ? "border-blue-500 bg-blue-500 shadow-[inset_0_0_0_4px_#eff6ff]" : "border-slate-300")}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "help" && (
            <div className="space-y-8 animate-in fade-in zoom-in-[0.98] duration-300">
              <div>
                <h2 className="text-xl font-black text-slate-800 mb-6">Trợ giúp & Hỗ trợ</h2>
                <div className="space-y-4">
                  <Button className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border-2 border-slate-100 shadow-[0_4px_0_0_#e2e8f0] hover:-translate-y-1 hover:shadow-[0_6px_0_0_#e2e8f0] active:translate-y-1 active:shadow-[0_0px_0_0_#e2e8f0]">
                    <div className="text-left">
                      <h3 className="font-black text-slate-800">Trung tâm trợ giúp</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">Các câu hỏi thường gặp và hướng dẫn sử dụng</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 stroke-[3]" />
                  </Button>
                  <a href="https://zalo.me/g/vappqohaaewiockcc9zc" target="_blank" className="block outline-none">
                    <Button className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border-2 border-slate-100 shadow-[0_4px_0_0_#e2e8f0] hover:-translate-y-1 hover:shadow-[0_6px_0_0_#e2e8f0] active:translate-y-1 active:shadow-[0_0px_0_0_#e2e8f0]">
                      <div className="text-left">
                        <h3 className="font-black text-slate-800">Liên hệ hỗ trợ</h3>
                        <p className="text-sm font-medium text-slate-500 mt-1">Gửi tin nhắn cho đội ngũ phát triển Zentask qua Zalo</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 stroke-[3]" />
                    </Button>
                  </a>
                  <a href="https://zalo.me/g/vappqohaaewiockcc9zc" target="_blank" className="block outline-none">
                    <Button className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border-2 border-slate-100 shadow-[0_4px_0_0_#e2e8f0] hover:-translate-y-1 hover:shadow-[0_6px_0_0_#e2e8f0] active:translate-y-1 active:shadow-[0_0px_0_0_#e2e8f0]">
                      <div className="text-left">
                        <h3 className="font-black text-slate-800">Góp ý & Báo lỗi</h3>
                        <p className="text-sm font-medium text-slate-500 mt-1">Giúp chúng tôi cải thiện ứng dụng tốt hơn</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 stroke-[3]" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-4 border-slate-100">
            <div className="p-6 border-b-2 border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800">Thay đổi ảnh đại diện</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Dán đường dẫn (URL) hình ảnh bạn muốn sử dụng.</p>
              </div>
            </div>

            <div className="p-6">
              <Textarea
                placeholder="https://example.com/avatar.jpg"
                value={tempPhotoURL}
                onChange={(e) => setTempPhotoURL(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-medium h-32 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                autoFocus
              ></Textarea>

              {tempPhotoURL && (
                <div className="mt-6 flex justify-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-[4px] border-white shadow-[0_8px_0_0_#e2e8f0]">
                    <img
                      src={tempPhotoURL}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg";
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t-2 border-slate-100 flex justify-end gap-3">
              <Button onClick={() => setShowAvatarModal(false)} className="px-5 py-3.5 rounded-2xl font-black text-slate-500 bg-white border-2 border-slate-200 hover:bg-slate-100 hover:text-slate-800 transition-all hover:-translate-y-1 shadow-[0_4px_0_0_#e2e8f0] hover:shadow-[0_6px_0_0_#e2e8f0] active:translate-y-1 active:shadow-[0_0px_0_0_#e2e8f0]">
                Hủy
              </Button>
              <Button onClick={handleConfirmAvatar} className="px-5 py-3.5 bg-blue-500 text-white font-black rounded-2xl hover:bg-blue-600 transition-all border-[3px] border-white shadow-[0_4px_0_0_#2563eb] hover:-translate-y-1 hover:shadow-[0_6px_0_0_#2563eb] active:translate-y-1 active:shadow-[0_0px_0_0_#2563eb]">
                Xác nhận
              </Button>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
    </div>
  );
}

function GamifiedToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "w-[56px] h-[32px] rounded-full p-1 transition-colors relative focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]",
        checked ? "bg-blue-500" : "bg-slate-200"
      )}
    >
      <div
        className={cn(
          "w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ease-spring",
          checked ? "translate-x-[24px]" : "translate-x-0"
        )}
      />
    </button>
  );
}
