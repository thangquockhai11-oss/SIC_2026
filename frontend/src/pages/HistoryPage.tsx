import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { useAnalysis } from "../context/AnalysisContext";
import { formatDateTime, formatVerdict } from "../utils/i18n";

export default function HistoryPage() {
  const { openModal } = useAnalysis();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["history", searchTerm, statusFilter, page],
    queryFn: () =>
      api.history.list({
        q: searchTerm || undefined,
        status: statusFilter || undefined,
        page,
        page_size: 20,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.history.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setDeleteTargetId(null);
    },
    onError: (err: any) => {
      alert("Lỗi khi xóa bài phân tích: " + (err.response?.data?.detail || err.message));
      setDeleteTargetId(null);
    },
  });

  const items = data?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-lg flex flex-col gap-space-lg">
      {/* Top Header Ribbon & Action */}
      <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[18px] text-primary">history</span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
              NHẬT KÝ NGHIÊN CỨU & KIỂM CHỨNG
            </span>
          </div>
          <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
            Lịch sử Phân tích — Nhật ký Nghiên cứu
          </h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 max-w-3xl leading-relaxed">
            Toàn bộ các phiên phân tích tin tức và kiểm chứng đa tác nhân đã được thực thi và lưu trữ trong cơ sở dữ liệu.
          </p>
        </div>

        <button
          onClick={openModal}
          className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-all shadow-sm shrink-0 self-start md:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>+ Phân tích bài mới</span>
        </button>
      </section>

      {/* Archival Policy Notice */}
      <section className="bg-surface-container-low rounded-xl p-space-md border border-surface-container flex items-center justify-between gap-space-sm shadow-xs">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-[20px] text-primary">history_edu</span>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            <strong>Chính sách lưu trữ học thuật:</strong> Tất cả báo cáo thẩm định được bảo toàn vĩnh viễn theo tiêu chuẩn COPE. {isAdmin ? "Tài khoản Hội đồng Khoa học (Admin) có quyền xóa bỏ hồ sơ khi cần hiệu chỉnh dữ liệu." : "Quyền xóa hồ sơ lưu trữ bị khóa đối với tài khoản Thẩm định viên/Khách."}
          </p>
        </div>
      </section>

      {/* Toolbar & Filter */}
      <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm flex-1 max-w-lg">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề, nội dung hoặc URL bài báo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-space-md py-1.5 rounded-lg bg-surface-container-low border border-surface-container font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-low rounded-lg px-space-md py-1.5 border border-surface-container font-label-md text-label-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="PROCESSING">Đang xử lý</option>
            <option value="FAILED">Thất bại</option>
          </select>

          <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold whitespace-nowrap">
            Tổng cộng: {data?.total || items.length} phiên
          </span>
        </div>
      </section>

      {/* History Table */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container overflow-hidden">
        {isLoading ? (
          <div className="p-space-xl flex flex-col items-center justify-center min-h-[300px]">
            <span className="material-symbols-outlined text-[36px] text-primary animate-spin mb-3">sync</span>
            <p className="font-body-md text-body-md text-on-surface-variant">Đang tải lịch sử phân tích...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-space-xl flex flex-col items-center justify-center min-h-[300px] text-center">
            <span className="material-symbols-outlined text-[48px] text-outline mb-2">history_toggle_off</span>
            <strong className="font-title-lg text-title-lg text-on-surface">Chưa có bản ghi lịch sử nào</strong>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
              Hãy bấm vào "+ Phân tích bài mới" để bắt đầu phiên thẩm định đầu tiên.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-container bg-surface-container-low/50 text-outline font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-space-md px-space-lg">Tiêu đề & Nguồn xuất bản</th>
                  <th className="py-space-md px-space-md">Kết luận thực chứng</th>
                  <th className="py-space-md px-space-md">Quy mô</th>
                  <th className="py-space-md px-space-md">Nhà cung cấp AI</th>
                  <th className="py-space-md px-space-md">Thời gian</th>
                  <th className="py-space-md px-space-lg text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-surface-container-low/40 transition-colors"
                  >
                    {/* Title & Source */}
                    <td className="py-space-md px-space-lg">
                      <div className="flex flex-col">
                        <Link
                          to={`/fact-checking?id=${item.id}`}
                          className="font-title-lg text-title-lg text-on-surface font-bold hover:text-primary transition-colors line-clamp-1"
                        >
                          {item.title}
                        </Link>
                        <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm mt-0.5">
                          <span className="material-symbols-outlined text-[14px] text-outline">link</span>
                          <span className="font-medium text-primary">
                            {item.source_url ? new URL(item.source_url).hostname : "Nguồn trực tiếp"}
                          </span>
                          <span className="text-outline">•</span>
                          <span className="font-mono text-outline">#{item.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                      </div>
                    </td>

                    {/* Verdict */}
                    <td className="py-space-md px-space-md whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold inline-flex items-center gap-1 ${
                          item.verdict === "SUPPORTED"
                            ? "bg-[#DCFCE7] text-[#15803D]"
                            : item.verdict === "REFUTED"
                            ? "bg-error-container text-error"
                            : item.verdict === "MISLEADING"
                            ? "bg-[#FEF3C7] text-[#B45309]"
                            : "bg-surface-container text-secondary"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {item.verdict === "SUPPORTED"
                            ? "check_circle"
                            : item.verdict === "REFUTED"
                            ? "cancel"
                            : "warning"}
                        </span>
                        {formatVerdict(item.verdict)}
                      </span>
                    </td>

                    {/* Claims count */}
                    <td className="py-space-md px-space-md whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold">
                        {item.claims_count} Luận điểm
                      </span>
                    </td>

                    {/* AI Provider */}
                    <td className="py-space-md px-space-md whitespace-nowrap">
                      <span className="font-mono text-[11px] text-outline px-2 py-0.5 rounded bg-surface-container">
                        {item.ai_provider}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-space-md px-space-md whitespace-nowrap text-on-surface-variant font-label-sm text-label-sm">
                      {formatDateTime(item.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-space-md px-space-lg text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/fact-checking?id=${item.id}`}
                          className="px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md font-semibold transition-all inline-flex items-center gap-1 border border-surface-container"
                          title="Xem biên bản thẩm định học thuật"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Xem</span>
                        </Link>
                        {isAdmin ? (
                          <button
                            type="button"
                            className="p-1.5 rounded-lg hover:bg-error-container text-error transition-colors"
                            title="Xóa bản ghi này (Chỉ Admin)"
                            onClick={() => setDeleteTargetId(item.id)}
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        ) : (
                          <span
                            className="p-1.5 text-outline cursor-default opacity-40"
                            title="Không có quyền xóa hồ sơ này"
                          >
                            <span className="material-symbols-outlined text-[16px]">lock</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setDeleteTargetId(null)}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden border border-surface-container p-space-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-space-md mb-space-md">
              <span className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </span>
              <div>
                <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
                  Xác nhận xóa bài phân tích
                </h3>
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                  Mã phiên: {deleteTargetId}
                </p>
              </div>
            </div>

            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-space-lg">
              Bạn có chắc chắn muốn xóa bản ghi phân tích này không? Thao tác này sẽ xóa vĩnh viễn các tuyên bố và bằng chứng liên quan khỏi cơ sở dữ liệu.
            </p>

            <div className="flex items-center justify-end gap-space-sm pt-space-md border-t border-surface-container">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-medium transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTargetId)}
                className="px-space-md py-2 rounded-lg bg-error text-on-error font-label-md text-label-md font-semibold hover:bg-red-700 transition-colors shadow-sm"
              >
                {deleteMutation.isPending ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
