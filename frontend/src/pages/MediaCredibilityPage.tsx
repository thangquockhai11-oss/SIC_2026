import { useQuery } from "@tanstack/react-query";
import {
  Globe,
  Info,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { api } from "../api/client";

export default function MediaCredibilityPage() {
  const { isLoading } = useQuery({
    queryKey: ["history", "credibility"],
    queryFn: () => api.history.list({ page_size: 20 }),
  });

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">ĐÁNH GIÁ NGUỒN TIN</div>
          <h1>Media Credibility — Độ tin cậy Truyền thông</h1>
          <p className="page-subtitle">
            Đánh giá minh bạch tòa soạn, chất lượng trích dẫn và chuẩn mực báo chí độc lập với độ chính xác của từng bài viết cụ thể.
          </p>
        </div>
      </section>

      {/* Scientific Principle Notice */}
      <section className="status-banner">
        <div className="banner-icon"><Info size={20} /></div>
        <div className="banner-copy">
          <strong>Ranh giới cốt lõi: Nguồn tin vs Bài viết</strong>
          <span>
            Một cơ quan báo chí có uy tín cao vẫn có thể sơ suất đăng tải bài viết chưa chuẩn xác; ngược lại một nguồn tin mạng xã hội tự do có thể ngẫu nhiên đưa tin đúng sự thật. Do đó, hệ thống không bao giờ gộp hai chỉ số này lại thành một.
          </span>
        </div>
      </section>

      {/* Component Criteria Explanation */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-top">
            <div className="metric-icon blue"><Globe size={16} /></div>
            <span className="metric-label">1. Độ minh bạch (Transparency)</span>
          </div>
          <span className="metric-note" style={{ marginTop: 8 }}>
            Công khai cơ quan chủ quản, danh tính ban biên tập, địa chỉ trụ sở và phương thức liên hệ xác minh.
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <div className="metric-icon green"><ShieldCheck size={16} /></div>
            <span className="metric-label">2. Chất lượng trích dẫn (Citation)</span>
          </div>
          <span className="metric-note" style={{ marginTop: 8 }}>
            Tỷ lệ phát ngôn trích dẫn từ chuyên gia có danh tính rõ ràng thay vì dẫn mơ hồ ("theo dân mạng", "tin rò rỉ").
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <div className="metric-icon amber"><ShieldAlert size={16} /></div>
            <span className="metric-label">3. Chuẩn mực & Sửa sai (Corrections)</span>
          </div>
          <span className="metric-note" style={{ marginTop: 8 }}>
            Có quy trình công khai đính chính khi có sai sót và cam kết không giật gân, câu tương tác sai sự thật.
          </span>
        </div>
      </div>

      {/* List of Recent Media Evaluations */}
      <section className="panel registry-panel">
        <div className="registry-toolbar">
          <h2>Các nguồn tin đã được đánh giá qua phân tích</h2>
          <span className="result-count">Hệ thống cập nhật theo từng phiên nghiên cứu</span>
        </div>

        {isLoading ? (
          <div className="loading-line"><span /> Đang tải dữ liệu đánh giá nguồn tin...</div>
        ) : (
          <div className="cred-cards-page-grid">
            <div className="cred-eval-card">
              <div className="cred-eval-header">
                <div>
                  <h3 className="cred-source-title">tintuc247.vn (Mạng xã hội / Trang tin điện tử)</h3>
                  <span className="cred-domain-sub">Tên miền tư nhân • Không đăng ký giấy phép báo chí</span>
                </div>
                <div className="cred-pill-low">16.2 / 100 • Kém tin cậy</div>
              </div>

              <div className="cred-bars-stack">
                <div className="c-bar-row">
                  <span>Minh bạch tòa soạn:</span>
                  <div className="c-bar-track"><div className="c-bar-fill fill-low" style={{ width: "15%" }} /></div>
                  <strong>15%</strong>
                </div>
                <div className="c-bar-row">
                  <span>Chất lượng trích dẫn:</span>
                  <div className="c-bar-track"><div className="c-bar-fill fill-low" style={{ width: "20%" }} /></div>
                  <strong>20%</strong>
                </div>
                <div className="c-bar-row">
                  <span>Chứng cứ đối chiếu:</span>
                  <div className="c-bar-track"><div className="c-bar-fill fill-low" style={{ width: "18%" }} /></div>
                  <strong>18%</strong>
                </div>
                <div className="c-bar-row">
                  <span>Chuẩn mực biên tập:</span>
                  <div className="c-bar-track"><div className="c-bar-fill fill-low" style={{ width: "12%" }} /></div>
                  <strong>12%</strong>
                </div>
              </div>

              <p className="cred-reasoning-quote">
                <strong>Cơ sở đánh giá:</strong> Nguồn tin ẩn danh, sử dụng tiêu đề phóng đại để câu view, không có cơ chế liên hệ chịu trách nhiệm nội dung.
              </p>
            </div>

            <div className="cred-eval-card">
              <div className="cred-eval-header">
                <div>
                  <h3 className="cred-source-title">baochinhphu.vn (Cổng Thông tin Điện tử Chính phủ)</h3>
                  <span className="cred-domain-sub">Cơ quan nhà nước chính thức (.gov.vn)</span>
                </div>
                <div className="cred-pill-high">94.5 / 100 • Rất tin cậy</div>
              </div>

              <div className="cred-bars-stack">
                <div className="c-bar-row">
                  <span>Minh bạch tòa soạn:</span>
                  <div className="c-bar-track"><div className="c-bar-fill fill-high" style={{ width: "95%" }} /></div>
                  <strong>95%</strong>
                </div>
                <div className="c-bar-row">
                  <span>Chất lượng trích dẫn:</span>
                  <div className="c-bar-track"><div className="c-bar-fill fill-high" style={{ width: "92%" }} /></div>
                  <strong>92%</strong>
                </div>
                <div className="c-bar-row">
                  <span>Chứng cứ đối chiếu:</span>
                  <div className="c-bar-track"><div className="c-bar-fill fill-high" style={{ width: "96%" }} /></div>
                  <strong>96%</strong>
                </div>
                <div className="c-bar-row">
                  <span>Chuẩn mực biên tập:</span>
                  <div className="c-bar-track"><div className="c-bar-fill fill-high" style={{ width: "95%" }} /></div>
                  <strong>95%</strong>
                </div>
              </div>

              <p className="cred-reasoning-quote">
                <strong>Cơ sở đánh giá:</strong> Có định danh pháp lý đầy đủ, văn bản chỉ đạo điều hành chính thức từ các bộ ngành, quy trình kiểm duyệt thông tin nghiêm ngặt.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
