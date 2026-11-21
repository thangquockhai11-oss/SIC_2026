import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      navigate("/fact-checking");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        if (!fullName.trim()) throw new Error("Vui lòng nhập họ và tên chuyên gia / nhà nghiên cứu");
        await register(email, password, fullName.trim());
      } else {
        await login(email, password);
      }
      navigate("/fact-checking");
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        (isRegister ? "Đăng ký tài khoản thất bại" : "Tài khoản hoặc mật khẩu không chính xác");
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
      navigate("/fact-checking");
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Đăng nhập thử nghiệm thất bại";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const triggerPasskeyAuth = () => {
    handleDemoLogin("admin@trustmedia.ai", "Admin@123456");
  };

  return (
    <div
      className="bg-[#f4f7f5] text-slate-800 antialiased min-h-screen flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900 relative"
      style={{
        backgroundImage:
          'url("https://lh3.googleusercontent.com/aida/ALJJyrAkY5QDpAy8BbfHbNj11YkdTi4SH4SeSaEfRV_EPEug9ODRTbzPoDaR4KxLr-TCr1hDah_-opoHv3y7g5GN6VYTjsuCpBGFW5u0dXLUWkQTUQPohR8LsPxuqdszKYVTjx1OfH4pymfa_xCK1YQzaDmNfi3ik0Xbr0rkV7cOQ_1kAPBx30YwCxIdDClpeCtxJHSpQ6xs4CRQ2-C_GfqAfo2xSnoG7FT3IS6hih1lUcTD")',
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
        fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Subtle academic background grid & accent radial glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#0d5c3a_0.75px,transparent_0.75px)] [background-size:24px_24px] opacity-[0.06] z-0"></div>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-200/25 blur-3xl pointer-events-none rounded-full z-0"></div>

      {/* Header: Minimal TrustMedia Brand Bar */}
      <header className="relative z-10 w-full border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline text-inherit">
            <div className="w-9 h-9 rounded-lg bg-[#0d5c3a] flex items-center justify-center text-white shadow-sm transition-transform duration-300 hover:scale-105">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-[18px] text-[#0d5c3a] tracking-tight">TrustMedia</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-[#0d5c3a] border border-emerald-200 whitespace-nowrap">
                ACADEMIC
              </span>
            </div>
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Cổng kiểm chứng thông tin báo chí &amp; truyền thông</span>
          </div>
        </div>
      </header>

      {/* Centered Login Stage */}
      <main className="relative z-10 flex-1 flex justify-center px-4 py-10 flex-col items-center">
        <div className="w-full max-w-[460px] mx-auto">
          {/* Main Glassmorphic/Clean Card with subtle gradient border & hover glow */}
          <div className="relative group/card rounded-2xl p-[1px] bg-gradient-to-b from-white/90 via-emerald-100/60 to-slate-200/60 shadow-[0_16px_40px_-8px_rgba(13,92,58,0.1),0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_-6px_rgba(13,92,58,0.16),0_8px_24px_-4px_rgba(0,0,0,0.06)] transition-all duration-500 ease-out">
            {/* Subtle ambient top highlight glow inside wrapper */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-emerald-400/20 blur-2xl pointer-events-none rounded-full opacity-60 group-hover/card:opacity-90 transition-opacity duration-700"></div>
            <div
              className="rounded-2xl p-8 sm:p-9 relative overflow-hidden backdrop-blur-md transition-all duration-300"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.92)", backdropFilter: "blur(16px)" }}
            >
              {/* Top institutional badge */}
              <div className="flex justify-center mb-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8f5e9] border border-[#a7f3d0] text-[#0d5c3a] shadow-xs transition-transform duration-300 hover:scale-105 select-none">
                  <span className="material-symbols-outlined text-[15px]">verified_user</span>
                  <span className="text-[11px] font-semibold tracking-wide uppercase">
                    Hội Đồng Thẩm Định Báo Chí
                  </span>
                </div>
              </div>

              {/* Segmented Control Switcher: Đăng nhập vs Đăng ký */}
              <div className="flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    !isRegister
                      ? "bg-white text-[#0d5c3a] shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">login</span>
                  <span>Đăng nhập</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    isRegister
                      ? "bg-white text-[#0d5c3a] shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">person_add</span>
                  <span>Đăng ký</span>
                </button>
              </div>

              {/* Heading and subtext */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                  {isRegister ? "Đăng ký tài khoản nghiên cứu" : "Đăng nhập hệ thống"}
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {isRegister
                    ? "Tạo tài khoản thẩm định viên để tham gia đối soát và phản biện thông tin báo chí."
                    : "Cổng xác thực & đối soát chứng cứ dành cho chuyên gia phản biện và hội đồng khoa học."}
                </p>
              </div>

              {!isRegister && (
                <>
                  {/* Social SSO Buttons */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <button
                      onClick={() => handleDemoLogin("researcher@trustmedia.ai", "Research@123456")}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white/80 hover:bg-white text-slate-700 text-xs font-medium shadow-xs hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-out group"
                      type="button"
                      title="Đăng nhập nhanh Google (Chuyên gia)"
                    >
                      <svg className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"></path>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"></path>
                      </svg>
                      <span className="group-hover:text-slate-900 transition-colors">Google</span>
                    </button>

                    <button
                      onClick={() => handleDemoLogin("admin@trustmedia.ai", "Admin@123456")}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white/80 hover:bg-white text-slate-700 text-xs font-medium shadow-xs hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-out group"
                      type="button"
                      title="Đăng nhập nhanh Microsoft 365 (Admin)"
                    >
                      <svg className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 23 23">
                        <path d="M1 1h10v10H1z" fill="#f35325"></path>
                        <path d="M12 1h10v10H12z" fill="#81bc06"></path>
                        <path d="M1 12h10v10H1z" fill="#05a6f0"></path>
                        <path d="M12 12h10v10H12z" fill="#ffba08"></path>
                      </svg>
                      <span className="group-hover:text-slate-900 transition-colors">Microsoft 365</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium px-1">
                      Hoặc tài khoản công vụ
                    </span>
                    <div className="flex-1 h-px bg-slate-200"></div>
                  </div>
                </>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Full name input for registration */}
                {isRegister && (
                  <div className="input-field-group">
                    <label
                      className="block text-xs font-semibold text-slate-700 mb-1.5 transition-colors"
                      htmlFor="fullNameInput"
                    >
                      Họ và tên chuyên gia / nhà nghiên cứu
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined input-icon absolute left-3.5 text-slate-400 text-[18px] pointer-events-none transition-all duration-200 ease-out">
                        person
                      </span>
                      <input
                        className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#0d5c3a] focus:ring-4 focus:ring-[#0d5c3a]/15 transition-all duration-200 ease-out shadow-xs"
                        id="fullNameInput"
                        placeholder="TS. Nguyễn Văn A"
                        required
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Email / Identifier Input */}
                <div className="input-field-group">
                  <label
                    className="block text-xs font-semibold text-slate-700 mb-1.5 transition-colors"
                    htmlFor="emailInput"
                  >
                    {isRegister ? "Email công vụ / cơ quan nghiên cứu" : "Email công vụ / Mã thẩm định viên"}
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined input-icon absolute left-3.5 text-slate-400 text-[18px] pointer-events-none transition-all duration-200 ease-out">
                      mail
                    </span>
                    <input
                      className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#0d5c3a] focus:ring-4 focus:ring-[#0d5c3a]/15 transition-all duration-200 ease-out shadow-xs"
                      id="emailInput"
                      placeholder="chuyengia@trustmedia.edu.vn"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="input-field-group">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 transition-colors" htmlFor="passwordInput">
                      {isRegister ? "Mật khẩu khởi tạo" : "Mật khẩu"}
                    </label>
                    {!isRegister && (
                      <a
                        className="text-xs font-medium text-[#0d5c3a] hover:text-[#08422a] hover:underline underline-offset-2 transition-colors"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          alert("Vui lòng liên hệ Quản trị viên hệ thống (admin@trustmedia.ai) để được cấp lại mật khẩu xác thực.");
                        }}
                      >
                        Quên mật khẩu?
                      </a>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined input-icon absolute left-3.5 text-slate-400 text-[18px] pointer-events-none transition-all duration-200 ease-out">
                      lock
                    </span>
                    <input
                      className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#0d5c3a] focus:ring-4 focus:ring-[#0d5c3a]/15 transition-all duration-200 ease-out shadow-xs"
                      id="passwordInput"
                      placeholder={isRegister ? "Tối thiểu 6 ký tự" : "••••••••••••"}
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      aria-label="Ẩn / Hiện mật khẩu"
                      className="absolute right-3 text-slate-400 hover:text-[#0d5c3a] p-1 rounded-md transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none"
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px] transition-transform duration-200 block">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox or Terms Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  {!isRegister ? (
                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                      <input
                        className="w-4 h-4 rounded text-[#0d5c3a] border-slate-300 focus:ring-[#0d5c3a]/30 focus:ring-offset-0 cursor-pointer transition-all duration-150"
                        id="rememberSession"
                        type="checkbox"
                        checked={rememberSession}
                        onChange={(e) => setRememberSession(e.target.checked)}
                      />
                      <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors">
                        Ghi nhớ phiên đăng nhập (30 ngày)
                      </span>
                    </label>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                      <input
                        className="w-4 h-4 rounded text-[#0d5c3a] border-slate-300 focus:ring-[#0d5c3a]/30 focus:ring-offset-0 cursor-pointer transition-all duration-150"
                        id="termsConsent"
                        type="checkbox"
                        required
                        defaultChecked
                      />
                      <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors">
                        Tuân thủ Quy chuẩn Đạo đức Thẩm định &amp; COPE
                      </span>
                    </label>
                  )}
                </div>

                {/* Primary Submit CTA */}
                <button
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#0d5c3a] via-[#0f6741] to-[#0d5c3a] hover:from-[#0f6741] hover:to-[#09462c] text-white text-sm font-semibold tracking-wide flex items-center justify-center gap-2 shadow-md shadow-[#0d5c3a]/25 hover:shadow-[0_6px_24px_rgba(13,92,58,0.4)] hover:brightness-105 active:scale-[0.985] transition-all duration-300 ease-out relative overflow-hidden group disabled:opacity-80"
                  id="submitBtn"
                  type="submit"
                  disabled={loading}
                >
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white relative z-10" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor"></path>
                      </svg>
                      <span className="relative z-10">Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <span className="relative z-10">{isRegister ? "Đăng ký tài khoản mới" : "Đăng nhập ngay"}</span>
                      <span className="material-symbols-outlined text-[18px] relative z-10 transition-transform duration-300 group-hover:translate-x-1">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </form>

              {/* Passkey option (in login mode) */}
              {!isRegister && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white/70 hover:bg-emerald-50/50 hover:border-emerald-300 hover:shadow-sm text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 group"
                    onClick={triggerPasskeyAuth}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[17px] text-[#0d5c3a] transition-transform duration-200 group-hover:scale-110">
                      fingerprint
                    </span>
                    <span className="group-hover:text-slate-900 transition-colors">
                      Sử dụng Khóa bảo mật Passkey / SmartCard
                    </span>
                  </button>
                </div>
              )}

              {/* Footer inside card */}
              <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  {isRegister ? "Đã có tài khoản hệ thống?" : "Chưa có tài khoản nghiên cứu?"}
                  <button
                    type="button"
                    className="font-semibold text-[#0d5c3a] hover:text-[#08422a] hover:underline underline-offset-2 ml-1 transition-colors"
                    onClick={() => {
                      setIsRegister(!isRegister);
                      setError(null);
                    }}
                  >
                    {isRegister ? "Đăng nhập tại đây" : "Đăng ký thành viên mới"}
                  </button>
                </p>
                {!isRegister && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cần cấp quyền hội đồng?{" "}
                    <a
                      className="text-[#0d5c3a] hover:underline"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        alert("Vui lòng gửi email đến Ban thư ký Hội đồng Thẩm định: banthuky@trustmedia.ai hoặc admin@trustmedia.ai");
                      }}
                    >
                      Liên hệ Ban thư ký
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trust note below card */}
        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-emerald-600">verified</span>
            Chuẩn IFCN Standard v2.4
          </span>
          <span>•</span>
          <span>Viện Nghiên cứu Báo chí &amp; Truyền thông</span>
        </div>
      </main>

      {/* Clean Academic Footer */}
      <footer className="relative z-10 w-full border-t border-slate-200/80 bg-white/60 py-4 text-center sm:text-left">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <span>© 2026 TrustMedia Academic. ĐH KHXH&amp;NV. Tất cả các quyền được bảo lưu.</span>
          </div>
          <div className="flex items-center gap-4">
            <a className="hover:text-[#0d5c3a] transition-colors" href="#">
              Quy chuẩn đạo đức báo chí
            </a>
            <a className="hover:text-[#0d5c3a] transition-colors" href="#">
              Bảo mật &amp; Dữ liệu
            </a>
            <a className="hover:text-[#0d5c3a] transition-colors" href="#">
              Hỗ trợ kỹ thuật
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
