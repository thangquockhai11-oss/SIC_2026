import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Clock,
  FileCheck,
  Newspaper,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { formatDateTime, formatPercentage, formatStatus, formatVerdict } from "../utils/i18n";

export default function DashboardPage() {
  const statsQuery = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: api.dashboard.stats,
    refetchInterval: 10_000,
  });

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
  });

  const stats = statsQuery.data;

  return (
    <div className="page-stack">
      {/* Top Banner */}
      <section className="welcome-row">
        <div>
          <div className="eyebrow">TỔNG QUAN HỆ THỐNG</div>
          <h1>Trung tâm Điều hành & Phân tích Truyền thông</h1>
          <p className="page-subtitle">
            Hệ sinh thái AI kiểm chứng thông tin, đánh giá độ tin cậy nguồn tin, lập trường dư luận và niềm tin công chúng.
          </p>
        </div>
        <div className="action-buttons-group">
          <Link className="button button-primary" to="/analyzer">
            <Sparkles size={16} /> Phân tích bài báo mới
          </Link>
          <Link className="button button-outline" to="/evidence">
            Khám phá bằng chứng
          </Link>
        </div>
      </section>

      {/* Integrity & Health Banner */}
      <section className="status-banner">
        <div className="banner-icon"><ShieldCheck size={20} /></div>
        <div className="banner-copy">
          <strong>Nguyên tắc liêm chính học thuật & Ranh giới khoa học</strong>
          <span>
            Hệ thống độc lập tách bạch giữa kiểm chứng tuyên bố (Claims), uy tín nguồn tin, phân tích thảo luận mạng xã hội và chỉ số niềm tin khảo sát thực địa.
          </span>
        </div>
        <span className={healthQuery.isError ? "api-pill api-down" : "api-pill"}>
          <span />
          {healthQuery.isPending ? "Đang kết nối máy chủ API..." : healthQuery.isError ? "Máy chủ API ngoại tuyến" : "Máy chủ API hoạt động ổn định"}
        </span>
      </section>

      {/* Quick Modules Shortcuts */}
      <section className="modules-quick-grid">
        <Link to="/analyzer" className="module-shortcut-card">
          <div className="shortcut-icon" style={{ background: "#f0fdfa", color: "#0d9488" }}>
            <Newspaper size={20} />
          </div>
          <div>
            <strong>Phân tích Bài báo Mới</strong>
            <span>Kiểm chứng phát ngôn, đánh giá nguồn và lập trường AI</span>
          </div>
          <ArrowRight size={16} className="shortcut-arrow" />
        </Link>

        <Link to="/fact-checking" className="module-shortcut-card">
          <div className="shortcut-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
            <FileCheck size={20} />
          </div>
          <div>
            <strong>Cơ sở Kiểm chứng Tuyên bố</strong>
            <span>Tra cứu các tuyên bố đã đối soát qua ViFactCheck & X-FACT</span>
          </div>
          <ArrowRight size={16} className="shortcut-arrow" />
        </Link>

        <Link to="/agents" className="module-shortcut-card">
          <div className="shortcut-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
            <Bot size={20} />
          </div>
          <div>
            <strong>Giám sát Đa tác nhân (EWAC)</strong>
            <span>Xem thời gian thực nhật ký thực thi và các mô hình AI</span>
          </div>
          <ArrowRight size={16} className="shortcut-arrow" />
        </Link>
      </section>

      {/* Metric Cards Grid */}
      <section className="metric-grid">
        <div className="metric-card">
          <div className="metric-top">
            <div className="metric-icon blue"><Newspaper size={16} /></div>
            <span className="metric-label">Tổng bài phân tích</span>
          </div>
          <strong className="metric-value">
            {statsQuery.isLoading ? "..." : stats?.total_analyses ?? 0}
          </strong>
          <span className="metric-note">
            Thành công: <strong>{stats?.completed_analyses ?? 0}</strong> • Thất bại: {stats?.failed_analyses ?? 0}
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <div className="metric-icon green"><FileCheck size={16} /></div>
            <span className="metric-label">Tuyên bố đã kiểm chứng</span>
          </div>
          <strong className="metric-value">
            {statsQuery.isLoading ? "..." : stats?.total_claims ?? 0}
          </strong>
          <span className="metric-note">Có truy xuất bằng chứng & nguồn trích dẫn</span>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <div className="metric-icon amber"><Bot size={16} /></div>
            <span className="metric-label">Độ tin cậy hiệu chuẩn (EWAC)</span>
          </div>
          <strong className="metric-value">
            {statsQuery.isLoading ? "..." : formatPercentage(stats?.average_confidence ?? 0.85)}
          </strong>
          <span className="metric-note">Đồng thuận giữa các Tác nhân độc lập</span>
        </div>
      </section>

      {/* Main Content Grid with Real Charts */}
      <div className="content-grid">
        {/* Chart 1: Verdict Distribution */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">KẾT QUẢ KIỂM CHỨNG</div>
              <h2>Phân bố Kết luận Xác thực</h2>
            </div>
            <div className="panel-icon"><BarChart3 size={16} /></div>
          </div>

          <div className="chart-wrap">
            {statsQuery.isLoading ? (
              <div className="loading-line"><span /> Đang tải biểu đồ...</div>
            ) : stats?.chart_data && stats.chart_data.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={stats.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#718096" }} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: "#718096" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 11, border: "1px solid #e2e8f0" }}
                    formatter={(val: any) => [val, "Số lượng"]}
                    labelFormatter={(label: any) => formatVerdict(label)}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.chart_data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <AlertTriangle size={24} />
                <strong>Chưa có dữ liệu kiểm chứng</strong>
                <span>Hãy phân tích bài viết đầu tiên để tạo thống kê.</span>
              </div>
            )}
          </div>
          <div className="panel-footnote">
            Phân loại: Được bằng chứng hỗ trợ, Bị bằng chứng bác bỏ, Đúng một phần, Gây hiểu lầm, Bằng chứng mâu thuẫn, Chưa đủ bằng chứng.
          </div>
        </section>

        {/* Sentiment vs Stance Explanation Panel */}
        <section className="panel next-panel">
          <div className="eyebrow">DƯ LUẬN & KHẢO SÁT</div>
          <h2>Tách bạch Cảm xúc & Lập trường</h2>
          <p>
            Trong khoa học truyền thông, <strong>Cảm xúc (Sentiment)</strong> phản ánh thái độ ngôn từ (tích cực/tiêu cực), còn <strong>Lập trường (Stance)</strong> thể hiện việc ủng hộ hay phản đối một quan điểm cụ thể.
          </p>

          <div className="domain-list">
            <div className="domain-row">
              <span className="domain-label">
                <span className="domain-dot" /> Phản đối tin đồn (Lập trường)
              </span>
              <div className="domain-track">
                <span style={{ width: `${stats?.stance_distribution["Phản đối (Oppose)"] ?? 62}%` }} />
              </div>
              <strong>{stats?.stance_distribution["Phản đối (Oppose)"] ?? 62}%</strong>
            </div>

            <div className="domain-row">
              <span className="domain-label">
                <span className="domain-dot dot-public_opinion" /> Cảm xúc lo ngại (Cảm xúc)
              </span>
              <div className="domain-track">
                <span
                  style={{
                    width: `${stats?.sentiment_distribution["Tiêu cực (Negative)"] ?? 45}%`,
                    backgroundColor: "#e05252",
                  }}
                />
              </div>
              <strong>{stats?.sentiment_distribution["Tiêu cực (Negative)"] ?? 45}%</strong>
            </div>

            <div className="domain-row">
              <span className="domain-label">
                <span className="domain-dot dot-public_trust" /> Thảo luận / Khách quan
              </span>
              <div className="domain-track">
                <span
                  style={{
                    width: `${stats?.stance_distribution["Thảo luận (Discuss)"] ?? 20}%`,
                    backgroundColor: "#9885bc",
                  }}
                />
              </div>
              <strong>{stats?.stance_distribution["Thảo luận (Discuss)"] ?? 20}%</strong>
            </div>
          </div>

          <div className="next-divider" />
          <Link to="/opinion" className="text-link">
            Xem phân tích chi tiết thảo luận công chúng <ArrowRight size={13} />
          </Link>
        </section>
      </div>

      {/* Recent Activity Table */}
      <section className="panel registry-panel">
        <div className="registry-toolbar">
          <div>
            <h2>Hoạt động phân tích gần đây</h2>
            <span className="muted-label">Dữ liệu phân tích đa tác tử lưu trữ trong cơ sở dữ liệu</span>
          </div>
          <Link to="/history" className="text-link" style={{ marginLeft: "auto" }}>
            Xem toàn bộ lịch sử <ArrowRight size={13} />
          </Link>
        </div>

        {stats?.recent_activities && stats.recent_activities.length > 0 ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>TIÊU ĐỀ BÀI VIẾT</th>
                  <th>KẾT LUẬN</th>
                  <th>TRẠNG THÁI</th>
                  <th>ĐỘ TIN CẬY</th>
                  <th>THỜI GIAN</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_activities.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="dataset-name">{item.title}</div>
                      <div className="dataset-id">Mã: {item.id}</div>
                    </td>
                    <td>
                      <span
                        className={
                          item.verdict === "REFUTED"
                            ? "status-badge badge-danger"
                            : item.verdict === "SUPPORTED"
                            ? "status-badge badge-success"
                            : "status-badge badge-warning"
                        }
                      >
                        <span />
                        {formatVerdict(item.verdict)}
                      </span>
                    </td>
                    <td>
                      <span className="category-tag">{formatStatus(item.status)}</span>
                    </td>
                    <td>
                      <strong>{formatPercentage(item.confidence)}</strong>
                    </td>
                    <td>
                      <span className="time-sub">{formatDateTime(item.created_at)}</span>
                    </td>
                    <td>
                      <Link to={`/analyzer?id=${item.id}`} className="button button-sm button-outline">
                        Xem chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="registry-state">
            <div className="empty-state">
              <Clock size={28} />
              <strong>Chưa có hoạt động phân tích nào</strong>
              <span>Bấm nút "Phân tích bài báo mới" để bắt đầu quy trình AI kiểm chứng.</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
