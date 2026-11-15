import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ExternalLink,
  Search,
} from "lucide-react";
import { api } from "../api/client";

export default function EvidenceExplorerPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVerdict, setSelectedVerdict] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["evidence", "explorer", searchTerm, selectedVerdict],
    queryFn: () =>
      api.evidence.list({
        q: searchTerm || undefined,
        verdict: selectedVerdict || undefined,
        page_size: 30,
      }),
  });

  const items = data?.items || [];

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">KHO CHỨNG CỨ SỐ</div>
          <h1>Evidence Explorer — Truy xuất Nguồn gốc Bằng chứng</h1>
          <p className="page-subtitle">
            Khám phá cơ sở dữ liệu bằng chứng đối chứng, trích dẫn báo chí chính thống, văn bản pháp quy và dấu vết thời gian truy xuất (Provenance).
          </p>
        </div>
      </section>

      {/* Search Toolbar */}
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

          <span className="result-count">Tổng cộng: {data?.total ?? 0} bản ghi</span>
        </div>

        {isLoading ? (
          <div className="loading-line"><span /> Đang tải kho bằng chứng...</div>
        ) : items.length === 0 ? (
          <div className="registry-state">
            <div className="empty-state">
              <Search size={32} />
              <strong>Không tìm thấy bằng chứng phù hợp</strong>
              <span>Hãy thử tìm kiếm với từ khóa khác.</span>
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
    </div>
  );
}
