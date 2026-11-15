import React, { useState } from "react";
import { AlertCircle, Key, Lock, Mail, Shield, User as UserIcon, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        if (!fullName.trim()) throw new Error("Vui lòng nhập họ và tên");
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Đã xảy ra lỗi khi xác thực";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string, name?: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    if (name) setFullName(name);
    setError(null);
  };

  return (
    <div className="modal-backdrop" onClick={closeAuthModal}>
      <div className="modal-card auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon"><Shield size={20} /></div>
            <div>
              <h3>{isRegister ? "Đăng ký tài khoản nghiên cứu" : "Đăng nhập TrustMedia AI"}</h3>
              <p>{isRegister ? "Tạo tài khoản để lưu trữ và quản trị phân tích" : "Xác thực phiên làm việc để truy cập đầy đủ tính năng"}</p>
            </div>
          </div>
          <button className="icon-btn-ghost" onClick={closeAuthModal}><X size={18} /></button>
        </div>

        {error && (
          <div className="form-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="form-field">
              <label>Họ và tên</label>
              <div className="input-with-icon">
                <UserIcon size={16} />
                <input
                  type="text"
                  placeholder="TS. Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-field">
            <label>Email nghiên cứu / cơ quan</label>
            <div className="input-with-icon">
              <Mail size={16} />
              <input
                type="email"
                placeholder="researcher@trustmedia.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label>Mật khẩu</label>
            <div className="input-with-icon">
              <Lock size={16} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="button button-primary auth-submit-btn" disabled={loading}>
            {loading ? "Đang xử lý..." : isRegister ? "Tạo tài khoản" : "Đăng nhập ngay"}
          </button>
        </form>

        <div className="demo-accounts-box">
          <div className="demo-label">
            <Key size={13} />
            <span>Tài khoản mẫu để thử nghiệm nhanh:</span>
          </div>
          <div className="demo-btns-row">
            <button
              type="button"
              className="demo-btn"
              onClick={() => handleDemoFill("admin@trustmedia.ai", "Admin@123456", "Administrator")}
            >
              👑 Quản trị viên (Admin)
            </button>
            <button
              type="button"
              className="demo-btn"
              onClick={() => handleDemoFill("researcher@trustmedia.ai", "Research@123456", "Nhà nghiên cứu")}
            >
              🔬 Nhà nghiên cứu (User)
            </button>
          </div>
        </div>

        <div className="modal-footer-switch">
          <span>{isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}</span>
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
          >
            {isRegister ? "Đăng nhập tại đây" : "Đăng ký tài khoản mới"}
          </button>
        </div>
      </div>
    </div>
  );
}

