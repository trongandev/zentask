import React from "react";
import { Modal } from "../../../components/shared/Modal";
import { Globe2, Lock, Crown, Trash2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import toast from "react-hot-toast";

// COLORS defined in Flashcards.tsx
export const COLORS = [
  "bg-blue-500", "bg-blue-600", "bg-blue-700", "bg-blue-800",
  "bg-red-500", "bg-red-600", "bg-red-700", "bg-red-800",
  "bg-yellow-500", "bg-yellow-600", "bg-yellow-700", "bg-yellow-800",
  "bg-green-500", "bg-green-600", "bg-green-700", "bg-green-800",
  "bg-purple-500", "bg-purple-600", "bg-purple-700", "bg-purple-800",
  "bg-pink-500", "bg-pink-600", "bg-pink-700", "bg-pink-800",
  "bg-orange-500", "bg-orange-600", "bg-orange-700", "bg-orange-800",
  "bg-teal-500", "bg-teal-600", "bg-teal-700", "bg-teal-800",
];

export function CreateEditFolderModal({
  isOpen, onClose, editingFolder,
  newFolderName, setNewFolderName,
  newFolderColor, setNewFolderColor,
  handleCreateOrUpdateFolder, loading
}: any) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingFolder ? "Sửa thư mục" : "Tạo Folder mới"} className="max-w-sm">
      <div className="p-6">
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tên thư mục</label>
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="VD: Tiếng Anh giao tiếp"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
              onKeyDown={(e) => {
                e.key === "Enter" && handleCreateOrUpdateFolder();
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Màu sắc</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewFolderColor(c)}
                  className={cn("w-6 h-6 rounded-full shadow-sm transition-transform flex-shrink-0", c, newFolderColor === c ? "ring-2 ring-offset-2 ring-blue-500 scale-125" : "hover:scale-110")}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl transition-colors">
            Hủy
          </button>
          <button onClick={handleCreateOrUpdateFolder} disabled={loading} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-md">
            Hoàn tất
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function DeleteFolderModal({
  folderToDelete, onClose, handleDeleteFolderConfirmed, loading
}: any) {
  return (
    <Modal isOpen={!!folderToDelete} onClose={onClose} className="max-w-sm text-center" hideCloseButton>
      {folderToDelete && (
        <div className="p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
            <Trash2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Xóa Folder này?</h2>

          {folderToDelete.step === 1 ? (
            <p className="text-gray-500 text-sm mb-6">
              Bạn đang xóa folder <strong className="text-gray-700">{folderToDelete.folder.name}</strong>.<br />
              Các bộ thẻ bên trong sẽ được chuyển ra ngoài (không bị xóa).
            </p>
          ) : (
            <p className="text-gray-500 text-sm mb-6">
              Xóa folder <strong className="text-gray-700">{folderToDelete.folder.name}</strong> và <strong className="text-red-600">TẤT CẢ</strong> bộ thẻ bên trong.
              <br />
              Hành động này không thể hoàn tác!
            </p>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl transition-colors">
              Hủy
            </button>
            <button
              onClick={() => handleDeleteFolderConfirmed(folderToDelete.folder.id, folderToDelete.step === 2)}
              disabled={loading}
              className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Xóa vĩnh viễn
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "🇬🇧 Tiếng Anh" },
  { code: "zh", label: "🇨🇳 Tiếng Trung" },
  { code: "ko", label: "🇰🇷 Tiếng Hàn" },
  { code: "ja", label: "🇯🇵 Tiếng Nhật" },
  { code: "de", label: "🇩🇪 Tiếng Đức" },
  { code: "fr", label: "🇫🇷 Tiếng Pháp" },
  { code: "es", label: "🇪🇸 Tiếng Tây Ban Nha" },
  { code: "th", label: "🇹🇭 Tiếng Thái" },
];

export function CreateEditSetModal({
  isOpen, onClose, editingSet,
  newTitle, setNewTitle,
  newDesc, setNewDesc,
  selectedCategoryId, setSelectedCategoryId, categories,
  setIsPublic, setSetIsPublic, isVip,
  selectedColor, setSelectedColor,
  selectedLanguage, setSelectedLanguage,
  handleCreateOrUpdateSet, loading
}: any) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingSet ? "Sửa bộ thẻ" : "Tạo bộ thẻ mới"} className="max-w-md">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Tên bộ thẻ</label>
          <input
            type="text"
            value={newTitle}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreateOrUpdateSet()}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ví dụ: Từ vựng IELTS..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả (Tùy chọn)</label>
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Mô tả về bộ thẻ này..."
            rows={3}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Ngôn ngữ học</label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">AI sẽ tạo từ vựng theo ngôn ngữ bộ thẻ này.</p>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Đề mục</label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">Không chọn đề mục</option>
            {categories.map((category: any) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Quyền riêng tư</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSetIsPublic(true)}
              className={`rounded-2xl border p-4 text-left transition-all ${setIsPublic ? "border-emerald-400 bg-emerald-50 ring-4 ring-emerald-100" : "border-gray-200 bg-gray-50 hover:bg-white"}`}
            >
              <div className="flex items-center gap-2 font-extrabold text-gray-900">
                <Globe2 className="w-5 h-5 text-emerald-600" /> Công khai
              </div>
              <p className="mt-1 text-xs font-medium text-gray-500">Mặc định. Mọi người có thể xem và lưu bộ thẻ này.</p>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isVip) {
                  toast.error("Bộ thẻ riêng tư chỉ dành cho tài khoản VIP.");
                  return;
                }
                setSetIsPublic(false);
              }}
              className={`rounded-2xl border p-4 text-left transition-all ${!setIsPublic ? "border-slate-400 bg-slate-100 ring-4 ring-slate-100" : "border-gray-200 bg-gray-50 hover:bg-white"} ${!isVip ? "opacity-75" : ""}`}
            >
              <div className="flex items-center gap-2 font-extrabold text-gray-900">
                <Lock className="w-5 h-5 text-slate-600" /> Riêng tư {!isVip && <Crown className="w-4 h-4 text-yellow-500" />}
              </div>
              <p className="mt-1 text-xs font-medium text-gray-500">Chỉ tài khoản VIP mới được tạo bộ thẻ riêng tư.</p>
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Màu sắc</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={cn("w-6 h-6 rounded-full shadow-sm transition-transform", c, selectedColor === c ? "ring-2 ring-offset-2 ring-blue-500 scale-125" : "hover:scale-110")}
              />
            ))}
          </div>
        </div>
        <button
          onClick={handleCreateOrUpdateSet}
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
        >
          {loading ? "Đang xử lý..." : "Hoàn tất"}
        </button>
      </div>
    </Modal>
  );
}

export function DeleteSetModal({
  setToDelete, onClose, handleDeleteSet, loading
}: any) {
  return (
    <Modal isOpen={!!setToDelete} onClose={onClose} className="max-w-sm text-center" hideCloseButton>
      {setToDelete && (
        <div className="p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
            <Trash2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Xóa bộ thẻ này?</h2>
          <p className="text-gray-500 text-sm mb-6">
            Bạn có chắc chắn muốn xóa bộ thẻ <strong className="text-gray-700">{setToDelete.title}</strong>?<br />
            <br />
            <span className="text-red-500 font-medium">Lưu ý: Tất cả từ vựng bên trong bộ thẻ này cũng sẽ bị xóa vĩnh viễn.</span>
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors">
              Hủy
            </button>
            <button
              onClick={() => handleDeleteSet(setToDelete.id)}
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? "Đang xóa..." : "Xóa vĩnh viễn"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
