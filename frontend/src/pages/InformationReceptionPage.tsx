import { useQuery } from "@tanstack/react-query";
import {
  BrainCircuit,
  FileCheck2,
  Share2,
} from "lucide-react";
import { api } from "../api/client";

export default function InformationReceptionPage() {
  const { data: tests, isLoading } = useQuery({
    queryKey: ["reception", "tests"],
    queryFn: api.reception.listTests,
  });

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">TÂM LÝ HỌC TRUYỀN THÔNG</div>
          <h1>Information Reception — Tiếp nhận Thông tin</h1>
          <p className="page-subtitle">
            Đo lường mức độ thấu hiểu thông điệp, khả năng nhận diện phát ngôn sai lệch, sức kháng cự nhận thức và ý định chia sẻ lại của độc giả.
          </p>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="metric-grid">
        <div className="metric-card">
          <div className="metric-top">
            <div className="metric-icon green"><BrainCircuit size={16} /></div>
            <span className="metric-label">Độ hiểu thông điệp (Comprehension)</span>
          </div>
          <strong className="metric-value">85.4%</strong>
          <span className="metric-note">Khả năng nắm bắt đúng luận điểm cốt lõi bài viết</span>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <div className="metric-icon blue"><FileCheck2 size={16} /></div>
            <span className="metric-label">Độ nhạy nhận diện Claim</span>
          </div>
          <strong className="metric-value">88.2%</strong>
          <span className="metric-note">Phát hiện chính xác các phát ngôn thiếu kiểm chứng</span>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <div className="metric-icon amber"><Share2 size={16} /></div>
            <span className="metric-label">Tỷ lệ kiểm chứng trước chia sẻ</span>
          </div>
          <strong className="metric-value">72.5%</strong>
          <span className="metric-note">Người đọc cam kết tra cứu nguồn độc lập</span>
        </div>
      </section>

      {/* List of Reception studies */}
      <section className="panel registry-panel">
        <div className="registry-toolbar">
          <h2>Kết quả Kiểm định Đọc hiểu & Tiếp nhận Thực nghiệm</h2>
          <span className="result-count">Dữ liệu thử nghiệm phản ứng người đọc đối với các dạng tin tức</span>
        </div>

        {isLoading ? (
          <div className="loading-line"><span /> Đang tải dữ liệu kiểm định tiếp nhận...</div>
        ) : (
          <div className="reception-cards-grid">
            {tests && tests.length > 0 ? (
              tests.map((t) => (
                <div key={t.id} className="reception-test-item">
                  <div className="rec-header">
                    <div>
                      <h3>Thử nghiệm Tiếp nhận Tin tức Khẩn cấp</h3>
                      <span className="rec-sample">Cỡ mẫu đối chứng: {t.sample_size} độc giả</span>
                    </div>
                  </div>

                  <div className="rec-stats-row">
                    <div className="rec-stat-col">
                      <span>Hiểu đúng thông tin:</span>
                      <strong>{t.comprehension_score}%</strong>
                    </div>
                    <div className="rec-stat-col">
                      <span>Nhận biết claim:</span>
                      <strong>{t.claim_identification_rate}%</strong>
                    </div>
                    <div className="rec-stat-col">
                      <span>Chấp nhận thông điệp:</span>
                      <strong>{t.acceptance_rate}%</strong>
                    </div>
                    <div className="rec-stat-col">
                      <span>Kiểm chứng trước share:</span>
                      <strong className="text-teal">{t.verify_before_sharing_rate}%</strong>
                    </div>
                  </div>

                  <div className="sharing-intention-bar-box">
                    <div className="sh-labels">
                      <span>Ý định chia sẻ: Thấp ({t.sharing_intention_low}%)</span>
                      <span>Trung bình ({t.sharing_intention_medium}%)</span>
                      <span style={{ color: "#e05252" }}>Cao ({t.sharing_intention_high}%)</span>
                    </div>
                    <div className="sh-stacked-track">
                      <div className="sh-fill-low" style={{ width: `${t.sharing_intention_low}%` }} />
                      <div className="sh-fill-med" style={{ width: `${t.sharing_intention_medium}%` }} />
                      <div className="sh-fill-high" style={{ width: `${t.sharing_intention_high}%` }} />
                    </div>
                  </div>

                  <p className="rec-cognitive-notes">
                    <strong>Phân tích kháng cự nhận thức:</strong> {t.cognitive_resistance_notes}
                  </p>
                </div>
              ))
            ) : (
              <div className="registry-state">
                <div className="empty-state">
                  <BrainCircuit size={32} />
                  <strong>Chưa có bài kiểm định tiếp nhận nào</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
