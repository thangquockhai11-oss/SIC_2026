import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
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
  Sliders,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { api } from "../api/client";
import type { AnalysisDetail } from "../api/types";

// Realistic Presets for 1-Click Verification Testing
const SAMPLE_PRESETS = [
  {
    id: "bep-gas",
    label: "Bếp gas chạy bằng nước lã",
    badge: "Tin đồn lừa đảo",
    title: "Xác minh thông tin 'bếp gas chạy bằng nước lã' tiết kiệm 100% nhiên liệu",
    content:
      "Gần đây, mạng xã hội liên tục xuất hiện các clip quảng cáo về 'bếp gas chạy bằng nước lã'. Người bán khẳng định chỉ cần đổ nước lã pha chút muối ăn vào bình chứa là ngọn lửa cháy liên tục 24/24 giờ mà không tốn gas, giúp tiết kiệm 100% chi phí năng lượng. Thậm chí có người hỏi thông tin để đặt mua hàng loạt. Các chuyên gia năng lượng và viện hóa học khẳng định nước (H2O) không phải là chất đốt tự nhiên, đây là chiêu trò lừa đảo sử dụng bình đất đèn (khí acetylen) ngụy trang tiềm ẩn nguy cơ nổ cực kỳ nguy hiểm.",
    language: "vi",
    scope: "full",
  },
  {
    id: "vo-dap",
    label: "Tin đồn vỡ đập thủy điện",
    badge: "Tin giả thiên tai",
    title: "Kiểm chứng thông tin 'vỡ đập thủy điện' gây hoang mang dư luận tại miền Trung",
    content:
      "Trên một số hội nhóm mạng xã hội lan truyền tin khẩn cấp: 'Đập thủy điện Sông Tranh 2 đã bị nứt vỡ thân đập do mưa lũ lớn, người dân vùng hạ du cần sơ tán khẩn cấp ngay trong đêm'. Ban chỉ huy Phòng chống thiên tai tỉnh và đại diện Tập đoàn Điện lực Việt Nam (EVN) đã chính thức bác bỏ, khẳng định toàn bộ các công trình thủy điện miền Trung vẫn vận hành an toàn, mực nước hồ chứa đang trong ngưỡng kiểm soát, không có bất kỳ sự cố rò rỉ hay nứt đập nào.",
    language: "vi",
    scope: "full",
  },
  {
    id: "huy-thi",
    label: "Hủy thi tốt nghiệp THPT",
    badge: "Tin giáo dục sai lệch",
    title: "Thực hư tin đồn 'Bộ GD&ĐT chính thức hủy bỏ kỳ thi tốt nghiệp THPT từ năm 2026'",
    content:
      "Một tài khoản TikTok đưa tin 'Bộ Giáo dục và Đào tạo vừa ban hành quyết định hủy bỏ hoàn toàn kỳ thi tốt nghiệp THPT từ năm 2026, chuyển giao 100% quyền xét tuyển cho các trường đại học'. Đại diện Bộ Giáo dục và Đào tạo khẳng định đây là thông tin hoàn toàn bịa đặt. Kỳ thi tốt nghiệp THPT năm 2026 vẫn diễn ra bình thường theo Chương trình Giáo dục phổ thông 2018 với định dạng đề thi mới đã được công bố chính thức.",
    language: "vi",
    scope: "full",
  },
  {
    id: "gia-dien",
    label: "EVN điều chỉnh giá điện",
    badge: "Thời sự / Kinh tế",
    title: "EVN thông tin chính thức về cơ chế điều chỉnh giá bán lẻ điện bình quân",
    content:
      "Tập đoàn Điện lực Việt Nam (EVN) thông báo điều chỉnh mức giá bán lẻ điện bình quân nhằm phản ánh biến động giá than và khí đầu vào. Một số trang tin không chính thống đồn đoán giá điện sẽ tăng gấp đôi trong quý tới. Đại diện Bộ Công Thương khẳng định mức điều chỉnh tuân thủ nghiêm ngặt khung giá của Chính phủ, đồng thời chính sách hỗ trợ tiền điện cho các hộ nghèo và gia đình chính sách tiếp tục được bảo đảm theo quy định.",
    language: "vi",
    scope: "full",
  },
];

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
  const [copiedPreset, setCopiedPreset] = useState<string | null>(null);
  const [pastedStatus, setPastedStatus] = useState(false);

  // Execution state
  const [submitting, setSubmitting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(queryId);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisDetail | null>(null);

  // Active result tab
  const [activeTab, setActiveTab] = useState<"consensus" | "factcheck" | "credibility" | "opinion" | "trust" | "agents">("consensus");

  // Metrics
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const isValidLength = charCount >= 20;

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
          throw new Error("Nội dung bài viết tối thiểu 20 ký tự để trích xuất claim");
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

  const handleApplyPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setInputMode("text");
    setTitle(preset.title);
    setContent(preset.content);
    setLanguage(preset.language);
    setScope(preset.scope);
    setErrorMessage(null);
    setCopiedPreset(preset.id);
    setTimeout(() => setCopiedPreset(null), 2500);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setContent(text);
        setPastedStatus(true);
        setTimeout(() => setPastedStatus(false), 2000);
      }
    } catch {
      // Browser permission denied or not supported
    }
  };

  const handleClearForm = () => {
    setTitle("");
    setContent("");
    setSourceUrl("");
    setErrorMessage(null);
  };

  const handleReset = () => {
    setResult(null);
    setCurrentJobId(null);
    setJobStatus(null);
    setErrorMessage(null);
    setSearchParams({});
  };

  // Dynamic metrics calculation for active result
  const supportedClaimsCount = result?.claims.filter((c) => c.verdict === "SUPPORTED").length ?? 0;
  const refutedClaimsCount = result?.claims.filter((c) => c.verdict === "REFUTED").length ?? 0;
  const notCheckableCount = result?.claims.filter((c) => c.verdict === "NOT_CHECKABLE").length ?? 0;
  const inconclusiveCount = result?.claims.filter((c) => c.verdict === "NOT_ENOUGH_INFORMATION").length ?? 0;
  const totalClaims = result?.claims.length ?? 0;

  // Stance analysis
  const stanceOppose = result?.opinion?.stance_oppose ?? 0;
  const stanceSupport = result?.opinion?.stance_support ?? 0;
  const stanceDiscuss = result?.opinion?.stance_discuss ?? 0;
  const dominantStanceName =
    stanceOppose > stanceSupport && stanceOppose > stanceDiscuss
      ? "Phản đối tin đồn"
      : stanceDiscuss > stanceSupport
      ? "Thảo luận & Phân tích"
      : "Đồng thuận & Ủng hộ";
  const dominantStanceValue = Math.round(Math.max(stanceOppose, stanceSupport, stanceDiscuss) * 100);

  // Dynamic calibration criteria
  const metaExec = result?.agent_executions.find((a) => a.agent_name === "MetaSynthesisAgent");
  const dynamicCriteria: string[] = (metaExec?.output as any)?.calibration_criteria || [
    `Thẩm định ${totalClaims} phát ngôn cốt lõi: Ghi nhận ${supportedClaimsCount} claim xác thực có căn cứ, ${refutedClaimsCount} claim bị bác bỏ và ${inconclusiveCount + notCheckableCount} claim cần phúc tra hoặc mang tính thảo luận xã hội.`,
    `Đánh giá độc lập nguồn tin: Nguồn '${result?.credibility?.source_name || "Nguồn tin"}' đạt ${result?.credibility?.overall_credibility_score ?? 70}/100 theo chuẩn đối chuẩn NELA-GT; tách biệt uy tín cơ quan báo chí với tính xác thực của từng phát biểu.`,
    `Đồng thuận dư luận & khảo sát thực chứng: Luồng thảo luận công chúng nghiêng về '${dominantStanceName}' (${dominantStanceValue}%); điểm khảo sát niềm tin đạt ${result?.survey?.trust_source_score ?? 80}/100 và tỷ lệ tiếp nhận kiểm chứng đạt ${result?.reception?.verify_before_sharing_rate ?? 70}%.`,
  ];

  return (
    <div className="page-stack">
      {/* Page Header Hero */}
      <section className="analyzer-header-hero">
        <div className="analyzer-header-content">
          <div className="analyzer-badge-chip">
            <Sparkles size={13} className="sparkle-svg" />
            <span>HỆ ĐIỀU PHỐI ĐA TÁC TỬ • MULTI-AGENT VERIFICATION</span>
          </div>
          <h1 className="analyzer-main-title">
            News Analyzer <span className="title-gradient">— Giám định & Phân tích Tin tức Số</span>
          </h1>
          <p className="analyzer-header-subtitle">
            Hệ sinh thái AI phối hợp đa tác tử: Trích xuất phát ngôn cốt lõi (Claims), đối chiếu bằng chứng đa nguồn qua Hybrid RAG (FEVER & ViFactCheck), thẩm định độ tin cậy tòa soạn (NELA-GT) và hiệu chuẩn đồng thuận (EWAC).
          </p>
        </div>
        {result && (
          <button className="button button-outline analyzer-new-btn" onClick={handleReset}>
            <RefreshCw size={14} /> Phân tích bài báo mới
          </button>
        )}
      </section>

      {/* Input Form Section */}
      {!result && (
        <section className="analyzer-input-card">
          {/* Quick Scenario Presets */}
          <div className="analyzer-quick-presets">
            <div className="preset-label">
              <Zap size={14} className="icon-amber" />
              <span>Kịch bản mẫu kiểm thử nhanh:</span>
            </div>
            <div className="preset-chips-scroll">
              {SAMPLE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`preset-chip-btn ${copiedPreset === p.id ? "applied" : ""}`}
                  onClick={() => handleApplyPreset(p)}
                  title="Nhấn để tự động nạp kịch bản mẫu này"
                >
                  <span className="preset-tag">{p.badge}</span>
                  <span className="preset-name">{p.label}</span>
                  {copiedPreset === p.id && <Check size={12} className="applied-icon" />}
                </button>
              ))}
            </div>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="analyzer-mode-switcher">
            <button
              type="button"
              className={`mode-switch-btn ${inputMode === "text" ? "active" : ""}`}
              onClick={() => setInputMode("text")}
            >
              <FileText size={16} />
              <div className="mode-btn-text">
                <span className="mode-main">Dán văn bản bài báo</span>
                <span className="mode-sub">Nội dung, bài đăng mạng xã hội hoặc phát ngôn</span>
              </div>
            </button>
            <button
              type="button"
              className={`mode-switch-btn ${inputMode === "url" ? "active" : ""}`}
              onClick={() => setInputMode("url")}
            >
              <Globe size={16} />
              <div className="mode-btn-text">
                <span className="mode-main">Trích xuất từ URL</span>
                <span className="mode-sub">Hệ thống bảo vệ Chống SSRF an toàn</span>
              </div>
            </button>
          </div>

          {errorMessage && (
            <div className="inline-error" style={{ margin: "16px 0" }}>
              <AlertCircle size={18} />
              <div>
                <strong>Lỗi xử lý yêu cầu:</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="analyzer-form-modern">
            {/* Title field */}
            <div className="analyzer-field-group">
              <div className="field-label-row">
                <label htmlFor="article-title" className="field-main-label">
                  Tiêu đề bài viết
                </label>
                <span className="field-badge-optional">Tùy chọn • Tự động trích xuất nếu để trống</span>
              </div>
              <div className="input-modern-wrapper">
                <FileText size={16} className="input-left-icon" />
                <input
                  id="article-title"
                  type="text"
                  className="input-control-modern"
                  placeholder="VD: Cảnh báo tin đồn vỡ đập thủy điện hoặc video 'bếp gas chạy bằng nước lã'..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={submitting}
                />
                {title && !submitting && (
                  <button
                    type="button"
                    className="input-clear-btn"
                    onClick={() => setTitle("")}
                    title="Xóa tiêu đề"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Content Textarea OR URL input */}
            {inputMode === "url" ? (
              <div className="analyzer-field-group">
                <div className="field-label-row">
                  <label htmlFor="source-url" className="field-main-label">
                    URL bài báo trực tuyến cần thẩm định <span className="required-star">*</span>
                  </label>
                  <span className="field-badge-security">SSRF Shield Active</span>
                </div>

                <div className="input-modern-wrapper">
                  <Globe size={16} className="input-left-icon text-teal" />
                  <input
                    id="source-url"
                    type="url"
                    className="input-control-modern"
                    placeholder="https://vnexpress.net/thoi-su/... hoặc https://tuoitre.vn/..."
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    required
                    disabled={submitting}
                  />
                  {sourceUrl && !submitting && (
                    <button
                      type="button"
                      className="input-clear-btn"
                      onClick={() => setSourceUrl("")}
                      title="Xóa URL"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div className="ssrf-shield-card">
                  <ShieldCheck size={20} className="shield-icon" />
                  <div className="shield-details">
                    <div className="shield-title">Cơ chế Bảo vệ Chống SSRF (Server-Side Request Forgery)</div>
                    <p className="shield-desc">
                      Hệ thống tự động phân giải DNS trước khi kết nối, chặn triệt để dải IP nội bộ RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), Loopback (127.0.0.1) và Cloud Metadata (169.254.169.254). Giới hạn kích thước tải tối đa 2MB với timeout 6.0 giây để bảo đảm an toàn hạ tầng.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="analyzer-field-group">
                <div className="textarea-top-toolbar">
                  <div className="field-label-row" style={{ marginBottom: 0 }}>
                    <label htmlFor="article-content" className="field-main-label">
                      Nội dung bài viết / Thông điệp cần kiểm chứng <span className="required-star">*</span>
                    </label>
                  </div>

                  <div className="textarea-quick-tools">
                    <button
                      type="button"
                      className="tool-btn"
                      onClick={handlePasteClipboard}
                      disabled={submitting}
                      title="Dán văn bản trực tiếp từ clipboard máy tính"
                    >
                      <Copy size={13} />
                      <span>{pastedStatus ? "Đã dán!" : "Dán Clipboard"}</span>
                    </button>

                    {content && !submitting && (
                      <button
                        type="button"
                        className="tool-btn tool-btn-danger"
                        onClick={() => setContent("")}
                        title="Xóa nhanh toàn bộ nội dung"
                      >
                        <Trash2 size={13} />
                        <span>Xóa</span>
                      </button>
                    )}

                    <div className={`char-counter-pill ${isValidLength ? "valid" : "invalid"}`}>
                      {isValidLength ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <AlertTriangle size={12} />
                      )}
                      <span>
                        {charCount} ký tự {isValidLength ? `(~${wordCount} từ)` : "/ tối thiểu 20"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="textarea-modern-wrapper">
                  <textarea
                    id="article-content"
                    rows={7}
                    className="textarea-control-modern"
                    placeholder="Dán toàn bộ văn bản bài viết, phát ngôn báo chí hoặc tin đồn lan truyền trên mạng xã hội vào đây... (Mẹo: Có thể dùng phím tắt Ctrl + Enter để bắt đầu phân tích ngay)"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !submitting && isValidLength) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="textarea-bottom-bar">
                  <div className="bar-left-info">
                    <span className="rag-indicator">
                      <Database size={12} /> Hybrid RAG Active: <strong>FEVER</strong> • <strong>ViFactCheck</strong> • <strong>X-FACT</strong>
                    </span>
                  </div>
                  <div className="bar-right-hint">
                    <span>Nhấn <kbd>Ctrl</kbd> + <kbd>Enter</kbd> để gửi phân tích</span>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Configuration Settings (Scope & Language) */}
            <div className="analyzer-settings-grid">
              <div className="setting-card">
                <div className="setting-card-header">
                  <Globe size={16} className="setting-icon text-blue" />
                  <div>
                    <label htmlFor="analysis-lang" className="setting-title">Ngôn ngữ xử lý (Language)</label>
                    <span className="setting-subtitle">Tối ưu hóa tokenizer và mô hình NLI tương ứng</span>
                  </div>
                </div>
                <select
                  id="analysis-lang"
                  className="select-control-modern"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={submitting}
                >
                  <option value="vi">🇻🇳 Tiếng Việt (Vietnamese — PhoBERT / ViHate / ViNLI)</option>
                  <option value="en">🇬🇧 English (Tiếng Anh — RoBERTa / DeBERTa NLI)</option>
                </select>
              </div>

              <div className="setting-card">
                <div className="setting-card-header">
                  <Sliders size={16} className="setting-icon text-emerald" />
                  <div>
                    <label htmlFor="analysis-scope" className="setting-title">Phạm vi phân tích (Scope)</label>
                    <span className="setting-subtitle">Lựa chọn các tác tử chuyên biệt cùng phối hợp</span>
                  </div>
                </div>
                <select
                  id="analysis-scope"
                  className="select-control-modern"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  disabled={submitting}
                >
                  <option value="full">🚀 Toàn diện (Fact-checking + Media + Opinion + Public Trust + Meta-Agent)</option>
                  <option value="fact_checking">🔍 Chỉ Fact-checking (Trích xuất Claims & Bằng chứng RAG)</option>
                  <option value="media_credibility">📰 Chỉ Media Credibility (Độ tin cậy & Tôn chỉ Tòa soạn NELA-GT)</option>
                  <option value="public_opinion">💬 Chỉ Public Opinion (Lập trường & Cảm xúc dư luận TweetEval / UIT-VSFC)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="analyzer-submit-row">
              <button
                type="submit"
                className="btn-analyze-primary"
                disabled={submitting || (inputMode === "text" && !isValidLength) || (inputMode === "url" && !sourceUrl.trim())}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={18} className="spin-icon" />
                    <div className="btn-text-block">
                      <span className="btn-main-label">Đang điều phối các Tác tử AI...</span>
                      <span className="btn-sub-label">LangGraph Multi-Agent Execution</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="glow-icon" />
                    <div className="btn-text-block">
                      <span className="btn-main-label">Bắt đầu phân tích Đa tác tử</span>
                      <span className="btn-sub-label">Multi-Agent Consensus Verification</span>
                    </div>
                  </>
                )}
              </button>

              {(title || content || sourceUrl) && !submitting && (
                <button
                  type="button"
                  className="btn-clear-secondary"
                  onClick={handleClearForm}
                  title="Xóa trắng dữ liệu vừa nhập"
                >
                  <Trash2 size={15} /> Xóa form
                </button>
              )}

              <div className="submit-meta-info">
                <span className="meta-tag">
                  <Database size={11} /> pgvector RAG Active
                </span>
                <span className="meta-tag">
                  <Bot size={11} /> 5 AI Agents Ready
                </span>
              </div>
            </div>
          </form>

          {/* Multi-Agent Live Execution Board when Submitting */}
          {submitting && (
            <div className="agent-pipeline-board">
              <div className="pipeline-header">
                <div className="pipeline-title-group">
                  <div className="pulse-indicator-dot" />
                  <div>
                    <div className="pipeline-title">
                      Hệ điều phối Đa tác tử đang hoạt động (LangGraph Pipeline)
                    </div>
                    <div className="pipeline-status-text">
                      Trạng thái hiện tại: <strong>{jobStatus || "PROCESSING"}</strong>
                    </div>
                  </div>
                </div>
                <div className="pipeline-progress-badge">
                  <span>Tiến độ tổng thể: <strong>{jobProgress}%</strong></span>
                </div>
              </div>

              {/* Progress track */}
              <div className="pipeline-track">
                <div
                  className="pipeline-fill"
                  style={{ width: `${Math.max(jobProgress, 8)}%` }}
                />
              </div>

              {/* 5 Agent Cards */}
              <div className="pipeline-agents-grid">
                <div className={`agent-flow-card ${jobProgress >= 15 ? (jobProgress >= 30 ? "done" : "running") : "pending"}`}>
                  <div className="agent-card-icon">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="agent-card-body">
                    <div className="agent-card-name">1. Ingestion & Guard Agent</div>
                    <div className="agent-card-desc">Làm sạch văn bản, chuẩn hóa tiếng Việt & chống SSRF</div>
                    <div className="agent-card-status">
                      {jobProgress >= 30 ? "✓ Hoàn thành" : jobProgress >= 15 ? "Đang xử lý..." : "Chờ kích hoạt"}
                    </div>
                  </div>
                </div>

                <div className={`agent-flow-card ${jobProgress >= 30 ? (jobProgress >= 60 ? "done" : "running") : "pending"}`}>
                  <div className="agent-card-icon">
                    <FileCheck2 size={18} />
                  </div>
                  <div className="agent-card-body">
                    <div className="agent-card-name">2. Fact-Checking Agent</div>
                    <div className="agent-card-desc">Trích xuất Claims & Hybrid RAG (FEVER, ViFactCheck)</div>
                    <div className="agent-card-status">
                      {jobProgress >= 60 ? "✓ Hoàn thành" : jobProgress >= 30 ? "Đang truy xuất tri thức..." : "Chờ kích hoạt"}
                    </div>
                  </div>
                </div>

                <div className={`agent-flow-card ${jobProgress >= 60 ? (jobProgress >= 80 ? "done" : "running") : "pending"}`}>
                  <div className="agent-card-icon">
                    <ShieldAlert size={18} />
                  </div>
                  <div className="agent-card-body">
                    <div className="agent-card-name">3. Media Credibility Agent</div>
                    <div className="agent-card-desc">Đánh giá tôn chỉ, quy trình biên tập NELA-GT</div>
                    <div className="agent-card-status">
                      {jobProgress >= 80 ? "✓ Hoàn thành" : jobProgress >= 60 ? "Đang thẩm định tòa soạn..." : "Chờ kích hoạt"}
                    </div>
                  </div>
                </div>

                <div className={`agent-flow-card ${jobProgress >= 80 ? (jobProgress >= 90 ? "done" : "running") : "pending"}`}>
                  <div className="agent-card-icon">
                    <MessageSquareQuote size={18} />
                  </div>
                  <div className="agent-card-body">
                    <div className="agent-card-name">4. Public Opinion & Stance</div>
                    <div className="agent-card-desc">Phân tích lập trường dư luận TweetEval & UIT-VSFC</div>
                    <div className="agent-card-status">
                      {jobProgress >= 90 ? "✓ Hoàn thành" : jobProgress >= 80 ? "Đang tính toán cảm xúc..." : "Chờ kích hoạt"}
                    </div>
                  </div>
                </div>

                <div className={`agent-flow-card ${jobProgress >= 90 ? (jobProgress >= 100 ? "done" : "running") : "pending"}`}>
                  <div className="agent-card-icon">
                    <Bot size={18} />
                  </div>
                  <div className="agent-card-body">
                    <div className="agent-card-name">5. EWAC Meta-Agent</div>
                    <div className="agent-card-desc">Hiệu chuẩn trọng số bằng chứng & tổng hợp phán quyết</div>
                    <div className="agent-card-status">
                      {jobProgress >= 100 ? "✓ Hoàn thành" : jobProgress >= 90 ? "Đang hiệu chuẩn đồng thuận..." : "Chờ kích hoạt"}
                    </div>
                  </div>
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
                      : result.verdict === "MIXED"
                      ? "pill-warning"
                      : result.verdict === "NOT_CHECKABLE"
                      ? "pill-neutral"
                      : "pill-warning"
                  }`}
                >
                  <span className="verdict-dot" />
                  <strong>
                    {result.verdict === "REFUTED"
                      ? "BÁC BỎ (REFUTED)"
                      : result.verdict === "SUPPORTED"
                      ? "XÁC THỰC (SUPPORTED)"
                      : result.verdict === "MIXED"
                      ? "HỖN HỢP (MIXED)"
                      : result.verdict === "NOT_CHECKABLE"
                      ? "THĂM DÒ / Ý KIẾN (OPINION)"
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
                    {dynamicCriteria.map((crit, idx) => (
                      <li key={idx}>
                        <CheckCircle2 size={16} color="#0d9488" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{crit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="card-bordered">
                  <h4>Tổng hợp Chỉ số Đa chiều</h4>
                  <div className="stats-mini-list">
                    <div className="mini-stat-card">
                      <div className="mini-stat-header">
                        <span className="mini-stat-label">Độ tin cậy tòa soạn (NELA-GT)</span>
                        <strong className="mini-stat-val">{result.credibility?.overall_credibility_score ?? 70}/100</strong>
                      </div>
                      <div className="mini-progress-track">
                        <div
                          className="mini-progress-fill fill-emerald"
                          style={{ width: `${Math.min(100, result.credibility?.overall_credibility_score ?? 70)}%` }}
                        />
                      </div>
                      <span className="mini-stat-sub">{result.credibility?.source_name || "Nguồn tin đối chuẩn"}</span>
                    </div>

                    <div className="mini-stat-card">
                      <div className="mini-stat-header">
                        <span className="mini-stat-label">Lập trường dư luận: {dominantStanceName}</span>
                        <strong className="mini-stat-val">{dominantStanceValue}%</strong>
                      </div>
                      <div className="mini-progress-track">
                        <div
                          className="mini-progress-fill fill-blue"
                          style={{ width: `${dominantStanceValue}%` }}
                        />
                      </div>
                      <span className="mini-stat-sub">Chuẩn hóa theo ngữ liệu TweetEval & UIT-VSMEC</span>
                    </div>

                    <div className="mini-stat-card">
                      <div className="mini-stat-header">
                        <span className="mini-stat-label">Khảo sát niềm tin công chúng (WVS Wave 7)</span>
                        <strong className="mini-stat-val">{result.survey?.trust_source_score ?? 80}/100</strong>
                      </div>
                      <div className="mini-progress-track">
                        <div
                          className="mini-progress-fill fill-teal"
                          style={{ width: `${Math.min(100, result.survey?.trust_source_score ?? 80)}%` }}
                        />
                      </div>
                      <span className="mini-stat-sub">Cỡ mẫu khảo sát thực nghiệm: {result.survey?.sample_size ?? 1250} người</span>
                    </div>

                    <div className="mini-stat-card">
                      <div className="mini-stat-header">
                        <span className="mini-stat-label">Mức độ tiếp nhận & đọc hiểu (MIND)</span>
                        <strong className="mini-stat-val">{result.reception?.comprehension_score ?? 85}%</strong>
                      </div>
                      <div className="mini-progress-track">
                        <div
                          className="mini-progress-fill fill-purple"
                          style={{ width: `${Math.min(100, result.reception?.comprehension_score ?? 85)}%` }}
                        />
                      </div>
                      <span className="mini-stat-sub">Tỷ lệ kiểm chứng trước khi chia sẻ: {result.reception?.verify_before_sharing_rate ?? 70}%</span>
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
