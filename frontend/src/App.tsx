import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";

const FactCheckingPage = lazy(() => import("./pages/FactCheckingPage"));
const MediaCredibilityPage = lazy(() => import("./pages/MediaCredibilityPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const MultiAgentMonitorPage = lazy(() => import("./pages/MultiAgentMonitorPage"));
const EvidenceExplorerPage = lazy(() => import("./pages/EvidenceExplorerPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const DatasetsPage = lazy(() => import("./pages/DatasetsPage"));
const NewsAnalyzerPage = lazy(() => import("./pages/NewsAnalyzerPage"));
const PublicOpinionPage = lazy(() => import("./pages/PublicOpinionPage"));
const InformationReceptionPage = lazy(() => import("./pages/InformationReceptionPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));

function RouteLoading() {
  return (
    <div className="flex items-center justify-center p-12 text-on-surface-variant font-label-md text-label-md">
      <span className="material-symbols-outlined text-[20px] animate-spin mr-2 text-primary">sync</span>
      Đang tải dữ liệu phân hệ nghiên cứu...
    </div>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return <RouteLoading />;
  if (!isAdmin) {
    return <Navigate to="/fact-checking" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Standalone Login Screen matching exact stitch design */}
      <Route path="login" element={<Suspense fallback={<RouteLoading />}><LoginPage /></Suspense>} />

      <Route element={<AppShell />}>
        {/* Core 3 Functions accessible to User & Public */}
        <Route index element={<Suspense fallback={<RouteLoading />}><FactCheckingPage /></Suspense>} />
        <Route path="fact-checking" element={<Suspense fallback={<RouteLoading />}><FactCheckingPage /></Suspense>} />
        <Route path="credibility" element={<Suspense fallback={<RouteLoading />}><MediaCredibilityPage /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<RouteLoading />}><ReportsPage /></Suspense>} />
        <Route path="trust" element={<Suspense fallback={<RouteLoading />}><ReportsPage /></Suspense>} />

        {/* Admin-only Workstations */}
        <Route path="agents" element={<Suspense fallback={<RouteLoading />}><AdminRoute><MultiAgentMonitorPage /></AdminRoute></Suspense>} />
        <Route path="evidence" element={<Suspense fallback={<RouteLoading />}><AdminRoute><EvidenceExplorerPage /></AdminRoute></Suspense>} />
        <Route path="datasets" element={<Suspense fallback={<RouteLoading />}><AdminRoute><DatasetsPage /></AdminRoute></Suspense>} />
        <Route path="history" element={<Suspense fallback={<RouteLoading />}><AdminRoute><HistoryPage /></AdminRoute></Suspense>} />

        {/* Specialized Modules */}
        <Route path="analyzer" element={<Suspense fallback={<RouteLoading />}><NewsAnalyzerPage /></Suspense>} />
        <Route path="opinion" element={<Suspense fallback={<RouteLoading />}><PublicOpinionPage /></Suspense>} />
        <Route path="reception" element={<Suspense fallback={<RouteLoading />}><InformationReceptionPage /></Suspense>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
