import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { api } from "../api/client";

export default function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["history", "reports"],
    queryFn: () => api.history.list({ page_size: 20 }),
  });

  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

  const analyses = data?.items || [];
  const currentId = selectedAnalysisId || (analyses[0]?.id ?? null);

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">XUẤT BẢN NGHIÊN CỨU</div>
          <h1>Reports & Export — Trung tâm Báo cáo Nghiên cứu</h1>
          <p className="page-subtitle">
            Trích xuất báo cáo khoa học với đầy đủ trích dẫn, bằng chứng đối chiếu và khuyến cáo giới hạn nghiên cứu sang định dạng JSON, CSV hoặc bản in PDF.
          </p>
        </div>
      </section>

      {/* Reports Selection and Action Card */}
      <section className="panel analyzer-input-panel">
        <div className="panel-heading">
          <div>
            <h2>Chọn bài phân tích cần xuất báo cáo</h2>
            <span className="muted-label">Báo cáo chuẩn hóa định dạng phục vụ công bố và đối soát dữ liệu</span>
          </div>
          <FileText size={18} className="text-teal" />
        </div>

        {isLoading ? (
          <div className="loading-line"><span /> Đang tải danh sách báo cáo...</div>
        ) : analyses.length === 0 ? (
          <div className="registry-state">
            <div className="empty-state">
              <FileText size={32} />
              <strong>Chưa có bài phân tích nào để xuất báo cáo</strong>
              <span>Hãy phân tích bài báo đầu tiên qua News Analyzer.</span>
            </div>
          </div>
        ) : (
          <div className="reports-selection-layout">
            <div className="form-field" style={{ maxWidth: 600 }}>
              <label>Danh sách các bài nghiên cứu đã hoàn tất:</label>
              <select
                value={currentId || ""}
                onChange={(e) => setSelectedAnalysisId(e.target.value)}
                style={{ height: 42, fontSize: 13 }}
              >
                {analyses.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.verdict || "ANALYSIS"}] {a.title} ({new Date(a.created_at).toLocaleDateString("vi-VN")})
                  </option>
                ))}
              </select>
            </div>

            {currentId && (
              <div className="export-cards-row">
                <div className="export-card">
                  <div className="export-icon"><FileSpreadsheet size={24} color="#319795" /></div>
                  <h4>Xuất file CSV</h4>
                  <p>Phù hợp cho phân tích số liệu thống kê trong Excel, SPSS hoặc R.</p>
                  <a
                    href={api.reports.exportCsvUrl(currentId)}
                    download
                    className="button button-outline"
                    style={{ width: "100%" }}
                  >
                    <Download size={14} /> Tải CSV
                  </a>
                </div>

                <div className="export-card">
                  <div className="export-icon"><FileText size={24} color="#4299e1" /></div>
                  <h4>Xuất file JSON chuẩn</h4>
                  <p>Bao gồm đầy đủ schema máy đọc được, metadata và quan hệ Claim-Evidence.</p>
                  <a
                    href={api.reports.exportJsonUrl(currentId)}
                    download
                    className="button button-outline"
                    style={{ width: "100%" }}
                  >
                    <Download size={14} /> Tải JSON
                  </a>
                </div>

                <div className="export-card">
                  <div className="export-icon"><Printer size={24} color="#805ad5" /></div>
                  <h4>Bản in Báo cáo / PDF</h4>
                  <p>Giao diện định dạng trang in ấn học thuật chuyên nghiệp.</p>
                  <a
                    href={api.reports.htmlUrl(currentId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button-primary"
                    style={{ width: "100%" }}
                  >
                    <ExternalLink size={14} /> Mở bản in HTML/PDF
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Guidelines Card */}
      <section className="status-banner">
        <div className="banner-icon"><ShieldCheck size={20} /></div>
        <div className="banner-copy">
          <strong>Chuẩn mực Trích dẫn & Trách nhiệm Liêm chính</strong>
          <span>
            Mọi báo cáo xuất ra từ TrustMedia AI đều mặc định tích hợp phụ lục giới hạn nghiên cứu, phiên bản thuật toán và thời điểm truy xuất để bảo đảm tính khả tái lập (reproducibility) trong nghiên cứu truyền thông số.
          </span>
        </div>
      </section>
    </div>
  );
}
