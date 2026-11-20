import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";

  const [searchTerm, setSearchTerm] = useState(initialQ);
  const [statusFilter, setStatusFilter] = useState("");
  const page = 1;
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["history", searchTerm, statusFilter, page],
    queryFn: () =>
      api.history.list({
        q: searchTerm || undefined,
        status: statusFilter || undefined,
        page,
        page_size: 15,
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
    <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-xl">
      <div className="flex flex-col gap-space-xl">
        {/* Title Header */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-primary-container">history_edu</span>
              <span className="font-label-sm text-[11px] uppercase tracking-wider font-semibold text-primary">
                Cơ sở Dữ liệu Lưu trữ Thực nghiệm
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">
              Lịch sử Phân tích & Hồ sơ Bài báo
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
              Toàn bộ các phiên phân tích tin tức và kiểm chứng đa tác tử đã được thực thi và bảo lưu trong hệ thống.
            </p>
          </div>
          <Link
            to="/analyzer"
            className="px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md font-semibold transition-colors shadow-sm flex items-center gap-2 self-start sm:self-auto shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Phân tích bài mới</span>
          </Link>
        </section>

        {/* Toolbar & Filter Bar */}
        <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề hoặc URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-space-md py-2 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>

          <div className="flex items-center gap-space-sm w-full md:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-space-md py-2 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="COMPLETED">Đã đối soát (COMPLETED)</option>
              <option value="PROCESSING">Đang xử lý (PROCESSING)</option>
              <option value="FAILED">Thất bại (FAILED)</option>
            </select>

            <span className="text-on-surface-variant font-label-sm text-label-sm bg-surface-container px-3 py-2 rounded-lg font-medium whitespace-nowrap">
              Tổng số: {data?.total || 0} bài
            </span>
          </div>
        </section>

        {/* Main Records Table */}
        <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30">
          {isLoading ? (
            <div className="py-space-xl text-center text-on-surface-variant font-body-md text-body-md flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Đang tải danh sách bài báo lưu trữ...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-space-xl text-center text-outline flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[36px]">folder_off</span>
              <p className="font-body-lg text-body-lg">Chưa tìm thấy bản ghi nào phù hợp.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-md text-body-md">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-outline font-label-sm text-[11px] uppercase tracking-wider">
                    <th className="pb-space-sm font-semibold">Mã lưu trữ & Tiêu đề</th>
                    <th className="pb-space-sm font-semibold">Tòa soạn / Nguồn tin</th>
                    <th className="pb-space-sm font-semibold">Ngày phân tích</th>
                    <th className="pb-space-sm font-semibold">Mệnh đề</th>
                    <th className="pb-space-sm font-semibold">Trạng thái</th>
                    <th className="pb-space-sm text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3.5 pr-space-md max-w-sm">
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] text-outline font-semibold">
                            #TM-{item.id.slice(0, 8).toUpperCase()}
                          </span>
                          <Link
                            to={`/fact-checking?id=${item.id}`}
                            className="font-medium text-on-surface hover:text-primary line-clamp-2"
                          >
                            {item.title}
                          </Link>
                        </div>
                      </td>
                      <td className="py-3.5 pr-space-md text-on-surface-variant font-label-sm text-label-sm">
                        {item.source_url ? new URL(item.source_url).hostname : "Văn bản dán"}
                      </td>
                      <td className="py-3.5 pr-space-md text-outline font-label-sm text-label-sm whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-3.5 pr-space-md font-label-sm text-label-sm">
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary font-medium">
                          {item.claims_count} luận điểm
                        </span>
                      </td>
                      <td className="py-3.5 pr-space-md font-label-sm text-label-sm">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase tracking-wider ${
                            item.status === "COMPLETED"
                              ? "bg-[#DCFCE7] text-[#15803D]"
                              : item.status === "FAILED"
                              ? "bg-error-container text-error"
                              : "bg-surface-container text-secondary"
                          }`}
                        >
                          {item.status === "COMPLETED" ? "Đã đối soát" : item.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-space-xs">
                          <Link
                            to={`/fact-checking?id=${item.id}`}
                            className="px-2.5 py-1 rounded bg-primary-container text-on-primary hover:bg-primary font-label-sm text-label-sm font-semibold transition-colors inline-flex items-center gap-0.5 shadow-xs"
                          >
                            Mở hồ sơ <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(item.id)}
                            className="p-1 rounded text-outline hover:text-error hover:bg-error-container/30 transition-colors"
                            title="Xóa bản ghi"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Delete confirmation modal */}
      {deleteTargetId && (
        <div
          className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setDeleteTargetId(null)}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl p-space-lg flex flex-col gap-space-md border border-outline-variant/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-space-xs text-error">
              <span className="material-symbols-outlined text-[24px]">warning</span>
              <h3 className="font-title-lg text-title-lg font-bold">Xác nhận xóa bản ghi</h3>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Bạn có chắc chắn muốn xóa bài báo và toàn bộ kết quả phân tích luận điểm này khỏi hệ thống lưu trữ?
            </p>
            <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-space-md py-2 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md hover:bg-surface-container-highest"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTargetId)}
                className="px-space-md py-2 rounded-lg bg-error text-on-error font-label-md text-label-md font-semibold hover:bg-error/90 shadow-sm"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
