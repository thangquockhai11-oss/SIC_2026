import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  FileCheck2,
  HelpCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { formatDateTime, formatPercentage, formatStance, formatVerdict } from "../utils/i18n";

export default function FactCheckingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<string>("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["evidence", searchTerm, verdictFilter],
    queryFn: () =>
      api.evidence.list({
        q: searchTerm || undefined,
        verdict: verdictFilter || undefined,
        page_size: 20,
      }),
  });

  const claims = data?.items ?? [];

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">XÁC MINH SỰ THẬT & CƠ SỞ TRI THỨC</div>
          <h1>Kiểm chứng Thông tin — Cơ sở Tri thức Thực nghiệm</h1>
          <p className="page-subtitle">
            Trích xuất tuyên bố (Claims), truy xuất bằng chứng đối chiếu đa nguồn qua Hybrid RAG và phân loại độ chính xác bằng mô hình NLI hiệu chuẩn.
          </p>
        </div>
        <Link to="/analyzer" className="button button-primary">
          + Kiểm chứng bài báo mới
        </Link>
      </section>

      {/* Filter toolbar */}
      <section className="panel registry-panel">
        <div className="registry-toolbar">
          <div className="filter-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Tìm kiếm tuyên bố, nội dung hoặc bằng chứng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select value={verdictFilter} onChange={(e) => setVerdictFilter(e.target.value)}>
            <option value="">Tất cả kết luận kiểm chứng</option>
            <option value="SUPPORTED">Được bằng chứng hỗ trợ</option>
            <option value="REFUTED">Bị bằng chứng bác bỏ</option>
            <option value="PARTIALLY_SUPPORTED">Đúng một phần</option>
            <option value="MISLEADING">Gây hiểu lầm</option>
            <option value="CONFLICTING_EVIDENCE">Bằng chứng mâu thuẫn</option>
            <option value="NOT_ENOUGH_INFORMATION">Chưa đủ bằng chứng</option>
            <option value="NOT_CHECKABLE">Không thể kiểm chứng</option>
          </select>

          <span className="result-count">Tổng cộng: {data?.total ?? 0} tuyên bố đã lưu</span>
        </div>

        {isLoading ? (
          <div className="loading-line" style={{ padding: "40px 20px" }}>
            <span /> Đang truy xuất dữ liệu kiểm chứng và cơ sở tri thức...
          </div>
        ) : isError ? (
          <div className="inline-error" style={{ margin: 20 }}>
            <AlertTriangle size={18} />
            <span>Không thể kết nối đến cơ sở dữ liệu kiểm chứng.</span>
          </div>
        ) : claims.length === 0 ? (
          <div className="registry-state">
            <div className="empty-state">
              <FileCheck2 size={32} />
              <strong>Chưa tìm thấy tuyên bố phù hợp</strong>
              <span>Hãy điều chỉnh bộ lọc hoặc gửi một bài viết mới qua phân hệ Phân tích bài báo.</span>
            </div>
          </div>
        ) : (
          <div className="claims-grid-page">
            {claims.map((claim: any) => {
              const evidences = claim.evidences || [];
              const supportingEvs = evidences.filter((e: any) => e.stance === "SUPPORTS");
              const refutingEvs = evidences.filter((e: any) => e.stance === "REFUTES");
              const otherEvs = evidences.filter(
                (e: any) => e.stance !== "SUPPORTS" && e.stance !== "REFUTES"
              );

              return (
                <div key={claim.id} className="claim-card-standalone">
                  {/* Top Metadata Row */}
                  <div className="claim-header-row" style={{ flexWrap: "wrap", gap: "8px" }}>
                    <div className="analysis-origin-tag">
                      Bài viết: <strong>{claim.analysis_title}</strong>
                    </div>

                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
                      {/* Model Badge */}
                      <span className="model-badge">
                        <Cpu size={12} /> {claim.model_name || "TrustMedia-NLI-HybridVerifier"} v{claim.model_version || "2.0"}
                      </span>

                      {/* Verification Status Badge */}
                      <span
                        className={`verification-status-badge ${
                          claim.verdict === "NOT_ENOUGH_INFORMATION"
                            ? "insufficient"
                            : "verified"
                        }`}
                      >
                        {claim.verdict === "NOT_ENOUGH_INFORMATION" ? "Chưa đủ căn cứ" : "Đã đối soát"}
                      </span>

                      {/* Verdict Badge */}
                      <span
                        className={`claim-verdict-badge ${
                          claim.verdict === "REFUTED"
                            ? "pill-danger"
                            : claim.verdict === "SUPPORTED"
                            ? "pill-success"
                            : "pill-warning"
                        }`}
                      >
                        {claim.verdict === "REFUTED" && <XCircle size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />}
                        {claim.verdict === "SUPPORTED" && <CheckCircle2 size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />}
                        {claim.verdict === "NOT_ENOUGH_INFORMATION" && <HelpCircle size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />}
                        {formatVerdict(claim.verdict)}
                      </span>
                    </div>
                  </div>

                  {/* Claim Text */}
                  <h3 className="claim-text-title" style={{ marginTop: "12px" }}>
                    "{claim.claim_text}"
                  </h3>

                  {/* Calibrated Confidence Badge */}
                  <div style={{ margin: "8px 0" }}>
                    <span className="calibrated-conf-badge">
                      <ShieldCheck size={14} />
                      Độ tin cậy hiệu chuẩn: <strong>{formatPercentage(claim.confidence)}</strong>
                    </span>
                  </div>

                  {/* Reasoning */}
                  <p className="claim-reasoning-body">
                    <strong>Cơ sở xác minh:</strong> {claim.reasoning}
                  </p>

                  {claim.limitations && (
                    <div className="claim-limit-note">
                      <AlertTriangle size={13} />
                      <span>{claim.limitations}</span>
                    </div>
                  )}

                  {/* Evidence Section */}
                  <div className="evidences-fold" style={{ marginTop: "14px" }}>
                    {evidences.length === 0 ? (
                      <div className="no-evidence-alert">
                        <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                        <div>
                          <strong>Không tìm thấy bằng chứng đối chứng nào</strong> trong cơ sở tri thức đạt ngưỡng liên quan tối thiểu (≥ 0.22).
                          <div style={{ marginTop: 2, fontSize: 10, opacity: 0.9 }}>
                            Kết luận: <em>Chưa đủ bằng chứng để kiểm chứng (NOT_ENOUGH_INFORMATION)</em>. Hệ thống minh bạch không tự tạo bằng chứng giả định.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="evidence-groups-container">
                        {/* Refuting Group */}
                        {refutingEvs.length > 0 && (
                          <div className="evidence-group" style={{ borderColor: "#fecaca" }}>
                            <div className="evidence-group-title" style={{ color: "#b91c1c" }}>
                              <ShieldAlert size={14} /> Bằng chứng Bác bỏ tuyên bố ({refutingEvs.length})
                            </div>
                            <div className="ev-cards-list">
                              {refutingEvs.map((ev: any) => (
                                <EvidenceCard key={ev.id} ev={ev} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Supporting Group */}
                        {supportingEvs.length > 0 && (
                          <div className="evidence-group" style={{ borderColor: "#a7f3d0" }}>
                            <div className="evidence-group-title" style={{ color: "#047857" }}>
                              <ShieldCheck size={14} /> Bằng chứng Hỗ trợ tuyên bố ({supportingEvs.length})
                            </div>
                            <div className="ev-cards-list">
                              {supportingEvs.map((ev: any) => (
                                <EvidenceCard key={ev.id} ev={ev} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Neutral / Context Group */}
                        {otherEvs.length > 0 && (
                          <div className="evidence-group">
                            <div className="evidence-group-title" style={{ color: "#64748b" }}>
                              <Search size={14} /> Bằng chứng Bối cảnh & Trung lập ({otherEvs.length})
                            </div>
                            <div className="ev-cards-list">
                              {otherEvs.map((ev: any) => (
                                <EvidenceCard key={ev.id} ev={ev} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="claim-footer-row" style={{ marginTop: "14px" }}>
                    <Link to={`/analyzer?id=${claim.analysis_id}`} className="button button-sm button-outline">
                      Xem báo cáo phân tích toàn diện
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function EvidenceCard({ ev }: { ev: any }) {
  return (
    <div className="ev-item-card">
      <div className="ev-item-top">
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
          {formatStance(ev.stance)} ({formatPercentage(ev.reliability_score)})
        </span>
      </div>

      <p className="ev-quote">"{ev.excerpt}"</p>

      {/* Provenance and Verification Details */}
      <div className="ev-meta-footer">
        <span className="ev-meta-tag">
          <Database size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
          Nguồn tri thức: <strong>{ev.dataset_source || "Kiểm chứng Thực nghiệm"}</strong>
        </span>
        {ev.dataset_record_id && (
          <span className="ev-meta-tag">Mã bản ghi: #{ev.dataset_record_id}</span>
        )}
        {ev.relevance_score !== undefined && ev.relevance_score !== null && (
          <span className="ev-meta-tag">
            Độ liên quan: <strong>{formatPercentage(ev.relevance_score)}</strong>
          </span>
        )}
        {ev.nli_relation && (
          <span className="ev-meta-tag">
            Quan hệ NLI: <strong>{ev.nli_relation}</strong>
          </span>
        )}
        {ev.retrieval_timestamp && (
          <span className="ev-meta-tag">
            Thời điểm: {formatDateTime(ev.retrieval_timestamp)}
          </span>
        )}
        {ev.source_url && (
          <a
            href={ev.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ev-ref-link"
            style={{ marginLeft: "auto" }}
          >
            <ExternalLink size={12} /> Nguồn gốc
          </a>
        )}
      </div>
    </div>
  );
}
