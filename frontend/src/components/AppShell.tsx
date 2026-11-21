import { useState } from "react";
import { NavLink, Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAnalysis } from "../context/AnalysisContext";
import NewAnalysisModal from "./NewAnalysisModal";
import ProfileModal from "./ProfileModal";
import AuthModal from "./AuthModal";

export default function AppShell() {
  const { user, isAdmin } = useAuth();
  const { article, isModalOpen, openModal, closeModal, resetToPrototype } = useAnalysis();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleResetToPrototype = () => {
    resetToPrototype();
    navigate("/fact-checking");
  };

  type NavItem = {
    to: string;
    label: string;
    icon: string;
    matchRoot?: boolean;
  };

  // User ONLY has access to 3 core functions:
  // 1. Kiểm chứng phát ngôn (/fact-checking)
  // 2. Hồ sơ tòa soạn (/credibility)
  // 3. Báo cáo người đọc (/reports)
  // Admin has access to all 7 functions
  const baseNav: NavItem[] = [
    { to: "/fact-checking", label: "Kiểm chứng phát ngôn", icon: "fact_check", matchRoot: true },
    { to: "/credibility", label: "Hồ sơ tòa soạn", icon: "apartment" },
    { to: "/reports", label: "Báo cáo người đọc", icon: "bar_chart" },
  ];

  const adminNav: NavItem[] = [
    { to: "/agents", label: "Giám sát AI", icon: "smart_toy" },
    { to: "/evidence", label: "Kho bằng chứng", icon: "manage_search" },
    { to: "/datasets", label: "Quản lý dữ liệu", icon: "database" },
    { to: "/history", label: "Lịch sử", icon: "history" },
  ];

  const mainNav: NavItem[] = isAdmin ? [...baseNav, ...adminNav] : baseNav;

  const isTabActive = (item: NavItem) => {
    if (item.matchRoot && (location.pathname === "/" || location.pathname === "/fact-checking")) {
      return true;
    }
    return location.pathname === item.to || location.pathname.startsWith(item.to + "/");
  };

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface min-h-screen flex flex-col antialiased selection:bg-primary-container selection:text-on-primary">
      {/* Top Academic Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(24,40,36,0.04)] border-b border-surface-container">
        <div className="h-16 max-w-7xl mx-auto px-margin-mobile lg:px-margin flex items-center justify-between gap-space-lg">
          {/* Logo & Institute Title */}
          <Link to="/fact-checking" className="flex items-center gap-space-md group text-inherit no-underline">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-container text-on-primary shadow-sm group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">verified</span>
            </div>
            <div>
              <div className="flex items-center gap-space-xs">
                <span className="font-title-lg text-title-lg text-primary tracking-tight font-bold">TrustMedia</span>
                <span className="px-space-xs py-0.5 rounded-full bg-surface-container-highest text-secondary font-label-sm text-label-sm uppercase font-semibold">
                  Academic
                </span>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant line-clamp-1">
                Viện Nghiên cứu Báo chí & Truyền thông · ĐHKHXH&NV
              </p>
            </div>
          </Link>

          {/* Quick Search */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-space-lg">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
              <input
                className="w-full pl-9 pr-space-md py-1.5 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
                placeholder="Tra cứu mã kiểm chứng, URL bài báo hoặc tuyên bố..."
                type="text"
              />
            </div>
          </div>

          {/* User & Actions */}
          <div className="flex items-center gap-space-md">
            <button
              onClick={openModal}
              className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-all shadow-sm"
              title="Phân tích bài báo hoặc dán URL mới"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span className="hidden sm:inline">+ Phân tích bài báo mới</span>
              <span className="sm:hidden">+ Phân tích</span>
            </button>

            {user ? (
              <div
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-space-sm cursor-pointer hover:opacity-85 transition-opacity bg-surface-container-low px-2.5 py-1.5 rounded-lg border border-surface-container"
                title="Xem hồ sơ & bảng phân quyền"
              >
                <div className="hidden sm:flex flex-col text-right">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    {user.full_name || "Thành viên Thẩm định"}
                  </span>
                  <span className={`font-label-sm text-[11px] font-bold ${isAdmin ? "text-primary" : "text-secondary"}`}>
                    {isAdmin ? "👑 Hội đồng Khoa học (Admin)" : "🔬 Chuyên gia Thẩm định (User)"}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[13px] shadow-sm">
                  {user.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md font-semibold border border-surface-container transition-all shadow-sm"
                title="Đăng nhập tài khoản nghiên cứu hoặc quản trị"
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full pt-16 bg-surface min-h-screen flex-1 flex flex-col">
        {/* Article Context Header Section */}
        <section className="w-full bg-surface-container-lowest shadow-[0_1px_4px_rgba(24,40,36,0.03)] border-b border-surface-container">
          <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin pt-space-lg pb-0">
            {/* Category & Archive Code */}
            <div className="flex flex-wrap items-center justify-between gap-space-xs mb-space-xs text-on-surface-variant">
              <div className="flex flex-wrap items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] text-primary-container">folder_open</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wide font-medium">
                  {article.category || "Nghiên cứu Y tế & Sức khỏe cộng đồng"}
                </span>
                <span className="text-outline">•</span>
                <span className="font-label-sm text-label-sm font-semibold text-primary">
                  Mã lưu trữ {article.code || "#TM-2024-8841A"}
                </span>
              </div>

              {article.id !== "prototype-article-sample" && article.id !== "prototype-tuoitre-cancer" && (
                <button
                  onClick={handleResetToPrototype}
                  className="text-[12px] text-secondary hover:text-primary underline flex items-center gap-1"
                  title="Khôi phục bài báo mẫu mặc định"
                >
                  <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                  Xem bài mẫu chuẩn
                </button>
              )}
            </div>

            {/* Headline Title */}
            <h1 className="font-headline-md text-headline-md text-on-surface mb-space-sm font-bold tracking-tight">
              {article.title}
            </h1>

            {/* Metadata Bar */}
            <div className="flex flex-wrap items-center gap-y-1 gap-x-space-md pb-space-lg text-on-surface-variant">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-outline">newspaper</span>
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  {article.source_name || "Nguồn tin chưa xác định"}
                </span>
              </div>
              <span className="text-outline-variant">•</span>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-outline">calendar_today</span>
                <span className="font-label-md text-label-md">Ngày xuất bản: {article.publication_date || "N/A"}</span>
              </div>
              <span className="text-outline-variant">•</span>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-outline">edit_note</span>
                <span className="font-label-md text-label-md">Tác giả: {article.author || "Ban biên tập"}</span>
              </div>
              {article.source_url && (
                <>
                  <span className="text-outline-variant">•</span>
                  <a
                    href={article.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline font-label-md text-label-md font-medium"
                  >
                    <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                    Xem link gốc
                  </a>
                </>
              )}
            </div>

            {/* Sub-navigation Tabs */}
            <div className="overflow-x-auto">
              <nav className="flex items-center gap-space-xs py-1" aria-label="Phân hệ chức năng">
                {mainNav.map((item) => {
                  const active = isTabActive(item);
                  const targetUrl =
                    item.to === "/history" || item.to === "/datasets"
                      ? item.to
                      : article.id && article.id !== "prototype-tuoitre-cancer"
                      ? `${item.to}?id=${article.id}`
                      : item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={targetUrl}
                      className={`px-space-md py-2 rounded-lg font-label-md text-label-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        active
                          ? "bg-primary-container text-on-primary font-semibold shadow-sm"
                          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          </div>
        </section>

        {/* Content View Outlet */}
        <div className="flex-1 w-full">
          <Outlet />
        </div>
      </main>

      {/* Academic Footer */}
      <footer className="w-full bg-surface-container-low border-t border-surface-container mt-auto">
        <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-xs">
              <span className="font-title-lg text-title-lg text-primary font-bold">TrustMedia Verification Archive</span>
              <span className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm font-semibold">
                ĐHQG TP.HCM
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
              Cơ sở dữ liệu học thuật thẩm định thông tin truyền thông trực thuộc Viện Nghiên cứu Báo chí & Truyền thông, Trường Đại học Khoa học Xã hội & Nhân văn.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-lg font-label-md text-label-md text-on-surface-variant">
            <span>Tiêu chuẩn IFCN & COPE</span>
            <span>Giao thức Thẩm định #REV-2024</span>
            <span className="text-outline">© 2024 ĐHKHXH&NV. Bảo lưu mọi quyền.</span>
          </div>
        </div>
      </footer>

      {/* New Analysis Modal */}
      <NewAnalysisModal isOpen={isModalOpen} onClose={closeModal} />

      {/* Auth & Profile Modals */}
      <AuthModal />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}
