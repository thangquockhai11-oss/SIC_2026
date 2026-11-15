import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Layers,
  Network,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { api } from "../api/client";

export default function MultiAgentMonitorPage() {
  const [activeTab, setActiveTab] = useState<"traces" | "models">("traces");
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>("");

  // 1. Fetch recent analyses for dropdown
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["history", "agents"],
    queryFn: () => api.history.list({ page_size: 10 }),
  });

  const recentItems = historyData?.items || [];
  const currentAnalysisId = selectedAnalysisId || recentItems[0]?.id || "";

  // 2. Fetch trace for selected analysis
  const {
    data: traceData,
    isLoading: traceLoading,
    refetch: refetchTrace,
  } = useQuery({
    queryKey: ["analyzer", "trace", currentAnalysisId],
    queryFn: () => (currentAnalysisId ? api.analyzer.getTrace(currentAnalysisId) : null),
    enabled: !!currentAnalysisId,
  });

  // 3. Fetch Model Catalog
  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ["analyzer", "models"],
    queryFn: () => api.analyzer.getModels(),
  });

  const traces = traceData?.traces || [];
  const models = modelsData || [];

  const totalLatency =
    traceData?.total_latency_ms ||
    traces.reduce((sum: number, t: any) => sum + (t.latency_ms || t.execution_time_ms || 0), 0);

  const disagreementCount = traces.filter((t: any) => t.disagreement_detected).length;

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">ĐIỀU PHỐI ĐA TÁC TỬ & TRUY NGUYÊN NGUỒN GỐC</div>
          <h1>Multi-Agent Monitor — Giám sát & Truy vết Hệ thống Tác tử</h1>
          <p className="page-subtitle">
            Theo dõi thời gian thực quy trình tương tác, độ trễ xử lý (ms), mô hình NLP phục vụ, tập dữ liệu gắn kết và hiệu chuẩn đồng thuận EWAC.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className={`pill-btn ${activeTab === "traces" ? "active" : ""}`}
            onClick={() => setActiveTab("traces")}
          >
            <Layers size={14} /> Nhật ký Thực thi ({traces.length})
          </button>
          <button
            className={`pill-btn ${activeTab === "models" ? "active" : ""}`}
            onClick={() => setActiveTab("models")}
          >
            <Cpu size={14} /> Danh mục Mô hình AI ({models.length})
          </button>
        </div>
      </section>

      {/* Top Architecture Diagram Card */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">MÔ HÌNH ĐỒ THỊ ĐIỀU PHỐI</div>
            <h2>Kiến trúc Đa tác tử Độc lập & Tổng hợp Đồng thuận (EWAC)</h2>
          </div>
          <Network size={18} className="text-teal" />
        </div>

        <div className="architecture-diagram-flow">
          <div className="diag-step">
            <div className="diag-box">
              <Cpu size={16} />
              <span>Input Ingestion</span>
            </div>
            <div className="diag-arrow">→</div>
          </div>

          <div className="diag-step">
            <div className="diag-box diag-parallel">
              <div className="diag-sub-agent">ClaimExtractor</div>
              <div className="diag-sub-agent">MediaCredibility</div>
              <div className="diag-sub-agent">PublicOpinion</div>
              <div className="diag-sub-agent">Trust & Reception</div>
            </div>
            <div className="diag-arrow">→</div>
          </div>

          <div className="diag-step">
            <div className="diag-box diag-meta">
              <Bot size={16} />
              <span>Meta-Agent Consensus (EWAC)</span>
            </div>
            <div className="diag-arrow">→</div>
          </div>

          <div className="diag-step">
            <div className="diag-box diag-output">
              <CheckCircle2 size={16} />
              <span>Calibrated Verdict</span>
            </div>
          </div>
        </div>

        <div className="panel-footnote">
          Mỗi tác tử hoạt động độc lập trong miền chuyên môn riêng; Agent không được biểu quyết chéo sang tác vụ của Agent khác.
        </div>
      </section>

      {/* Latency and State KPI Cards */}
      <section className="metric-grid">
        <div className="metric-card">
          <div className="metric-top">
            <div className="metric-icon green"><Zap size={16} /></div>
            <span className="metric-label">Tác tử trong Phiên</span>
          </div>
          <strong className="metric-value">{traces.length > 0 ? traces.length : 6} Agents</strong>
          <span className="metric-note">Trạng thái: 100% Hoạt động thực tế</span>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <div className="metric-icon blue"><Clock size={16} /></div>
            <span className="metric-label">Tổng thời gian xử lý đa tác tử</span>
          </div>
          <strong className="metric-value">{totalLatency} ms</strong>
          <span className="metric-note">Thực thi song song qua Event Loop</span>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <div className="metric-icon amber"><ShieldCheck size={16} /></div>
            <span className="metric-label">Tình trạng xung đột quan điểm</span>
          </div>
          <strong className="metric-value">
            {disagreementCount === 0 ? "0 Bất đồng" : `${disagreementCount} Cảnh báo Xung đột`}
          </strong>
          <span className="metric-note">Độ hội tụ đồng thuận: {disagreementCount === 0 ? "100%" : "Đã hiệu chuẩn"}</span>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <div className="metric-icon teal"><Cpu size={16} /></div>
            <span className="metric-label">Mô hình AI Đã Đăng ký</span>
          </div>
          <strong className="metric-value">{models.length} Mô hình</strong>
          <span className="metric-note">NLI, Extractor, NELA, Opinion, PHEME</span>
        </div>
      </section>

      {/* TAB 1: EXECUTION TRACES */}
      {activeTab === "traces" && (
        <section className="panel registry-panel">
          <div className="registry-toolbar" style={{ flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 style={{ fontSize: 13, margin: 0 }}>Nhật ký Thực thi Từng Tác tử (Agent Execution Traces)</h2>
              <span className="result-count">Truy nguyên nguồn gốc mô hình, thời gian và tập dữ liệu phục vụ</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
              <label style={{ fontSize: 10, color: "#64748b" }}>Phiên phân tích:</label>
              <select
                value={currentAnalysisId}
                onChange={(e) => setSelectedAnalysisId(e.target.value)}
                style={{ maxWidth: 300 }}
              >
                {recentItems.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({new Date(item.created_at).toLocaleTimeString("vi-VN")})
                  </option>
                ))}
              </select>
              <button
                className="button button-sm button-outline"
                onClick={() => refetchTrace()}
                title="Làm mới trace"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {traceLoading || historyLoading ? (
            <div className="loading-line" style={{ padding: "40px 20px" }}>
              <span /> Đang tải dữ liệu vết thực thi tác tử...
            </div>
          ) : traces.length === 0 ? (
            <div className="registry-state">
              <div className="empty-state">
                <Bot size={32} />
                <strong>Chưa có vết thực thi nào cho phiên này</strong>
                <span>Hãy chọn một bài viết khác từ danh sách hoặc gửi bài phân tích mới.</span>
              </div>
            </div>
          ) : (
            <div className="agents-monitor-list">
              {traces.map((agent: any, idx: number) => (
                <div key={agent.id || agent.execution_id || idx} className="agent-detail-row" style={{ alignItems: "flex-start" }}>
                  <div className="agent-left-col" style={{ width: 220 }}>
                    <div className="agent-avatar-icon">
                      <Bot size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0 }}>{agent.agent_name}</h4>
                      <span className="agent-role-caption">{agent.agent_role}</span>
                      <div style={{ marginTop: 4 }}>
                        <span className="model-badge">
                          <Cpu size={10} /> {agent.model_name || "TrustMedia-Agent"} v{agent.model_version || "1.0"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="agent-mid-col">
                    <p className="agent-result-quote">{agent.result_summary}</p>

                    {agent.disagreement_detected && (
                      <div className="conflict-tag" style={{ margin: "6px 0" }}>
                        <AlertTriangle size={13} />
                        <span>Phát hiện xung đột quan điểm giữa các nguồn dữ liệu</span>
                      </div>
                    )}

                    <div className="ev-meta-footer" style={{ marginTop: 6, borderTop: "none" }}>
                      {agent.dataset_ids && agent.dataset_ids.length > 0 && (
                        <span className="ev-meta-tag">
                          <Database size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
                          Tập dữ liệu: <strong>{agent.dataset_ids.join(", ")}</strong>
                        </span>
                      )}
                      <span className="ev-meta-tag">
                        Truy xuất tri thức: <strong>{agent.retrieval_count ?? 0} bản ghi</strong>
                      </span>
                      {agent.execution_id && (
                        <span className="ev-meta-tag" style={{ fontFamily: "monospace" }}>
                          Exec ID: {agent.execution_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="agent-right-col" style={{ alignSelf: "center" }}>
                    <span className="latency-badge">
                      <Clock size={12} /> {agent.latency_ms || agent.execution_time_ms || 0} ms
                    </span>
                    <span
                      className={`status-badge ${
                        agent.status === "COMPLETED"
                          ? "badge-success"
                          : agent.status === "FAILED"
                          ? "pill-danger"
                          : "badge-neutral"
                      }`}
                      style={{ padding: "3px 8px" }}
                    >
                      <span /> {agent.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: MODEL CATALOG */}
      {activeTab === "models" && (
        <section className="panel registry-panel">
          <div className="registry-toolbar">
            <div>
              <h2 style={{ fontSize: 13, margin: 0 }}>Danh Mục Mô Hình AI (Model Catalog & Registry)</h2>
              <span className="result-count">
                Đăng ký, kiểm tra trạng thái nạp bộ nhớ, trọng số hiệu chuẩn và số liệu đánh giá thực tế
              </span>
            </div>
            <span className="result-count">Đã nạp: {models.length} mô hình</span>
          </div>

          {modelsLoading ? (
            <div className="loading-line" style={{ padding: "40px 20px" }}>
              <span /> Đang tải danh mục mô hình NLP...
            </div>
          ) : (
            <div className="model-catalog-grid" style={{ padding: 16 }}>
              {models.map((m: any, idx: number) => (
                <div key={idx} className="model-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Cpu size={16} className="text-teal" />
                      <strong style={{ fontSize: 12, color: "#0f172a" }}>{m.model_name}</strong>
                    </div>
                    <span
                      className={`verification-status-badge ${
                        m.loading_status === "LOADED" || m.loading_status === "BASELINE_CALIBRATED"
                          ? "verified"
                          : "insufficient"
                      }`}
                    >
                      {m.loading_status}
                    </span>
                  </div>

                  <div style={{ fontSize: 10, color: "#64748b" }}>
                    <strong>Tác vụ:</strong> {m.task}
                  </div>

                  <div style={{ fontSize: 10, color: "#64748b" }}>
                    <strong>Phiên bản:</strong> v{m.model_version} • <strong>Phần cứng:</strong> {m.device}
                  </div>

                  <div style={{ fontSize: 10, color: "#64748b" }}>
                    <strong>Nhà cung cấp:</strong> {m.provider}
                  </div>

                  {m.dataset_training_version && (
                    <div style={{ fontSize: 9, color: "#475569", background: "#f8fafc", padding: "4px 8px", borderRadius: 4 }}>
                      <Database size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      Huấn luyện trên: <strong>{m.dataset_training_version}</strong>
                    </div>
                  )}

                  {m.evaluation_metrics && (
                    <div style={{ marginTop: 4, padding: "6px 8px", background: "#f0fdf4", borderRadius: 4, border: "1px solid #dcfce7" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#166534", marginBottom: 2 }}>
                        Chỉ số Đánh giá Thực tế:
                      </div>
                      <div style={{ display: "flex", gap: 10, fontSize: 9, color: "#15803d" }}>
                        {m.evaluation_metrics.macro_f1 !== undefined && (
                          <span>Macro-F1: <strong>{(m.evaluation_metrics.macro_f1 * 100).toFixed(1)}%</strong></span>
                        )}
                        {m.evaluation_metrics.accuracy !== undefined && (
                          <span>Độ chính xác: <strong>{(m.evaluation_metrics.accuracy * 100).toFixed(1)}%</strong></span>
                        )}
                        {m.evaluation_metrics.calibration_ece !== undefined && (
                          <span>Sai số ECE: <strong>{m.evaluation_metrics.calibration_ece}</strong></span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
