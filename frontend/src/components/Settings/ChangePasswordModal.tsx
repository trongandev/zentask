import React, { useState } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { Button } from "@/src/components/ui/Button";
import { useAuthStore } from "@/src/services/authService";
import toastService from "@/src/services/toastService";
import { Lock, Eye, EyeOff } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { changePassword, loading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toastService.error("Mật khẩu mới không khớp.");
      return;
    }
    if (newPassword.length < 6) {
      toastService.error("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    const success = await changePassword(currentPassword, newPassword);
    if (success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6 bg-white rounded-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Đổi mật khẩu</h2>
          <p className="text-sm text-gray-500">Cập nhật mật khẩu mới cho tài khoản của bạn</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu hiện tại</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-colors pr-10"
              placeholder="Nhập mật khẩu hiện tại"
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu mới</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-colors pr-10"
              placeholder="Nhập mật khẩu mới"
              required
              minLength={6}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-colors pr-10"
              placeholder="Nhập lại mật khẩu mới"
              required
              minLength={6}
            />
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <Button type="button" variant="outline" size="default" className="flex-1 text-blue-500" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="default" size="default" className="flex-1 bg-blue-600 text-white hover:bg-blue-700" disabled={loading}>
            {loading ? "Đang xử lý..." : "Cập nhật"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
