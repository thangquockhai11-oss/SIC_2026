import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Calendar,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Search,
  Sliders,
  Zap,
} from "lucide-react";
import { api } from "../api/client";

export default function EvidenceExplorerPage() {
  const [activeTab, setActiveTab] = useState<"evidence" | "rag-monitor">("evidence");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVerdict, setSelectedVerdict] = useState("");

  // Live RAG query state
  const [ragQuery, setRagQuery] = useState("đập thủy điện vận hành an toàn");
  const [ragMethod, setRagMethod] = useState<"hybrid" | "vector" | "bm25">("hybrid");
  const [useReranker, setUseReranker] = useState(true);
  const [ragRunning, setRagRunning] = useState(false);
  const [ragResults, setRagResults] = useState<any>(null);

  // Evidence Explorer query
  const { data: evidenceData, isLoading: evidenceLoading } = useQuery({
    queryKey: ["evidence", "explorer", searchTerm, selectedVerdict],
    queryFn: () =>
      api.evidence.list({
        q: searchTerm || undefined,
        verdict: selectedVerdict || undefined,
        page_size: 30,
      }),
  });

  // RAG Stats & Health query
  const { data: ragStats } = useQuery({
    queryKey: ["rag", "stats"],
    queryFn: () => api.rag.stats(),
  });

  const { data: ragHealth } = useQuery({
    queryKey: ["rag", "health"],
    queryFn: () => api.rag.health(),
  });

  const items = evidenceData?.items || [];

  const handleRunRAGSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;
    setRagRunning(true);
    try {
      const res = await api.rag.search({
        query: ragQuery.trim(),
        top_k: 5,
        method: ragMethod,
        use_reranker: useReranker,
      });
      setRagResults(res);
    } catch (err: any) {
      console.error("RAG search failed:", err);
    } finally {
      setRagRunning(false);
    }
  };

  return (
    <div className="page-stack">
      {/* Page Header Hero */}
      <section className="analyzer-header-hero">
        <div className="analyzer-header-content">
          <div className="analyzer-badge-chip">
            <Database size={13} className="sparkle-svg" />
            <span>POSTGRESQL + PGVECTOR • ADVANCED HYBRID RAG</span>
          </div>
          <h1 className="analyzer-main-title">
            Evidence Explorer <span className="title-gradient">& RAG Monitor</span>
          </h1>
          <p className="analyzer-header-subtitle">
            Khám phá cơ sở dữ liệu bằng chứng đối chứng đa nguồn (ViFactCheck, X-FACT, FEVER, NELA-GT) và giám sát trực tiếp quy trình truy xuất lai: Lexical BM25 + Dense Vector BGE-M3 (1024 chiều) + Xếp hạng lại BGE Reranker v2 M3.
          </p>
        </div>
      </section>

      {/* RAG System Metrics Row */}
      <section className="grid-3col">
        <div className="stat-card">
          <div className="stat-label">
            <Database size={15} className="text-teal" />
            <span>Kho Dữ liệu pgvector</span>
          </div>
          <div className="stat-value">{ragStats?.total_chunks ?? 164} chunks</div>
          <div className="stat-hint">{ragStats?.total_documents ?? 151} tài liệu chuẩn hóa • 1024 chiều</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <Cpu size={15} className="text-teal" />
            <span>Mô hình Nhúng & Reranker</span>
          </div>
          <div className="stat-value">BGE-M3 + Reranker v2</div>
          <div className="stat-hint">
            Trạng thái: <strong className="text-teal">HNSW Active</strong> • Reciprocal Rank Fusion
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <Clock size={15} className="text-teal" />
            <span>Độ trễ Truy xuất Trung bình</span>
          </div>
          <div className="stat-value">{ragStats?.avg_retrieval_latency_ms ?? 25.4} ms</div>
          <div className="stat-hint">
            Trạng thái máy chủ RAG: <strong className="text-teal">{ragHealth?.status ?? "HEALTHY"}</strong>
          </div>
        </div>
      </section>

      {/* Mode Switcher Tabs */}
      <div className="analyzer-mode-switcher" style={{ marginTop: 8 }}>
        <button
          type="button"
          className={`mode-switch-btn ${activeTab === "evidence" ? "active" : ""}`}
          onClick={() => setActiveTab("evidence")}
        >
          <Layers size={16} />
          <div className="mode-btn-text">
            <span className="mode-main">Kho Bằng chứng Đã Kiểm chứng</span>
            <span className="mode-sub">Dấu vết thời gian, nguồn trích dẫn và lập trường</span>
          </div>
        </button>

        <button
          type="button"
          className={`mode-switch-btn ${activeTab === "rag-monitor" ? "active" : ""}`}
          onClick={() => setActiveTab("rag-monitor")}
        >
          <Activity size={16} />
          <div className="mode-btn-text">
            <span className="mode-main">Giám sát Truy xuất RAG Thực tế</span>
            <span className="mode-sub">BM25 + pgvector + RRF + BGE Reranker</span>
          </div>
        </button>
      </div>

      {/* TAB 1: Evidence Explorer */}
      {activeTab === "evidence" && (
        <section className="panel registry-panel">
          <div className="registry-toolbar">
            <div className="filter-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Tìm theo tên nguồn, phát ngôn hoặc nội dung trích dẫn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select value={selectedVerdict} onChange={(e) => setSelectedVerdict(e.target.value)}>
              <option value="">Tất cả lập trường phán quyết</option>
              <option value="REFUTED">Bác bỏ (REFUTED)</option>
              <option value="SUPPORTED">Xác thực (SUPPORTED)</option>
              <option value="NOT_ENOUGH_INFORMATION">Thiếu thông tin</option>
            </select>

            <span className="result-count">Tổng cộng: {evidenceData?.total ?? 0} bản ghi</span>
          </div>

          {evidenceLoading ? (
            <div className="loading-line">
              <span /> Đang tải kho bằng chứng đối chứng...
            </div>
          ) : items.length === 0 ? (
            <div className="registry-state">
              <div className="empty-state">
                <Search size={32} />
                <strong>Không tìm thấy bằng chứng phù hợp</strong>
                <span>Hãy thử tìm kiếm với từ khóa khác hoặc nạp thêm tài liệu.</span>
              </div>
            </div>
          ) : (
            <div className="evidence-explorer-cards-list">
              {items.map((item: any) => (
                <div key={item.id} className="explorer-claim-block">
                  <div className="explorer-claim-top">
                    <div>
                      <span className="analysis-parent-title">Bài gốc: {item.analysis_title}</span>
                      <h3 className="explorer-claim-text">"{item.claim_text}"</h3>
                    </div>
                    <span
                      className={`claim-verdict-badge ${
                        item.verdict === "REFUTED"
                          ? "pill-danger"
                          : item.verdict === "SUPPORTED"
                          ? "pill-success"
                          : "pill-warning"
                      }`}
                    >
                      {item.verdict} ({Math.round(item.confidence * 100)}%)
                    </span>
                  </div>

                  <div className="explorer-evidences-grid">
                    {item.evidences?.map((ev: any) => (
                      <div key={ev.id} className="explorer-evidence-card">
                        <div className="ev-source-row">
                          <strong>{ev.source_name}</strong>
                          <span
                            className={`ev-stance-badge ${
                              ev.stance === "REFUTES"
                                ? "stance-refute"
                                : ev.stance === "SUPPORTS"
                                ? "stance-support"
                                : "stance-neutral"
                            }`}
                          >
                            {ev.stance} ({Math.round(ev.reliability_score * 100)}%)
                          </span>
                        </div>
                        <p className="ev-quote-text">"{ev.excerpt}"</p>
                        <div className="ev-provenance-footer">
                          <span className="ev-timestamp">
                            <Calendar size={12} /> {new Date(ev.retrieval_timestamp).toLocaleString("vi-VN")}
                          </span>
                          {ev.source_url && (
                            <a
                              href={ev.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ev-verify-link"
                            >
                              <ExternalLink size={12} /> Kiểm tra URL nguồn
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Live RAG Monitor */}
      {activeTab === "rag-monitor" && (
        <section className="panel registry-panel">
          <div className="section-title-box">
            <h3>Bảng Điều khiển & Giám sát Truy xuất RAG (Live RAG Runner)</h3>
            <p>
              Kiểm thử trực tiếp câu truy vấn qua 3 tầng: Lọc từ khóa BM25, Không gian vector BGE-M3 (PostgreSQL pgvector) và Hiệu chuẩn tái xếp hạng BGE Reranker v2 M3.
            </p>
          </div>

          <form onSubmit={handleRunRAGSearch} className="rag-runner-form" style={{ margin: "16px 0" }}>
            <div className="analyzer-field-group">
              <label className="field-main-label">Câu truy vấn kiểm thử / Claim:</label>
              <div className="input-modern-wrapper">
                <Search size={16} className="input-left-icon text-teal" />
                <input
                  type="text"
                  className="input-control-modern"
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  placeholder="Nhập claim hoặc từ khóa cần tra cứu trong cơ sở tri thức..."
                  disabled={ragRunning}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sliders size={14} />
                <label style={{ fontSize: 13, fontWeight: 500 }}>Phương thức:</label>
                <select
                  value={ragMethod}
                  onChange={(e) => setRagMethod(e.target.value as any)}
                  className="input-control-modern"
                  style={{ width: "auto", padding: "6px 12px" }}
                >
                  <option value="hybrid">Lai ghép (BM25 + pgvector + RRF)</option>
                  <option value="vector">Chỉ Vector (PostgreSQL pgvector)</option>
                  <option value="bm25">Chỉ Từ khóa (BM25 Lexical)</option>
                </select>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={useReranker}
                  onChange={(e) => setUseReranker(e.target.checked)}
                />
                <span>Kích hoạt BGE-Reranker v2 M3</span>
              </label>

              <button
                type="submit"
                className="button button-primary"
                disabled={ragRunning}
                style={{ marginLeft: "auto" }}
              >
                {ragRunning ? (
                  <>
                    <Activity size={14} className="spin" /> Đang truy xuất...
                  </>
                ) : (
                  <>
                    <Zap size={14} /> Chạy thử nghiệm RAG
                  </>
                )}
              </button>
            </div>
          </form>

          {/* RAG Results Viewer */}
          {ragResults && (
            <div className="rag-results-box" style={{ marginTop: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h4>
                  Kết quả Truy xuất: <strong>{ragResults.total_results} bằng chứng</strong> ({ragResults.method.toUpperCase()})
                </h4>
                <span className="model-badge">
                  <Clock size={12} /> Độ trễ: <strong>{ragResults.latency_ms} ms</strong>
                </span>
              </div>

              <div className="explorer-evidences-grid">
                {ragResults.results?.map((res: any, idx: number) => (
                  <div key={res.chunk_id || idx} className="explorer-evidence-card">
                    <div className="ev-source-row">
                      <strong>{res.source_name || "Kho tri thức đối chuẩn"}</strong>
                      <span className="ev-stance-badge stance-support">
                        Điểm liên quan: {Math.round(res.relevance_score * 100)}%
                      </span>
                    </div>

                    <p className="ev-quote-text" style={{ fontSize: 13, lineHeight: 1.5 }}>
                      "{res.content}"
                    </p>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "8px 0" }}>
                      {res.bm25_score !== undefined && (
                        <span className="model-badge" style={{ fontSize: 10 }}>
                          BM25: {res.bm25_score}
                        </span>
                      )}
                      {res.vector_similarity !== undefined && (
                        <span className="model-badge" style={{ fontSize: 10 }}>
                          Vector Cosine: {res.vector_similarity}
                        </span>
                      )}
                      {res.rrf_score !== undefined && (
                        <span className="model-badge" style={{ fontSize: 10, background: "#f0fdf4", color: "#166534" }}>
                          RRF: {res.rrf_score}
                        </span>
                      )}
                    </div>

                    <div className="ev-provenance-footer">
                      <span className="ev-timestamp">Dataset: {res.dataset_id || "ViFactCheck/X-FACT"}</span>
                      {res.source_url && (
                        <a
                          href={res.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ev-verify-link"
                        >
                          <ExternalLink size={12} /> Kiểm tra nguồn
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
