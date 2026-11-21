import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, isAdmin, roleLabel, roleDescription, updateProfile, logout } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setLoading(true);
    try {
      await updateProfile(
        fullName !== user.full_name ? fullName : undefined,
        currentPassword || undefined,
        newPassword || undefined
      );
      setStatusMsg({ type: "success", text: "Thông tin hồ sơ học thuật đã được cập nhật thành công!" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Cập nhật hồ sơ thất bại";
      setStatusMsg({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden border border-surface-container flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-space-lg bg-surface-container-low/50 border-b border-surface-container flex items-start justify-between">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[18px] shadow-sm">
              {user.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
                  {user.full_name}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1 ${
                    isAdmin
                      ? "bg-primary-container text-on-primary"
                      : "bg-secondary-container text-on-secondary-container"
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {isAdmin ? "admin_panel_settings" : "science"}
                  </span>
                  <span>{isAdmin ? "Admin" : "User"}</span>
                </span>
              </div>
              <p className="font-mono text-[12px] text-on-surface-variant mt-0.5">{user.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
            title="Đóng cửa sổ"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-space-lg space-y-space-md max-h-[75vh] overflow-y-auto">
          {/* Role & Privileges Matrix */}
          <div className="bg-surface-container-low rounded-xl p-space-md border border-surface-container">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">badge</span>
                <span>Vai trò: {roleLabel}</span>
              </span>
              <span className="font-label-sm text-[11px] text-outline">RBAC v2.4</span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-space-sm leading-relaxed">
              {roleDescription}
            </p>

            {/* Privileges checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-space-xs border-t border-surface-container text-[12px]">
              <div className="flex items-center gap-1.5 text-on-surface">
                <span className="material-symbols-outlined text-[15px] text-primary-container">check_circle</span>
                <span className="font-semibold text-primary">1. Kiểm chứng phát ngôn</span>
              </div>
              <div className="flex items-center gap-1.5 text-on-surface">
                <span className="material-symbols-outlined text-[15px] text-primary-container">check_circle</span>
                <span className="font-semibold text-primary">2. Hồ sơ tòa soạn</span>
              </div>
              <div className="flex items-center gap-1.5 text-on-surface">
                <span className="material-symbols-outlined text-[15px] text-primary-container">check_circle</span>
                <span className="font-semibold text-primary">3. Báo cáo người đọc</span>
              </div>
              <div className="flex items-center gap-1.5 text-on-surface">
                {isAdmin ? (
                  <>
                    <span className="material-symbols-outlined text-[15px] text-primary-container">check_circle</span>
                    <span className="text-on-surface">4. Giám sát AI (EWAC)</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px] text-outline">lock</span>
                    <span className="text-on-surface-variant line-through opacity-70">4. Giám sát AI (Chỉ Admin)</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-on-surface">
                {isAdmin ? (
                  <>
                    <span className="material-symbols-outlined text-[15px] text-primary-container">check_circle</span>
                    <span className="text-on-surface">5. Kho bằng chứng</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px] text-outline">lock</span>
                    <span className="text-on-surface-variant line-through opacity-70">5. Kho bằng chứng (Chỉ Admin)</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-on-surface">
                {isAdmin ? (
                  <>
                    <span className="material-symbols-outlined text-[15px] text-primary-container">check_circle</span>
                    <span className="text-on-surface">6. Quản lý dữ liệu (CRUD)</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px] text-outline">lock</span>
                    <span className="text-on-surface-variant line-through opacity-70">6. Quản lý dữ liệu (Chỉ Admin)</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-on-surface sm:col-span-2">
                {isAdmin ? (
                  <>
                    <span className="material-symbols-outlined text-[15px] text-primary-container">check_circle</span>
                    <span className="text-on-surface">7. Lịch sử thẩm định & Lưu trữ</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px] text-outline">lock</span>
                    <span className="text-on-surface-variant line-through opacity-70">7. Lịch sử thẩm định (Chỉ Admin)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {statusMsg && (
            <div
              className={`p-space-sm rounded-lg border font-label-md text-label-md flex items-center gap-2 ${
                statusMsg.type === "success"
                  ? "bg-primary-container/10 border-primary-container/30 text-primary"
                  : "bg-error-container border-error/20 text-on-error-container"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {statusMsg.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleUpdate} className="space-y-space-md">
            <div>
              <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                Họ và tên hiển thị
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-space-md py-2 rounded-lg bg-surface-container-low border border-surface-container font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
              />
            </div>

            <div className="pt-space-xs border-t border-surface-container">
              <span className="block font-label-md text-label-md text-on-surface-variant font-semibold mb-2">
                Đổi mật khẩu tài khoản (để trống nếu không thay đổi):
              </span>

              <div className="space-y-space-sm">
                <div>
                  <label className="block font-label-sm text-label-sm text-outline mb-1">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu hiện tại..."
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-space-md py-2 rounded-lg bg-surface-container-low border border-surface-container font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
                  />
                </div>

                <div>
                  <label className="block font-label-sm text-label-sm text-outline mb-1">
                    Mật khẩu mới (tối thiểu 6 ký tự)
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu mới..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-space-md py-2 rounded-lg bg-surface-container-low border border-surface-container font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-space-sm">
              <button
                type="button"
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="px-space-md py-2 rounded-lg border border-error text-error hover:bg-error-container font-label-md text-label-md font-semibold transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>Đăng xuất</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-space-lg py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md font-semibold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>Lưu cập nhật</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
