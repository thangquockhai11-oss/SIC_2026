import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Globe,
  HelpCircle,
  Layers,
  MessageSquareQuote,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "../api/client";
import type { AnalysisDetail } from "../api/types";

export default function NewsAnalyzerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryId = searchParams.get("id");

  // Form state
  const [inputMode, setInputMode] = useState<"text" | "url">("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [language, setLanguage] = useState("vi");
  const [scope, setScope] = useState("full");

  // Execution state
  const [submitting, setSubmitting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(queryId);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisDetail | null>(null);

  // Active result tab
  const [activeTab, setActiveTab] = useState<"consensus" | "factcheck" | "credibility" | "opinion" | "trust" | "agents">("consensus");

  // Load existing analysis if ID in URL
  useEffect(() => {
    if (queryId) {
      setCurrentJobId(queryId);
      loadAnalysisDetail(queryId);
    }
  }, [queryId]);

  // Polling loop for active job
  useEffect(() => {
    if (!currentJobId || result) return;

    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const statusData = await api.analyzer.pollStatus(currentJobId);
        setJobStatus(statusData.status);
        setJobProgress(statusData.progress_percent);

        if (statusData.status === "COMPLETED") {
          await loadAnalysisDetail(currentJobId);
        } else if (statusData.status === "FAILED") {
          setErrorMessage(statusData.error_message || "Quá trình phân tích AI gặp sự cố.");
          setSubmitting(false);
        } else {
          timer = setTimeout(poll, 1500);
        }
      } catch (err: any) {
        setErrorMessage(err.response?.data?.detail || err.message || "Lỗi kiểm tra tiến độ");
        setSubmitting(false);
      }
    };

    poll();
    return () => clearTimeout(timer);
  }, [currentJobId, result]);

  const loadAnalysisDetail = async (id: string) => {
    try {
      const detail = await api.analyzer.getDetail(id);
      setResult(detail);
      setJobStatus("COMPLETED");
      setJobProgress(100);
      setSubmitting(false);
    } catch (err: any) {
      setErrorMessage("Không thể tải chi tiết phân tích: " + (err.response?.data?.detail || err.message));
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResult(null);
    setSubmitting(true);
    setJobProgress(15);
    setJobStatus("PROCESSING");

    try {
      const payload: any = { language, scope };
      if (inputMode === "url") {
        if (!sourceUrl.trim()) throw new Error("Vui lòng nhập URL bài báo");
        payload.source_url = sourceUrl.trim();
        if (title.trim()) payload.title = title.trim();
      } else {
        if (!content.trim() || content.trim().length < 20) {
          throw new Error("Nội dung bài viết tối thiểu 20 ký tự");
        }
        payload.content = content.trim();
        payload.title = title.trim() || undefined;
      }

      const res = await api.analyzer.submit(payload);
      setCurrentJobId(res.id);
      setSearchParams({ id: res.id });
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || err.message || "Lỗi gửi yêu cầu phân tích");
      setSubmitting(false);
      setJobStatus(null);
    }
  };

  const handleReset = () => {
    setResult(null);
    setCurrentJobId(null);
    setJobStatus(null);
    setErrorMessage(null);
    setSearchParams({});
  };

  return (
    <div className="page-stack">
      {/* Page Header */}
      <section className="welcome-row">
        <div>
          <div className="eyebrow">CÔNG CỤ PHÂN TÍCH</div>
          <h1>News Analyzer — Trực quan hóa Đa tác tử</h1>
          <p className="page-subtitle">
            Hệ sinh thái AI kiểm chứng thông tin số, đánh giá độc lập nguồn tin, lập trường thảo luận và hiệu chuẩn đồng thuận.
          </p>
        </div>
        {result && (
          <button className="button button-outline" onClick={handleReset}>
            <RefreshCw size={14} /> Phân tích bài báo khác
          </button>
        )}
      </section>

      {/* Input Form Section (shown if not currently viewing completed result or can be toggled) */}
      {!result && (
        <section className="panel analyzer-input-panel">
          <div className="tab-pills-row">
            <button
              className={`pill-btn ${inputMode === "text" ? "active" : ""}`}
              onClick={() => setInputMode("text")}
              type="button"
            >
              <FileText size={15} /> Dán văn bản bài báo
            </button>
            <button
              className={`pill-btn ${inputMode === "url" ? "active" : ""}`}
              onClick={() => setInputMode("url")}
              type="button"
            >
              <Globe size={15} /> Trích xuất từ URL (Chống SSRF)
            </button>
          </div>

          {errorMessage && (
            <div className="inline-error" style={{ margin: "14px 0" }}>
              <AlertCircle size={18} />
              <div>
                <strong>Lỗi phân tích:</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="analyzer-form">
            <div className="form-field">
              <label>Tiêu đề bài viết (tùy chọn)</label>
              <input
                type="text"
                placeholder="VD: Cảnh báo tin đồn vỡ đập thủy điện tại miền Trung..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={submitting}
              />
            </div>

            {inputMode === "url" ? (
              <div className="form-field">
                <label>URL bài báo cần kiểm chứng</label>
                <div className="input-with-icon">
                  <Globe size={16} />
                  <input
                    type="url"
                    placeholder="https://vnexpress.net/thoi-su/..."
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
                <span className="field-hint">
                  Hệ thống bảo mật SSRF: Chỉ tải từ tên miền công khai hợp lệ, chặn dải IP nội bộ và giới hạn 2MB/6 giây.
                </span>
              </div>
            ) : (
              <div className="form-field">
                <label>Nội dung bài viết / Thông điệp cần kiểm chứng</label>
                <textarea
                  rows={6}
                  placeholder="Dán toàn bộ văn bản bài viết, phát ngôn hoặc thông tin lan truyền trên mạng xã hội vào đây..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            )}

            <div className="form-row-2col">
              <div className="form-field">
                <label>Ngôn ngữ phân tích</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={submitting}>
                  <option value="vi">Tiếng Việt (Vietnamese)</option>
                  <option value="en">Tiếng Anh (English)</option>
                </select>
              </div>

              <div className="form-field">
                <label>Phạm vi phân tích (Scope)</label>
                <select value={scope} onChange={(e) => setScope(e.target.value)} disabled={submitting}>
                  <option value="full">Toàn diện (Fact-checking + Media + Opinion + Trust + Meta)</option>
                  <option value="fact_checking">Chỉ kiểm chứng sự thật (Claims & Evidence)</option>
                  <option value="media_credibility">Chỉ đánh giá nguồn tin (Credibility)</option>
                  <option value="public_opinion">Chỉ phân tích dư luận & lập trường (Opinion & Stance)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="button button-primary submit-analysis-btn" disabled={submitting}>
              {submitting ? (
                <>
                  <RefreshCw size={16} className="spin-icon" /> Đang điều phối các AI Agent...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Bắt đầu phân tích Đa tác tử
                </>
              )}
            </button>
          </form>

          {/* Progress Tracker when Submitting */}
          {submitting && (
            <div className="analysis-progress-card">
              <div className="progress-top">
                <div className="progress-label">
                  <Bot size={17} />
                  <span>Trạng thái: <strong>{jobStatus || "PROCESSING"}</strong></span>
                </div>
                <span className="progress-val">{jobProgress}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${jobProgress}%` }} />
              </div>
              <div className="progress-steps-list">
                <div className="step-item active">
                  <span className="step-bullet done">✓</span>
                  <span>Tiếp nhận & Làm sạch dữ liệu</span>
                </div>
                <div className={`step-item ${jobProgress >= 30 ? "active" : ""}`}>
                  <span className={`step-bullet ${jobProgress >= 30 ? "done" : ""}`}>
                    {jobProgress >= 30 ? "✓" : "2"}
                  </span>
                  <span>Trích xuất Claims & Bằng chứng đối chiếu</span>
                </div>
                <div className={`step-item ${jobProgress >= 60 ? "active" : ""}`}>
                  <span className={`step-bullet ${jobProgress >= 60 ? "done" : ""}`}>
                    {jobProgress >= 60 ? "✓" : "3"}
                  </span>
                  <span>Đánh giá nguồn tin & Phân tích lập trường dư luận</span>
                </div>
                <div className={`step-item ${jobProgress >= 90 ? "active" : ""}`}>
                  <span className={`step-bullet ${jobProgress >= 90 ? "done" : ""}`}>
                    {jobProgress >= 90 ? "✓" : "4"}
                  </span>
                  <span>Hiệu chuẩn đồng thuận Meta-Agent (EWAC)</span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Analysis Result Presentation */}
      {result && (
        <section className="analysis-result-view">
          {/* Result Header Hero Card */}
          <div className="panel result-hero-card">
            <div className="hero-top-row">
              <div className="hero-left">
                <div className="eyebrow">BÁO CÁO KẾT QUẢ PHÂN TÍCH</div>
                <h2>{result.title}</h2>
                {result.source_url && (
                  <a
                    href={result.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-url-pill"
                  >
                    <ExternalLink size={12} /> {result.source_url}
                  </a>
                )}
              </div>

              <div className="hero-right-badges">
                <div
                  className={`verdict-pill ${
                    result.verdict === "REFUTED"
                      ? "pill-danger"
                      : result.verdict === "SUPPORTED"
                      ? "pill-success"
                      : "pill-warning"
                  }`}
                >
                  <span className="verdict-dot" />
                  <strong>
                    {result.verdict === "REFUTED"
                      ? "BÁC BỎ (REFUTED)"
                      : result.verdict === "SUPPORTED"
                      ? "XÁC THỰC (SUPPORTED)"
                      : "THIẾU DỮ LIỆU (INCONCLUSIVE)"}
                  </strong>
                </div>

                <div className="confidence-pill">
                  <span>Độ tin cậy hiệu chuẩn:</span>
                  <strong>{Math.round((result.confidence_score ?? 0.85) * 100)}%</strong>
                </div>
              </div>
            </div>

            <div className="hero-meta-row">
              <span className="ai-tag">
                <Sparkles size={12} /> {result.ai_provider}
              </span>
              <span>Thời gian hoàn tất: {new Date(result.created_at).toLocaleString("vi-VN")}</span>
              <div className="export-actions">
                <a
                  href={api.reports.exportJsonUrl(result.id)}
                  download
                  className="button button-sm button-outline"
                >
                  <Download size={13} /> JSON
                </a>
                <a
                  href={api.reports.exportCsvUrl(result.id)}
                  download
                  className="button button-sm button-outline"
                >
                  <Download size={13} /> CSV
                </a>
                <a
                  href={api.reports.htmlUrl(result.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-sm button-primary"
                >
                  <Printer size={13} /> In / Xuất PDF
                </a>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="result-tabs-nav">
            <button
              className={`result-tab-btn ${activeTab === "consensus" ? "active" : ""}`}
              onClick={() => setActiveTab("consensus")}
            >
              <Bot size={15} /> Tổng hợp Meta-Agent
            </button>
            <button
              className={`result-tab-btn ${activeTab === "factcheck" ? "active" : ""}`}
              onClick={() => setActiveTab("factcheck")}
            >
              <FileCheck2 size={15} /> Kiểm chứng Claims ({result.claims.length})
            </button>
            <button
              className={`result-tab-btn ${activeTab === "credibility" ? "active" : ""}`}
              onClick={() => setActiveTab("credibility")}
            >
              <ShieldAlert size={15} /> Độ tin cậy Nguồn tin
            </button>
            <button
              className={`result-tab-btn ${activeTab === "opinion" ? "active" : ""}`}
              onClick={() => setActiveTab("opinion")}
            >
              <MessageSquareQuote size={15} /> Dư luận & Lập trường
            </button>
            <button
              className={`result-tab-btn ${activeTab === "trust" ? "active" : ""}`}
              onClick={() => setActiveTab("trust")}
            >
              <Users size={15} /> Khảo sát Niềm tin & Tiếp nhận
            </button>
            <button
              className={`result-tab-btn ${activeTab === "agents" ? "active" : ""}`}
              onClick={() => setActiveTab("agents")}
            >
              <Layers size={15} /> Giám sát Đa tác tử ({result.agent_executions.length})
            </button>
          </div>

          {/* Tab 1: Consensus / Meta-Agent */}
          {activeTab === "consensus" && (
            <div className="panel tab-panel-body">
              <div className="section-title-box">
                <h3>Kết luận Hiệu chuẩn Đồng thuận từ Meta-Agent</h3>
                <p>
                  Được tổng hợp độc lập từ kết quả của các Agent thành phần dựa trên nguyên lý trọng số bằng chứng EWAC và phát hiện xung đột thông tin.
                </p>
              </div>

              <div className="consensus-summary-box">
                <div className="quote-mark">“</div>
                <p>{result.summary}</p>
              </div>

              <div className="consensus-grid-2col">
                <div className="card-bordered">
                  <h4>Ranh giới Khoa học & Tiêu chí Hiệu chuẩn</h4>
                  <ul className="bullet-checklist">
                    <li>
                      <CheckCircle2 size={15} color="#168077" />
                      <span>
                        <strong>Không quy nạp sai lệch:</strong> Niềm tin thực tế đo bằng khảo sát, không suy đoán từ bình luận MXH.
                      </span>
                    </li>
                    <li>
                      <CheckCircle2 size={15} color="#168077" />
                      <span>
                        <strong>Tách biệt ranh giới:</strong> Uy tín nguồn tin (Media Credibility) không bị gộp chung với tính chính xác của bài viết.
                      </span>
                    </li>
                    <li>
                      <CheckCircle2 size={15} color="#168077" />
                      <span>
                        <strong>Truy xuất nguồn gốc:</strong> Mọi bằng chứng trích dẫn đều có URL đối chiếu và dấu thời gian kiểm chứng.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="card-bordered">
                  <h4>Tổng hợp Chỉ số Đa chiều</h4>
                  <div className="stats-mini-list">
                    <div className="mini-stat-row">
                      <span>Điểm tin cậy nguồn tin:</span>
                      <strong>{result.credibility?.overall_credibility_score ?? 0}/100</strong>
                    </div>
                    <div className="mini-stat-row">
                      <span>Lập trường phản đối tin đồn:</span>
                      <strong>{Math.round((result.opinion?.stance_oppose ?? 0) * 100)}%</strong>
                    </div>
                    <div className="mini-stat-row">
                      <span>Khảo sát tin tưởng nguồn chính thống:</span>
                      <strong>{result.survey?.trust_source_score ?? 0}/100</strong>
                    </div>
                    <div className="mini-stat-row">
                      <span>Tỷ lệ kiểm chứng trước khi chia sẻ:</span>
                      <strong>{result.reception?.verify_before_sharing_rate ?? 0}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Fact-Checking Claims & Evidence */}
          {activeTab === "factcheck" && (
            <div className="panel tab-panel-body">
              <div className="section-title-box">
                <h3>Các phát ngôn được kiểm chứng (Extracted Claims)</h3>
                <p>
                  Các claim được tách biệt từ văn bản gốc, phân loại phán quyết và đối chiếu với bằng chứng kiểm chứng số.
                </p>
              </div>

              <div className="claims-detailed-stack">
                {result.claims.map((claim, idx) => {
                  const evidences = claim.evidences || [];
                  const supporting = evidences.filter((e) => e.stance === "SUPPORTS");
                  const refuting = evidences.filter((e) => e.stance === "REFUTES");
                  const others = evidences.filter((e) => e.stance !== "SUPPORTS" && e.stance !== "REFUTES");

                  return (
                    <div key={claim.id} className="claim-card">
                      <div className="claim-card-top" style={{ flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="claim-badge-num">Claim #{idx + 1}</div>
                          <span className="model-badge">
                            <Cpu size={11} /> {claim.model_name || "TrustMedia-NLI-HybridVerifier"} v{claim.model_version || "1.2"}
                          </span>
                          <span
                            className={`verification-status-badge ${
                              claim.verdict === "NOT_ENOUGH_INFORMATION" ? "insufficient" : "verified"
                            }`}
                          >
                            {claim.verification_status || (claim.verdict === "NOT_ENOUGH_INFORMATION" ? "INSUFFICIENT_EVIDENCE" : "VERIFIED")}
                          </span>
                        </div>
                        <span
                          className={`claim-verdict-badge ${
                            claim.verdict === "REFUTED"
                              ? "pill-danger"
                              : claim.verdict === "SUPPORTED"
                              ? "pill-success"
                              : "pill-warning"
                          }`}
                        >
                          {claim.verdict}
                        </span>
                      </div>

                      <div className="claim-text-highlight" style={{ marginTop: 8 }}>
                        "{claim.claim_text}"
                      </div>

                      <div style={{ margin: "6px 0" }}>
                        <span className="calibrated-conf-badge">
                          <ShieldCheck size={13} />
                          Độ tin cậy hiệu chuẩn: <strong>{Math.round(claim.confidence * 100)}%</strong> ({claim.confidence_metric_type || "Calibrated Posterior"})
                        </span>
                      </div>

                      <div className="claim-reasoning">
                        <strong>Cơ sở đánh giá:</strong> {claim.reasoning}
                      </div>

                      {claim.limitations && (
                        <div className="claim-limitations">
                          <AlertTriangle size={14} />
                          <span><strong>Giới hạn kết luận:</strong> {claim.limitations}</span>
                        </div>
                      )}

                      {/* Evidences List */}
                      <div className="evidences-subpanel">
                        <div className="evidence-sub-title">
                          <Search size={14} /> Bằng chứng đối chiếu ({evidences.length})
                        </div>

                        {evidences.length === 0 ? (
                          <div className="no-evidence-alert">
                            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                            <div>
                              <strong>Không tìm thấy bằng chứng đối chứng nào</strong> trong cơ sở tri thức đạt ngưỡng liên quan tối thiểu (≥ 0.22).
                              <div style={{ fontSize: 10, marginTop: 2 }}>
                                Kết luận: <em>Chưa đủ thông tin để thẩm định (NOT_ENOUGH_INFORMATION)</em>. Hệ thống không tạo bằng chứng giả định.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="evidence-groups-container">
                            {refuting.length > 0 && (
                              <div className="evidence-group" style={{ borderColor: "#fecaca" }}>
                                <div className="evidence-group-title" style={{ color: "#b91c1c" }}>
                                  <ShieldAlert size={13} /> Bằng chứng Bác bỏ phát ngôn ({refuting.length})
                                </div>
                                <div className="evidence-grid">
                                  {refuting.map((ev) => (
                                    <div key={ev.id} className="evidence-box">
                                      <div className="ev-box-header">
                                        <span className="ev-source">{ev.source_name}</span>
                                        <span className="ev-stance-tag stance-refute">
                                          {ev.stance} ({Math.round(ev.reliability_score * 100)}%)
                                        </span>
                                      </div>
                                      <p className="ev-excerpt">"{ev.excerpt}"</p>
                                      <div className="ev-meta-footer">
                                        <span className="ev-meta-tag">
                                          <Database size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
                                          {ev.dataset_source || "Tri thức kiểm chứng"}
                                        </span>
                                        {ev.relevance_score !== undefined && ev.relevance_score !== null && (
                                          <span className="ev-meta-tag">Độ khớp: {Math.round(ev.relevance_score * 100)}%</span>
                                        )}
                                        {ev.source_url && (
                                          <a href={ev.source_url} target="_blank" rel="noopener noreferrer" className="ev-link" style={{ marginLeft: "auto" }}>
                                            <ExternalLink size={11} /> Nguồn
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {supporting.length > 0 && (
                              <div className="evidence-group" style={{ borderColor: "#a7f3d0" }}>
                                <div className="evidence-group-title" style={{ color: "#047857" }}>
                                  <ShieldCheck size={13} /> Bằng chứng Xác thực phát ngôn ({supporting.length})
                                </div>
                                <div className="evidence-grid">
                                  {supporting.map((ev) => (
                                    <div key={ev.id} className="evidence-box">
                                      <div className="ev-box-header">
                                        <span className="ev-source">{ev.source_name}</span>
                                        <span className="ev-stance-tag stance-support">
                                          {ev.stance} ({Math.round(ev.reliability_score * 100)}%)
                                        </span>
                                      </div>
                                      <p className="ev-excerpt">"{ev.excerpt}"</p>
                                      <div className="ev-meta-footer">
                                        <span className="ev-meta-tag">
                                          <Database size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
                                          {ev.dataset_source || "Tri thức kiểm chứng"}
                                        </span>
                                        {ev.relevance_score !== undefined && ev.relevance_score !== null && (
                                          <span className="ev-meta-tag">Độ khớp: {Math.round(ev.relevance_score * 100)}%</span>
                                        )}
                                        {ev.source_url && (
                                          <a href={ev.source_url} target="_blank" rel="noopener noreferrer" className="ev-link" style={{ marginLeft: "auto" }}>
                                            <ExternalLink size={11} /> Nguồn
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {others.length > 0 && (
                              <div className="evidence-group">
                                <div className="evidence-group-title" style={{ color: "#64748b" }}>
                                  <Search size={13} /> Bằng chứng Bối cảnh & Trung lập ({others.length})
                                </div>
                                <div className="evidence-grid">
                                  {others.map((ev) => (
                                    <div key={ev.id} className="evidence-box">
                                      <div className="ev-box-header">
                                        <span className="ev-source">{ev.source_name}</span>
                                        <span className="ev-stance-tag stance-neutral">
                                          {ev.stance} ({Math.round(ev.reliability_score * 100)}%)
                                        </span>
                                      </div>
                                      <p className="ev-excerpt">"{ev.excerpt}"</p>
                                      <div className="ev-meta-footer">
                                        <span className="ev-meta-tag">{ev.dataset_source || "Tri thức kiểm chứng"}</span>
                                        {ev.source_url && (
                                          <a href={ev.source_url} target="_blank" rel="noopener noreferrer" className="ev-link" style={{ marginLeft: "auto" }}>
                                            <ExternalLink size={11} /> Nguồn
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Media Credibility */}
          {activeTab === "credibility" && (
            <div className="panel tab-panel-body">
              <div className="section-title-box">
                <h3>Đánh giá Độ tin cậy Nguồn truyền thông (Media Credibility)</h3>
                <p>
                  Đánh giá các thuộc tính nguồn, quy trình biên tập và chất lượng dẫn chứng độc lập với bài viết cụ thể.
                </p>
              </div>

              {result.credibility ? (
                <div className="credibility-full-view">
                  <div className="cred-score-banner">
                    <div className="cred-big-score">
                      <strong>{result.credibility.overall_credibility_score}</strong>
                      <span>/ 100</span>
                    </div>
                    <div>
                      <h4>Nguồn: {result.credibility.source_name}</h4>
                      <p>{result.credibility.reasoning}</p>
                    </div>
                  </div>

                  <div className="cred-criteria-grid">
                    <div className="criteria-card">
                      <div className="crit-label">
                        <span>Độ minh bạch tòa soạn</span>
                        <strong>{result.credibility.transparency_score}%</strong>
                      </div>
                      <div className="crit-track">
                        <div
                          className="crit-fill"
                          style={{ width: `${result.credibility.transparency_score}%` }}
                        />
                      </div>
                      <span className="crit-note">Công khai tôn chỉ, ban biên tập, liên hệ & địa chỉ</span>
                    </div>

                    <div className="criteria-card">
                      <div className="crit-label">
                        <span>Chất lượng trích dẫn nguồn</span>
                        <strong>{result.credibility.citation_score}%</strong>
                      </div>
                      <div className="crit-track">
                        <div
                          className="crit-fill"
                          style={{ width: `${result.credibility.citation_score}%` }}
                        />
                      </div>
                      <span className="crit-note">Dẫn nguồn trực tiếp có tên danh tính thay vì ẩn danh</span>
                    </div>

                    <div className="criteria-card">
                      <div className="crit-label">
                        <span>Chất lượng bằng chứng thực nghiệm</span>
                        <strong>{result.credibility.evidence_score}%</strong>
                      </div>
                      <div className="crit-track">
                        <div
                          className="crit-fill"
                          style={{ width: `${result.credibility.evidence_score}%` }}
                        />
                      </div>
                      <span className="crit-note">Số liệu quan trắc, văn bản pháp quy đối chứng</span>
                    </div>

                    <div className="criteria-card">
                      <div className="crit-label">
                        <span>Chuẩn mực báo chí & Sửa sai</span>
                        <strong>{result.credibility.journalistic_standard_score}%</strong>
                      </div>
                      <div className="crit-track">
                        <div
                          className="crit-fill"
                          style={{ width: `${result.credibility.journalistic_standard_score}%` }}
                        />
                      </div>
                      <span className="crit-note">Có quy định đính chính công khai minh bạch</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <HelpCircle size={28} />
                  <strong>Chưa có dữ liệu đánh giá nguồn tin</strong>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Public Opinion */}
          {activeTab === "opinion" && (
            <div className="panel tab-panel-body">
              <div className="section-title-box">
                <h3>Phân tích Dư luận, Cảm xúc & Lập trường thảo luận</h3>
                <p>
                  Phân biệt rõ ràng giữa <strong>Cảm xúc (Sentiment)</strong> của người dùng và <strong>Lập trường (Stance)</strong> đối với sự kiện.
                </p>
              </div>

              {result.opinion ? (
                <div className="opinion-full-view">
                  <div className="opinion-summary-card">
                    <h4>Tóm tắt xu hướng thảo luận (Mẫu đại diện: {result.opinion.sample_size} tương tác)</h4>
                    <p>{result.opinion.discussion_summary}</p>
                  </div>

                  <div className="opinion-split-grid">
                    {/* Sentiment Box */}
                    <div className="split-box">
                      <h4>Phân bố Cảm xúc (Sentiment)</h4>
                      <div className="dist-list">
                        <div className="dist-item">
                          <span>Tích cực:</span>
                          <strong>{Math.round(result.opinion.sentiment_positive * 100)}%</strong>
                        </div>
                        <div className="dist-item">
                          <span>Trung lập:</span>
                          <strong>{Math.round(result.opinion.sentiment_neutral * 100)}%</strong>
                        </div>
                        <div className="dist-item">
                          <span>Tiêu cực / Lo sợ:</span>
                          <strong style={{ color: "#e05252" }}>
                            {Math.round(result.opinion.sentiment_negative * 100)}%
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Stance Box */}
                    <div className="split-box">
                      <h4>Phân bố Lập trường (Stance)</h4>
                      <div className="dist-list">
                        <div className="dist-item">
                          <span>Ủng hộ tin tức:</span>
                          <strong>{Math.round(result.opinion.stance_support * 100)}%</strong>
                        </div>
                        <div className="dist-item">
                          <span>Phản đối / Bác bỏ:</span>
                          <strong style={{ color: "#168077" }}>
                            {Math.round(result.opinion.stance_oppose * 100)}%
                          </strong>
                        </div>
                        <div className="dist-item">
                          <span>Thảo luận tìm hiểu:</span>
                          <strong>{Math.round(result.opinion.stance_discuss * 100)}%</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Emotions Tags */}
                  <div className="emotions-block">
                    <h4>Các sắc thái cảm xúc nổi bật:</h4>
                    <div className="emotion-chips-row">
                      {Object.entries(result.opinion.top_emotions || {}).map(([emo, val]) => (
                        <div key={emo} className="emotion-chip">
                          <span>{emo}</span>
                          <strong>{val}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <HelpCircle size={28} />
                  <strong>Chưa có dữ liệu phân tích ý kiến công chúng</strong>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Public Trust & Information Reception */}
          {activeTab === "trust" && (
            <div className="panel tab-panel-body">
              <div className="section-title-box">
                <h3>Khảo sát Niềm tin Công chúng & Khả năng Tiếp nhận Thông tin</h3>
                <p>
                  Dữ liệu được thu thập từ các khảo sát dân số và bài kiểm tra đọc hiểu nhận thức độc lập.
                </p>
              </div>

              <div className="trust-reception-grid">
                {result.survey && (
                  <div className="trust-card">
                    <h4>Chỉ số Niềm tin Khảo sát (Empirical Public Trust)</h4>
                    <div className="survey-metric-row">
                      <span>Mẫu khảo sát:</span>
                      <strong>{result.survey.sample_size} người</strong>
                    </div>
                    <div className="survey-metric-row">
                      <span>Niềm tin vào nguồn chính thống:</span>
                      <strong className="text-teal">{result.survey.trust_source_score}/100</strong>
                    </div>
                    <div className="survey-metric-row">
                      <span>Niềm tin vào bằng chứng thực nghiệm:</span>
                      <strong className="text-teal">{result.survey.trust_evidence_score}/100</strong>
                    </div>
                    <p className="survey-desc">{result.survey.findings_summary}</p>
                    <div className="survey-limits">
                      <AlertTriangle size={13} />
                      <span>{result.survey.limitations}</span>
                    </div>
                  </div>
                )}

                {result.reception && (
                  <div className="reception-card">
                    <h4>Đánh giá Tiếp nhận & Ý định Chia sẻ</h4>
                    <div className="survey-metric-row">
                      <span>Khả năng đọc hiểu thông điệp:</span>
                      <strong>{result.reception.comprehension_score}%</strong>
                    </div>
                    <div className="survey-metric-row">
                      <span>Độ chính xác nhận diện Claim:</span>
                      <strong>{result.reception.claim_identification_rate}%</strong>
                    </div>
                    <div className="survey-metric-row">
                      <span>Tỷ lệ kiểm chứng trước chia sẻ:</span>
                      <strong className="text-teal">{result.reception.verify_before_sharing_rate}%</strong>
                    </div>
                    <div className="survey-metric-row">
                      <span>Ý định chia sẻ cao (nguy cơ lan truyền):</span>
                      <strong style={{ color: "#e05252" }}>
                        {result.reception.sharing_intention_high}%
                      </strong>
                    </div>
                    <p className="reception-desc">{result.reception.cognitive_resistance_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 6: Multi-Agent Monitor */}
          {activeTab === "agents" && (
            <div className="panel tab-panel-body">
              <div className="section-title-box">
                <h3>Bảng Giám sát Các Tác tử AI (Multi-Agent Monitor)</h3>
                <p>
                  Theo dõi trạng thái thời gian thực, độ trễ xử lý (ms), phát hiện xung đột và nhật ký hoạt động của từng Agent.
                </p>
              </div>

              <div className="agents-cards-grid">
                {result.agent_executions.map((ag) => (
                  <div key={ag.id} className="agent-monitor-card">
                    <div className="agent-top">
                      <div className="agent-name-role">
                        <Bot size={17} className="text-teal" />
                        <div>
                          <strong>{ag.agent_name}</strong>
                          <span>{ag.agent_role}</span>
                        </div>
                      </div>
                      <span className={`agent-status-badge ${ag.status === "COMPLETED" ? "completed" : ""}`}>
                        <span /> {ag.status}
                      </span>
                    </div>

                    <div style={{ margin: "6px 0", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <span className="model-badge">
                        <Cpu size={10} /> {ag.model_name || "TrustMedia-Agent"} v{ag.model_version || "1.0"}
                      </span>
                      {ag.dataset_ids && ag.dataset_ids.length > 0 && (
                        <span className="model-badge" style={{ background: "#f0fdf4", color: "#166534" }}>
                          <Database size={10} /> {ag.dataset_ids.join(", ")}
                        </span>
                      )}
                    </div>

                    <div className="agent-latency-row">
                      <Clock size={13} />
                      <span>Thời gian thực thi: <strong>{ag.latency_ms || ag.execution_time_ms || 0} ms</strong></span>
                      {ag.retrieval_count !== undefined && ag.retrieval_count > 0 && (
                        <span style={{ fontSize: 9, color: "#64748b" }}>
                          • Truy xuất: {ag.retrieval_count} bản ghi
                        </span>
                      )}
                      {ag.disagreement_detected && (
                        <span className="disagreement-warning">
                          <AlertTriangle size={12} /> Phát hiện bất đồng
                        </span>
                      )}
                    </div>

                    <p className="agent-summary-text">{ag.result_summary || "Hoàn thành tác vụ."}</p>
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
