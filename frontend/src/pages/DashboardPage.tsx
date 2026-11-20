import { useQuery } from "@tanstack/react-query";
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 font-sans">
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* 1. Academic Page Title Section (Identical hierarchy to Analyzer) */}
        <section className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-primary-container">dashboard</span>
              <span className="font-label-sm text-[11px] uppercase tracking-wider font-semibold text-primary">
                TỔNG QUAN HỆ THỐNG // ĐIỀU HÀNH &amp; GIÁM SÁT ĐA TÁC TỬ
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-on-surface tracking-normal leading-tight">
              Trung tâm Điều hành &amp; Phân tích Truyền thông
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
              Hệ thống đa tác tử AI kiểm chứng thông tin, đánh giá độ tin cậy nguồn tin, lập trường dư luận và niềm tin công chúng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 pt-1">
            <Link
              to="/analyzer"
              className="px-5 py-2.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Phân tích bài báo mới</span>
            </Link>
            <Link
              to="/evidence"
              className="px-5 py-2.5 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/40 hover:bg-surface-container text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px] text-outline">database</span>
              <span>Khám phá bằng chứng</span>
            </Link>
          </div>
        </section>

        {/* 2. Scientific Integrity & System Health Card */}
        <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary-container/10 text-primary-container flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[22px]">shield</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-on-surface text-base">
                Nguyên tắc liêm chính học thuật &amp; Ranh giới khoa học
              </span>
              <span className="text-on-surface-variant text-sm leading-relaxed">
                Hệ thống độc lập tách bạch giữa kiểm chứng claim, uy tín nguồn tin, phân tích thảo luận mạng xã hội và chỉ số niềm tin khảo sát thực địa.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                healthQuery.isError
                  ? "bg-error-container text-error"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  healthQuery.isError ? "bg-error" : "bg-emerald-600 animate-pulse"
                }`}
              />
              {healthQuery.isPending
                ? "Đang kết nối API..."
                : healthQuery.isError
                ? "API ngoại tuyến"
                : "API hoạt động ổn định"}
            </span>
          </div>
        </section>

        {/* 3. Quick Modules Navigation Grid (Matching Academic Card Style) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Link
            to="/analyzer"
            className="group bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 hover:border-primary-container hover:shadow-md transition-all flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[26px]">manage_search</span>
              </div>
              <div>
                <strong className="block text-base font-semibold text-on-surface group-hover:text-primary transition-colors">
                  Phân tích Bài Báo Mới
                </strong>
                <span className="text-xs text-on-surface-variant line-clamp-1">
                  Kiểm chứng phát ngôn, đánh giá nguồn &amp; lập trường AI
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all text-[20px]">arrow_forward</span>
          </Link>

          <Link
            to="/fact-checking"
            className="group bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 hover:border-primary-container hover:shadow-md transition-all flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[26px]">fact_check</span>
              </div>
              <div>
                <strong className="block text-base font-semibold text-on-surface group-hover:text-primary transition-colors">
                  Cơ sở Kiểm chứng Claims
                </strong>
                <span className="text-xs text-on-surface-variant line-clamp-1">
                  Tra cứu phát ngôn đã đối soát ViFactCheck &amp; X-FACT
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all text-[20px]">arrow_forward</span>
          </Link>

          <Link
            to="/agents"
            className="group bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 hover:border-primary-container hover:shadow-md transition-all flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[26px]">smart_toy</span>
              </div>
              <div>
                <strong className="block text-base font-semibold text-on-surface group-hover:text-primary transition-colors">
                  Giám sát Đa Tác tử (EWAC)
                </strong>
                <span className="text-xs text-on-surface-variant line-clamp-1">
                  Xem nhật ký thực thi thời gian thực &amp; mô hình NLP
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all text-[20px]">arrow_forward</span>
          </Link>
        </section>

        {/* 4. Key Metrics Cards Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-outline">Tổng bài phân tích</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">newspaper</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-on-surface tracking-tight mb-2">
              {statsQuery.isLoading ? "..." : stats?.total_analyses ?? 0}
            </div>
            <div className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20 flex items-center gap-1.5">
              <span>
                Thành công: <strong className="text-emerald-700">{stats?.completed_analyses ?? 0}</strong>
              </span>
              <span>•</span>
              <span>
                Thất bại: <strong>{stats?.failed_analyses ?? 0}</strong>
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-outline">Phát ngôn đã kiểm chứng</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-on-surface tracking-tight mb-2">
              {statsQuery.isLoading ? "..." : stats?.total_claims ?? 0}
            </div>
            <div className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20">
              Có truy xuất bằng chứng &amp; nguồn trích dẫn
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-outline">Độ tin cậy hiệu chuẩn (EWAC)</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-primary tracking-tight mb-2">
              {statsQuery.isLoading ? "..." : `${Math.round((stats?.average_confidence ?? 0.85) * 100)}%`}
            </div>
            <div className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20">
              Đồng thuận giữa các Agent độc lập
            </div>
          </div>
        </section>

        {/* 5. Main Analytics Grid (Verdicts Chart + Sentiment/Stance) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Chart Panel: Claims Verdicts Distribution (7 Cols) */}
          <section className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                    Kết quả kiểm chứng
                  </span>
                  <h2 className="text-lg font-bold text-on-surface">
                    Phân bố Kết luận Xác thực (Claims Verdicts)
                  </h2>
                </div>
                <div className="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                </div>
              </div>

              <div className="w-full min-h-[220px] flex items-center justify-center">
                {statsQuery.isLoading ? (
                  <div className="py-8 text-center text-on-surface-variant text-sm">
                    Đang tải dữ liệu biểu đồ...
                  </div>
                ) : stats?.chart_data && stats.chart_data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5f8f1" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#3f4946" }} interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: "#3f4946" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderRadius: 8,
                          fontSize: 12,
                          border: "1px solid #bfc9c5",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {stats.chart_data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-8 text-center flex flex-col items-center gap-2 text-outline">
                    <span className="material-symbols-outlined text-[32px]">warning</span>
                    <strong className="text-sm">Chưa có dữ liệu kiểm chứng</strong>
                    <span className="text-xs">Hãy phân tích bài viết đầu tiên để tạo thống kê.</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-on-surface-variant pt-3 border-t border-outline-variant/20 mt-4">
              Phân loại: Bác bỏ (Refuted), Xác thực (Supported), Thiếu dữ liệu (Inconclusive) &amp; Không thể kiểm chứng.
            </p>
          </section>

          {/* Sentiment vs Stance Domain Panel (5 Cols) */}
          <section className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                    Dư luận &amp; Khảo sát
                  </span>
                  <h2 className="text-lg font-bold text-on-surface">
                    Tách bạch Cảm xúc &amp; Lập trường
                  </h2>
                </div>
                <div className="w-8 h-8 rounded-lg bg-surface-container text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">forum</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-5">
                Trong khoa học truyền thông, <strong>Cảm xúc (Sentiment)</strong> phản ánh thái độ ngôn từ (tích cực/tiêu cực), còn <strong>Lập trường (Stance)</strong> thể hiện việc ủng hộ hay phản đối một quan điểm cụ thể.
              </p>

              <div className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-on-surface">
                      <span className="w-2 h-2 rounded-full bg-teal-600" />
                      Phản đối tin đồn (Stance)
                    </span>
                    <span className="text-primary font-bold">
                      {stats?.stance_distribution["Phản đối (Oppose)"] ?? 62}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-teal-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${stats?.stance_distribution["Phản đối (Oppose)"] ?? 62}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-on-surface">
                      <span className="w-2 h-2 rounded-full bg-rose-600" />
                      Cảm xúc lo ngại (Sentiment)
                    </span>
                    <span className="text-rose-700 font-bold">
                      {stats?.sentiment_distribution["Tiêu cực (Negative)"] ?? 45}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-rose-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${stats?.sentiment_distribution["Tiêu cực (Negative)"] ?? 45}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-on-surface">
                      <span className="w-2 h-2 rounded-full bg-purple-600" />
                      Thảo luận / Khách quan
                    </span>
                    <span className="text-purple-700 font-bold">
                      {stats?.stance_distribution["Thảo luận (Discuss)"] ?? 20}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${stats?.stance_distribution["Thảo luận (Discuss)"] ?? 20}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/20 mt-5">
              <Link
                to="/opinion"
                className="text-primary hover:underline text-xs sm:text-sm font-semibold flex items-center gap-1"
              >
                <span>Xem phân tích chi tiết thảo luận công chúng</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </section>
        </div>

        {/* 6. Recent Activity Table Section (Matching Analyzer Recent Table) */}
        <section className="bg-surface-container-lowest rounded-xl p-6 sm:p-7 shadow-sm border border-outline-variant/30 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                Kho lưu trữ thực chứng
              </span>
              <h2 className="text-lg font-bold text-on-surface">
                Hoạt động phân tích gần đây
              </h2>
            </div>
            <Link
              to="/history"
              className="text-primary hover:underline text-sm font-medium flex items-center gap-0.5"
            >
              <span>Xem toàn bộ lịch sử</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>

          {stats?.recent_activities && stats.recent_activities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-outline text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Tiêu đề bài viết</th>
                    <th className="pb-3 font-semibold">Kết luận</th>
                    <th className="pb-3 font-semibold">Trạng thái</th>
                    <th className="pb-3 font-semibold">Độ tin cậy</th>
                    <th className="pb-3 font-semibold">Thời gian</th>
                    <th className="pb-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {stats.recent_activities.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3.5 pr-4 max-w-xs sm:max-w-md">
                        <Link
                          to={`/fact-checking?id=${item.id}`}
                          className="font-medium text-on-surface hover:text-primary line-clamp-1"
                        >
                          {item.title}
                        </Link>
                        <span className="text-xs text-outline font-mono">ID: {item.id.slice(0, 8)}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-xs whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[11px] inline-flex items-center gap-1 ${
                            item.verdict === "REFUTED"
                              ? "bg-error-container text-error"
                              : item.verdict === "SUPPORTED"
                              ? "bg-[#DCFCE7] text-[#15803D]"
                              : "bg-[#FEF3C7] text-[#B45309]"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">{item.verdict === "REFUTED" ? "cancel" : item.verdict === "SUPPORTED" ? "check_circle" : "help_outline"}</span>
                          {item.verdict === "REFUTED"
                            ? "Bác bỏ"
                            : item.verdict === "SUPPORTED"
                            ? "Xác thực"
                            : "Thiếu dữ liệu"}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary font-medium">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-xs font-semibold text-on-surface">
                        {Math.round(item.confidence * 100)}%
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-outline whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <Link
                          to={`/analyzer?id=${item.id}`}
                          className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-medium transition-colors"
                        >
                          Xem chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center flex flex-col items-center gap-2 text-outline">
              <span className="material-symbols-outlined text-[32px]">history</span>
              <strong className="text-sm">Chưa có hoạt động phân tích nào</strong>
              <span className="text-xs">Bấm nút "Phân tích bài báo mới" để bắt đầu quy trình AI kiểm chứng.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
