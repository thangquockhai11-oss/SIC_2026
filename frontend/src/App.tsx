import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const NewsAnalyzerPage = lazy(() => import("./pages/NewsAnalyzerPage"));
const FactCheckingPage = lazy(() => import("./pages/FactCheckingPage"));
const MediaCredibilityPage = lazy(() => import("./pages/MediaCredibilityPage"));
const PublicOpinionPage = lazy(() => import("./pages/PublicOpinionPage"));
const PublicTrustPage = lazy(() => import("./pages/PublicTrustPage"));
const InformationReceptionPage = lazy(() => import("./pages/InformationReceptionPage"));
const MultiAgentMonitorPage = lazy(() => import("./pages/MultiAgentMonitorPage"));
const EvidenceExplorerPage = lazy(() => import("./pages/EvidenceExplorerPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const DatasetsPage = lazy(() => import("./pages/DatasetsPage"));

function RouteLoading() {
  return (
    <div className="route-loading" role="status">
      <span className="spinner-inline" /> Đang tải dữ liệu phân hệ...
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Suspense fallback={<RouteLoading />}><DashboardPage /></Suspense>} />
        <Route path="analyzer" element={<Suspense fallback={<RouteLoading />}><NewsAnalyzerPage /></Suspense>} />
        <Route path="fact-checking" element={<Suspense fallback={<RouteLoading />}><FactCheckingPage /></Suspense>} />
        <Route path="credibility" element={<Suspense fallback={<RouteLoading />}><MediaCredibilityPage /></Suspense>} />
        <Route path="opinion" element={<Suspense fallback={<RouteLoading />}><PublicOpinionPage /></Suspense>} />
        <Route path="trust" element={<Suspense fallback={<RouteLoading />}><PublicTrustPage /></Suspense>} />
        <Route path="reception" element={<Suspense fallback={<RouteLoading />}><InformationReceptionPage /></Suspense>} />
        <Route path="agents" element={<Suspense fallback={<RouteLoading />}><MultiAgentMonitorPage /></Suspense>} />
        <Route path="evidence" element={<Suspense fallback={<RouteLoading />}><EvidenceExplorerPage /></Suspense>} />
        <Route path="history" element={<Suspense fallback={<RouteLoading />}><HistoryPage /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<RouteLoading />}><ReportsPage /></Suspense>} />
        <Route path="datasets" element={<Suspense fallback={<RouteLoading />}><DatasetsPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
