import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AuthModal from "./AuthModal";
import ProfileModal from "./ProfileModal";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import type { AnalysisDetail } from "../api/types";

export default function AppShell() {
  const { user, openAuthModal } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [featureMenuOpen, setFeatureMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const currentId = searchParams.get("id");
  const [article, setArticle] = useState<AnalysisDetail | null>(null);

  // Load article metadata for the shared academic banner
  useEffect(() => {
    let isMounted = true;
    async function loadArticle() {
      try {
        let targetId = currentId;
        if (!targetId) {
          const list = await api.history.list({ page_size: 1 });
          if (list.items && list.items.length > 0) {
            targetId = list.items[0].id;
          }
        }
        if (targetId) {
          const data = await api.analyzer.getDetail(targetId);
          if (isMounted) setArticle(data);
        }
      } catch (err) {
        console.warn("Could not load article detail in AppShell:", err);
      }
    }
    loadArticle();
    return () => {
      isMounted = false;
    };
  }, [currentId]);

  const querySuffix = currentId ? `?id=${encodeURIComponent(currentId)}` : (article ? `?id=${encodeURIComponent(article.id)}` : "");

  // Article verification tabs (Exact Stitch tabs)
  const articleTabs = [
    {
      to: `/fact-checking${querySuffix}`,
      basePath: "/fact-checking",
      label: "Kiểm chứng phát ngôn",
    },
    {
      to: `/credibility${querySuffix}`,
      basePath: "/credibility",
      label: "Hồ sơ tòa soạn",
    },
    {
      to: `/reports${querySuffix}`,
      basePath: "/reports",
      label: "Báo cáo người đọc",
    },
  ];

  // Top header main navigation links
  const topNavLinks = [
    { to: "/", label: "Tổng quan", end: true },
    { to: "/analyzer", label: "Phân tích URL" },
    { to: `/fact-checking${querySuffix}`, label: "Kiểm chứng bài báo", activePrefix: "/fact-checking" },
    { to: "/history", label: "Lịch sử lưu trữ" },
  ];

  const allModules = [
    { to: "/", label: "Bảng điều khiển Tổng quan (Dashboard)", icon: "dashboard" },
    { to: "/analyzer", label: "Phân tích Bài viết & Trích xuất URL", icon: "travel_explore" },
    { to: `/fact-checking${querySuffix}`, label: "Hồ sơ Kiểm chứng Phát ngôn", icon: "fact_check" },
    { to: `/credibility${querySuffix}`, label: "Hồ sơ Tòa soạn & Chuẩn mực COPE", icon: "verified" },
    { to: `/reports${querySuffix}`, label: "Báo cáo Khảo sát Người đọc", icon: "analytics" },
    { to: "/agents", label: "Giám sát Đa tác tử (Multi-Agent Monitor)", icon: "smart_toy" },
    { to: "/opinion", label: "Lập trường & Dư luận Xã hội", icon: "forum" },
    { to: "/trust", label: "Khảo sát Niềm tin Công chúng", icon: "groups" },
    { to: "/reception", label: "Tiếp nhận & Đọc hiểu Báo chí", icon: "psychology" },
    { to: "/evidence", label: "Kho Bằng chứng Thực nghiệm", icon: "database" },
    { to: "/history", label: "Lịch sử Phân tích & Lưu trữ Bài báo", icon: "history" },
    { to: "/datasets", label: "Cơ sở Dữ liệu Mở (ViFactCheck & VSMEC)", icon: "source" },
  ];

  const isArticleRoute = ["/fact-checking", "/credibility", "/reports"].includes(location.pathname);

  // Derive header display values
  const articleTitle = article?.title || "Nghiên cứu mới về chiết xuất thảo dược hỗ trợ ức chế tế bào ung thư tại Viện Hàn lâm Khoa học";
  const archiveCode = article ? `#TM-${article.id.slice(0, 8).toUpperCase()}` : "#TM-2024-8841A";
  
  const latestSnapshot = article?.snapshots && article.snapshots.length > 0 ? article.snapshots[article.snapshots.length - 1] : null;
  const publisherName = article?.credibility?.source_name || latestSnapshot?.author || (article?.source_url ? new URL(article.source_url).hostname : "Báo Tuổi Trẻ");
  const authorName = latestSnapshot?.author || article?.credibility?.article_quality?.author || "Ban Khoa giáo";
  const publishedDate = latestSnapshot?.published_date 
    ? new Date(latestSnapshot.published_date).toLocaleDateString("vi-VN") 
    : (article?.created_at ? new Date(article.created_at).toLocaleDateString("vi-VN") : "24/10/2024");

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen flex flex-col">
      {/* 1. TOP STITCH FIXED HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(24,40,36,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-margin-mobile lg:px-margin flex items-center justify-between gap-space-lg">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-space-md hover:opacity-95 transition-opacity">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-container text-on-primary">
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
                Viện Nghiên cứu Báo chí &amp; Truyền thông · ĐHKHXH&amp;NV
              </p>
            </div>
          </Link>

          {/* Universal Search Input */}
          <div className="hidden md:flex items-center flex-1 max-w-xs lg:max-w-sm mx-space-md">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
              <input
                className="w-full pl-9 pr-space-md py-1.5 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
                placeholder="Tra cứu mã bài báo hoặc phát ngôn..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    navigate(`/history?q=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
              />
            </div>
          </div>

          {/* Top Quick Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 font-label-md text-label-md">
            {topNavLinks.map((nav) => {
              const isActive = nav.end 
                ? location.pathname === nav.to 
                : (nav.activePrefix ? location.pathname.startsWith(nav.activePrefix) : location.pathname === nav.to);
              return (
                <Link
                  key={nav.to}
                  to={nav.to}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    isActive 
                      ? "bg-primary-container text-on-primary font-semibold shadow-xs" 
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  {nav.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions & User Profile */}
          <div className="flex items-center gap-space-md">
            {/* All Modules dropdown button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFeatureMenuOpen(!featureMenuOpen)}
                className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-colors"
                title="Tất cả phân hệ"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">apps</span>
                <span className="hidden sm:inline">Phân hệ khác</span>
              </button>

              {featureMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 p-2 z-50 animate-fadeIn"
                  onClick={() => setFeatureMenuOpen(false)}
                >
                  <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-outline border-b border-outline-variant/20 mb-1">
                    Tất cả phân hệ nghiên cứu
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-0.5">
                    {allModules.map((m) => (
                      <Link
                        key={m.to}
                        to={m.to}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">{m.icon}</span>
                        <span>{m.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {user ? (
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-space-sm text-left"
                type="button"
              >
                <div className="hidden sm:flex flex-col text-right">
                  <span className="font-label-md text-label-md text-on-surface font-medium">{user.full_name}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {user.role === "admin" ? "Chủ tịch Hội đồng" : "Thành viên Hội đồng"}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs uppercase shadow-xs">
                  {user.full_name?.charAt(0) || "U"}
                </div>
              </button>
            ) : (
              <button
                onClick={() => openAuthModal()}
                className="flex items-center gap-space-sm text-left"
                type="button"
              >
                <div className="hidden sm:flex flex-col text-right">
                  <span className="font-label-md text-label-md text-on-surface">TS. Nguyễn Minh Anh</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Thành viên Hội đồng Thẩm định</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN STITCH WORKSPACE */}
      <main className="w-full pt-16 bg-surface min-h-screen flex-1 flex flex-col">
        {/* Article Banner Section (Shared across all academic screens - only displayed on article verification views) */}
        {isArticleRoute && (
          <section className="w-full bg-surface-container-lowest shadow-[0_1px_4px_rgba(24,40,36,0.03)] border-b border-outline-variant/20">
            <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin pt-space-lg pb-0">
              {/* Category & Archive Code */}
              <div className="flex flex-wrap items-center gap-space-xs mb-space-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-primary-container">folder_open</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wide">Nghiên cứu Y tế &amp; Sức khỏe cộng đồng</span>
                <span className="text-outline">•</span>
                <span className="font-label-sm text-label-sm font-semibold text-primary">Mã lưu trữ {archiveCode}</span>
              </div>

              {/* Article Title */}
              <h1 className="font-headline-md text-headline-md text-on-surface mb-space-sm font-bold">
                {articleTitle}
              </h1>

              {/* Article Metadata Line */}
              <div className="flex flex-wrap items-center gap-y-1 gap-x-space-md pb-space-lg text-on-surface-variant">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-outline">newspaper</span>
                  <span className="font-label-md text-label-md text-on-surface font-semibold">{publisherName}</span>
                </div>
                <span className="text-outline-variant">•</span>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-outline">calendar_today</span>
                  <span className="font-label-md text-label-md">Ngày xuất bản: {publishedDate}</span>
                </div>
                <span className="text-outline-variant">•</span>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-outline">edit_note</span>
                  <span className="font-label-md text-label-md">Tác giả: {authorName}</span>
                </div>
                {article?.source_url && (
                  <>
                    <span className="text-outline-variant">•</span>
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5 text-label-sm"
                    >
                      Xem bài gốc <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  </>
                )}
              </div>

              {/* Horizontal Stitch Sub-Navigation Bar */}
              <div className="overflow-x-auto border-t border-outline-variant/20 pt-1">
                <nav className="flex items-center gap-space-xs py-1" aria-label="Phân hệ thẩm định học thuật">
                  {articleTabs.map((tab) => {
                    const isActive = location.pathname === tab.basePath;
                    return (
                      <NavLink
                        key={tab.basePath}
                        to={tab.to}
                        className={`px-space-md py-2 rounded-lg font-label-md text-label-md whitespace-nowrap transition-colors ${
                          isActive
                            ? "bg-primary-container text-on-primary font-semibold shadow-xs"
                            : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {tab.label}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            </div>
          </section>
        )}

        {/* Outlet Content */}
        <div className="w-full flex-1">
          <Outlet />
        </div>
      </main>

      {/* 3. STITCH FOOTER */}
      <footer className="w-full bg-surface-container-low mt-space-xl border-t border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-xs">
              <span className="font-title-lg text-title-lg text-primary font-bold">TrustMedia Verification Archive</span>
              <span className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm font-semibold">
                ĐHQG TP.HCM
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
              Cơ sở dữ liệu học thuật thẩm định thông tin truyền thông trực thuộc Viện Nghiên cứu Báo chí &amp; Truyền thông, Trường Đại học Khoa học Xã hội &amp; Nhân văn.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-lg font-label-md text-label-md text-on-surface-variant">
            <span>Tiêu chuẩn IFCN &amp; COPE</span>
            <span>Giao thức Thẩm định #REV-2024</span>
            <span className="text-outline">© 2024 ĐHKHXH&amp;NV. Bảo lưu mọi quyền.</span>
          </div>
        </div>
      </footer>

      {/* Auth & Profile Modals */}
      <AuthModal />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}
