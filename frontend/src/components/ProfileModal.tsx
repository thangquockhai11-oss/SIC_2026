import React, { useState } from "react";
import { CheckCircle2, Lock, ShieldCheck, User as UserIcon, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, updateProfile, logout } = useAuth();
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
      setStatusMsg({ type: "success", text: "Thông tin hồ sơ đã được cập nhật thành công!" });
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon"><UserIcon size={20} /></div>
            <div>
              <h3>Hồ sơ tài khoản</h3>
              <p>Quản lý thông tin xác thực và vai trò trong hệ thống</p>
            </div>
          </div>
          <button className="icon-btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="profile-badge-row">
          <div className="avatar-circle">{user.full_name.charAt(0).toUpperCase()}</div>
          <div>
            <strong>{user.full_name}</strong>
            <span className="profile-email">{user.email}</span>
            <div className="role-tag">
              <ShieldCheck size={12} />
              <span>{user.role === "admin" ? "Quản trị viên hệ thống (Admin)" : "Nhà nghiên cứu (Researcher)"}</span>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div className={statusMsg.type === "success" ? "form-success-banner" : "form-error-banner"}>
            <CheckCircle2 size={16} />
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="auth-form">
          <div className="form-field">
            <label>Họ và tên hiển thị</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="divider-line" />
          <div className="field-hint">Đổi mật khẩu (bỏ trống nếu không đổi):</div>

          <div className="form-field">
            <label>Mật khẩu hiện tại</label>
            <div className="input-with-icon">
              <Lock size={15} />
              <input
                type="password"
                placeholder="Nhập mật khẩu hiện tại"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Mật khẩu mới</label>
            <div className="input-with-icon">
              <Lock size={15} />
              <input
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-actions-between">
            <button
              type="button"
              className="button button-outline-danger"
              onClick={() => {
                logout();
                onClose();
              }}
            >
              Đăng xuất
            </button>
            <button type="submit" className="button button-primary" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

