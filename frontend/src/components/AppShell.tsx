import { useState } from "react";
import {
  Bot,
  BrainCircuit,
  Database,
  FileCheck2,
  FileText,
  History,
  LayoutDashboard,
  LogIn,
  Menu,
  MessageSquareQuote,
  Newspaper,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import AuthModal from "./AuthModal";
import ProfileModal from "./ProfileModal";
import { useAuth } from "../context/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: any;
  end?: boolean;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "TỔNG QUAN",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: "TRUNG TÂM PHÂN TÍCH AI",
    items: [
      { to: "/analyzer", label: "News Analyzer", icon: Newspaper, badge: "AI Core" },
      { to: "/fact-checking", label: "Fact-checking", icon: FileCheck2 },
      { to: "/agents", label: "Multi-Agent Monitor", icon: Bot, badge: "Live" },
    ],
  },
  {
    title: "CÁC CHIỀU ĐÁNH GIÁ CHUYÊN SÂU",
    items: [
      { to: "/credibility", label: "Media Credibility", icon: ShieldAlert },
      { to: "/opinion", label: "Public Opinion", icon: MessageSquareQuote },
      { to: "/trust", label: "Public Trust", icon: Users },
      { to: "/reception", label: "Information Reception", icon: BrainCircuit },
    ],
  },
  {
    title: "TRI THỨC & BÁO CÁO",
    items: [
      { to: "/evidence", label: "Evidence Explorer", icon: Search },
      { to: "/history", label: "Lịch sử phân tích", icon: History },
      { to: "/reports", label: "Xuất báo cáo", icon: FileText },
      { to: "/datasets", label: "Cơ sở Dataset", icon: Database },
    ],
  },
];

export default function AppShell() {
  const { user, openAuthModal } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const allNavItems = navSections.flatMap((s) => s.items);
  const currentNav = allNavItems.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  );

  return (
    <div className="app-frame">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={22} />
          </div>
          <div className="brand-text">
            <strong>TrustMedia AI</strong>
            <span>Digital Media Platform</span>
          </div>
          <button
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-nav-scroll">
          {navSections.map((section, idx) => (
            <div key={idx} className="nav-group">
              <div className="nav-caption">{section.title}</div>
              <nav className="main-nav">
                {section.items.map(({ to, label, icon: Icon, end, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      isActive ? "nav-link active" : "nav-link"
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon size={18} className="nav-icon" />
                    <span className="nav-label">{label}</span>
                    {badge && <span className="nav-pill-badge">{badge}</span>}
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="engine-card">
            <div className="engine-header">
              <span className="status-dot live" />
              <strong>Multi-Agent EWAC</strong>
            </div>
            <p>Hệ thống AI kiểm chứng, phân tích lập trường & hiệu chuẩn đồng thuận.</p>
            <div className="engine-footer">
              <span className="version-pill">v2.0 • Real Dataset</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="hamburger-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
            <div className="topbar-context">
              <span className="context-root">TrustMedia</span>
              <span className="context-divider">/</span>
              <strong className="context-current">
                {currentNav?.label || "Workspace"}
              </strong>
            </div>
          </div>

          <div className="topbar-right">
            <Link
              to="/analyzer"
              className="button button-sm button-primary quick-analyze-btn"
            >
              <Sparkles size={14} />
              <span>Phân tích bài báo</span>
            </Link>

            <div className="system-status-chip">
              <span className="topbar-dot" />
              <span>Multi-Agent Ready</span>
            </div>

            {user ? (
              <button
                type="button"
                className="user-profile-btn"
                onClick={() => setIsProfileOpen(true)}
                title="Quản lý hồ sơ"
              >
                <div className="topbar-avatar">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="topbar-user-info">
                  <span className="topbar-user-name">{user.full_name}</span>
                  <span className="topbar-user-role">
                    {user.role === "admin" ? "Quản trị viên" : "Chuyên viên"}
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                className="button button-sm button-ghost auth-login-btn"
                onClick={() => openAuthModal()}
              >
                <LogIn size={14} />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>

      <AuthModal />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}
